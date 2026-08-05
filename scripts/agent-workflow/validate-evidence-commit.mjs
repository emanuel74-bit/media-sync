import { basename, posix, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { inventoryBetween } from "./checkpoint.mjs";
import {
    canonicalJson,
    digestJson,
    fail,
    git,
    gitText,
    parseCliArgs,
    repositoryRoot,
    validateAcceptedPlanningSnapshot,
    validateRepositoryPath,
} from "./preflight.mjs";
import { validateReportSnapshot } from "./validate-review.mjs";

const sha1Pattern = /^[0-9a-f]{40}$/u;
const allowedEvidenceFiles = new Set([
    "checkpoint.json",
    "integration-report.json",
    "review-report.json",
    "work-order.json",
]);

function readJsonFromCommit(commitSha, path) {
    try {
        return JSON.parse(git(["show", `${commitSha}:${path}`]).stdout.toString("utf8"));
    } catch (error) {
        fail(`Cannot read JSON evidence ${path}: ${error.message}`);
    }
}

function evidenceLocation(path) {
    validateRepositoryPath(path);
    const active = path.match(/^openspec\/changes\/([a-z0-9-]+)\/evidence\/([0-9a-f]{40})\/(.+)$/u);
    const archived = path.match(
        /^openspec\/changes\/archive\/\d{4}-\d{2}-\d{2}-([a-z0-9-]+)\/evidence\/([0-9a-f]{40})\/(.+)$/u,
    );
    const match = active ?? archived;
    if (!match) {
        fail(`Evidence path is outside a change subject directory: ${path}`);
    }
    const [, changeId, subjectSha, file] = match;
    if (!allowedEvidenceFiles.has(file) || file.includes("/")) {
        fail(`Unexpected evidence file: ${path}`);
    }
    return {
        changeId,
        changeRoot: path.slice(0, path.indexOf("/evidence/")),
        directory: posix.dirname(path),
        file,
        subjectSha,
    };
}

function assertCommit(commitSha) {
    if (!sha1Pattern.test(commitSha)) {
        fail("Evidence commit must be a full lowercase Git SHA");
    }
    if (git(["cat-file", "-e", `${commitSha}^{commit}`], { allowFailure: true }).status !== 0) {
        fail(`Evidence commit is unavailable: ${commitSha}`);
    }
    const parents = gitText(["show", "-s", "--format=%P", commitSha]).split(/\s+/u).filter(Boolean);
    if (parents.length !== 1) {
        fail("Evidence commit must have exactly one parent");
    }
    return parents[0];
}

export function validateEvidenceCommit(commitSha) {
    const parentSha = assertCommit(commitSha);
    const inventory = inventoryBetween(parentSha, commitSha);
    if (inventory.deletions.length > 0 || inventory.renames.length > 0) {
        fail("Evidence commit cannot delete or rename files");
    }
    const changed = [...inventory.additions, ...inventory.modifications];
    if (changed.length === 0) {
        fail("Evidence commit has no evidence files");
    }
    const locations = changed.map(evidenceLocation);
    const first = locations[0];
    if (
        locations.some(
            (entry) =>
                entry.changeId !== first.changeId ||
                entry.changeRoot !== first.changeRoot ||
                entry.subjectSha !== first.subjectSha ||
                entry.directory !== first.directory,
        )
    ) {
        fail("Evidence commit spans multiple changes or reviewed subjects");
    }
    if (parentSha !== first.subjectSha) {
        fail("Evidence commit parent is not the exact reviewed subject");
    }
    const byName = new Map(locations.map((entry, index) => [entry.file, changed[index]]));
    for (const required of ["work-order.json", "checkpoint.json"]) {
        if (!byName.has(required)) {
            fail(`Evidence commit is missing ${required}`);
        }
    }
    const reportName = byName.has("review-report.json")
        ? "review-report.json"
        : byName.has("integration-report.json")
          ? "integration-report.json"
          : undefined;
    if (!reportName) {
        fail("Evidence commit is missing a review or integration report");
    }
    if (byName.has("review-report.json") && byName.has("integration-report.json")) {
        fail("Evidence commit must contain one report kind");
    }
    const workOrder = readJsonFromCommit(commitSha, byName.get("work-order.json"));
    const checkpoint = readJsonFromCommit(commitSha, byName.get("checkpoint.json"));
    const report = readJsonFromCommit(commitSha, byName.get(reportName));
    const reportSubject =
        report.reportKind === "implementation-review"
            ? report.git?.subjectSha
            : report.reportKind === "final-integration-review"
              ? report.git?.candidateSha
              : undefined;
    if (reportSubject !== parentSha || report.changeId !== first.changeId) {
        fail("Evidence report is not bound to the commit parent and change path");
    }
    if (
        report.workOrder?.workOrderId !== workOrder.workOrderId ||
        report.workOrder?.workOrderDigest !== digestJson(workOrder) ||
        checkpoint.workOrderId !== workOrder.workOrderId ||
        checkpoint.workOrderDigest !== digestJson(workOrder)
    ) {
        fail("Evidence work-order snapshot or digest is stale");
    }
    if (
        report.acceptedArtifactDigest !== workOrder.acceptedArtifactDigest ||
        checkpoint.acceptedArtifactDigest !== workOrder.acceptedArtifactDigest
    ) {
        fail("Evidence accepted-artifact digest is inconsistent");
    }
    if (canonicalJson(changed.sort()) !== canonicalJson([...new Set(changed)].sort())) {
        fail("Evidence commit contains duplicate path identities");
    }
    const trustedPlanning = validateAcceptedPlanningSnapshot(
        workOrder,
        first.changeRoot,
        commitSha,
    );
    validateReportSnapshot(report, workOrder, {
        acceptance: trustedPlanning.acceptance,
        artifactDigest: trustedPlanning.artifactDigest,
        changeRoot: first.changeRoot,
        checkpoint,
        requireHead: false,
        revision: commitSha,
    });
    return {
        changeId: first.changeId,
        commitSha,
        fileOperations: inventory,
        parentSha,
        reportName,
    };
}

function main() {
    const args = parseCliArgs(process.argv.slice(2), ["--commit"]);
    const result = validateEvidenceCommit(args["--commit"]);
    console.log(
        `Evidence commit validation passed for ${result.commitSha}; parent ${result.parentSha}`,
    );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
    try {
        main();
    } catch (error) {
        console.error(`Evidence commit validation failed: ${error.message}`);
        process.exitCode = 1;
    }
}
