import assert from "node:assert/strict";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    renameSync,
    rmSync,
    symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
    cleanupFixture,
    commitPaths,
    git,
    readJson,
    runCheckpoint,
    runPreflight,
    setupFixture,
    write,
    writeJson,
} from "./workflow-test-helpers.mjs";

async function withFixture(options, callback) {
    const fixture = await setupFixture(options);
    try {
        const preflight = runPreflight(fixture);
        assert.equal(preflight.status, 0, preflight.stderr);
        await callback(fixture);
    } finally {
        cleanupFixture(fixture);
    }
}

test("checkpoint accepts allowed untracked, staged, and committed additions", async (t) => {
    for (const state of ["untracked", "staged", "committed"]) {
        await t.test(state, async () => {
            await withFixture({}, (fixture) => {
                write(fixture.root, "src/new.txt", `${state}\n`);
                if (state !== "untracked") {
                    git(fixture.root, ["add", "src/new.txt"]);
                }
                if (state === "committed") {
                    commitPaths(fixture.root, ["src/new.txt"], "add expected file");
                }
                const result = runCheckpoint(fixture);
                assert.equal(result.status, 0, result.stderr);
                const report = readJson(fixture.root, ".agents/work/checkpoint.json");
                assert.deepEqual(report.fileOperations.additions, ["src/new.txt"]);
                assert.equal(report.commands[0].outcome, "pass");
            });
        });
    }
});

test("checkpoint accepts declared modifications and deletions", async (t) => {
    await t.test("modification", async () => {
        await withFixture(
            {
                baseFiles: { "src/existing.txt": "before\n" },
                allowedPaths: ["src/existing.txt"],
                expectedAdditions: [],
                expectedModifications: ["src/existing.txt"],
            },
            (fixture) => {
                write(fixture.root, "src/existing.txt", "after\n");
                const result = runCheckpoint(fixture);
                assert.equal(result.status, 0, result.stderr);
            },
        );
    });
    await t.test("deletion", async () => {
        await withFixture(
            {
                baseFiles: { "src/deleted.txt": "before\n" },
                allowedPaths: ["src/deleted.txt"],
                expectedAdditions: [],
                expectedDeletions: ["src/deleted.txt"],
            },
            (fixture) => {
                rmSync(resolve(fixture.root, "src/deleted.txt"));
                const result = runCheckpoint(fixture);
                assert.equal(result.status, 0, result.stderr);
            },
        );
    });
});

test("checkpoint promotes an explicitly declared worktree rename", async () => {
    await withFixture(
        {
            baseFiles: { "src/old.txt": "same content\n" },
            allowedPaths: ["src/old.txt", "src/new-name.txt"],
            expectedAdditions: [],
            expectedRenames: [{ from: "src/old.txt", to: "src/new-name.txt" }],
        },
        (fixture) => {
            renameSync(
                resolve(fixture.root, "src/old.txt"),
                resolve(fixture.root, "src/new-name.txt"),
            );
            const result = runCheckpoint(fixture);
            assert.equal(result.status, 0, result.stderr);
            const report = readJson(fixture.root, ".agents/work/checkpoint.json");
            assert.deepEqual(report.fileOperations.renames, [
                { from: "src/old.txt", to: "src/new-name.txt" },
            ]);
        },
    );
});

test("checkpoint checks whitespace in a promoted rename destination", async () => {
    await withFixture(
        {
            baseFiles: { "src/old.txt": "same content\n" },
            allowedPaths: ["src/old.txt", "src/new-name.txt"],
            expectedAdditions: [],
            expectedRenames: [{ from: "src/old.txt", to: "src/new-name.txt" }],
        },
        (fixture) => {
            renameSync(
                resolve(fixture.root, "src/old.txt"),
                resolve(fixture.root, "src/new-name.txt"),
            );
            write(fixture.root, "src/new-name.txt", "same content   \n");
            const result = runCheckpoint(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Trailing whitespace at src\/new-name\.txt/iu);
        },
    );
});

test("checkpoint rejects out-of-scope and undeclared operations", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, "other.txt", "outside\n");
        const result = runCheckpoint(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /outside allowedPaths/iu);
    });
});

test("checkpoint rejects protected user-state changes", async () => {
    await withFixture({}, (fixture) => {
        write(fixture.root, ".claude/settings.local.json", "changed secret state\n");
        write(fixture.root, "src/new.txt", "expected\n");
        const result = runCheckpoint(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Protected pre-existing state changed/iu);
    });
});

test("checkpoint binds protected directory descendants", async (t) => {
    const runCase = async (mutate, expectSuccess, options = {}) => {
        const fixture = await setupFixture({
            baseFiles: options.baseFiles,
            protectedPaths: [".private"],
            userFile: false,
        });
        try {
            if (options.ignore !== false) {
                write(fixture.root, ".git/info/exclude", "/.private/\n");
            }
            if (!options.baseFiles) {
                write(fixture.root, ".private/existing.txt", "protected\n");
            }
            const preflight = runPreflight(fixture);
            assert.equal(preflight.status, 0, preflight.stderr);
            mutate(fixture);
            write(fixture.root, "src/new.txt", "expected\n");
            const checkpoint = runCheckpoint(fixture);
            if (expectSuccess) {
                assert.equal(checkpoint.status, 0, checkpoint.stderr);
            } else {
                assert.notEqual(checkpoint.status, 0);
                assert.match(checkpoint.stderr, /Protected pre-existing state changed/iu);
            }
        } finally {
            cleanupFixture(fixture);
        }
    };

    await t.test("unchanged directory", () => runCase(() => {}, true));
    await t.test("unchanged ordinary untracked directory", () =>
        runCase(() => {}, true, { ignore: false }),
    );
    await t.test("unchanged tracked directory", () =>
        runCase(() => {}, true, {
            baseFiles: { ".private/existing.txt": "protected\n" },
            ignore: false,
        }),
    );
    await t.test("added ignored descendant", () =>
        runCase((fixture) => {
            write(fixture.root, ".private/created-after-preflight.txt", "changed\n");
        }, false),
    );
});

test("checkpoint binds mixed protected-directory Git classifications", async (t) => {
    await t.test("ordinary descendant becomes ignored with unchanged bytes", async () => {
        const fixture = await setupFixture({
            allowedPaths: [".gitignore", "src/new.txt"],
            baseFiles: { ".private/tracked.txt": "tracked\n" },
            expectedAdditions: ["src/new.txt"],
            expectedModifications: [".gitignore"],
            protectedPaths: [".private"],
            userFile: false,
        });
        try {
            write(fixture.root, ".private/ordinary.txt", "same bytes\n");
            assert.equal(runPreflight(fixture).status, 0);
            write(fixture.root, ".gitignore", "/.agents/work/\n/.private/ordinary.txt\n");
            write(fixture.root, "src/new.txt", "expected\n");
            const checkpoint = runCheckpoint(fixture);
            assert.notEqual(checkpoint.status, 0);
            assert.match(checkpoint.stderr, /Protected pre-existing state changed/iu);
        } finally {
            cleanupFixture(fixture);
        }
    });

    await t.test("ignored descendant becomes ordinary with unchanged bytes", async () => {
        const fixture = await setupFixture({
            baseFiles: { ".private/tracked.txt": "tracked\n" },
            protectedPaths: [".private"],
            userFile: false,
        });
        try {
            write(fixture.root, ".private/ignored.txt", "same bytes\n");
            write(fixture.root, ".git/info/exclude", "/.private/ignored.txt\n");
            assert.equal(runPreflight(fixture).status, 0);
            write(fixture.root, ".git/info/exclude", "");
            write(fixture.root, "src/new.txt", "expected\n");
            const checkpoint = runCheckpoint(fixture);
            assert.notEqual(checkpoint.status, 0);
            assert.match(checkpoint.stderr, /Protected pre-existing state changed/iu);
        } finally {
            cleanupFixture(fixture);
        }
    });

    await t.test("tracked descendant becomes untracked with unchanged bytes", async () => {
        const fixture = await setupFixture({
            baseFiles: {
                ".private/retained.txt": "tracked\n",
                ".private/untracked-later.txt": "same bytes\n",
            },
            protectedPaths: [".private"],
            userFile: false,
        });
        try {
            assert.equal(runPreflight(fixture).status, 0);
            git(fixture.root, ["rm", "--cached", "--", ".private/untracked-later.txt"]);
            write(fixture.root, "src/new.txt", "expected\n");
            const checkpoint = runCheckpoint(fixture);
            assert.notEqual(checkpoint.status, 0);
        } finally {
            cleanupFixture(fixture);
        }
    });
});

test("checkpoint binds missing ignored protected paths and exact baseline coverage", async (t) => {
    await t.test("missing path creation", async () => {
        const fixture = await setupFixture({
            protectedPaths: [".private/state.json"],
            userFile: false,
        });
        try {
            write(fixture.root, ".git/info/exclude", "/.private/\n");
            const preflight = runPreflight(fixture);
            assert.equal(preflight.status, 0, preflight.stderr);
            const baseline = readJson(fixture.root, ".agents/work/baseline.json");
            assert.equal(baseline.entries[0].classification, "ignored");
            assert.equal(baseline.entries[0].kind, "missing");
            write(fixture.root, ".private/state.json", "created later\n");
            write(fixture.root, "src/new.txt", "expected\n");
            const checkpoint = runCheckpoint(fixture);
            assert.notEqual(checkpoint.status, 0);
            assert.match(checkpoint.stderr, /Protected pre-existing state changed/iu);
        } finally {
            cleanupFixture(fixture);
        }
    });

    await t.test("omitted baseline entry", async () => {
        await withFixture({}, (fixture) => {
            const baseline = readJson(fixture.root, ".agents/work/baseline.json");
            baseline.entries = [];
            writeJson(fixture.root, ".agents/work/baseline.json", baseline);
            write(fixture.root, "src/new.txt", "expected\n");
            const checkpoint = runCheckpoint(fixture);
            assert.notEqual(checkpoint.status, 0);
            assert.match(checkpoint.stderr, /exactly cover protectedPaths/iu);
        });
    });
});

test("checkpoint rejects failed fixed commands and whitespace errors", async (t) => {
    await t.test("command", async () => {
        await withFixture(
            {
                focusedCommands: [
                    {
                        commandId: "focused-fail",
                        cwd: ".",
                        argv: ["node", "-e", "process.exit(7)"],
                    },
                    {
                        commandId: "must-not-run",
                        cwd: ".",
                        argv: [
                            "node",
                            "-e",
                            "require('node:fs').writeFileSync('must-not-run.txt', 'x')",
                        ],
                    },
                ],
            },
            (fixture) => {
                write(fixture.root, "src/new.txt", "expected\n");
                const result = runCheckpoint(fixture);
                assert.notEqual(result.status, 0);
                assert.match(result.stderr, /Focused command focused-fail failed/iu);
                const report = readJson(fixture.root, ".agents/work/checkpoint.json");
                assert.equal(report.commands.length, 1);
                assert.equal(report.commands[0].exitCode, 7);
                assert.equal(report.commands[0].outcome, "fail");
                assert.match(report.commands[0].stdoutSha256, /^[0-9a-f]{64}$/u);
                assert.match(report.commands[0].stderrSha256, /^[0-9a-f]{64}$/u);
                assert.equal(existsSync(resolve(fixture.root, "must-not-run.txt")), false);
            },
        );
    });
    await t.test("trailing whitespace", async () => {
        await withFixture({}, (fixture) => {
            write(fixture.root, "src/new.txt", "trailing   \n");
            const result = runCheckpoint(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /Trailing whitespace/iu);
        });
    });
});

test("checkpoint rejects focused commands that mutate repository state", async (t) => {
    for (const [name, source, error] of [
        [
            "out-of-scope addition",
            "require('node:fs').writeFileSync('unexpected.txt', 'x')",
            /outside allowedPaths|file-operation inventory/iu,
        ],
        [
            "declared-file rewrite",
            "require('node:fs').writeFileSync('src/new.txt', 'changed')",
            /Focused commands changed repository state/iu,
        ],
    ]) {
        await t.test(name, async () => {
            await withFixture(
                {
                    focusedCommands: [
                        {
                            commandId: "mutate-worktree",
                            cwd: ".",
                            argv: ["node", "-e", source],
                        },
                    ],
                },
                (fixture) => {
                    write(fixture.root, "src/new.txt", "expected\n");
                    const result = runCheckpoint(fixture);
                    assert.notEqual(result.status, 0);
                    assert.match(result.stderr, error);
                },
            );
        });
    }

    await t.test("failed command mutation", async () => {
        await withFixture(
            {
                focusedCommands: [
                    {
                        commandId: "failing-mutator",
                        cwd: ".",
                        argv: [
                            "node",
                            "-e",
                            "require('node:fs').writeFileSync('src/new.txt', 'changed'); process.exit(9)",
                        ],
                    },
                ],
            },
            (fixture) => {
                write(fixture.root, "src/new.txt", "expected\n");
                const result = runCheckpoint(fixture);
                assert.notEqual(result.status, 0);
                assert.match(
                    result.stderr,
                    /Focused command failing-mutator failed[\s\S]*Post-command integrity failed/iu,
                );
                const report = readJson(fixture.root, ".agents/work/checkpoint.json");
                assert.equal(report.commands[0].exitCode, 9);
                assert.equal(report.commands[0].outcome, "fail");
            },
        );
    });

    await t.test("raw index flags", async () => {
        await withFixture(
            {
                focusedCommands: [
                    {
                        commandId: "mutate-index-flags",
                        cwd: ".",
                        argv: ["git", "update-index", "--assume-unchanged", "README.md"],
                    },
                ],
            },
            (fixture) => {
                write(fixture.root, "src/new.txt", "expected\n");
                const result = runCheckpoint(fixture);
                assert.notEqual(result.status, 0);
                assert.match(result.stderr, /Focused commands changed repository state/iu);
            },
        );
    });
});

test("checkpoint fixes Git whitespace configuration", async () => {
    await withFixture(
        {
            baseFiles: { "src/existing.css": "clean\n" },
            allowedPaths: ["src/existing.css"],
            expectedAdditions: [],
            expectedModifications: ["src/existing.css"],
        },
        (fixture) => {
            git(fixture.root, ["config", "core.whitespace", "-trailing-space"]);
            write(fixture.root, "src/existing.css", "trailing   \n");
            const result = runCheckpoint(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /git diff --check failed/iu);
        },
    );
});

test("checkpoint rejects a workflow-state junction before writing outside", async () => {
    const fixture = await setupFixture();
    const outside = mkdtempSync(resolve(tmpdir(), "media-sync-agent-workflow-state-"));
    try {
        const preflight = runPreflight(fixture);
        assert.equal(preflight.status, 0, preflight.stderr);
        for (const name of ["active-work-order.json", "baseline.json"]) {
            write(outside, name, readFileSync(resolve(fixture.root, ".agents/work", name), "utf8"));
        }
        rmSync(resolve(fixture.root, ".agents/work"), {
            force: true,
            recursive: true,
        });
        symlinkSync(outside, resolve(fixture.root, ".agents/work"), "junction");
        write(fixture.root, "src/new.txt", "expected\n");
        const result = runCheckpoint(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /escapes repository/iu);
        assert.equal(existsSync(resolve(outside, "checkpoint.json")), false);
    } finally {
        cleanupFixture(fixture);
        rmSync(outside, { force: true, recursive: true });
    }
});

test("checkpoint detects a protected dangling-link retarget", async () => {
    const fixture = await setupFixture({
        protectedPaths: [".claude/state-link"],
        userFile: false,
    });
    const link = resolve(fixture.root, ".claude/state-link");
    try {
        mkdirSync(resolve(fixture.root, ".claude"), { recursive: true });
        symlinkSync(resolve(fixture.root, "missing-one"), link, "junction");
        const preflight = runPreflight(fixture);
        assert.equal(preflight.status, 0, preflight.stderr);
        rmSync(link, { force: true });
        symlinkSync(resolve(fixture.root, "missing-two"), link, "junction");
        write(fixture.root, "src/new.txt", "expected\n");
        const result = runCheckpoint(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Protected pre-existing state changed/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("checkpoint accepts an unchanged protected symbolic link", async () => {
    const fixture = await setupFixture({
        protectedPaths: [".claude/state-link"],
        userFile: false,
    });
    const link = resolve(fixture.root, ".claude/state-link");
    try {
        mkdirSync(resolve(fixture.root, ".claude"), { recursive: true });
        symlinkSync(resolve(fixture.root, "missing-one"), link, "junction");
        const preflight = runPreflight(fixture);
        assert.equal(preflight.status, 0, preflight.stderr);
        write(fixture.root, "src/new.txt", "expected\n");
        const checkpoint = runCheckpoint(fixture);
        assert.equal(checkpoint.status, 0, checkpoint.stderr);
    } finally {
        cleanupFixture(fixture);
    }
});

test("preflight rejects a dangling-link target beneath an external junction", async () => {
    const fixture = await setupFixture({
        protectedPaths: [".claude/state-link"],
        userFile: false,
    });
    const outside = mkdtempSync(resolve(tmpdir(), "media-sync-agent-workflow-external-"));
    try {
        mkdirSync(resolve(fixture.root, ".claude"), { recursive: true });
        symlinkSync(outside, resolve(fixture.root, "redirect"), "junction");
        symlinkSync(
            resolve(fixture.root, "redirect/missing"),
            resolve(fixture.root, ".claude/state-link"),
            "junction",
        );
        const result = runPreflight(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /escapes repository/iu);
    } finally {
        cleanupFixture(fixture);
        rmSync(outside, { force: true, recursive: true });
    }
});

test("preflight rejects a focused-command cwd that resolves outside through a junction", async () => {
    const fixture = await setupFixture({
        focusedCommands: [
            {
                commandId: "external-cwd",
                cwd: "linked",
                argv: ["node", "--version"],
            },
        ],
    });
    const outside = mkdtempSync(resolve(tmpdir(), "media-sync-agent-workflow-external-"));
    try {
        symlinkSync(outside, resolve(fixture.root, "linked"), "junction");
        const result = runPreflight(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /escapes repository/iu);
    } finally {
        cleanupFixture(fixture);
        rmSync(outside, { force: true, recursive: true });
    }
});

test("preflight rejects a required document that resolves outside through a junction", async () => {
    const fixture = await setupFixture({
        requiredDocuments: [
            "openspec/changes/test-change/proposal.md",
            "openspec/changes/test-change/design.md",
            "openspec/changes/test-change/specs/test-capability/spec.md",
            "openspec/changes/test-change/tasks.md",
            "linked/document.md",
        ],
    });
    const outside = mkdtempSync(resolve(tmpdir(), "media-sync-agent-workflow-external-"));
    try {
        write(outside, "document.md", "# External\n");
        symlinkSync(outside, resolve(fixture.root, "linked"), "junction");
        const result = runPreflight(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /escapes repository/iu);
    } finally {
        cleanupFixture(fixture);
        rmSync(outside, { force: true, recursive: true });
    }
});

test("checkpoint rejects a changed path that resolves outside through a junction", async () => {
    await withFixture(
        {
            allowedPaths: ["linked/new.txt"],
            expectedAdditions: ["linked/new.txt"],
        },
        (fixture) => {
            const outside = mkdtempSync(resolve(tmpdir(), "media-sync-agent-workflow-external-"));
            try {
                symlinkSync(outside, resolve(fixture.root, "linked"), "junction");
            } catch (error) {
                rmSync(outside, { force: true, recursive: true });
                assert.fail(`junction creation failed: ${error.code ?? error.message}`);
            }
            try {
                write(fixture.root, "linked/new.txt", "escape\n");
                const result = runCheckpoint(fixture);
                assert.notEqual(result.status, 0);
                assert.match(result.stderr, /escapes repository/iu);
            } finally {
                rmSync(outside, { force: true, recursive: true });
            }
        },
    );
});

test("checkpoint rejects case-ambiguous paths already present in the Git index", async () => {
    await withFixture({}, (fixture) => {
        const emptyBlob = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
        git(fixture.root, ["update-index", "--add", "--cacheinfo", `100644,${emptyBlob},Case.txt`]);
        git(fixture.root, ["update-index", "--add", "--cacheinfo", `100644,${emptyBlob},case.txt`]);
        const result = runCheckpoint(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Case-ambiguous repository paths/iu);
    });
});

test("checkpoint permits coordinator task completion markers after preflight", async () => {
    await withFixture({}, (fixture) => {
        const tasksPath = "openspec/changes/test-change/tasks.md";
        const tasks = readFileSync(resolve(fixture.root, tasksPath), "utf8");
        write(fixture.root, tasksPath, tasks.replace("- [ ] 1.1", "- [x] 1.1"));
        write(fixture.root, "src/new.txt", "expected\n");
        const result = runCheckpoint(fixture);
        assert.equal(result.status, 0, result.stderr);
        const report = readJson(fixture.root, ".agents/work/checkpoint.json");
        assert.deepEqual(report.fileOperations.additions, ["src/new.txt"]);
    });
});

test("integration checkpoint includes committed task-marker state in its inventory", async () => {
    const tasksPath = "openspec/changes/test-change/tasks.md";
    await withFixture(
        {
            role: "integration",
            allowedPaths: ["src/new.txt", tasksPath],
            expectedAdditions: ["src/new.txt"],
            expectedModifications: [tasksPath],
        },
        (fixture) => {
            const tasks = readFileSync(resolve(fixture.root, tasksPath), "utf8");
            write(fixture.root, tasksPath, tasks.replace("- [ ] 1.1", "- [x] 1.1"));
            write(fixture.root, "src/new.txt", "expected\n");
            const result = runCheckpoint(fixture);
            assert.equal(result.status, 0, result.stderr);
            const report = readJson(fixture.root, ".agents/work/checkpoint.json");
            assert.deepEqual(report.fileOperations.additions, ["src/new.txt"]);
            assert.deepEqual(report.fileOperations.modifications, [tasksPath]);
        },
    );
});
