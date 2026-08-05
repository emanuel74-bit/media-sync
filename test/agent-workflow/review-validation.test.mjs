import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { digestJson } from "../../scripts/agent-workflow/preflight.mjs";

import {
    cleanupFixture,
    command,
    commitPaths,
    git,
    readJson,
    runCheckpoint,
    runPreflight,
    runScript,
    setupFixture,
    updateWorkOrder,
    write,
    writeJson,
} from "./workflow-test-helpers.mjs";

const emptyDigest = createHash("sha256").update("").digest("hex");

function timestampAfter(timestamp, milliseconds = 1_000) {
    return new Date(Date.parse(timestamp) + milliseconds).toISOString();
}

function requiredChecksFromCheckpoint(checkpoint) {
    return checkpoint.commands.map((command) => ({
        checkId: command.commandId,
        outcome: command.outcome,
        result: {
            cwd: command.cwd,
            executable: command.executable,
            arguments: command.arguments,
            exitCode: command.exitCode,
            stdoutSha256: command.stdoutSha256,
            stderrSha256: command.stderrSha256,
        },
        evidence: ["The exact ordered checkpoint command passed."],
    }));
}

function fixtureInventory(root, baseSha, subjectSha) {
    const fields = command(root, "git", [
        "-c",
        `safe.directory=${root.replaceAll("\\", "/")}`,
        "diff",
        "--name-status",
        "-z",
        "--find-renames",
        baseSha,
        subjectSha,
    ]).stdout.split("\0");
    const inventory = {
        additions: [],
        modifications: [],
        deletions: [],
        renames: [],
    };
    for (let index = 0; index < fields.length && fields[index]; ) {
        const status = fields[index++];
        if (status.startsWith("R")) {
            inventory.renames.push({ from: fields[index++], to: fields[index++] });
        } else {
            const path = fields[index++];
            if (status === "A") inventory.additions.push(path);
            else if (status === "M") inventory.modifications.push(path);
            else if (status === "D") inventory.deletions.push(path);
            else assert.fail(`Unexpected fixture status ${status}`);
        }
    }
    for (const key of ["additions", "modifications", "deletions"]) {
        inventory[key].sort();
    }
    inventory.renames.sort((left, right) => left.from.localeCompare(right.from));
    return inventory;
}

function fixtureCommitShas(root, baseSha, subjectSha) {
    return git(root, ["rev-list", "--reverse", "--first-parent", `${baseSha}..${subjectSha}`])
        .split(/\r?\n/u)
        .filter(Boolean);
}

async function createReviewedFixture(options = {}) {
    const fixture = await setupFixture({
        baseFiles: { "src/subject.txt": "before\n", ...options.baseFiles },
        allowedPaths: ["src/subject.txt"],
        conventionIds: options.conventionIds,
        expectedAdditions: [],
        expectedModifications: ["src/subject.txt"],
        protectedPaths: options.protectedPaths,
        specContent: options.specContent,
        userFile: options.userFile,
    });
    options.beforePreflight?.(fixture);
    const preflight = runPreflight(fixture);
    assert.equal(preflight.status, 0, preflight.stderr);
    write(fixture.root, "src/subject.txt", "after\n");
    const subjectSha = commitPaths(fixture.root, ["src/subject.txt"], "modify reviewed subject");
    const checkpoint = runCheckpoint(fixture);
    assert.equal(checkpoint.status, 0, checkpoint.stderr);
    const checkpointReport = readJson(fixture.root, ".agents/work/checkpoint.json");
    const subjectTreeSha = git(fixture.root, ["rev-parse", `${subjectSha}^{tree}`]);
    const rawDiff = command(fixture.root, "git", [
        "-c",
        `safe.directory=${fixture.root.replaceAll("\\", "/")}`,
        "diff",
        "--binary",
        "--full-index",
        "--no-ext-diff",
        "--no-textconv",
        "--find-renames=50%",
        "--diff-algorithm=default",
        "--no-indent-heuristic",
        fixture.baseSha,
        subjectSha,
    ]).stdout;
    const rawDiffSha256 = createHash("sha256").update(rawDiff).digest("hex");
    const report = {
        schemaVersion: 1,
        reportKind: "implementation-review",
        reportId: "fixture-review",
        changeId: "test-change",
        reviewer: {
            reviewerId: "fresh-reviewer",
            role: "fresh-implementation-reviewer",
            reviewedAt: timestampAfter(checkpointReport.recordedAt),
        },
        workOrder: {
            workOrderId: fixture.workOrder.workOrderId,
            workOrderDigest: checkpointReport.workOrderDigest,
        },
        acceptedArtifactDigest: fixture.artifactDigest,
        git: {
            baseSha: fixture.baseSha,
            subjectSha,
            subjectTreeSha,
            rawDiffSha256,
        },
        scenarioMatrix: [
            {
                requirement: "Exact review",
                scenario: "Passing candidate",
                status: "pass",
                evidence: ["Fixture identities recomputed."],
            },
        ],
        conventionMatrix: [
            {
                conventionId: "TOOL-09",
                status: "pass",
                evidence: ["Fixture validation passed."],
            },
        ],
        fileOperations: {
            additions: [],
            modifications: ["src/subject.txt"],
            deletions: [],
            renames: [],
        },
        commands: checkpointReport.commands,
        findings: [],
        verdict: "pass",
        acceptedRisks: [],
    };
    writeJson(fixture.root, ".agents/work/review-report.json", report);
    return { fixture, report };
}

function validate(fixture) {
    return runScript(fixture, "validate-review.mjs", [
        "--report",
        ".agents/work/review-report.json",
    ]);
}

test("review validation accepts an exact passing commit, tree, diff, inventory, and matrices", async () => {
    const { fixture } = await createReviewedFixture();
    try {
        const result = validate(fixture);
        assert.equal(result.status, 0, result.stderr);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation accepts unchanged protected-directory descendants", async () => {
    const { fixture } = await createReviewedFixture({
        beforePreflight: (currentFixture) => {
            write(currentFixture.root, ".private/existing.txt", "protected\n");
        },
        protectedPaths: [".private"],
        userFile: false,
    });
    try {
        const result = validate(fixture);
        assert.equal(result.status, 0, result.stderr);
    } finally {
        cleanupFixture(fixture);
    }
});

test("implementation review rejects mixed protected descendant classification drift", async () => {
    const { fixture } = await createReviewedFixture({
        baseFiles: { ".private/tracked.txt": "tracked\n" },
        beforePreflight: (currentFixture) => {
            write(currentFixture.root, ".private/ordinary.txt", "same bytes\n");
        },
        protectedPaths: [".private"],
        userFile: false,
    });
    try {
        write(fixture.root, ".git/info/exclude", "/.private/ordinary.txt\n");
        const result = validate(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Protected pre-existing state changed/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review raw-diff identity is invariant to core.abbrev", async () => {
    const { fixture, report } = await createReviewedFixture();
    try {
        git(fixture.root, ["config", "core.abbrev", "12"]);
        const valid = validate(fixture);
        assert.equal(valid.status, 0, valid.stderr);
        const abbreviatedDiff = command(fixture.root, "git", [
            "-c",
            `safe.directory=${fixture.root.replaceAll("\\", "/")}`,
            "diff",
            "--binary",
            "--no-ext-diff",
            fixture.baseSha,
            report.git.subjectSha,
        ]).stdout;
        report.git.rawDiffSha256 = createHash("sha256").update(abbreviatedDiff).digest("hex");
        writeJson(fixture.root, ".agents/work/review-report.json", report);
        const stale = validate(fixture);
        assert.notEqual(stale.status, 0);
        assert.match(stale.stderr, /raw diff digest is stale/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation rejects incomplete scenario and convention matrices", async (t) => {
    await t.test("scenario matrix", async () => {
        const { fixture } = await createReviewedFixture({
            specContent: [
                "## ADDED Requirements",
                "",
                "### Requirement: Exact review",
                "The tool MUST validate.",
                "",
                "#### Scenario: Passing candidate",
                "- **WHEN** review runs",
                "- **THEN** it passes",
                "",
                "#### Scenario: Changed candidate",
                "- **WHEN** review is stale",
                "- **THEN** it fails",
                "",
            ].join("\n"),
        });
        try {
            const result = validate(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /scenarioMatrix does not exactly cover/iu);
        } finally {
            cleanupFixture(fixture);
        }
    });

    await t.test("convention matrix", async () => {
        const { fixture } = await createReviewedFixture({
            conventionIds: ["TOOL-09", "TEST-08"],
        });
        try {
            const result = validate(fixture);
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /conventionMatrix does not exactly cover/iu);
        } finally {
            cleanupFixture(fixture);
        }
    });
});

test("review validation rejects command evidence that differs from the checkpoint", async () => {
    const { fixture, report } = await createReviewedFixture();
    try {
        report.commands[0].stdoutSha256 = "0".repeat(64);
        writeJson(fixture.root, ".agents/work/review-report.json", report);
        const result = validate(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /checkpoint is stale or does not match/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation rejects stale work-order, tree, and raw-diff digests", async (t) => {
    for (const [name, mutate, pattern] of [
        [
            "work order",
            (report) => (report.workOrder.workOrderDigest = "0".repeat(64)),
            /work-order digest is stale/iu,
        ],
        ["tree", (report) => (report.git.subjectTreeSha = "0".repeat(40)), /tree SHA is stale/iu],
        [
            "raw diff",
            (report) => (report.git.rawDiffSha256 = "0".repeat(64)),
            /raw diff digest is stale/iu,
        ],
    ]) {
        await t.test(name, async () => {
            const { fixture, report } = await createReviewedFixture();
            try {
                mutate(report);
                writeJson(fixture.root, ".agents/work/review-report.json", report);
                const result = validate(fixture);
                assert.notEqual(result.status, 0);
                assert.match(result.stderr, pattern);
            } finally {
                cleanupFixture(fixture);
            }
        });
    }
});

test("review validation rejects a stale current implementation", async () => {
    const { fixture } = await createReviewedFixture();
    try {
        git(fixture.root, ["commit", "--allow-empty", "-m", "advance head"]);
        const result = validate(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Current implementation differs/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation rejects invalid and temporally stale review timestamps", async () => {
    const { fixture, report } = await createReviewedFixture();
    try {
        const checkpoint = readJson(fixture.root, ".agents/work/checkpoint.json");
        const originalRecordedAt = checkpoint.recordedAt;
        checkpoint.recordedAt = "2026-02-30T00:00:00.000Z";
        writeJson(fixture.root, ".agents/work/checkpoint.json", checkpoint);
        const invalid = validate(fixture);
        assert.notEqual(invalid.status, 0);
        assert.match(invalid.stderr, /Review checkpoint is stale/iu);

        checkpoint.recordedAt = "2020-01-01T00:00:00.000Z";
        writeJson(fixture.root, ".agents/work/checkpoint.json", checkpoint);
        const predatesWorkOrder = validate(fixture);
        assert.notEqual(predatesWorkOrder.status, 0);
        assert.match(predatesWorkOrder.stderr, /Review checkpoint is stale/iu);

        checkpoint.recordedAt = originalRecordedAt;
        writeJson(fixture.root, ".agents/work/checkpoint.json", checkpoint);
        report.reviewer.reviewedAt = "2020-01-01T00:00:00.000Z";
        writeJson(fixture.root, ".agents/work/review-report.json", report);
        const predatesCheckpoint = validate(fixture);
        assert.notEqual(predatesCheckpoint.status, 0);
        assert.match(predatesCheckpoint.stderr, /Review checkpoint is stale/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation rejects post-review task completion markers", async () => {
    const { fixture } = await createReviewedFixture();
    try {
        const tasksPath = "openspec/changes/test-change/tasks.md";
        const tasks = readFileSync(resolve(fixture.root, tasksPath), "utf8");
        write(fixture.root, tasksPath, tasks.replace("- [ ] 1.1", "- [x] 1.1"));
        const result = validate(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Current worktree differs from the reviewed subject/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation rejects forged baseline exclusions", async () => {
    const { fixture } = await createReviewedFixture();
    try {
        const baseline = readJson(fixture.root, ".agents/work/baseline.json");
        baseline.entries.push({ path: "src/hidden-after-review.txt" });
        writeJson(fixture.root, ".agents/work/baseline.json", baseline);
        write(fixture.root, "src/hidden-after-review.txt", "hidden\n");
        const result = validate(fixture);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /exactly cover protectedPaths/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation blocks changes-required and unaccepted risks", async (t) => {
    await t.test("changes required", async () => {
        const { fixture, report } = await createReviewedFixture();
        try {
            report.verdict = "changes-required";
            report.findings = [
                {
                    findingId: "finding-one",
                    severity: "major",
                    status: "open",
                    title: "Fixture issue",
                    description: "The fixture has an issue.",
                    evidence: [
                        {
                            path: "src/subject.txt",
                            lineStart: 1,
                            lineEnd: 1,
                            detail: "Evidence.",
                        },
                    ],
                },
            ];
            writeJson(fixture.root, ".agents/work/review-report.json", report);
            assert.match(validate(fixture).stderr, /verdict is blocking/iu);
        } finally {
            cleanupFixture(fixture);
        }
    });
    await t.test("unaccepted risk", async () => {
        const { fixture, report } = await createReviewedFixture();
        try {
            report.verdict = "pass-with-accepted-risks";
            report.findings = [
                {
                    findingId: "risk-finding",
                    severity: "minor",
                    status: "accepted-risk",
                    title: "Fixture risk",
                    description: "A bounded fixture risk.",
                    evidence: [
                        {
                            path: "src/subject.txt",
                            lineStart: 1,
                            lineEnd: 1,
                            detail: "Evidence.",
                        },
                    ],
                },
            ];
            writeJson(fixture.root, ".agents/work/review-report.json", report);
            assert.match(
                validate(fixture).stderr,
                /has fewer than 1 items|requires explicit risk acceptance/iu,
            );
        } finally {
            cleanupFixture(fixture);
        }
    });
});

test("review validation accepts explicit coordinator risk metadata", async () => {
    const { fixture, report } = await createReviewedFixture();
    try {
        report.verdict = "pass-with-accepted-risks";
        report.findings = [
            {
                findingId: "risk-finding",
                severity: "minor",
                status: "accepted-risk",
                title: "Fixture risk",
                description: "A bounded fixture risk.",
                evidence: [
                    {
                        path: "src/subject.txt",
                        lineStart: 1,
                        lineEnd: 1,
                        detail: "Evidence.",
                    },
                ],
            },
        ];
        report.acceptedRisks = [
            {
                riskId: "accepted-fixture-risk",
                findingId: "risk-finding",
                coordinatorId: "test-coordinator",
                acceptedAt: timestampAfter(report.reviewer.reviewedAt),
                rationale: "The fixture demonstrates explicit acceptance.",
                followUpDisposition: "No product follow-up is required.",
            },
        ];
        writeJson(fixture.root, ".agents/work/review-report.json", report);
        const result = validate(fixture);
        assert.equal(result.status, 0, result.stderr);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation rejects a final integration candidate that remains active", async () => {
    const fixture = await setupFixture({
        role: "integration",
        baseFiles: { "src/integration.txt": "before\n" },
        allowedPaths: ["src/integration.txt"],
        expectedAdditions: [],
        expectedModifications: ["src/integration.txt"],
    });
    try {
        assert.equal(runPreflight(fixture).status, 0);
        write(fixture.root, "src/integration.txt", "after\n");
        const candidateSha = commitPaths(
            fixture.root,
            ["src/integration.txt"],
            "archive candidate",
        );
        assert.equal(runCheckpoint(fixture).status, 0);
        const checkpoint = readJson(fixture.root, ".agents/work/checkpoint.json");
        const candidateTreeSha = git(fixture.root, ["rev-parse", `${candidateSha}^{tree}`]);
        const rawDiff = command(fixture.root, "git", [
            "-c",
            `safe.directory=${fixture.root.replaceAll("\\", "/")}`,
            "diff",
            "--binary",
            "--full-index",
            "--no-ext-diff",
            "--no-textconv",
            "--find-renames=50%",
            "--diff-algorithm=default",
            "--no-indent-heuristic",
            fixture.baseSha,
            candidateSha,
        ]).stdout;
        const rawDiffSha256 = createHash("sha256").update(rawDiff).digest("hex");
        const reviewedAt = timestampAfter(checkpoint.recordedAt);
        const report = {
            schemaVersion: 1,
            reportKind: "final-integration-review",
            reportId: "fixture-integration-review",
            changeId: "test-change",
            reviewer: {
                reviewerId: "fresh-integration-reviewer",
                role: "fresh-integration-reviewer",
                reviewedAt,
            },
            workOrder: {
                workOrderId: fixture.workOrder.workOrderId,
                workOrderDigest: checkpoint.workOrderDigest,
            },
            acceptedArtifactDigest: fixture.artifactDigest,
            git: {
                baselineSha: fixture.baseSha,
                reviewedImplementationSha: candidateSha,
                finalArchiveSha: candidateSha,
                candidateSha,
                candidateTreeSha,
                rawDiffSha256,
            },
            scenarioMatrix: [
                {
                    requirement: "Final integration",
                    scenario: "Exact candidate",
                    status: "pass",
                    evidence: ["Candidate identity recomputed."],
                },
            ],
            conventionMatrix: [
                {
                    conventionId: "TOOL-09",
                    status: "pass",
                    evidence: ["Fixture gate passed."],
                },
            ],
            expectedCommits: [{ sequence: 1, sha: candidateSha, description: "Candidate." }],
            orderedIntegrations: [
                {
                    sequence: 1,
                    integrationId: "fixture-integration",
                    expectedCommitSha: candidateSha,
                    workOrderId: fixture.workOrder.workOrderId,
                    workOrderDigest: checkpoint.workOrderDigest,
                    sourceSubjectSha: candidateSha,
                    sourceTreeSha: candidateTreeSha,
                    fileOperations: checkpoint.fileOperations,
                },
            ],
            fileOperations: checkpoint.fileOperations,
            commands: checkpoint.commands,
            requiredChecks: [
                {
                    checkId: "fixture-check",
                    outcome: "pass",
                    result: {
                        cwd: ".",
                        executable: "node",
                        arguments: ["--version"],
                        exitCode: 0,
                        stdoutSha256: emptyDigest,
                        stderrSha256: emptyDigest,
                    },
                    evidence: ["Fixture check passed."],
                },
            ],
            reviewReferences: [
                {
                    reportId: "fixture-review",
                    reportSha256: emptyDigest,
                    workOrderDigest: checkpoint.workOrderDigest,
                    subjectSha: candidateSha,
                    subjectTreeSha: candidateTreeSha,
                    verdict: "pass",
                    evidencePath: `openspec/changes/test-change/evidence/${candidateSha}/review-report.json`,
                },
            ],
            evidenceReferences: [
                {
                    kind: "review-report",
                    path: `openspec/changes/test-change/evidence/${candidateSha}/review-report.json`,
                    sha256: emptyDigest,
                    subjectSha: candidateSha,
                },
            ],
            evidenceOnlyCommitValidation: {
                commitSha: candidateSha,
                parentSha: candidateSha,
                expectedEvidencePaths: [
                    `openspec/changes/test-change/evidence/${candidateSha}/review-report.json`,
                ],
                fileOperations: {
                    additions: [],
                    modifications: [],
                    deletions: [],
                    renames: [],
                },
                validatorResult: {
                    cwd: ".",
                    executable: "node",
                    arguments: [],
                    exitCode: 0,
                    stdoutSha256: emptyDigest,
                    stderrSha256: emptyDigest,
                },
                outcome: "pass",
            },
            findings: [],
            finalVerdict: "pass",
            acceptedRisks: [],
            mergeEligibility: {
                eligible: true,
                method: "ff-only",
                expectedMasterSha: fixture.baselineSha,
                candidateSha,
                checkedAt: timestampAfter(reviewedAt),
                blockers: [],
            },
        };
        writeJson(fixture.root, ".agents/work/integration-report.json", report);
        const valid = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(valid.status, 0);
        assert.match(valid.stderr, /still contains active change/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("review validation resolves archived evidence and the full accepted-baseline delta", async () => {
    const fixture = await setupFixture({
        baseFiles: {
            ".private/tracked.txt": "tracked\n",
            "src/integration.txt": "before\n",
        },
        allowedPaths: ["src/integration.txt"],
        expectedAdditions: [],
        expectedModifications: ["src/integration.txt"],
        protectedPaths: [".private"],
        userFile: false,
    });
    try {
        write(fixture.root, ".private/ordinary.txt", "same bytes\n");
        assert.equal(runPreflight(fixture).status, 0);
        write(fixture.root, "src/integration.txt", "after\n");
        const subjectSha = commitPaths(
            fixture.root,
            ["src/integration.txt"],
            "reviewed implementation",
        );
        assert.equal(runCheckpoint(fixture).status, 0);
        const implementationWorkOrder = readJson(
            fixture.root,
            ".agents/work/active-work-order.json",
        );
        const implementationCheckpoint = readJson(fixture.root, ".agents/work/checkpoint.json");
        const subjectTreeSha = git(fixture.root, ["rev-parse", `${subjectSha}^{tree}`]);
        const subjectDiff = command(fixture.root, "git", [
            "-c",
            `safe.directory=${fixture.root.replaceAll("\\", "/")}`,
            "diff",
            "--binary",
            "--full-index",
            "--no-ext-diff",
            "--no-textconv",
            "--find-renames=50%",
            "--diff-algorithm=default",
            "--no-indent-heuristic",
            fixture.baseSha,
            subjectSha,
        ]).stdout;
        const implementationReviewedAt = timestampAfter(implementationCheckpoint.recordedAt);
        const reviewReport = {
            schemaVersion: 1,
            reportKind: "implementation-review",
            reportId: "real-fixture-review",
            changeId: "test-change",
            reviewer: {
                reviewerId: "fresh-reviewer",
                role: "fresh-implementation-reviewer",
                reviewedAt: implementationReviewedAt,
            },
            workOrder: {
                workOrderId: implementationWorkOrder.workOrderId,
                workOrderDigest: implementationCheckpoint.workOrderDigest,
            },
            acceptedArtifactDigest: fixture.artifactDigest,
            git: {
                baseSha: fixture.baseSha,
                subjectSha,
                subjectTreeSha,
                rawDiffSha256: createHash("sha256").update(subjectDiff).digest("hex"),
            },
            scenarioMatrix: [
                {
                    requirement: "Final integration evidence",
                    scenario: "Reviewed subject is exact",
                    status: "pass",
                    evidence: ["Subject identity recomputed."],
                },
            ],
            conventionMatrix: [
                {
                    conventionId: "TOOL-09",
                    status: "pass",
                    evidence: ["Protocol validation passed."],
                },
            ],
            fileOperations: implementationCheckpoint.fileOperations,
            commands: implementationCheckpoint.commands,
            findings: [],
            verdict: "pass",
            acceptedRisks: [],
        };
        const activeRoot = "openspec/changes/test-change";
        const activeEvidenceDirectory = `${activeRoot}/evidence/${subjectSha}`;
        const activeEvidencePaths = [
            `${activeEvidenceDirectory}/checkpoint.json`,
            `${activeEvidenceDirectory}/review-report.json`,
            `${activeEvidenceDirectory}/work-order.json`,
        ].sort();
        writeJson(
            fixture.root,
            `${activeEvidenceDirectory}/work-order.json`,
            implementationWorkOrder,
        );
        writeJson(
            fixture.root,
            `${activeEvidenceDirectory}/checkpoint.json`,
            implementationCheckpoint,
        );
        writeJson(fixture.root, `${activeEvidenceDirectory}/review-report.json`, reviewReport);
        const evidenceCommitSha = commitPaths(
            fixture.root,
            activeEvidencePaths,
            "record exact review evidence",
        );
        const validatorArguments = [
            "scripts/agent-workflow/validate-evidence-commit.mjs",
            "--commit",
            evidenceCommitSha,
        ];
        const evidenceValidation = command(fixture.root, "node", validatorArguments);
        assert.equal(evidenceValidation.status, 0, evidenceValidation.stderr);

        const archiveRoot = "openspec/changes/archive/2026-07-31-test-change";
        mkdirSync(resolve(fixture.root, "openspec/changes/archive"), {
            recursive: true,
        });
        git(fixture.root, ["mv", activeRoot, archiveRoot]);
        git(fixture.root, ["commit", "-m", "archive reviewed change"]);
        const candidateSha = git(fixture.root, ["rev-parse", "HEAD"]);
        const authorizedInventory = fixtureInventory(fixture.root, fixture.baseSha, candidateSha);
        const operationPaths = [
            ...authorizedInventory.additions,
            ...authorizedInventory.modifications,
            ...authorizedInventory.deletions,
            ...authorizedInventory.renames.flatMap((rename) => [rename.from, rename.to]),
        ];
        const archivedRequiredDocuments = [
            `${archiveRoot}/proposal.md`,
            `${archiveRoot}/design.md`,
            `${archiveRoot}/specs/test-capability/spec.md`,
            `${archiveRoot}/tasks.md`,
        ];
        const integrationWorkOrder = updateWorkOrder(fixture, (workOrder) => ({
            ...workOrder,
            workOrderId: "integration-work-order",
            role: "integration",
            allowedPaths: [...new Set(operationPaths)].sort(),
            expectedAdditions: authorizedInventory.additions,
            expectedModifications: authorizedInventory.modifications,
            expectedDeletions: authorizedInventory.deletions,
            expectedRenames: authorizedInventory.renames,
            requiredDocuments: archivedRequiredDocuments,
        }));
        const integrationPreflight = runPreflight(fixture);
        assert.equal(integrationPreflight.status, 0, integrationPreflight.stderr);
        const integrationCheckpointResult = runCheckpoint(fixture);
        assert.equal(integrationCheckpointResult.status, 0, integrationCheckpointResult.stderr);
        const integrationCheckpoint = readJson(fixture.root, ".agents/work/checkpoint.json");
        const integrationWorkOrderDigest = digestJson(integrationWorkOrder);
        const candidateTreeSha = git(fixture.root, ["rev-parse", `${candidateSha}^{tree}`]);
        const candidateDiff = command(fixture.root, "git", [
            "-c",
            `safe.directory=${fixture.root.replaceAll("\\", "/")}`,
            "diff",
            "--binary",
            "--full-index",
            "--no-ext-diff",
            "--no-textconv",
            "--find-renames=50%",
            "--diff-algorithm=default",
            "--no-indent-heuristic",
            fixture.baselineSha,
            candidateSha,
        ]).stdout;
        const archivedEvidenceDirectory = `${archiveRoot}/evidence/${subjectSha}`;
        const archivedReviewPath = `${archivedEvidenceDirectory}/review-report.json`;
        const evidenceDigest = (path) =>
            createHash("sha256")
                .update(readFileSync(resolve(fixture.root, path)))
                .digest("hex");
        const integrationReviewedAt = timestampAfter(integrationCheckpoint.recordedAt);
        const report = {
            schemaVersion: 1,
            reportKind: "final-integration-review",
            reportId: "real-fixture-integration-review",
            changeId: "test-change",
            reviewer: {
                reviewerId: "fresh-integration-reviewer",
                role: "fresh-integration-reviewer",
                reviewedAt: integrationReviewedAt,
            },
            workOrder: {
                workOrderId: integrationWorkOrder.workOrderId,
                workOrderDigest: integrationWorkOrderDigest,
            },
            acceptedArtifactDigest: fixture.artifactDigest,
            git: {
                baselineSha: fixture.baselineSha,
                reviewedImplementationSha: subjectSha,
                finalArchiveSha: candidateSha,
                candidateSha,
                candidateTreeSha,
                rawDiffSha256: createHash("sha256").update(candidateDiff).digest("hex"),
            },
            scenarioMatrix: [
                {
                    requirement: "Final integration",
                    scenario: "Evidence and candidate are exact",
                    status: "pass",
                    evidence: ["All candidate references were recomputed."],
                },
            ],
            conventionMatrix: [
                {
                    conventionId: "TOOL-09",
                    status: "pass",
                    evidence: ["Final gate passed."],
                },
            ],
            expectedCommits: fixtureCommitShas(fixture.root, fixture.baselineSha, candidateSha).map(
                (sha, index) => ({
                    sequence: index + 1,
                    sha,
                    description: `Accepted candidate commit ${index + 1}.`,
                }),
            ),
            orderedIntegrations: [
                {
                    sequence: 1,
                    integrationId: "reviewed-implementation",
                    expectedCommitSha: subjectSha,
                    workOrderId: implementationWorkOrder.workOrderId,
                    workOrderDigest: implementationCheckpoint.workOrderDigest,
                    sourceSubjectSha: subjectSha,
                    sourceTreeSha: subjectTreeSha,
                    fileOperations: implementationCheckpoint.fileOperations,
                },
            ],
            fileOperations: fixtureInventory(fixture.root, fixture.baselineSha, candidateSha),
            commands: structuredClone(integrationCheckpoint.commands),
            requiredChecks: requiredChecksFromCheckpoint(integrationCheckpoint),
            reviewReferences: [
                {
                    reportId: reviewReport.reportId,
                    reportSha256: evidenceDigest(archivedReviewPath),
                    workOrderDigest: implementationCheckpoint.workOrderDigest,
                    subjectSha,
                    subjectTreeSha,
                    verdict: "pass",
                    evidencePath: archivedReviewPath,
                },
            ],
            evidenceReferences: [
                {
                    kind: "checkpoint",
                    path: `${archivedEvidenceDirectory}/checkpoint.json`,
                    sha256: evidenceDigest(`${archivedEvidenceDirectory}/checkpoint.json`),
                    subjectSha,
                },
                {
                    kind: "review-report",
                    path: archivedReviewPath,
                    sha256: evidenceDigest(archivedReviewPath),
                    subjectSha,
                },
                {
                    kind: "work-order",
                    path: `${archivedEvidenceDirectory}/work-order.json`,
                    sha256: evidenceDigest(`${archivedEvidenceDirectory}/work-order.json`),
                    subjectSha,
                },
            ],
            evidenceOnlyCommitValidation: {
                commitSha: evidenceCommitSha,
                parentSha: subjectSha,
                expectedEvidencePaths: activeEvidencePaths,
                fileOperations: {
                    additions: activeEvidencePaths,
                    modifications: [],
                    deletions: [],
                    renames: [],
                },
                validatorResult: {
                    cwd: ".",
                    executable: "node",
                    arguments: validatorArguments,
                    exitCode: evidenceValidation.status,
                    stdoutSha256: createHash("sha256")
                        .update(evidenceValidation.stdout)
                        .digest("hex"),
                    stderrSha256: createHash("sha256")
                        .update(evidenceValidation.stderr)
                        .digest("hex"),
                },
                outcome: "pass",
            },
            findings: [],
            finalVerdict: "pass",
            acceptedRisks: [],
            mergeEligibility: {
                eligible: true,
                method: "ff-only",
                expectedMasterSha: fixture.baselineSha,
                candidateSha,
                checkedAt: timestampAfter(integrationReviewedAt),
                blockers: [],
            },
        };
        writeJson(fixture.root, ".agents/work/integration-report.json", report);
        const valid = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.equal(valid.status, 0, valid.stderr);

        write(fixture.root, ".git/info/exclude", "/.private/ordinary.txt\n");
        const staleProtectedClassification = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(staleProtectedClassification.status, 0);
        assert.match(staleProtectedClassification.stderr, /Protected pre-existing state changed/iu);
        write(fixture.root, ".git/info/exclude", "");

        const archivedTasksPath = `${archiveRoot}/tasks.md`;
        const archivedTasks = readFileSync(resolve(fixture.root, archivedTasksPath), "utf8");
        const integrationBaseline = readJson(fixture.root, ".agents/work/baseline.json");
        const forgedBaseline = structuredClone(integrationBaseline);
        forgedBaseline.entries.push({ path: archivedTasksPath });
        writeJson(fixture.root, ".agents/work/baseline.json", forgedBaseline);
        write(fixture.root, archivedTasksPath, archivedTasks.replace("- [ ] 1.1", "- [x] 1.1"));
        const staleTasks = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(staleTasks.status, 0);
        assert.match(staleTasks.stderr, /exactly cover protectedPaths/iu);
        writeJson(fixture.root, ".agents/work/baseline.json", integrationBaseline);
        write(fixture.root, archivedTasksPath, archivedTasks);

        report.commands[0].executable = "same-name/node";
        writeJson(fixture.root, ".agents/work/integration-report.json", report);
        const forgedCommand = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(forgedCommand.status, 0);
        assert.match(forgedCommand.stderr, /checkpoint is stale or does not match/iu);
        report.commands = structuredClone(integrationCheckpoint.commands);

        const forgedCheckpoint = structuredClone(integrationCheckpoint);
        forgedCheckpoint.commands[0].stdoutSha256 = "0".repeat(64);
        writeJson(fixture.root, ".agents/work/checkpoint.json", forgedCheckpoint);
        writeJson(fixture.root, ".agents/work/integration-report.json", report);
        const staleCheckpoint = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(staleCheckpoint.status, 0);
        assert.match(staleCheckpoint.stderr, /checkpoint is stale or does not match/iu);
        writeJson(fixture.root, ".agents/work/checkpoint.json", integrationCheckpoint);

        const originalIntegrationCommit = report.orderedIntegrations[0].expectedCommitSha;
        report.orderedIntegrations[0].expectedCommitSha = candidateSha;
        writeJson(fixture.root, ".agents/work/integration-report.json", report);
        const forgedIntegrationCommit = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(forgedIntegrationCommit.status, 0);
        assert.match(forgedIntegrationCommit.stderr, /does not match its reviewed inventory/iu);
        report.orderedIntegrations[0].expectedCommitSha = originalIntegrationCommit;

        const originalIntegrationInventory = report.orderedIntegrations[0].fileOperations;
        report.orderedIntegrations[0].fileOperations = {
            additions: [],
            modifications: [],
            deletions: [],
            renames: [],
        };
        writeJson(fixture.root, ".agents/work/integration-report.json", report);
        const forgedIntegrationInventory = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(forgedIntegrationInventory.status, 0);
        assert.match(
            forgedIntegrationInventory.stderr,
            /inventory is not the reviewed inventory/iu,
        );
        report.orderedIntegrations[0].fileOperations = originalIntegrationInventory;

        report.git.reviewedImplementationSha = evidenceCommitSha;
        writeJson(fixture.root, ".agents/work/integration-report.json", report);
        const forgedReviewedImplementation = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(forgedReviewedImplementation.status, 0);
        assert.match(
            forgedReviewedImplementation.stderr,
            /does not resolve from a validated review/iu,
        );
        report.git.reviewedImplementationSha = subjectSha;
        writeJson(fixture.root, ".agents/work/integration-report.json", report);

        git(fixture.root, ["branch", "-f", "master", candidateSha]);
        const advancedMaster = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(advancedMaster.status, 0);
        assert.match(advancedMaster.stderr, /Master advanced from the accepted baseline/iu);
        git(fixture.root, ["branch", "-f", "master", fixture.baselineSha]);

        report.reviewReferences[0].reportSha256 = "0".repeat(64);
        writeJson(fixture.root, ".agents/work/integration-report.json", report);
        const stale = runScript(fixture, "validate-review.mjs", [
            "--report",
            ".agents/work/integration-report.json",
        ]);
        assert.notEqual(stale.status, 0);
        assert.match(stale.stderr, /Review reference digest is stale/iu);

        report.reviewReferences[0].reportSha256 = evidenceDigest(archivedReviewPath);
        const finalEvidenceDirectory = `${archiveRoot}/evidence/${candidateSha}`;
        const finalEvidencePaths = [
            `${finalEvidenceDirectory}/checkpoint.json`,
            `${finalEvidenceDirectory}/integration-report.json`,
            `${finalEvidenceDirectory}/work-order.json`,
        ].sort();
        writeJson(fixture.root, `${finalEvidenceDirectory}/work-order.json`, integrationWorkOrder);
        writeJson(fixture.root, `${finalEvidenceDirectory}/checkpoint.json`, integrationCheckpoint);
        writeJson(fixture.root, `${finalEvidenceDirectory}/integration-report.json`, report);
        const finalEvidenceCommit = commitPaths(
            fixture.root,
            finalEvidencePaths,
            "record final integration evidence",
        );
        const finalEvidenceValidation = runScript(fixture, "validate-evidence-commit.mjs", [
            "--commit",
            finalEvidenceCommit,
        ]);
        assert.equal(finalEvidenceValidation.status, 0, finalEvidenceValidation.stderr);
    } finally {
        cleanupFixture(fixture);
    }
});
