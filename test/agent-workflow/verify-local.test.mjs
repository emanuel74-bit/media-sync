import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import {
    assertCheckpointTemporalConsistency,
    assertNoAmbientNodeInjection,
    assertRepositoryStateUnchanged,
    bundledNpmCliPath,
    captureRepositoryState,
    discoverWorkflowFormattingPaths,
    discoverWorkflowTests,
    fileIdentity,
    inspectInstalledOpenSpecClosure,
    repositoryCommandPlan,
    runChangeVerification,
    runProcess,
    runRepositoryVerification,
    validateMarkdownLinks,
    validatePinnedToolchain,
    validateSchemaExamples,
    validateWorkflowLineEndings,
} from "../../scripts/agent-workflow/verify-local.mjs";
import { sanitizedSubprocessEnvironment } from "../../scripts/agent-workflow/preflight.mjs";
import {
    cleanupFixture,
    command,
    commitPaths,
    git,
    runScript,
    setupFixture,
    write,
    writeJson,
} from "./workflow-test-helpers.mjs";

async function withFixture(options, callback) {
    const fixture = await setupFixture(options);
    try {
        await callback(fixture);
    } finally {
        cleanupFixture(fixture);
    }
}

function installPinnedOpenSpecFixture(root) {
    const integrity = `sha512-${Buffer.alloc(64, 7).toString("base64")}`;
    const lockEntry = {
        dependencies: {
            commander: "1.0.0",
            "nested-dependency": "1.0.0",
        },
        integrity,
        resolved: "https://registry.example.test/openspec-1.6.0.tgz",
        version: "1.6.0",
    };
    write(root, ".nvmrc", "22.22.0\n");
    writeJson(root, "package.json", {
        devDependencies: { "@fission-ai/openspec": "1.6.0" },
        engines: { node: "22.22.0" },
    });
    const commanderEntry = {
        integrity: `sha512-${Buffer.alloc(64, 6).toString("base64")}`,
        resolved: "https://registry.example.test/commander-1.0.0.tgz",
        version: "1.0.0",
    };
    const nestedEntry = {
        integrity: `sha512-${Buffer.alloc(64, 5).toString("base64")}`,
        resolved: "https://registry.example.test/nested-dependency-1.0.0.tgz",
        version: "1.0.0",
    };
    const installedPackages = {
        "node_modules/@fission-ai/openspec": lockEntry,
        "node_modules/@fission-ai/openspec/node_modules/nested-dependency": nestedEntry,
        "node_modules/commander": commanderEntry,
    };
    writeJson(root, "package-lock.json", {
        lockfileVersion: 3,
        packages: {
            "": {
                devDependencies: { "@fission-ai/openspec": "1.6.0" },
                engines: { node: "22.22.0" },
            },
            ...installedPackages,
        },
    });
    writeJson(root, "node_modules/.package-lock.json", {
        lockfileVersion: 3,
        packages: installedPackages,
    });
    writeJson(root, "node_modules/@fission-ai/openspec/package.json", {
        bin: { openspec: "bin/openspec.js" },
        dependencies: lockEntry.dependencies,
        name: "@fission-ai/openspec",
        version: "1.6.0",
    });
    write(root, "node_modules/@fission-ai/openspec/bin/openspec.js", "export {};\n");
    writeJson(root, "node_modules/commander/package.json", {
        name: "commander",
        version: "1.0.0",
    });
    write(root, "node_modules/commander/index.js", "export {};\n");
    writeJson(
        root,
        "node_modules/@fission-ai/openspec/node_modules/nested-dependency/package.json",
        {
            name: "nested-dependency",
            version: "1.0.0",
        },
    );
    write(
        root,
        "node_modules/@fission-ai/openspec/node_modules/nested-dependency/index.js",
        "export {};\n",
    );
    return { integrity, lockEntry };
}

function expectedInstallationIdentity(root) {
    const identity = inspectInstalledOpenSpecClosure(root);
    return {
        installedTreeSha256: identity.installedTreeSha256,
        lockGraphSha256: identity.lockGraphSha256,
        packageCount: identity.packageCount,
    };
}

test("repository verification rejects ambient Node injection and sanitizes children", () => {
    for (const key of [
        "NODE_OPTIONS",
        "NODE_PATH",
        "NPM_CONFIG_NODE_OPTIONS",
        "NODE_V8_COVERAGE",
        "node_compile_cache",
    ]) {
        assert.throws(
            () => assertNoAmbientNodeInjection({ [key]: "injected" }),
            /rejects ambient Node injection/iu,
        );
    }
    assert.doesNotThrow(() => assertNoAmbientNodeInjection({ npm_execpath: "ignored.mjs" }));
    const environment = sanitizedSubprocessEnvironment({
        NODE_OPTIONS: "--require injected.cjs",
        node_path: "injected-modules",
        npm_config_node_options: "--import injected.mjs",
        npm_execpath: "injected-npm-cli.mjs",
        node_compile_cache: "injected-compile-cache",
        NODE_V8_COVERAGE: "injected-coverage",
    });
    assert.equal(environment.NODE_OPTIONS, undefined);
    assert.equal(environment.node_path, undefined);
    assert.equal(environment.npm_config_node_options, undefined);
    assert.equal(environment.npm_execpath, undefined);
    assert.equal(environment.node_compile_cache, undefined);
    assert.equal(environment.NODE_V8_COVERAGE, undefined);
    assert.equal(environment.DO_NOT_TRACK, "1");
    assert.equal(environment.OPENSPEC_TELEMETRY, "0");
});

test("actual verifier rejects ambient late-exit Node writers before reporting pass", async (t) => {
    for (const key of ["NODE_V8_COVERAGE", "node_compile_cache"]) {
        await t.test(key, async () => {
            await withFixture({ protectedPaths: [".private"], userFile: false }, (fixture) => {
                const lateWriteRoot = resolve(fixture.root, ".private", key.toLowerCase());
                const verifierUrl = pathToFileURL(
                    resolve(fixture.root, "scripts/agent-workflow/verify-local.mjs"),
                ).href;
                const source = [
                    `import { runRepositoryVerification } from ${JSON.stringify(verifierUrl)};`,
                    "try {",
                    "  const result = runRepositoryVerification({ skipStaticChecks: true, steps: [] });",
                    "  console.log(`VERIFIER_PASS ${JSON.stringify(result)}`);",
                    "} catch (error) {",
                    "  console.error(`VERIFIER_REJECTED ${error.message}`);",
                    "  process.exitCode = 1;",
                    "}",
                ].join("\n");
                const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
                    cwd: fixture.root,
                    encoding: "utf8",
                    env: {
                        ...sanitizedSubprocessEnvironment(process.env),
                        [key]: lateWriteRoot,
                    },
                    shell: false,
                    windowsHide: true,
                });
                assert.notEqual(result.status, 0);
                assert.doesNotMatch(result.stdout, /VERIFIER_PASS/iu);
                assert.match(result.stderr, /rejects ambient Node injection/iu);
            });
        });
    }
});

test("command plan ignores an ambient npm_execpath", async () => {
    await withFixture({}, (fixture) => {
        const fakeNpm = resolve(fixture.root, "fake-npm-cli.mjs");
        write(fixture.root, "fake-npm-cli.mjs", "process.exit(0);\n");
        write(fixture.root, "test/agent-workflow/fixture.test.mjs", "export {};\n");
        const previous = process.env.npm_execpath;
        try {
            process.env.npm_execpath = fakeNpm;
            const plan = repositoryCommandPlan(fixture.root);
            const expectedNpm = bundledNpmCliPath();
            for (const label of ["backend verify", "frontend verify"]) {
                const step = plan.find((entry) => entry.label === label);
                assert.equal(step.arguments[0], expectedNpm);
                assert.notEqual(step.arguments[0], fakeNpm);
            }
        } finally {
            if (previous === undefined) {
                delete process.env.npm_execpath;
            } else {
                process.env.npm_execpath = previous;
            }
        }
    });
});

test("child execution removes a Node preload", () => {
    const root = mkdtempSync(resolve(tmpdir(), "media-sync-node-injection-"));
    try {
        const marker = resolve(root, "marker.txt");
        const preload = resolve(root, "preload.cjs");
        write(
            root,
            "preload.cjs",
            `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "x");\n`,
        );
        const result = runProcess(process.execPath, ["-e", "process.exit(0)"], {
            cwd: root,
            echo: false,
            env: { ...process.env, NODE_OPTIONS: `--require=${preload}` },
        });
        assert.equal(result.status, 0);
        assert.equal(existsSync(marker), false);
    } finally {
        rmSync(root, { force: true, recursive: true });
    }
});

test("workflow formatting paths retain LF under autocrlf checkouts", async () => {
    await withFixture({}, (fixture) => {
        assert.doesNotThrow(() => validateWorkflowLineEndings(fixture.root));
        const clone = mkdtempSync(resolve(tmpdir(), "media-sync-autocrlf-clone-"));
        try {
            rmSync(clone, { force: true, recursive: true });
            const cloned = command(fixture.root, "git", [
                "-c",
                "core.autocrlf=true",
                "clone",
                "--quiet",
                fixture.root,
                clone,
            ]);
            assert.equal(cloned.status, 0, cloned.stderr);
            const bytes = readFileSync(resolve(clone, "scripts/agent-workflow/preflight.mjs"));
            assert.equal(bytes.includes(Buffer.from("\r\n")), false);
            write(fixture.root, ".gitattributes", "* text=auto\n");
            assert.throws(
                () => validateWorkflowLineEndings(fixture.root),
                /lacks repository-owned LF normalization/iu,
            );
        } finally {
            rmSync(clone, { force: true, recursive: true });
        }
    });
});

test("state comparison detects tracked and pre-existing untracked mutation", async (t) => {
    await t.test("tracked file", async () => {
        await withFixture({}, (fixture) => {
            const before = captureRepositoryState(fixture.root);
            write(fixture.root, "README.md", "changed\n");
            const after = captureRepositoryState(fixture.root);
            assert.throws(
                () => assertRepositoryStateUnchanged(before, after),
                /changed tracked or user state: README.md/iu,
            );
        });
    });
    await t.test("pre-existing untracked file", async () => {
        await withFixture({}, (fixture) => {
            const before = captureRepositoryState(fixture.root);
            write(fixture.root, ".claude/settings.local.json", "changed user state\n");
            const after = captureRepositoryState(fixture.root);
            assert.throws(
                () => assertRepositoryStateUnchanged(before, after),
                /changed tracked or user state: \.claude\/settings\.local\.json/iu,
            );
        });
    });
    await t.test("raw index flags", async () => {
        await withFixture({}, (fixture) => {
            const before = captureRepositoryState(fixture.root);
            git(fixture.root, ["update-index", "--assume-unchanged", "README.md"]);
            const after = captureRepositoryState(fixture.root);
            assert.throws(
                () => assertRepositoryStateUnchanged(before, after),
                /changed repository HEAD, branch, or index state/iu,
            );
        });
    });
});

test("repository verification rejects a sub-gate that changes raw index flags", async () => {
    await withFixture({}, (fixture) => {
        assert.throws(
            () =>
                runRepositoryVerification({
                    root: fixture.root,
                    skipStaticChecks: true,
                    steps: [
                        {
                            arguments: ["update-index", "--skip-worktree", "README.md"],
                            cwd: fixture.root,
                            executable: "git",
                            label: "mutating raw index flags",
                        },
                    ],
                }),
            /changed repository HEAD, branch, or index state/iu,
        );
    });
});

test("state comparison preserves CRLF raw-byte identity", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, "README.md", "# fixture\r\nsecond line\r\n");
        commitPaths(fixture.root, ["README.md"], "store CRLF fixture");
        const before = captureRepositoryState(fixture.root);
        write(fixture.root, "README.md", "# fixture\nsecond line\n");
        const after = captureRepositoryState(fixture.root);
        assert.throws(
            () => assertRepositoryStateUnchanged(before, after),
            /changed tracked or user state: README.md/iu,
        );
    });
});

test("state comparison rejects newly created ignored personal state", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, ".gitignore", "/.agents/work/\n/.obsidian/\n");
        commitPaths(fixture.root, [".gitignore"], "ignore personal state");
        const before = captureRepositoryState(fixture.root);
        write(fixture.root, ".obsidian/workspace.json", "personal state\n");
        const after = captureRepositoryState(fixture.root);
        assert.throws(
            () => assertRepositoryStateUnchanged(before, after),
            /changed tracked or user state: \.obsidian\/workspace\.json/iu,
        );
    });
});

test("state comparison permits regenerated ignored build output", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, ".gitignore", "/.agents/work/\n/backend/dist/\n");
        commitPaths(fixture.root, [".gitignore"], "ignore generated output");
        write(fixture.root, "backend/dist/output.js", "old build\n");
        const before = captureRepositoryState(fixture.root);
        write(fixture.root, "backend/dist/output.js", "new build\n");
        const after = captureRepositoryState(fixture.root);
        assert.doesNotThrow(() => assertRepositoryStateUnchanged(before, after));
    });
});

test("repository verification protects ignored personal state outside generated roots", async () => {
    await withFixture({}, (fixture) => {
        write(
            fixture.root,
            ".gitignore",
            "/.agents/work/\n/.claude/\n/.obsidian/\n/backend/dist/\n",
        );
        commitPaths(fixture.root, [".gitignore"], "classify ignored state");
        write(fixture.root, ".obsidian/workspace.json", "personal state\n");
        write(fixture.root, "backend/dist/output.js", "old build\n");
        assert.throws(
            () =>
                runRepositoryVerification({
                    comparisonBase: fixture.baseSha,
                    root: fixture.root,
                    skipStaticChecks: true,
                    steps: [
                        {
                            arguments: [
                                "-e",
                                [
                                    "const fs = require('node:fs')",
                                    "fs.writeFileSync('.claude/settings.local.json', 'changed secret state\\n')",
                                    "fs.writeFileSync('.obsidian/workspace.json', 'changed personal state\\n')",
                                    "fs.writeFileSync('backend/dist/output.js', 'new build\\n')",
                                ].join(";"),
                            ],
                            cwd: fixture.root,
                            executable: process.execPath,
                            label: "mutating ignored fixture command",
                        },
                    ],
                }),
            /changed tracked or user state: \.claude\/settings\.local\.json, \.obsidian\/workspace\.json/iu,
        );
    });
});

test("repository verification reports a command that rewrites tracked source", async () => {
    await withFixture({}, (fixture) => {
        assert.throws(
            () =>
                runRepositoryVerification({
                    root: fixture.root,
                    skipStaticChecks: true,
                    steps: [
                        {
                            arguments: [
                                "-e",
                                "require('node:fs').writeFileSync('README.md', 'rewritten\\n')",
                            ],
                            cwd: fixture.root,
                            executable: process.execPath,
                            label: "mutating fixture command",
                        },
                    ],
                }),
            /changed tracked or user state: README.md/iu,
        );
    });
});

test("repository verification preserves a failed sub-gate and its mutation finding", async () => {
    await withFixture({}, (fixture) => {
        assert.throws(
            () =>
                runRepositoryVerification({
                    comparisonBase: fixture.baseSha,
                    root: fixture.root,
                    skipStaticChecks: true,
                    steps: [
                        {
                            arguments: [
                                "-e",
                                "require('node:fs').writeFileSync('README.md', 'rewritten\\n'); process.exit(7)",
                            ],
                            cwd: fixture.root,
                            executable: process.execPath,
                            label: "failing mutating fixture command",
                        },
                    ],
                }),
            /failing mutating fixture command failed with exit code 7[\s\S]*changed tracked or user state: README\.md/iu,
        );
    });
});

test("change verification captures state before checkpoint focused commands", async () => {
    await withFixture({}, (fixture) => {
        assert.throws(
            () =>
                runChangeVerification("test-change", {
                    changeValidator() {
                        write(fixture.root, "README.md", "changed by focused command\n");
                        throw new Error("Focused command fixture failed (9)");
                    },
                    root: fixture.root,
                    skipStaticChecks: true,
                    steps: [],
                }),
            /Focused command fixture failed \(9\)[\s\S]*changed tracked or user state: README\.md/iu,
        );
    });
});

test("change verification succeeds with an unchanged checkpoint and repository gate", async () => {
    await withFixture({}, (fixture) => {
        const verification = runChangeVerification("test-change", {
            changeValidator(changeId) {
                assert.equal(changeId, "test-change");
                return {
                    baseSha: fixture.baseSha,
                    fileOperations: {
                        additions: [],
                        deletions: [],
                        modifications: [],
                        renames: [],
                    },
                };
            },
            root: fixture.root,
            skipStaticChecks: true,
            steps: [],
        });
        assert.equal(verification.checkpoint.baseSha, fixture.baseSha);
        assert.deepEqual(verification.result, {
            stateEntries: captureRepositoryState(fixture.root).entries.length,
            steps: 0,
        });
    });
});

test("checkpoint temporal consistency rejects a report predating its work order", () => {
    assert.throws(
        () =>
            assertCheckpointTemporalConsistency(
                { issuedAt: "2026-07-31T12:00:00.000Z" },
                { recordedAt: "2026-07-31T11:59:59.999Z" },
            ),
        /Checkpoint predates its work order/iu,
    );
    assert.throws(
        () =>
            assertCheckpointTemporalConsistency(
                { issuedAt: "2026-07-31T12:00:00.000Z" },
                { recordedAt: "2026-02-30T12:00:00.000Z" },
            ),
        /Checkpoint predates its work order/iu,
    );
});

test("Markdown validation accepts real targets and rejects missing relative targets", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, "docs/target.md", "# Target\n");
        write(fixture.root, "docs/source.md", "[target](target.md)\n");
        commitPaths(fixture.root, ["docs/target.md", "docs/source.md"], "add valid links");
        assert.doesNotThrow(() => validateMarkdownLinks(fixture.root, { exceptions: new Map() }));
        write(fixture.root, "docs/source.md", "[missing](does-not-exist.md)\n");
        assert.throws(
            () => validateMarkdownLinks(fixture.root, { exceptions: new Map() }),
            /does-not-exist\.md \(missing target\)/iu,
        );
    });
});

test("schema-example validation rejects drift from tracked contracts", async () => {
    await withFixture({}, (fixture) => {
        assert.deepEqual(validateSchemaExamples(fixture.root), [
            "work-order",
            "review-report",
            "integration-report",
        ]);
        write(fixture.root, ".agents/templates/work-order.example.json", "{}\n");
        assert.throws(
            () => validateSchemaExamples(fixture.root),
            /missing required property schemaVersion/iu,
        );
    });
});

test("installed OpenSpec identity is tied to both lock inventories", async (t) => {
    await t.test("matching installed package", async () => {
        await withFixture({}, (fixture) => {
            const { integrity } = installPinnedOpenSpecFixture(fixture.root);
            const expectedIdentity = expectedInstallationIdentity(fixture.root);
            const identity = validatePinnedToolchain(fixture.root, {
                expectedInstallationIdentity: expectedIdentity,
            });
            assert.equal(identity.openspec, "1.6.0");
            assert.equal(identity.lockIntegrity, integrity);
            assert.equal(identity.packageCount, 3);
            assert.match(identity.installedCliSha256, /^[0-9a-f]{64}$/u);
        });
    });
    await t.test("tampered installed manifest", async () => {
        await withFixture({}, (fixture) => {
            installPinnedOpenSpecFixture(fixture.root);
            const expectedIdentity = expectedInstallationIdentity(fixture.root);
            writeJson(fixture.root, "node_modules/@fission-ai/openspec/package.json", {
                bin: { openspec: "bin/openspec.js" },
                name: "@fission-ai/openspec",
                version: "1.6.1",
            });
            assert.throws(
                () =>
                    validatePinnedToolchain(fixture.root, {
                        expectedInstallationIdentity: expectedIdentity,
                    }),
                /Installed OpenSpec package identity does not match package-lock\.json/iu,
            );
        });
    });
    await t.test("tampered installed integrity metadata", async () => {
        await withFixture({}, (fixture) => {
            const { lockEntry } = installPinnedOpenSpecFixture(fixture.root);
            const expectedIdentity = expectedInstallationIdentity(fixture.root);
            writeJson(fixture.root, "node_modules/.package-lock.json", {
                lockfileVersion: 3,
                packages: {
                    "node_modules/@fission-ai/openspec": {
                        ...lockEntry,
                        integrity: `sha512-${Buffer.alloc(64, 8).toString("base64")}`,
                    },
                },
            });
            assert.throws(
                () =>
                    validatePinnedToolchain(fixture.root, {
                        expectedInstallationIdentity: expectedIdentity,
                    }),
                /Installed OpenSpec package identity does not match package-lock\.json/iu,
            );
        });
    });
    await t.test("tampered installed CLI bytes", async () => {
        await withFixture({}, (fixture) => {
            installPinnedOpenSpecFixture(fixture.root);
            const expectedIdentity = expectedInstallationIdentity(fixture.root);
            write(
                fixture.root,
                "node_modules/@fission-ai/openspec/bin/openspec.js",
                "throw new Error('tampered');\n",
            );
            assert.throws(
                () =>
                    validatePinnedToolchain(fixture.root, {
                        expectedInstallationIdentity: expectedIdentity,
                    }),
                /Installed OpenSpec dependency closure does not match the pinned identity/iu,
            );
        });
    });
    await t.test("tampered transitive dependency bytes", async () => {
        await withFixture({}, (fixture) => {
            installPinnedOpenSpecFixture(fixture.root);
            const expectedIdentity = expectedInstallationIdentity(fixture.root);
            write(
                fixture.root,
                "node_modules/commander/index.js",
                "export const tampered = true;\n",
            );
            assert.throws(
                () =>
                    validatePinnedToolchain(fixture.root, {
                        expectedInstallationIdentity: expectedIdentity,
                    }),
                /Installed OpenSpec dependency closure does not match the pinned identity/iu,
            );
        });
    });
});

test("state comparison detects a dangling-link retarget", async () => {
    await withFixture({}, (fixture) => {
        const path = ".obsidian/state-link";
        const link = resolve(fixture.root, path);
        mkdirSync(resolve(fixture.root, ".obsidian"), { recursive: true });
        symlinkSync(resolve(fixture.root, "missing-one"), link, "junction");
        const before = captureRepositoryState(fixture.root);
        rmSync(link, { force: true });
        symlinkSync(resolve(fixture.root, "missing-two"), link, "junction");
        const after = captureRepositoryState(fixture.root);
        const beforeEntry = before.entries.find((entry) => entry.path === path);
        const afterIdentity = fileIdentity(fixture.root, path);
        assert.equal(beforeEntry.kind, "symbolic-link");
        assert.equal(afterIdentity.kind, "symbolic-link");
        assert.notEqual(afterIdentity.sha256, beforeEntry.sha256);
        assert.throws(
            () => assertRepositoryStateUnchanged(before, after),
            /changed tracked or user state: \.obsidian\/state-link/iu,
        );
    });
});

test("repository verification revalidates OpenSpec after earlier sub-gates", async () => {
    await withFixture({}, (fixture) => {
        installPinnedOpenSpecFixture(fixture.root);
        const expectedIdentity = expectedInstallationIdentity(fixture.root);
        assert.throws(
            () =>
                runRepositoryVerification({
                    comparisonBase: fixture.baseSha,
                    root: fixture.root,
                    steps: [
                        {
                            arguments: [
                                "-e",
                                [
                                    "require('node:fs').writeFileSync(",
                                    "'node_modules/commander/index.js',",
                                    "'throw new Error(\\\"tampered\\\")')",
                                ].join(""),
                            ],
                            cwd: fixture.root,
                            executable: process.execPath,
                            label: "tampering earlier sub-gate",
                        },
                        {
                            arguments: ["-e", "process.exit(0)"],
                            cwd: fixture.root,
                            executable: process.execPath,
                            label: "pinned OpenSpec validation",
                            revalidateToolchain: true,
                        },
                    ],
                    toolchainOptions: { expectedInstallationIdentity: expectedIdentity },
                }),
            /Installed OpenSpec dependency closure does not match the pinned identity/iu,
        );
    });
});

test("repository whitespace validation includes committed candidate changes", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, "docs/whitespace.md", "trailing whitespace \n");
        commitPaths(fixture.root, ["docs/whitespace.md"], "commit whitespace defect");
        assert.throws(
            () =>
                runRepositoryVerification({
                    comparisonBase: fixture.baseSha,
                    root: fixture.root,
                    skipStaticChecks: true,
                    steps: [],
                }),
            /git diff --check failed from/iu,
        );
    });
});

test("command plan discovers the complete workflow test set deterministically", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, "test/agent-workflow/zeta.test.mjs", "export {};\n");
        write(fixture.root, "test/agent-workflow/helper.mjs", "export {};\n");
        write(fixture.root, "test/agent-workflow/alpha.test.mjs", "export {};\n");
        assert.deepEqual(discoverWorkflowTests(fixture.root), [
            "test/agent-workflow/alpha.test.mjs",
            "test/agent-workflow/zeta.test.mjs",
        ]);
        assert.ok(
            discoverWorkflowFormattingPaths(fixture.root).includes(
                ".agents/templates/work-order.example.json",
            ),
        );
        assert.ok(
            discoverWorkflowFormattingPaths(fixture.root).includes(
                "scripts/agent-workflow/verify-local.mjs",
            ),
        );
        const plan = repositoryCommandPlan(fixture.root);
        assert.deepEqual(
            plan.map((step) => step.label),
            [
                "backend verify",
                "frontend verify",
                "root workflow formatting",
                "agent workflow tests",
                "pinned OpenSpec validation",
            ],
        );
        const workflow = plan.find((step) => step.label === "agent workflow tests");
        assert.deepEqual(workflow.arguments, [
            "--test",
            "test/agent-workflow/alpha.test.mjs",
            "test/agent-workflow/zeta.test.mjs",
        ]);
        const openspec = plan.find((step) => step.label === "pinned OpenSpec validation");
        assert.equal(openspec.revalidateToolchain, true);
        assert.equal(openspec.executable, process.execPath);
        assert.match(
            openspec.arguments[0].replaceAll("\\", "/"),
            /node_modules\/@fission-ai\/openspec\/bin\/openspec\.js$/u,
        );
        assert.deepEqual(openspec.arguments.slice(1), ["validate", "--all"]);
    });
});

test("change verification rejects a non-integration work order before repository commands", async () => {
    await withFixture({}, (fixture) => {
        const result = runScript(fixture, "verify-local.mjs", ["change", "test-change"]);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /requires an integration work order/iu);
    });
});
