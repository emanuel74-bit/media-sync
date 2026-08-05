import { existsSync } from "node:fs";
import { posix, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
    checkpointPath,
    inventoryBetween,
    loadAndValidateBaseline,
    validateInventory,
} from "./checkpoint.mjs";
import {
    assertProtocolStatePath,
    acceptedScenarioIdentities,
    acceptedScenarioIdentitiesAtRoot,
    canonicalJson,
    currentChangedPaths,
    defaultWorkOrderPath,
    digestJson,
    fail,
    focusedCommandIdentity,
    git,
    gitText,
    isRfc3339DateTime,
    loadAndValidateContext,
    parseCliArgs,
    readJson,
    repositoryPathIsWithin,
    repositoryRoot,
    resolveArchivedChangeRootAtRevision,
    resolveChangeRootAtRevision,
    run,
    sha256,
    validateAcceptedPlanningSnapshot,
    validateJsonAgainstSchema,
    validateRepositoryPath,
    validateWorkOrder,
} from "./preflight.mjs";

const sha1Pattern = /^[0-9a-f]{40}$/u;
const sha256Pattern = /^[0-9a-f]{64}$/u;

function schemaPath(name) {
    return resolve(repositoryRoot, ".agents/templates", `${name}.schema.json`);
}

function commitBytes(commitSha, path, label = path) {
    validateRepositoryPath(path);
    const result = git(["show", `${commitSha}:${path}`], { allowFailure: true });
    if (result.status !== 0) {
        fail(`${label} is unavailable in candidate ${commitSha}`);
    }
    return result.stdout;
}

function parseCommitJson(commitSha, path, label = path) {
    try {
        return JSON.parse(commitBytes(commitSha, path, label).toString("utf8"));
    } catch (error) {
        fail(`Cannot parse ${label}: ${error.message}`);
    }
}

function assertCommitAvailable(sha, label) {
    requireDigest(sha, label, sha1Pattern);
    if (git(["cat-file", "-e", `${sha}^{commit}`], { allowFailure: true }).status !== 0) {
        fail(`${label} is unavailable: ${sha}`);
    }
}

function assertAncestor(ancestor, descendant, label) {
    if (
        git(["merge-base", "--is-ancestor", ancestor, descendant], {
            allowFailure: true,
        }).status !== 0
    ) {
        fail(`${label}: ${ancestor} is not an ancestor of ${descendant}`);
    }
}

function assertOrderedSequence(entries, label) {
    const sequences = entries.map((entry) => entry.sequence);
    const expected = entries.map((_entry, index) => index + 1);
    if (canonicalJson(sequences) !== canonicalJson(expected)) {
        fail(`${label} must have a unique contiguous sequence in array order`);
    }
}

function requireFields(value, fields, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        fail(`${label} must be an object`);
    }
    for (const field of fields) {
        if (!(field in value)) {
            fail(`${label} is missing ${field}`);
        }
    }
}

function requireDigest(value, label, pattern) {
    if (typeof value !== "string" || !pattern.test(value)) {
        fail(`${label} is invalid`);
    }
}

function normalizeInventory(inventory) {
    requireFields(
        inventory,
        ["additions", "modifications", "deletions", "renames"],
        "fileOperations",
    );
    return {
        additions: [...inventory.additions].sort(),
        modifications: [...inventory.modifications].sort(),
        deletions: [...inventory.deletions].sort(),
        renames: [...inventory.renames].sort((left, right) =>
            `${left.from}\0${left.to}`.localeCompare(`${right.from}\0${right.to}`),
        ),
    };
}

export function canonicalRawDiff(baseSha, subjectSha) {
    return git([
        "diff",
        "--binary",
        "--full-index",
        "--no-ext-diff",
        "--no-textconv",
        "--find-renames=50%",
        "--diff-algorithm=default",
        "--no-indent-heuristic",
        baseSha,
        subjectSha,
    ]).stdout;
}

function assertGitIdentity(report, requireHead, workOrder) {
    requireFields(
        report.git,
        ["baseSha", "subjectSha", "subjectTreeSha", "rawDiffSha256"],
        "review git identity",
    );
    for (const field of ["baseSha", "subjectSha", "subjectTreeSha"]) {
        requireDigest(report.git[field], `git.${field}`, sha1Pattern);
    }
    requireDigest(report.git.rawDiffSha256, "git.rawDiffSha256", sha256Pattern);
    for (const sha of [report.git.baseSha, report.git.subjectSha]) {
        if (git(["cat-file", "-e", `${sha}^{commit}`], { allowFailure: true }).status !== 0) {
            fail(`Review Git commit is unavailable: ${sha}`);
        }
    }
    const subjectTree = gitText(["rev-parse", `${report.git.subjectSha}^{tree}`]);
    if (subjectTree !== report.git.subjectTreeSha) {
        fail("Review subject tree SHA is stale");
    }
    if (requireHead) {
        const head = gitText(["rev-parse", "HEAD"]);
        const headTree = gitText(["rev-parse", "HEAD^{tree}"]);
        if (head !== report.git.subjectSha || headTree !== report.git.subjectTreeSha) {
            fail("Current implementation differs from the reviewed subject");
        }
        loadAndValidateBaseline(workOrder);
        const dirty = currentChangedPaths(report.git.subjectSha).filter(
            (path) => !workOrder.protectedPaths.some((root) => repositoryPathIsWithin(path, root)),
        );
        if (dirty.length > 0) {
            fail(`Current worktree differs from the reviewed subject: ${dirty.join(", ")}`);
        }
    }
    const rawDiff = canonicalRawDiff(report.git.baseSha, report.git.subjectSha);
    if (sha256(rawDiff) !== report.git.rawDiffSha256) {
        fail("Review raw diff digest is stale");
    }
}

function assertExactIdentities(actual, expected, key, label) {
    const actualKeys = actual.map(key);
    const expectedKeys = expected.map(key);
    if (
        actualKeys.length !== expectedKeys.length ||
        new Set(actualKeys).size !== actualKeys.length ||
        canonicalJson([...actualKeys].sort()) !== canonicalJson([...expectedKeys].sort())
    ) {
        fail(`${label} does not exactly cover the accepted identities`);
    }
}

function assertMatrices(report, scenarios, conventionIds) {
    for (const [label, matrix] of [
        ["scenarioMatrix", report.scenarioMatrix],
        ["conventionMatrix", report.conventionMatrix],
    ]) {
        if (!Array.isArray(matrix) || matrix.length === 0) {
            fail(`${label} must be non-empty`);
        }
        if (matrix.some((entry) => !["pass", "not-applicable"].includes(entry.status))) {
            fail(`${label} contains a failing or invalid result`);
        }
        if (matrix.some((entry) => !Array.isArray(entry.evidence) || entry.evidence.length === 0)) {
            fail(`${label} is missing evidence`);
        }
    }
    if (scenarios.length > 0) {
        assertExactIdentities(
            report.scenarioMatrix,
            scenarios,
            (entry) => `${entry.requirement}\0${entry.scenario}`,
            "scenarioMatrix",
        );
    }
    assertExactIdentities(
        report.conventionMatrix,
        conventionIds.map((conventionId) => ({ conventionId })),
        (entry) => entry.conventionId,
        "conventionMatrix",
    );
}

function assertCheckpoint(checkpoint, expectation, workOrder) {
    const declaredCommands = workOrder.focusedCommands.map(focusedCommandIdentity);
    const checkpointCommandIdentities = (checkpoint?.commands ?? []).map((command) => ({
        commandId: command.commandId,
        cwd: command.cwd,
        executable: command.executable,
        arguments: command.arguments,
    }));
    const mismatches = [];
    const requireMatch = (condition, label) => {
        if (!condition) {
            mismatches.push(label);
        }
    };
    requireMatch(checkpoint?.schemaVersion === 1, "schema version");
    requireMatch(checkpoint?.workOrderId === workOrder.workOrderId, "work-order ID");
    requireMatch(checkpoint?.workOrderDigest === digestJson(workOrder), "work-order digest");
    requireMatch(
        checkpoint?.acceptedArtifactDigest === workOrder.acceptedArtifactDigest,
        "accepted-artifact digest",
    );
    requireMatch(checkpoint?.baseSha === expectation.baseSha, "base SHA");
    requireMatch(checkpoint?.headSha === expectation.subjectSha, "subject SHA");
    requireMatch(isRfc3339DateTime(checkpoint?.recordedAt), "checkpoint timestamp");
    requireMatch(isRfc3339DateTime(workOrder.issuedAt), "work-order timestamp");
    requireMatch(isRfc3339DateTime(expectation.reviewedAt), "review timestamp");
    requireMatch(
        Date.parse(workOrder.issuedAt) <= Date.parse(checkpoint?.recordedAt),
        "checkpoint predates work order",
    );
    requireMatch(
        Date.parse(checkpoint?.recordedAt) <= Date.parse(expectation.reviewedAt),
        "checkpoint postdates review",
    );
    requireMatch(
        canonicalJson(normalizeInventory(checkpoint?.fileOperations)) ===
            canonicalJson(normalizeInventory(expectation.fileOperations)),
        "file-operation inventory",
    );
    requireMatch(
        canonicalJson(checkpointCommandIdentities) === canonicalJson(declaredCommands),
        "work-order command identities",
    );
    requireMatch(
        canonicalJson(checkpoint?.commands) === canonicalJson(expectation.commands),
        "command results",
    );
    if (mismatches.length > 0) {
        fail(
            `Review checkpoint is stale or does not match the reviewed report: ${mismatches.join(", ")}`,
        );
    }
}

function assertCommands(report) {
    if (!Array.isArray(report.commands) || report.commands.length === 0) {
        fail("Review commands must be non-empty");
    }
    for (const command of report.commands) {
        requireFields(
            command,
            [
                "commandId",
                "cwd",
                "executable",
                "arguments",
                "exitCode",
                "stdoutSha256",
                "stderrSha256",
                "outcome",
            ],
            "command result",
        );
        if (command.exitCode !== 0 || command.outcome !== "pass") {
            fail(`Review command did not pass: ${command.commandId}`);
        }
        requireDigest(command.stdoutSha256, "command stdoutSha256", sha256Pattern);
        requireDigest(command.stderrSha256, "command stderrSha256", sha256Pattern);
    }
}

function assertRequiredChecks(report) {
    if (!Array.isArray(report.requiredChecks) || report.requiredChecks.length === 0) {
        fail("Integration report has a missing or failing required check");
    }
    if (
        report.requiredChecks.some(
            (check) => check.outcome !== "pass" || check.result?.exitCode !== 0,
        )
    ) {
        fail("Integration report has a missing or failing required check");
    }
}

function checkpointExpectation(report, workOrder) {
    if (report.reportKind === "final-integration-review") {
        return {
            baseSha: workOrder.baseSha,
            subjectSha: report.git.candidateSha,
            fileOperations: inventoryBetween(workOrder.baseSha, report.git.candidateSha),
            commands: report.commands,
            reviewedAt: report.reviewer?.reviewedAt,
        };
    }
    return {
        baseSha: report.git.baseSha,
        subjectSha: report.git.subjectSha,
        fileOperations: report.fileOperations,
        commands: report.commands,
        reviewedAt: report.reviewer?.reviewedAt,
    };
}

function assertFindingsAndRisks(report, coordinatorId) {
    if (!Array.isArray(report.findings) || !Array.isArray(report.acceptedRisks)) {
        fail("Review findings and acceptedRisks must be arrays");
    }
    const verdict = report.verdict ?? report.finalVerdict;
    if (verdict === "changes-required") {
        fail("Review verdict is blocking: changes-required");
    }
    if (!["pass", "pass-with-accepted-risks"].includes(verdict)) {
        fail(`Unknown review verdict: ${verdict}`);
    }
    const open = report.findings.filter((finding) => finding.status === "open");
    if (open.length > 0) {
        fail(`Review has open findings: ${open.map((finding) => finding.findingId).join(", ")}`);
    }
    if (verdict === "pass" && report.acceptedRisks.length > 0) {
        fail("A pass verdict cannot contain accepted risks");
    }
    if (verdict === "pass-with-accepted-risks" && report.acceptedRisks.length === 0) {
        fail("pass-with-accepted-risks requires explicit risk acceptance");
    }
    const findings = new Map(report.findings.map((finding) => [finding.findingId, finding]));
    for (const risk of report.acceptedRisks) {
        requireFields(
            risk,
            [
                "riskId",
                "findingId",
                "coordinatorId",
                "acceptedAt",
                "rationale",
                "followUpDisposition",
            ],
            "accepted risk",
        );
        const finding = findings.get(risk.findingId);
        if (!finding || finding.status !== "accepted-risk") {
            fail(`Accepted risk does not resolve a finding: ${risk.findingId}`);
        }
        if (
            risk.coordinatorId !== coordinatorId ||
            !isRfc3339DateTime(risk.acceptedAt) ||
            Date.parse(risk.acceptedAt) < Date.parse(report.reviewer.reviewedAt) ||
            !risk.rationale?.trim() ||
            !risk.followUpDisposition?.trim()
        ) {
            fail(`Risk lacks explicit coordinator acceptance: ${risk.riskId}`);
        }
    }
    const acceptedFindingIds = new Set(report.acceptedRisks.map((risk) => risk.findingId));
    const unaccepted = report.findings.filter(
        (finding) =>
            finding.status === "accepted-risk" && !acceptedFindingIds.has(finding.findingId),
    );
    if (unaccepted.length > 0) {
        fail(
            `Findings lack accepted-risk metadata: ${unaccepted.map((finding) => finding.findingId)}`,
        );
    }
}

function assertCurrentCandidate(candidateSha, candidateTreeSha, workOrder) {
    const head = gitText(["rev-parse", "HEAD"]);
    const headTree = gitText(["rev-parse", "HEAD^{tree}"]);
    if (head !== candidateSha || headTree !== candidateTreeSha) {
        fail("Current implementation differs from the reviewed subject");
    }
    loadAndValidateBaseline(workOrder);
    const dirty = currentChangedPaths(candidateSha).filter(
        (path) => !workOrder.protectedPaths.some((root) => repositoryPathIsWithin(path, root)),
    );
    if (dirty.length > 0) {
        fail(`Current worktree differs from the reviewed subject: ${dirty.join(", ")}`);
    }
}

function validateImplementationReport(report, context, options) {
    if (report.schemaVersion !== 1 || report.reportKind !== "implementation-review") {
        fail("Review report kind or schema version is invalid");
    }
    requireFields(
        report,
        [
            "schemaVersion",
            "reportKind",
            "reportId",
            "changeId",
            "reviewer",
            "workOrder",
            "acceptedArtifactDigest",
            "git",
            "scenarioMatrix",
            "conventionMatrix",
            "fileOperations",
            "commands",
            "findings",
            "verdict",
            "acceptedRisks",
        ],
        "review report",
    );
    if (report.changeId !== context.workOrder.changeId) {
        fail("Review changeId does not match the work order");
    }
    if (
        report.workOrder.workOrderId !== context.workOrder.workOrderId ||
        report.workOrder.workOrderDigest !== digestJson(context.workOrder)
    ) {
        fail("Review work-order digest is stale");
    }
    if (
        report.acceptedArtifactDigest !== context.artifactDigest ||
        report.git.baseSha !== context.workOrder.baseSha
    ) {
        fail("Review acceptance or base identity is stale");
    }
    assertGitIdentity(report, options.requireHead !== false, context.workOrder);
    const actualInventory = inventoryBetween(report.git.baseSha, report.git.subjectSha);
    validateInventory(actualInventory, context.workOrder);
    if (
        canonicalJson(normalizeInventory(report.fileOperations)) !== canonicalJson(actualInventory)
    ) {
        fail("Review file-operation inventory is stale");
    }
    for (const path of [
        ...report.fileOperations.additions,
        ...report.fileOperations.modifications,
        ...report.fileOperations.deletions,
        ...report.fileOperations.renames.flatMap((rename) => [rename.from, rename.to]),
    ]) {
        validateRepositoryPath(path);
    }
    assertMatrices(
        report,
        context.scenarios ?? acceptedScenarioIdentities(context.workOrder.changeId),
        context.workOrder.conventionIds,
    );
    assertCommands(report);
    assertFindingsAndRisks(report, context.acceptance.acceptedBy);
    return report;
}

function validateIntegrationReport(report, context, options) {
    requireFields(
        report,
        [
            "schemaVersion",
            "reportKind",
            "reportId",
            "changeId",
            "reviewer",
            "workOrder",
            "acceptedArtifactDigest",
            "git",
            "scenarioMatrix",
            "conventionMatrix",
            "expectedCommits",
            "orderedIntegrations",
            "fileOperations",
            "commands",
            "requiredChecks",
            "reviewReferences",
            "evidenceReferences",
            "evidenceOnlyCommitValidation",
            "findings",
            "finalVerdict",
            "acceptedRisks",
            "mergeEligibility",
        ],
        "integration report",
    );
    if (report.schemaVersion !== 1 || context.workOrder.role !== "integration") {
        fail("Integration report requires a version 1 integration work order");
    }
    if (
        !isRfc3339DateTime(report.reviewer?.reviewedAt) ||
        Date.parse(report.reviewer.reviewedAt) < Date.parse(context.workOrder.issuedAt)
    ) {
        fail("Integration review predates its work order");
    }
    if (
        report.changeId !== context.workOrder.changeId ||
        report.workOrder?.workOrderId !== context.workOrder.workOrderId ||
        report.workOrder?.workOrderDigest !== digestJson(context.workOrder) ||
        report.acceptedArtifactDigest !== context.artifactDigest
    ) {
        fail("Integration report work-order or acceptance identity is stale");
    }
    requireFields(
        report.git,
        [
            "baselineSha",
            "reviewedImplementationSha",
            "finalArchiveSha",
            "candidateSha",
            "candidateTreeSha",
            "rawDiffSha256",
        ],
        "integration git identity",
    );
    for (const field of [
        "baselineSha",
        "reviewedImplementationSha",
        "finalArchiveSha",
        "candidateSha",
        "candidateTreeSha",
    ]) {
        requireDigest(report.git[field], `git.${field}`, sha1Pattern);
    }
    requireDigest(report.git.rawDiffSha256, "git.rawDiffSha256", sha256Pattern);
    if (
        report.git.baselineSha !== context.acceptance.baselineSha ||
        report.git.finalArchiveSha !== report.git.candidateSha ||
        report.mergeEligibility?.candidateSha !== report.git.candidateSha
    ) {
        fail("Integration report does not bind one exact archive candidate");
    }
    if (
        git(["cat-file", "-e", `${report.git.candidateSha}^{commit}`], {
            allowFailure: true,
        }).status !== 0
    ) {
        fail("Integration candidate commit is unavailable");
    }
    assertCommitAvailable(report.git.reviewedImplementationSha, "reviewed implementation commit");
    assertAncestor(
        report.git.reviewedImplementationSha,
        report.git.candidateSha,
        "Reviewed implementation ancestry is stale",
    );
    const tree = gitText(["rev-parse", `${report.git.candidateSha}^{tree}`]);
    if (tree !== report.git.candidateTreeSha) {
        fail("Integration candidate tree SHA is stale");
    }
    const rawDiff = canonicalRawDiff(report.git.baselineSha, report.git.candidateSha);
    if (sha256(rawDiff) !== report.git.rawDiffSha256) {
        fail("Integration raw diff digest is stale");
    }
    if (options.requireHead !== false) {
        assertCurrentCandidate(
            report.git.candidateSha,
            report.git.candidateTreeSha,
            context.workOrder,
        );
    }
    const authorizedInventory = inventoryBetween(
        context.workOrder.baseSha,
        report.git.candidateSha,
    );
    validateInventory(authorizedInventory, context.workOrder);
    const actualInventory = inventoryBetween(report.git.baselineSha, report.git.candidateSha);
    if (
        canonicalJson(normalizeInventory(report.fileOperations)) !== canonicalJson(actualInventory)
    ) {
        fail("Integration file-operation inventory is stale");
    }
    if (!Array.isArray(report.expectedCommits) || report.expectedCommits.length === 0) {
        fail("Integration report is missing expected commits");
    }
    if (!Array.isArray(report.orderedIntegrations) || report.orderedIntegrations.length === 0) {
        fail("Integration report is missing ordered integrations");
    }
    assertOrderedSequence(report.expectedCommits, "expectedCommits");
    assertOrderedSequence(report.orderedIntegrations, "orderedIntegrations");
    const expectedCommitShas = new Set();
    for (const expected of report.expectedCommits) {
        assertCommitAvailable(expected.sha, "expected commit");
        if (expectedCommitShas.has(expected.sha)) {
            fail(`expectedCommits contains duplicate SHA ${expected.sha}`);
        }
        expectedCommitShas.add(expected.sha);
        assertAncestor(expected.sha, report.git.candidateSha, "Expected commit ancestry is stale");
    }
    const actualCommitShas = gitText([
        "rev-list",
        "--reverse",
        "--first-parent",
        `${report.git.baselineSha}..${report.git.candidateSha}`,
    ])
        .split(/\r?\n/u)
        .filter(Boolean);
    if (
        canonicalJson(report.expectedCommits.map((expected) => expected.sha)) !==
        canonicalJson(actualCommitShas)
    ) {
        fail("expectedCommits does not exactly cover the baseline-to-candidate history");
    }
    if (!expectedCommitShas.has(report.git.reviewedImplementationSha)) {
        fail("reviewedImplementationSha is absent from expectedCommits");
    }
    const integrationIds = new Set();
    const integratedCommitShas = new Set();
    let priorCommitPosition = -1;
    for (const integration of report.orderedIntegrations) {
        if (integrationIds.has(integration.integrationId)) {
            fail(
                `orderedIntegrations contains duplicate integrationId ${integration.integrationId}`,
            );
        }
        integrationIds.add(integration.integrationId);
        if (integratedCommitShas.has(integration.expectedCommitSha)) {
            fail(
                `orderedIntegrations contains duplicate expectedCommitSha ${integration.expectedCommitSha}`,
            );
        }
        integratedCommitShas.add(integration.expectedCommitSha);
        if (!expectedCommitShas.has(integration.expectedCommitSha)) {
            fail(
                `Ordered integration references an undeclared commit: ${integration.expectedCommitSha}`,
            );
        }
        const commitPosition = actualCommitShas.indexOf(integration.expectedCommitSha);
        if (commitPosition <= priorCommitPosition) {
            fail("orderedIntegrations expected commits are not in first-parent history order");
        }
        priorCommitPosition = commitPosition;
        assertCommitAvailable(integration.sourceSubjectSha, "integration source subject");
        assertAncestor(
            integration.sourceSubjectSha,
            report.git.candidateSha,
            "Integration source ancestry is stale",
        );
        const sourceTree = gitText(["rev-parse", `${integration.sourceSubjectSha}^{tree}`]);
        if (sourceTree !== integration.sourceTreeSha) {
            fail(`Ordered integration source tree is stale: ${integration.integrationId}`);
        }
    }
    assertMatrices(
        report,
        context.scenarios ?? acceptedScenarioIdentities(context.workOrder.changeId),
        context.workOrder.conventionIds,
    );
    assertCommands(report);
    assertRequiredChecks(report);
    if (!Array.isArray(report.reviewReferences) || report.reviewReferences.length === 0) {
        fail("Integration report has a missing or blocking review reference");
    }
    const resolvedReviews = [];
    for (const reference of report.reviewReferences) {
        if (!reference.evidencePath.startsWith(`${context.changeRoot}/evidence/`)) {
            fail(`Review reference is outside the archived change root: ${reference.reportId}`);
        }
        const reportBytes = commitBytes(
            report.git.candidateSha,
            reference.evidencePath,
            `review reference ${reference.reportId}`,
        );
        if (sha256(reportBytes) !== reference.reportSha256) {
            fail(`Review reference digest is stale: ${reference.reportId}`);
        }
        let referencedReport;
        try {
            referencedReport = JSON.parse(reportBytes.toString("utf8"));
        } catch (error) {
            fail(`Cannot parse review reference ${reference.reportId}: ${error.message}`);
        }
        const referencedWorkOrder = parseCommitJson(
            report.git.candidateSha,
            posix.join(posix.dirname(reference.evidencePath), "work-order.json"),
            `work order for review reference ${reference.reportId}`,
        );
        const referencedCheckpoint = parseCommitJson(
            report.git.candidateSha,
            posix.join(posix.dirname(reference.evidencePath), "checkpoint.json"),
            `checkpoint for review reference ${reference.reportId}`,
        );
        const referencedChangeRoot = reference.evidencePath.slice(
            0,
            reference.evidencePath.indexOf("/evidence/"),
        );
        const trustedPlanning = validateAcceptedPlanningSnapshot(
            referencedWorkOrder,
            referencedChangeRoot,
            report.git.candidateSha,
        );
        validateReportSnapshot(referencedReport, referencedWorkOrder, {
            acceptance: trustedPlanning.acceptance,
            artifactDigest: trustedPlanning.artifactDigest,
            changeRoot: referencedChangeRoot,
            checkpoint: referencedCheckpoint,
            requireHead: false,
            revision: report.git.candidateSha,
        });
        if (
            referencedReport.reportId !== reference.reportId ||
            referencedReport.workOrder.workOrderDigest !== reference.workOrderDigest ||
            referencedReport.git.subjectSha !== reference.subjectSha ||
            referencedReport.git.subjectTreeSha !== reference.subjectTreeSha ||
            referencedReport.verdict !== reference.verdict
        ) {
            fail(`Review reference identity is stale: ${reference.reportId}`);
        }
        resolvedReviews.push({ reference, report: referencedReport });
    }
    for (const integration of report.orderedIntegrations) {
        const matches = resolvedReviews.filter(
            ({ reference }) =>
                reference.subjectSha === integration.sourceSubjectSha &&
                reference.subjectTreeSha === integration.sourceTreeSha &&
                reference.workOrderDigest === integration.workOrderDigest,
        );
        if (
            matches.length !== 1 ||
            matches[0].report.workOrder.workOrderId !== integration.workOrderId
        ) {
            fail(
                `Ordered integration lacks an exact resolved review: ${integration.integrationId}`,
            );
        }
        const [resolved] = matches;
        if (
            canonicalJson(normalizeInventory(integration.fileOperations)) !==
            canonicalJson(normalizeInventory(resolved.report.fileOperations))
        ) {
            fail(
                `Ordered integration inventory is not the reviewed inventory: ${integration.integrationId}`,
            );
        }
        const expectedParent = gitText(
            ["rev-parse", "--verify", `${integration.expectedCommitSha}^1`],
            { allowFailure: true },
        );
        if (!expectedParent) {
            fail(`Ordered integration commit has no first parent: ${integration.integrationId}`);
        }
        const integratedInventory = inventoryBetween(expectedParent, integration.expectedCommitSha);
        if (
            canonicalJson(normalizeInventory(integration.fileOperations)) !==
            canonicalJson(integratedInventory)
        ) {
            fail(
                `Ordered integration commit does not match its reviewed inventory: ${integration.integrationId}`,
            );
        }
    }
    const reviewedImplementationMatches = resolvedReviews.filter(
        ({ reference }) => reference.subjectSha === report.git.reviewedImplementationSha,
    );
    if (reviewedImplementationMatches.length !== 1) {
        fail("reviewedImplementationSha does not resolve from a validated review reference");
    }
    if (!Array.isArray(report.evidenceReferences) || report.evidenceReferences.length === 0) {
        fail("Integration report has missing or invalid evidence references");
    }
    const evidenceKindNames = {
        "work-order": "work-order.json",
        checkpoint: "checkpoint.json",
        "review-report": "review-report.json",
    };
    for (const reference of report.evidenceReferences) {
        const bytes = commitBytes(
            report.git.candidateSha,
            reference.path,
            `evidence reference ${reference.path}`,
        );
        if (
            sha256(bytes) !== reference.sha256 ||
            !reference.path.startsWith(`${context.changeRoot}/evidence/`) ||
            !reference.path.includes(`/evidence/${reference.subjectSha}/`) ||
            posix.basename(reference.path) !== evidenceKindNames[reference.kind]
        ) {
            fail(`Evidence reference identity is stale: ${reference.path}`);
        }
    }
    if (
        report.evidenceOnlyCommitValidation?.outcome !== "pass" ||
        !sha1Pattern.test(report.evidenceOnlyCommitValidation?.commitSha ?? "") ||
        !sha1Pattern.test(report.evidenceOnlyCommitValidation?.parentSha ?? "")
    ) {
        fail("Integration report lacks passing evidence-only commit validation");
    }
    const evidenceValidation = report.evidenceOnlyCommitValidation;
    assertCommitAvailable(evidenceValidation.commitSha, "evidence-only commit");
    assertAncestor(
        evidenceValidation.commitSha,
        report.git.candidateSha,
        "Evidence-only commit is not part of the final candidate",
    );
    const actualParent = gitText(["show", "-s", "--format=%P", evidenceValidation.commitSha]);
    if (actualParent !== evidenceValidation.parentSha) {
        fail("Evidence-only commit parent is stale");
    }
    const evidenceInventory = inventoryBetween(
        evidenceValidation.parentSha,
        evidenceValidation.commitSha,
    );
    if (
        canonicalJson(normalizeInventory(evidenceValidation.fileOperations)) !==
        canonicalJson(evidenceInventory)
    ) {
        fail("Evidence-only commit inventory is stale");
    }
    const evidencePaths = [
        ...evidenceInventory.additions,
        ...evidenceInventory.modifications,
        ...evidenceInventory.deletions,
        ...evidenceInventory.renames.flatMap((rename) => [rename.from, rename.to]),
    ].sort();
    if (
        canonicalJson([...evidenceValidation.expectedEvidencePaths].sort()) !==
        canonicalJson(evidencePaths)
    ) {
        fail("Evidence-only commit expected paths are stale");
    }
    const activeEvidencePrefix = `openspec/changes/${context.workOrder.changeId}/evidence/`;
    const relocatedEvidencePaths = evidencePaths.map((path) => {
        if (!path.startsWith(activeEvidencePrefix)) {
            fail(`Evidence-only commit path is not rooted in the active change: ${path}`);
        }
        return `${context.changeRoot}/evidence/${path.slice(activeEvidencePrefix.length)}`;
    });
    if (
        canonicalJson(report.evidenceReferences.map((reference) => reference.path).sort()) !==
        canonicalJson(relocatedEvidencePaths.sort())
    ) {
        fail("Integration evidence references do not cover the evidence-only commit");
    }
    const validatorArguments = [
        "scripts/agent-workflow/validate-evidence-commit.mjs",
        "--commit",
        evidenceValidation.commitSha,
    ];
    if (
        canonicalJson(evidenceValidation.validatorResult.arguments) !==
        canonicalJson(validatorArguments)
    ) {
        fail("Evidence-only validator invocation is stale");
    }
    const validatorRun = run(
        process.execPath,
        [resolve(repositoryRoot, validatorArguments[0]), ...validatorArguments.slice(1)],
        { allowFailure: true },
    );
    if (
        validatorRun.status !== evidenceValidation.validatorResult.exitCode ||
        sha256(validatorRun.stdout) !== evidenceValidation.validatorResult.stdoutSha256 ||
        sha256(validatorRun.stderr) !== evidenceValidation.validatorResult.stderrSha256 ||
        validatorRun.status !== 0
    ) {
        fail("Evidence-only validator result is stale or failing");
    }
    if (
        report.mergeEligibility?.eligible !== true ||
        report.mergeEligibility?.method !== "ff-only" ||
        report.mergeEligibility?.expectedMasterSha !== context.acceptance.baselineSha ||
        !isRfc3339DateTime(report.mergeEligibility?.checkedAt) ||
        Date.parse(report.mergeEligibility.checkedAt) < Date.parse(report.reviewer.reviewedAt) ||
        report.mergeEligibility?.blockers?.length !== 0
    ) {
        fail("Integration report is not eligible for an ff-only merge");
    }
    const masterSha = gitText(["rev-parse", "--verify", "refs/heads/master^{commit}"], {
        allowFailure: true,
    });
    if (masterSha !== report.mergeEligibility.expectedMasterSha) {
        fail("Master advanced from the accepted baseline");
    }
    assertFindingsAndRisks(report, context.acceptance.acceptedBy);
    return report;
}

export function validateReportSnapshot(report, workOrder, options = {}) {
    validateWorkOrder(workOrder);
    if (
        !options.acceptance ||
        options.acceptance.acceptedBy !== workOrder.issuedBy ||
        options.artifactDigest !== workOrder.acceptedArtifactDigest
    ) {
        fail("Review snapshot lacks trusted accepted-planning context");
    }
    const schemaName =
        report.reportKind === "final-integration-review"
            ? "integration-report"
            : report.reportKind === "implementation-review"
              ? "review-report"
              : undefined;
    if (!schemaName) {
        fail(`Unknown review report kind: ${report.reportKind}`);
    }
    if (report.reportKind === "final-integration-review") {
        const revision = options.revision ?? report.git?.candidateSha;
        const archivedRoot = resolveArchivedChangeRootAtRevision(report.changeId, revision);
        if (options.changeRoot && options.changeRoot !== archivedRoot) {
            fail("Final integration report is not rooted in the exact archived change");
        }
        options = { ...options, changeRoot: archivedRoot, revision };
    }
    validateJsonAgainstSchema(report, schemaPath(schemaName), "Review report");
    const context = {
        acceptance: options.acceptance,
        artifactDigest: options.artifactDigest,
        changeRoot: options.changeRoot ?? `openspec/changes/${workOrder.changeId}`,
        workOrder,
        scenarios:
            options.scenarios ??
            acceptedScenarioIdentitiesAtRoot(
                options.changeRoot ?? `openspec/changes/${workOrder.changeId}`,
                options.revision,
            ),
    };
    const result =
        report.reportKind === "final-integration-review"
            ? validateIntegrationReport(report, context, options)
            : validateImplementationReport(report, context, options);
    if (!options.checkpoint) {
        fail("Review checkpoint is missing");
    }
    assertCheckpoint(options.checkpoint, checkpointExpectation(report, workOrder), workOrder);
    return result;
}

export function validateReviewReport(reportPath, options = {}) {
    const absoluteReportPath = assertProtocolStatePath(
        resolve(repositoryRoot, reportPath),
        reportPath,
    );
    if (!existsSync(absoluteReportPath)) {
        fail(`Review report does not exist: ${reportPath}`);
    }
    const report = readJson(absoluteReportPath);
    const subjectRevision =
        report.reportKind === "final-integration-review"
            ? report.git?.candidateSha
            : report.git?.subjectSha;
    const changeRoot =
        options.changeRoot ??
        (report.reportKind === "final-integration-review"
            ? resolveArchivedChangeRootAtRevision(report.changeId, subjectRevision)
            : resolveChangeRootAtRevision(report.changeId, subjectRevision));
    const context = loadAndValidateContext(options.workOrderPath ?? defaultWorkOrderPath, {
        changeRoot,
        requireFeatureBranch: options.requireFeatureBranch,
    });
    context.scenarios = acceptedScenarioIdentitiesAtRoot(changeRoot, subjectRevision);
    validateWorkOrder(context.workOrder);
    const schemaName =
        report.reportKind === "final-integration-review"
            ? "integration-report"
            : report.reportKind === "implementation-review"
              ? "review-report"
              : undefined;
    if (!schemaName) {
        fail(`Unknown review report kind: ${report.reportKind}`);
    }
    validateJsonAgainstSchema(report, schemaPath(schemaName), "Review report");
    assertProtocolStatePath(checkpointPath);
    const checkpoint = readJson(checkpointPath);
    const result =
        report.reportKind === "final-integration-review"
            ? validateIntegrationReport(report, context, options)
            : validateImplementationReport(report, context, options);
    assertCheckpoint(
        checkpoint,
        checkpointExpectation(report, context.workOrder),
        context.workOrder,
    );
    return result;
}

function main() {
    const args = parseCliArgs(process.argv.slice(2), ["--report"]);
    const report = validateReviewReport(args["--report"]);
    console.log(
        `Review validation passed for ${report.reportId} at ${report.git.subjectSha ?? report.git.candidateSha}`,
    );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
    try {
        main();
    } catch (error) {
        console.error(`Review validation failed: ${error.message}`);
        process.exitCode = 1;
    }
}
