import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
    readJson as readRepositoryJson,
    repositoryPathKey,
    validateJsonAgainstSchema,
    validateWorkOrder,
} from "../../scripts/agent-workflow/preflight.mjs";

import {
    cleanupFixture,
    command,
    commitPaths,
    git,
    readJson,
    runCheckpoint,
    runPreflight,
    setupFixture,
    updateWorkOrder,
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

function resolveArchivedFixtureChange(fixture) {
    return command(fixture.root, "node", [
        "--input-type=module",
        "--eval",
        "import { resolveArchivedChangeRootAtRevision } from './scripts/agent-workflow/preflight.mjs'; console.log(resolveArchivedChangeRootAtRevision('test-change'));",
    ]);
}

test("preflight records only hashes for protected pre-existing user state", async () => {
    const globalConfigRoot = mkdtempSync(resolve(tmpdir(), "media-sync-global-git-config-"));
    write(globalConfigRoot, "git/ignore", ".claude/\n");
    const previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = globalConfigRoot;
    try {
        await withFixture({}, (fixture) => {
            const result = runPreflight(fixture);
            assert.equal(result.status, 0, result.stderr);
            const baseline = readJson(fixture.root, ".agents/work/baseline.json");
            assert.equal(baseline.entries.length, 1);
            assert.equal(baseline.entries[0].path, ".claude/settings.local.json");
            assert.equal(baseline.entries[0].classification, "untracked");
            assert.equal(typeof baseline.entries[0].mode, "number");
            assert.equal(baseline.entries[0].size, "secret-local-state\n".length);
            assert.match(baseline.entries[0].sha256, /^[0-9a-f]{64}$/u);
            assert.equal(JSON.stringify(baseline).includes("secret-local-state"), false);
        });
    } finally {
        if (previousXdgConfigHome === undefined) {
            delete process.env.XDG_CONFIG_HOME;
        } else {
            process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
        }
        rmSync(globalConfigRoot, { force: true, recursive: true });
    }
});

test("archive resolution rejects residual and duplicate change roots without acceptance", async (t) => {
    const archiveFixture = (fixture) => {
        const activeRoot = "openspec/changes/test-change";
        const archiveRoot = "openspec/changes/archive/2026-07-31-test-change";
        mkdirSync(resolve(fixture.root, "openspec/changes/archive"), { recursive: true });
        git(fixture.root, ["mv", activeRoot, archiveRoot]);
        git(fixture.root, ["commit", "-m", "archive test change"]);
        return { activeRoot, archiveRoot };
    };

    await t.test("residual active root", async () => {
        await withFixture({}, (fixture) => {
            const { activeRoot } = archiveFixture(fixture);
            const residualPath = `${activeRoot}/leftover.md`;
            write(fixture.root, residualPath, "residual\n");
            commitPaths(fixture.root, [residualPath], "leave active residue");
            const result = resolveArchivedFixtureChange(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /still contains active change/iu);
        });
    });

    await t.test("duplicate dated root", async () => {
        await withFixture({}, (fixture) => {
            archiveFixture(fixture);
            const duplicatePath = "openspec/changes/archive/2026-08-01-test-change/leftover.md";
            write(fixture.root, duplicatePath, "duplicate\n");
            commitPaths(fixture.root, [duplicatePath], "add duplicate archive residue");
            const result = resolveArchivedFixtureChange(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Expected exactly one archived change root/iu);
        });
    });

    await t.test("exact active gitlink root", async () => {
        await withFixture({}, (fixture) => {
            const { activeRoot } = archiveFixture(fixture);
            const target = git(fixture.root, ["rev-parse", "HEAD"]);
            git(fixture.root, [
                "update-index",
                "--add",
                "--cacheinfo",
                `160000,${target},${activeRoot}`,
            ]);
            git(fixture.root, ["commit", "-m", "leave exact active gitlink"]);
            const result = resolveArchivedFixtureChange(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /still contains active change/iu);
        });
    });
});

test("preflight baselines ordinary and tracked protected-directory descendants", async (t) => {
    await t.test("ordinary untracked descendant", async () => {
        await withFixture(
            {
                protectedPaths: [".private"],
                userFile: false,
            },
            (fixture) => {
                write(fixture.root, ".private/existing.txt", "protected\n");
                const result = runPreflight(fixture);
                assert.equal(result.status, 0, result.stderr);
                const baseline = readJson(fixture.root, ".agents/work/baseline.json");
                assert.equal(baseline.entries[0].path, ".private");
                assert.equal(baseline.entries[0].classification, "untracked");
                assert.equal(baseline.entries[0].kind, "directory");
            },
        );
    });

    await t.test("tracked descendant", async () => {
        await withFixture(
            {
                baseFiles: { ".private/existing.txt": "protected\n" },
                protectedPaths: [".private"],
                userFile: false,
            },
            (fixture) => {
                const result = runPreflight(fixture);
                assert.equal(result.status, 0, result.stderr);
                const baseline = readJson(fixture.root, ".agents/work/baseline.json");
                assert.equal(baseline.entries[0].path, ".private");
                assert.equal(baseline.entries[0].classification, "tracked");
                assert.equal(baseline.entries[0].index.present, true);
                assert.equal(baseline.entries[0].index.entries[0].path, ".private/existing.txt");
            },
        );
    });
});

test("checkpoint rejects a protected file staged with unchanged bytes", async () => {
    await withFixture({}, (fixture) => {
        const preflight = runPreflight(fixture);
        assert.equal(preflight.status, 0, preflight.stderr);
        git(fixture.root, ["add", "-f", ".claude/settings.local.json"]);
        write(fixture.root, "src/new.txt", "expected\n");
        const checkpoint = runCheckpoint(fixture);
        assert.notEqual(checkpoint.status, 0);
        assert.match(checkpoint.stderr, /Protected pre-existing state changed/iu);
    });
});

test("preflight rejects master and detached HEAD", async () => {
    await withFixture({}, (fixture) => {
        git(fixture.root, ["branch", "-f", "master", fixture.baseSha]);
        git(fixture.root, ["checkout", "master"]);
        const master = runPreflight(fixture);
        assert.notEqual(master.status, 0);
        assert.match(master.stderr, /cannot run on master/iu);
        git(fixture.root, ["checkout", "--detach", fixture.baseSha]);
        const detached = runPreflight(fixture);
        assert.notEqual(detached.status, 0);
        assert.match(detached.stderr, /Detached HEAD/iu);
    });
});

test("preflight rejects missing and malformed work orders", async () => {
    await withFixture({}, (fixture) => {
        rmSync(`${fixture.root}/.agents/work/active-work-order.json`);
        const missing = runPreflight(fixture);
        assert.notEqual(missing.status, 0);
        assert.match(missing.stderr, /Work order is missing/iu);
        write(fixture.root, ".agents/work/active-work-order.json", "{not-json\n");
        const malformed = runPreflight(fixture);
        assert.notEqual(malformed.status, 0);
        assert.match(malformed.stderr, /Cannot parse JSON/iu);
    });
});

test("preflight rejects stale acceptance and invalid task IDs", async () => {
    await withFixture({}, (fixture) => {
        updateWorkOrder(fixture, { acceptedArtifactDigest: "0".repeat(64) });
        const stale = runPreflight(fixture);
        assert.notEqual(stale.status, 0);
        assert.match(stale.stderr, /digest is stale/iu);
        updateWorkOrder(fixture, {
            acceptedArtifactDigest: fixture.artifactDigest,
            taskIds: ["9.9"],
        });
        const task = runPreflight(fixture);
        assert.notEqual(task.status, 0);
        assert.match(task.stderr, /task does not exist/iu);
    });
});

test("preflight rejects retroactive, invalid, and untracked planning acceptance", async (t) => {
    await t.test("acceptance absent from work-order base", async () => {
        await withFixture({}, (fixture) => {
            updateWorkOrder(fixture, { baseSha: fixture.planningSha });
            const result = runPreflight(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Acceptance is not committed at the work-order base/iu);
        });
    });

    await t.test("invalid acceptance timestamp", async () => {
        await withFixture({}, (fixture) => {
            const path = "openspec/changes/test-change/acceptance.json";
            const acceptance = readJson(fixture.root, path);
            acceptance.acceptedAt = "not-a-timestamp";
            writeJson(fixture.root, path, acceptance);
            const result = runPreflight(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Acceptance record is invalid/iu);
        });
    });

    await t.test("work order predates acceptance", async () => {
        await withFixture({}, (fixture) => {
            updateWorkOrder(fixture, { issuedAt: "2026-07-30T23:59:59.000Z" });
            const result = runPreflight(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Work order predates accepted planning/iu);
        });
    });

    await t.test("descendant planning and acceptance rewrite", async () => {
        await withFixture({}, (fixture) => {
            write(
                fixture.root,
                "openspec/changes/test-change/proposal.md",
                "# Rewritten proposal\n",
            );
            commitPaths(
                fixture.root,
                ["openspec/changes/test-change/proposal.md"],
                "rewrite planning after acceptance",
            );
            const digestResult = command(fixture.root, "node", [
                "--input-type=module",
                "-e",
                "import { computeAcceptedArtifactDigest } from './scripts/agent-workflow/preflight.mjs'; console.log(computeAcceptedArtifactDigest('test-change'));",
            ]);
            assert.equal(digestResult.status, 0, digestResult.stderr);
            const rewrittenDigest = digestResult.stdout.trim();
            const acceptancePath = "openspec/changes/test-change/acceptance.json";
            const acceptance = readJson(fixture.root, acceptancePath);
            acceptance.artifactDigest = rewrittenDigest;
            writeJson(fixture.root, acceptancePath, acceptance);
            commitPaths(fixture.root, [acceptancePath], "rewrite acceptance after planning drift");
            updateWorkOrder(fixture, { acceptedArtifactDigest: rewrittenDigest });
            const result = runPreflight(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Acceptance record differs from the work-order base/iu);
        });
    });

    await t.test("untracked delta specification", async () => {
        await withFixture({}, (fixture) => {
            write(
                fixture.root,
                "openspec/changes/test-change/specs/unaccepted/spec.md",
                "## ADDED Requirements\n",
            );
            const result = runPreflight(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /planning artifacts contain untracked additions/iu);
        });
    });
});

test("preflight rejects unavailable base commits", async () => {
    await withFixture({}, (fixture) => {
        updateWorkOrder(fixture, { baseSha: "f".repeat(40) });
        const result = runPreflight(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /base commit is unavailable/iu);
    });
});

test("preflight rejects absolute, case-ambiguous, and conflicting paths", async () => {
    await withFixture({}, (fixture) => {
        updateWorkOrder(fixture, {
            allowedPaths: ["C:/escape.txt"],
            expectedAdditions: ["C:/escape.txt"],
        });
        assert.match(
            runPreflight(fixture).stderr,
            /does not match pattern|Invalid repository-relative POSIX path/iu,
        );
        updateWorkOrder(fixture, {
            allowedPaths: ["src/A.txt", "src/a.txt"],
            expectedAdditions: ["src/A.txt"],
        });
        assert.match(runPreflight(fixture).stderr, /case-ambiguous/iu);
        updateWorkOrder(fixture, {
            allowedPaths: ["src/new.txt"],
            expectedAdditions: ["src/new.txt"],
            protectedPaths: ["src/new.txt"],
        });
        assert.match(runPreflight(fixture).stderr, /Conflicting protected path/iu);
        updateWorkOrder(fixture, { protectedPaths: ["src"] });
        assert.match(runPreflight(fixture).stderr, /Conflicting protected path/iu);
    });
});

test("preflight rejects shell commands", async () => {
    for (const argv of [
        ["powershell", "-Command", "echo"],
        ["cmd.com", "/c", "echo"],
        ["tools/run.cmd"],
        ["tools/run.ps1"],
        ["env", "sh", "-c", "echo"],
        ["/usr/bin/env", "-S", "bash -c echo"],
        ["busybox", "sh", "-c", "echo"],
        ["busybox", "ash", "-c", "echo"],
        ["toybox", "bash", "-c", "echo"],
        ["npm", "exec", "--", "sh", "-c", "echo"],
        ["npx", "bash", "-c", "echo"],
        ["npx", "--call", "echo interpolated > escaped.txt"],
        ["env", "node", "--version"],
    ]) {
        await withFixture({}, (fixture) => {
            updateWorkOrder(fixture, {
                focusedCommands: [
                    {
                        commandId: "unsafe-shell",
                        cwd: ".",
                        argv,
                    },
                ],
            });
            const result = runPreflight(fixture);
            assert.notEqual(result.status, 0, argv.join(" "));
            assert.match(result.stderr, /uses (?:a shell executable|an indirect shell wrapper)/iu);
        });
    }
});

test("repository path keys use platform-specific case semantics", () => {
    assert.equal(repositoryPathKey("src/A.txt", "win32"), "src/a.txt");
    assert.equal(repositoryPathKey("src/A.txt", "linux"), "src/A.txt");
    assert.notEqual(
        repositoryPathKey("src/A.txt", "linux"),
        repositoryPathKey("src/a.txt", "linux"),
    );
});

test("preflight ignores hostile Git repository and configuration selectors", async () => {
    await withFixture({}, (fixture) => {
        const result = command(
            fixture.root,
            "node",
            [
                "scripts/agent-workflow/preflight.mjs",
                "--work-order",
                ".agents/work/active-work-order.json",
            ],
            {
                env: {
                    GIT_CONFIG_COUNT: "1",
                    GIT_CONFIG_KEY_0: "core.whitespace",
                    GIT_CONFIG_VALUE_0: "-trailing-space",
                    GIT_DIR: resolve(fixture.root, "missing-git-directory"),
                    GIT_INDEX_FILE: resolve(fixture.root, "missing-index"),
                },
            },
        );
        assert.equal(result.status, 0, result.stderr);
    });
});

test("preflight rejects an ignored forbidden path", async () => {
    await withFixture({ forbiddenPaths: [".private/state.json"] }, (fixture) => {
        write(fixture.root, ".git/info/exclude", "/.private/\n");
        write(fixture.root, ".private/state.json", "forbidden\n");
        const result = runPreflight(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /forbidden path/iu);
    });
});

test("preflight rejects a workflow-state junction before reading or writing outside", async () => {
    const fixture = await setupFixture();
    const outside = mkdtempSync(resolve(tmpdir(), "media-sync-agent-workflow-state-"));
    try {
        write(
            outside,
            "active-work-order.json",
            readFileSync(resolve(fixture.root, ".agents/work/active-work-order.json"), "utf8"),
        );
        rmSync(resolve(fixture.root, ".agents/work"), { force: true, recursive: true });
        symlinkSync(outside, resolve(fixture.root, ".agents/work"), "junction");
        const result = runPreflight(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /escapes repository/iu);
        assert.equal(existsSync(resolve(outside, "baseline.json")), false);
    } finally {
        cleanupFixture(fixture);
        rmSync(outside, { force: true, recursive: true });
    }
});

test("preflight rejects a workflow-state junction redirected inside the repository", async () => {
    const fixture = await setupFixture();
    const redirected = resolve(fixture.root, ".agents/redirected-work");
    try {
        write(
            fixture.root,
            ".agents/redirected-work/active-work-order.json",
            readFileSync(resolve(fixture.root, ".agents/work/active-work-order.json"), "utf8"),
        );
        rmSync(resolve(fixture.root, ".agents/work"), { force: true, recursive: true });
        symlinkSync(redirected, resolve(fixture.root, ".agents/work"), "junction");
        const result = runPreflight(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /escapes repository-owned \.agents\/work/iu);
        assert.equal(existsSync(resolve(redirected, "baseline.json")), false);
    } finally {
        cleanupFixture(fixture);
    }
});

test("preflight rejects unexplained untracked user files", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, "unexplained.txt", "user state\n");
        const result = runPreflight(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /unexplained pre-existing change/iu);
    });
});

test("integration preflight accepts declared integrated work while implementers reject it", async (t) => {
    await t.test("integration", async () => {
        await withFixture({ role: "integration" }, (fixture) => {
            write(fixture.root, "src/new.txt", "already integrated\n");
            commitPaths(fixture.root, ["src/new.txt"], "integrate declared work");
            const result = runPreflight(fixture);
            assert.equal(result.status, 0, result.stderr);
        });
    });
    await t.test("implementer", async () => {
        await withFixture({}, (fixture) => {
            write(fixture.root, "src/new.txt", "pre-existing implementation\n");
            commitPaths(fixture.root, ["src/new.txt"], "add pre-existing work");
            const result = runPreflight(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Assigned path contains pre-existing work/iu);
        });
    });
});

test("preflight permits task completion markers but rejects semantic task edits", async () => {
    await withFixture({}, (fixture) => {
        const tasksPath = resolve(fixture.root, "openspec/changes/test-change/tasks.md");
        const tasks = readFileSync(tasksPath, "utf8");
        write(
            fixture.root,
            "openspec/changes/test-change/tasks.md",
            tasks.replace("- [ ] 1.1", "- [x] 1.1"),
        );
        const checkboxOnly = runPreflight(fixture);
        assert.equal(checkboxOnly.status, 0, checkboxOnly.stderr);
        write(
            fixture.root,
            "openspec/changes/test-change/tasks.md",
            `${readFileSync(tasksPath, "utf8")}\nSemantic addition.\n`,
        );
        const semantic = runPreflight(fixture);
        assert.notEqual(semantic.status, 0);
        assert.match(semantic.stderr, /changes beyond completion markers/iu);
    });
});

test("tracked protocol examples satisfy their Draft 2020-12 schemas", () => {
    for (const name of ["work-order", "review-report", "integration-report"]) {
        const examplePath = resolve(".agents/templates", `${name}.example.json`);
        const schemaPath = resolve(".agents/templates", `${name}.schema.json`);
        assert.doesNotThrow(() =>
            validateJsonAgainstSchema(
                readRepositoryJson(examplePath),
                schemaPath,
                `${name} example`,
            ),
        );
    }
    assert.doesNotThrow(() =>
        validateWorkOrder(readRepositoryJson(resolve(".agents/templates/work-order.example.json"))),
    );
});
