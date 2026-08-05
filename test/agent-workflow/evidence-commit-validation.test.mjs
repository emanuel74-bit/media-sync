import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
    write,
    writeJson,
} from "./workflow-test-helpers.mjs";

const emptyDigest = createHash("sha256").update("").digest("hex");

async function createEvidenceFixture(options = {}) {
    const fixture = await setupFixture({
        baseFiles: { "src/subject.txt": "before\n" },
        allowedPaths: ["src/subject.txt"],
        expectedAdditions: [],
        expectedModifications: ["src/subject.txt"],
    });
    assert.equal(runPreflight(fixture).status, 0);
    write(fixture.root, "src/subject.txt", "after\n");
    const subjectSha = commitPaths(fixture.root, ["src/subject.txt"], "reviewed subject");
    const checkpointResult = runCheckpoint(fixture);
    assert.equal(checkpointResult.status, 0, checkpointResult.stderr);
    const checkpoint = readJson(fixture.root, ".agents/work/checkpoint.json");
    const workOrder = readJson(fixture.root, ".agents/work/active-work-order.json");
    if (options.tamperWorkOrder) {
        workOrder.nonGoals.push("Tampered after review.");
    }
    if (options.forgeIdentity) {
        workOrder.issuedBy = "forged-coordinator";
        checkpoint.workOrderDigest = digestJson(workOrder);
    }
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
    const report = {
        schemaVersion: 1,
        reportKind: "implementation-review",
        reportId: "fixture-evidence-review",
        changeId: "test-change",
        reviewer: {
            reviewerId: "fresh-reviewer",
            role: "fresh-implementation-reviewer",
            reviewedAt: new Date(Date.parse(checkpoint.recordedAt) + 1_000).toISOString(),
        },
        workOrder: {
            workOrderId: fixture.workOrder.workOrderId,
            workOrderDigest: checkpoint.workOrderDigest,
        },
        acceptedArtifactDigest: fixture.artifactDigest,
        git: {
            baseSha: fixture.baseSha,
            subjectSha,
            subjectTreeSha,
            rawDiffSha256: createHash("sha256").update(rawDiff).digest("hex"),
        },
        scenarioMatrix: [
            {
                requirement: "Evidence validation",
                scenario: "Exact implementation snapshot",
                status: "pass",
                evidence: ["Fixture identity recomputed."],
            },
        ],
        conventionMatrix: [
            {
                conventionId: "TOOL-09",
                status: "pass",
                evidence: ["Fixture validation passed."],
            },
        ],
        fileOperations: checkpoint.fileOperations,
        commands: checkpoint.commands,
        findings: [],
        verdict: "pass",
        acceptedRisks: [],
    };
    if (options.fabricateReportCommand) {
        report.commands = report.commands.map((entry, index) =>
            index === 0 ? { ...entry, stdoutSha256: "0".repeat(64) } : entry,
        );
    }
    if (options.forgeStoredCommand) {
        const forged = checkpoint.commands.map((entry, index) =>
            index === 0
                ? {
                      ...entry,
                      commandId: "forged-command",
                      executable: "node",
                      arguments: ["--version"],
                  }
                : entry,
        );
        checkpoint.commands = forged;
        report.commands = forged;
    }
    if (options.tamperReport) {
        delete report.reviewer;
    }
    const evidenceSubject = options.evidenceSubject ?? subjectSha;
    const directory = `openspec/changes/test-change/evidence/${evidenceSubject}`;
    const evidencePaths = [];
    if (!options.omitWorkOrder) {
        writeJson(fixture.root, `${directory}/work-order.json`, workOrder);
        evidencePaths.push(`${directory}/work-order.json`);
    }
    writeJson(fixture.root, `${directory}/checkpoint.json`, checkpoint);
    writeJson(fixture.root, `${directory}/review-report.json`, report);
    evidencePaths.push(`${directory}/checkpoint.json`, `${directory}/review-report.json`);
    if (options.sourceChange) {
        write(fixture.root, "src/extra.txt", "source-bearing evidence commit\n");
        evidencePaths.push("src/extra.txt");
    }
    const commitSha = commitPaths(fixture.root, evidencePaths, "record review evidence");
    return { commitSha, fixture, subjectSha };
}

function validate(fixture, commitSha) {
    return runScript(fixture, "validate-evidence-commit.mjs", ["--commit", commitSha]);
}

test("evidence validation accepts work-order, checkpoint, and review snapshots only", async () => {
    const { commitSha, fixture } = await createEvidenceFixture();
    try {
        const result = validate(fixture, commitSha);
        assert.equal(result.status, 0, result.stderr);
    } finally {
        cleanupFixture(fixture);
    }
});

test("evidence validation rejects report commands that differ from the checkpoint", async () => {
    const { commitSha, fixture } = await createEvidenceFixture({
        fabricateReportCommand: true,
    });
    try {
        const result = validate(fixture, commitSha);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /checkpoint is stale or does not match/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("evidence validation rejects self-consistent commands not declared by the work order", async () => {
    const { commitSha, fixture } = await createEvidenceFixture({
        forgeStoredCommand: true,
    });
    try {
        const result = validate(fixture, commitSha);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /checkpoint is stale or does not match/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("evidence validation rejects a source-bearing evidence commit", async () => {
    const { commitSha, fixture } = await createEvidenceFixture({
        sourceChange: true,
    });
    try {
        const result = validate(fixture, commitSha);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /outside a change subject directory/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("evidence validation rejects missing snapshots", async () => {
    const { commitSha, fixture } = await createEvidenceFixture({
        omitWorkOrder: true,
    });
    try {
        const result = validate(fixture, commitSha);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /missing work-order.json/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("evidence validation rejects a directory not rooted at the exact parent subject", async () => {
    const { commitSha, fixture } = await createEvidenceFixture({
        evidenceSubject: "0".repeat(40),
    });
    try {
        const result = validate(fixture, commitSha);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /parent is not the exact reviewed subject/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("evidence validation rejects a tampered work-order snapshot", async () => {
    const { commitSha, fixture } = await createEvidenceFixture({
        tamperWorkOrder: true,
    });
    try {
        const result = validate(fixture, commitSha);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /work-order snapshot or digest is stale/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("evidence validation rejects an incomplete stored review report", async () => {
    const { commitSha, fixture } = await createEvidenceFixture({
        tamperReport: true,
    });
    try {
        const result = validate(fixture, commitSha);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /missing required property reviewer/iu);
    } finally {
        cleanupFixture(fixture);
    }
});

test("evidence validation rejects a self-consistent forged coordinator identity", async () => {
    const { commitSha, fixture } = await createEvidenceFixture({
        forgeIdentity: true,
    });
    try {
        const result = validate(fixture, commitSha);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /issuer does not match the committed accepted coordinator/iu);
    } finally {
        cleanupFixture(fixture);
    }
});
