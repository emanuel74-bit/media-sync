import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import {
    assertInsideRepository,
    assertPhysicalPathInside,
    assertProtocolStatePath,
    baselinePath,
    canonicalJson,
    classifyPath,
    defaultWorkOrderPath,
    digestJson,
    fail,
    git,
    gitExecutableArguments,
    focusedCommandIdentity,
    hashPath,
    indexIdentity,
    loadAndValidateContext,
    normalizeRepositoryPath,
    parseCliArgs,
    readJson,
    repositoryPathIsWithin,
    repositoryRoot,
    run,
    sha256,
    validateRepositoryPath,
    writeJson,
    workDirectory,
} from "./preflight.mjs";

export const checkpointPath = resolve(workDirectory, "checkpoint.json");

function zeroSeparated(buffer) {
    return buffer.toString("utf8").split("\0").filter(Boolean);
}

function parseNameStatus(buffer) {
    const fields = zeroSeparated(buffer);
    const inventory = {
        additions: [],
        modifications: [],
        deletions: [],
        renames: [],
    };
    for (let index = 0; index < fields.length; ) {
        const status = fields[index];
        index += 1;
        if (/^[RC][0-9]+$/u.test(status)) {
            const from = fields[index];
            const to = fields[index + 1];
            index += 2;
            if (status.startsWith("R")) {
                inventory.renames.push({ from, to });
            } else {
                inventory.additions.push(to);
            }
            continue;
        }
        const path = fields[index];
        index += 1;
        if (status === "A") {
            inventory.additions.push(path);
        } else if (status === "D") {
            inventory.deletions.push(path);
        } else if (["M", "T"].includes(status)) {
            inventory.modifications.push(path);
        } else {
            fail(`Unsupported or conflicted Git status ${status} for ${path}`);
        }
    }
    return inventory;
}

function sortInventory(inventory) {
    return {
        additions: [...new Set(inventory.additions)].sort(),
        modifications: [...new Set(inventory.modifications)].sort(),
        deletions: [...new Set(inventory.deletions)].sort(),
        renames: [...inventory.renames].sort((left, right) =>
            `${left.from}\0${left.to}`.localeCompare(`${right.from}\0${right.to}`),
        ),
    };
}

export function inventoryBetween(baseSha, subjectSha) {
    return sortInventory(
        parseNameStatus(
            git(["diff", "--name-status", "-z", "--find-renames=50%", baseSha, subjectSha]).stdout,
        ),
    );
}

export function worktreeInventory(baseSha, exactPaths = []) {
    const inventory = parseNameStatus(
        git(["diff", "--name-status", "-z", "--find-renames=50%", baseSha]).stdout,
    );
    const ordinaryUntracked = zeroSeparated(
        git(["ls-files", "--others", "--exclude-standard", "-z"]).stdout,
    );
    const exactUntracked = exactPaths.filter(
        (path) => !indexIdentity(path).present && hashPath(path).kind !== "missing",
    );
    inventory.additions.push(...ordinaryUntracked, ...exactUntracked);
    return sortInventory(inventory);
}

function operationPaths(inventory) {
    return [
        ...inventory.additions,
        ...inventory.modifications,
        ...inventory.deletions,
        ...inventory.renames.flatMap((rename) => [rename.from, rename.to]),
    ];
}

function removeBaselineState(inventory, baseline, ignoredPaths = []) {
    const baselineRoots = baseline.entries.map((entry) => entry.path);
    const ignoredPathSet = new Set(ignoredPaths.map(normalizeRepositoryPath));
    const isPreserved = (path) =>
        ignoredPathSet.has(normalizeRepositoryPath(path)) ||
        baselineRoots.some((root) => repositoryPathIsWithin(path, root));
    return sortInventory({
        additions: inventory.additions.filter((path) => !isPreserved(path)),
        modifications: inventory.modifications.filter((path) => !isPreserved(path)),
        deletions: inventory.deletions.filter((path) => !isPreserved(path)),
        renames: inventory.renames.filter(
            (rename) => !isPreserved(rename.from) && !isPreserved(rename.to),
        ),
    });
}

function promoteExpectedRenames(inventory, workOrder) {
    const additions = new Set(inventory.additions.map(normalizeRepositoryPath));
    const deletions = new Set(inventory.deletions.map(normalizeRepositoryPath));
    const promoted = workOrder.expectedRenames.filter(
        (rename) =>
            additions.has(normalizeRepositoryPath(rename.to)) &&
            deletions.has(normalizeRepositoryPath(rename.from)),
    );
    const promotedAdditions = new Set(promoted.map((rename) => normalizeRepositoryPath(rename.to)));
    const promotedDeletions = new Set(
        promoted.map((rename) => normalizeRepositoryPath(rename.from)),
    );
    return sortInventory({
        additions: inventory.additions.filter(
            (path) => !promotedAdditions.has(normalizeRepositoryPath(path)),
        ),
        modifications: inventory.modifications,
        deletions: inventory.deletions.filter(
            (path) => !promotedDeletions.has(normalizeRepositoryPath(path)),
        ),
        renames: [...inventory.renames, ...promoted],
    });
}

function assertSameSet(actual, expected, label) {
    const actualSet = new Set(actual.map(normalizeRepositoryPath));
    const expectedSet = new Set(expected.map(normalizeRepositoryPath));
    const missing = expected.filter((path) => !actualSet.has(normalizeRepositoryPath(path)));
    const unexpected = actual.filter((path) => !expectedSet.has(normalizeRepositoryPath(path)));
    if (missing.length > 0 || unexpected.length > 0) {
        fail(
            `${label} mismatch; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}]`,
        );
    }
}

function assertSameRenames(actual, expected) {
    const key = (rename) =>
        `${normalizeRepositoryPath(rename.from)}\0${normalizeRepositoryPath(rename.to)}`;
    const actualKeys = new Set(actual.map(key));
    const expectedKeys = new Set(expected.map(key));
    const missing = expected.filter((rename) => !actualKeys.has(key(rename)));
    const unexpected = actual.filter((rename) => !expectedKeys.has(key(rename)));
    if (missing.length > 0 || unexpected.length > 0) {
        fail(
            `rename mismatch; missing=[${missing.map(key).join(", ")}], unexpected=[${unexpected.map(key).join(", ")}]`,
        );
    }
}

export function validateInventory(inventory, workOrder) {
    const allowed = new Set(workOrder.allowedPaths.map(normalizeRepositoryPath));
    for (const path of operationPaths(inventory)) {
        validateRepositoryPath(path);
        assertPhysicalPathInside(path);
        const normalized = normalizeRepositoryPath(path);
        if (workOrder.forbiddenPaths.some((root) => repositoryPathIsWithin(path, root))) {
            fail(`Changed path is forbidden: ${path}`);
        }
        if (workOrder.protectedPaths.some((root) => repositoryPathIsWithin(path, root))) {
            fail(`Changed path is protected: ${path}`);
        }
        if (!allowed.has(normalized)) {
            fail(`Changed path is outside allowedPaths: ${path}`);
        }
    }
    assertSameSet(inventory.additions, workOrder.expectedAdditions, "addition");
    assertSameSet(inventory.modifications, workOrder.expectedModifications, "modification");
    assertSameSet(inventory.deletions, workOrder.expectedDeletions, "deletion");
    assertSameRenames(inventory.renames, workOrder.expectedRenames);
}

export function loadAndValidateBaseline(workOrder) {
    assertProtocolStatePath(baselinePath);
    if (!existsSync(baselinePath)) {
        fail("Preflight baseline is missing");
    }
    const baseline = readJson(baselinePath);
    if (
        baseline.schemaVersion !== 1 ||
        baseline.workOrderId !== workOrder.workOrderId ||
        baseline.workOrderDigest !== digestJson(workOrder) ||
        baseline.baseSha !== workOrder.baseSha ||
        !Array.isArray(baseline.entries)
    ) {
        fail("Preflight baseline is stale or invalid");
    }
    const expectedPaths = [...workOrder.protectedPaths].map(normalizeRepositoryPath).sort();
    const actualPaths = baseline.entries.map((entry) => normalizeRepositoryPath(entry.path)).sort();
    if (
        new Set(actualPaths).size !== actualPaths.length ||
        canonicalJson(actualPaths) !== canonicalJson(expectedPaths)
    ) {
        fail("Preflight baseline does not exactly cover protectedPaths");
    }
    for (const entry of baseline.entries) {
        validateRepositoryPath(entry.path);
        const current = hashPath(entry.path);
        const currentIndex = indexIdentity(entry.path);
        if (
            entry.scope !== "protected" ||
            !["tracked", "ignored", "untracked"].includes(entry.classification) ||
            typeof entry.index?.present !== "boolean" ||
            !Array.isArray(entry.index?.entries) ||
            !["file", "directory", "symbolic-link", "missing"].includes(entry.kind) ||
            !Number.isInteger(entry.mode) ||
            !Number.isInteger(entry.size) ||
            !/^[0-9a-f]{64}$/u.test(entry.sha256 ?? "") ||
            classifyPath(entry.path) !== entry.classification ||
            canonicalJson(currentIndex) !== canonicalJson(entry.index) ||
            current.kind !== entry.kind ||
            current.mode !== entry.mode ||
            current.size !== entry.size ||
            current.sha256 !== entry.sha256
        ) {
            fail(`Protected pre-existing state changed: ${entry.path}`);
        }
    }
    return baseline;
}

function assertNoCaseCollisions(workOrder) {
    const paths = [
        ...zeroSeparated(git(["ls-files", "-z"]).stdout),
        ...zeroSeparated(git(["ls-files", "--others", "--exclude-standard", "-z"]).stdout),
        ...[...workOrder.forbiddenPaths, ...workOrder.protectedPaths].filter(
            (path) => indexIdentity(path).present || hashPath(path).kind !== "missing",
        ),
    ];
    const seen = new Map();
    for (const path of paths) {
        const normalized = normalizeRepositoryPath(path);
        const prior = seen.get(normalized);
        if (prior && prior !== path) {
            fail(`Case-ambiguous repository paths: ${prior} and ${path}`);
        }
        seen.set(normalized, path);
    }
}

function assertNoWhitespaceErrors(inventory, baseSha) {
    const diffCheck = git(["diff", "--check", baseSha], { allowFailure: true });
    if (diffCheck.status !== 0) {
        fail(`git diff --check failed: ${diffCheck.stdout.toString("utf8").trim()}`);
    }
    const paths = [
        ...inventory.additions,
        ...inventory.modifications,
        ...inventory.renames.map((rename) => rename.to),
    ];
    for (const path of [...new Set(paths)]) {
        const absolute = resolve(repositoryRoot, path.split("/").join(sep));
        assertInsideRepository(absolute, path);
        if (!existsSync(absolute) || !/\.(?:c?js|mjs|json|md|txt|ts|tsx|yaml|yml)$/iu.test(path)) {
            continue;
        }
        const lines = readFileSync(absolute, "utf8").split(/\r?\n/u);
        const invalidLine = lines.findIndex((line) => /[ \t]+$/u.test(line));
        if (invalidLine >= 0) {
            fail(`Trailing whitespace at ${path}:${invalidLine + 1}`);
        }
    }
}

function runFocusedCommands(workOrder) {
    const records = [];
    for (const command of workOrder.focusedCommands) {
        const cwd = command.cwd === "." ? repositoryRoot : resolve(repositoryRoot, command.cwd);
        assertInsideRepository(cwd, command.cwd);
        if (!existsSync(cwd)) {
            fail(`Focused command cwd does not exist: ${command.cwd}`);
        }
        assertPhysicalPathInside(command.cwd);
        if (!statSync(cwd).isDirectory()) {
            fail(`Focused command cwd is not a directory: ${command.cwd}`);
        }
        const executableLeaf = command.argv[0].split(/[\\/]/u).at(-1).toLocaleLowerCase("en-US");
        const argumentsList = /^(?:git|git\.exe)$/iu.test(executableLeaf)
            ? gitExecutableArguments(repositoryRoot, command.argv.slice(1))
            : command.argv.slice(1);
        const result = run(command.argv[0], argumentsList, {
            cwd,
            allowFailure: true,
        });
        const record = {
            ...focusedCommandIdentity(command),
            exitCode: result.status,
            stdoutSha256: sha256(result.stdout ?? Buffer.alloc(0)),
            stderrSha256: sha256(result.stderr ?? Buffer.alloc(0)),
            outcome: result.status === 0 ? "pass" : "fail",
        };
        records.push(record);
        if (result.status !== 0) {
            break;
        }
    }
    return records;
}

function rawGitFileIdentity(gitPath) {
    if (!gitPath) {
        return { path: "", present: false, size: 0, sha256: sha256(Buffer.from("missing")) };
    }
    const absolute = isAbsolute(gitPath) ? resolve(gitPath) : resolve(repositoryRoot, gitPath);
    if (!existsSync(absolute)) {
        return { path: gitPath, present: false, size: 0, sha256: sha256(Buffer.from("missing")) };
    }
    const bytes = readFileSync(absolute);
    return { path: gitPath, present: true, size: bytes.length, sha256: sha256(bytes) };
}

function captureRawIndexState() {
    const indexPath = git(["rev-parse", "--path-format=absolute", "--git-path", "index"])
        .stdout.toString("utf8")
        .trim();
    if (existsSync(`${indexPath}.lock`)) {
        fail("Git index lock is present");
    }
    const sharedResult = git(["rev-parse", "--shared-index-path"], { allowFailure: true });
    const sharedIndexPath =
        sharedResult.status === 0 ? sharedResult.stdout.toString("utf8").trim() : "";
    return {
        index: rawGitFileIdentity(indexPath),
        sharedIndex: rawGitFileIdentity(sharedIndexPath),
    };
}

function captureFocusedCommandState(workOrder) {
    const paths = [
        ...new Set([
            ...workOrder.allowedPaths,
            ...workOrder.forbiddenPaths,
            ...workOrder.protectedPaths,
        ]),
    ].sort();
    const branchResult = git(["symbolic-ref", "--quiet", "--short", "HEAD"], {
        allowFailure: true,
    });
    return {
        branch: branchResult.status === 0 ? branchResult.stdout.toString("utf8").trim() : null,
        headSha: git(["rev-parse", "HEAD"]).stdout.toString("utf8").trim(),
        index: captureRawIndexState(),
        paths: paths.map((path) => ({
            path,
            classification: classifyPath(path),
            index: indexIdentity(path),
            ...hashPath(path),
        })),
    };
}

export function runCheckpoint(workOrderPath = defaultWorkOrderPath, options = {}) {
    const context = loadAndValidateContext(workOrderPath);
    const baseline = loadAndValidateBaseline(context.workOrder);
    assertNoCaseCollisions(context.workOrder);
    const exactPreservedPaths = [
        ...context.workOrder.forbiddenPaths,
        ...context.workOrder.protectedPaths,
    ];
    const ignoredTaskPaths =
        context.workOrder.role === "implementer"
            ? [`openspec/changes/${context.workOrder.changeId}/tasks.md`]
            : [];
    const beforeInventory = promoteExpectedRenames(
        removeBaselineState(
            worktreeInventory(context.workOrder.baseSha, exactPreservedPaths),
            baseline,
            ignoredTaskPaths,
        ),
        context.workOrder,
    );
    validateInventory(beforeInventory, context.workOrder);
    assertNoWhitespaceErrors(beforeInventory, context.workOrder.baseSha);
    const beforeCommandState = captureFocusedCommandState(context.workOrder);
    const commands = options.skipCommands ? [] : runFocusedCommands(context.workOrder);
    const failedCommand = commands.find((command) => command.outcome === "fail");
    let inventory = beforeInventory;
    let postCommandError;
    try {
        const afterCommandState = captureFocusedCommandState(context.workOrder);
        if (canonicalJson(beforeCommandState) !== canonicalJson(afterCommandState)) {
            fail("Focused commands changed repository state");
        }
        const afterBaseline = loadAndValidateBaseline(context.workOrder);
        assertNoCaseCollisions(context.workOrder);
        inventory = promoteExpectedRenames(
            removeBaselineState(
                worktreeInventory(context.workOrder.baseSha, exactPreservedPaths),
                afterBaseline,
                ignoredTaskPaths,
            ),
            context.workOrder,
        );
        validateInventory(inventory, context.workOrder);
        assertNoWhitespaceErrors(inventory, context.workOrder.baseSha);
        if (canonicalJson(beforeInventory) !== canonicalJson(inventory)) {
            fail("Focused commands changed the declared file-operation inventory");
        }
    } catch (error) {
        postCommandError = error;
    }
    const report = {
        schemaVersion: 1,
        workOrderId: context.workOrder.workOrderId,
        workOrderDigest: digestJson(context.workOrder),
        acceptedArtifactDigest: context.artifactDigest,
        baseSha: context.workOrder.baseSha,
        headSha: git(["rev-parse", "HEAD"]).stdout.toString("utf8").trim(),
        recordedAt: new Date().toISOString(),
        fileOperations: inventory,
        commands,
    };
    writeJson(checkpointPath, report);
    if (failedCommand || postCommandError) {
        const failures = [];
        if (failedCommand) {
            failures.push(
                `Focused command ${failedCommand.commandId} failed: ${canonicalJson(failedCommand)}`,
            );
        }
        if (postCommandError) {
            failures.push(`Post-command integrity failed: ${postCommandError.message}`);
        }
        fail(failures.join("\n"));
    }
    return report;
}

function main() {
    const args = parseCliArgs(process.argv.slice(2), ["--work-order"]);
    const report = runCheckpoint(args["--work-order"]);
    console.log(
        `Checkpoint passed for ${report.workOrderId}; operations: ${operationPaths(report.fileOperations).length}`,
    );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
    try {
        main();
    } catch (error) {
        console.error(`Checkpoint failed: ${error.message}`);
        process.exitCode = 1;
    }
}
