import { createHash } from "node:crypto";
import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    readlinkSync,
    realpathSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const workDirectory = resolve(repositoryRoot, ".agents/work");
export const defaultWorkOrderPath = resolve(workDirectory, "active-work-order.json");
export const baselinePath = resolve(workDirectory, "baseline.json");

const workOrderKeys = new Set([
    "schemaVersion",
    "workOrderId",
    "changeId",
    "role",
    "taskIds",
    "acceptedArtifactDigest",
    "baseSha",
    "issuedBy",
    "issuedAt",
    "allowedPaths",
    "forbiddenPaths",
    "protectedPaths",
    "expectedAdditions",
    "expectedModifications",
    "expectedDeletions",
    "expectedRenames",
    "requiredDocuments",
    "conventionIds",
    "focusedCommands",
    "nonGoals",
    "stopConditions",
]);

const requiredWorkOrderKeys = [...workOrderKeys];
const shellExecutables = new Set([
    "ash",
    "bash",
    "cmd",
    "command",
    "csh",
    "dash",
    "fish",
    "ksh",
    "powershell",
    "pwsh",
    "sh",
    "tcsh",
    "wsl",
    "zsh",
]);
const shellWrapperExecutables = new Set([
    "busybox",
    "env",
    "nice",
    "nohup",
    "npm",
    "npx",
    "pnpm",
    "pnpx",
    "setsid",
    "stdbuf",
    "timeout",
    "toybox",
    "xargs",
    "yarn",
    "yarnpkg",
]);
export const nodeInjectionEnvironmentVariables = Object.freeze([
    "NPM_CONFIG_NODE_OPTIONS",
    "NPM_EXECPATH",
    "NODE_COMPILE_CACHE",
    "NODE_EXTRA_CA_CERTS",
    "NODE_ICU_DATA",
    "NODE_OPTIONS",
    "NODE_PATH",
    "NODE_REPL_EXTERNAL_MODULE",
    "NODE_V8_COVERAGE",
]);
const nodeInjectionVariables = new Set(nodeInjectionEnvironmentVariables);
const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
const gitShaPattern = /^[0-9a-f]{40}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const identifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const taskIdPattern = /^[1-9][0-9]*(?:\.[1-9][0-9]*)*$/;
const conventionPattern = /^[A-Z][A-Z0-9]*-[0-9]{2}$/;
const rfc3339Pattern =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/u;

export function fail(message) {
    throw new Error(message);
}

export function sha256(value) {
    return createHash("sha256").update(value).digest("hex");
}

export function isRfc3339DateTime(value) {
    if (typeof value !== "string") {
        return false;
    }
    const match = value.match(rfc3339Pattern);
    if (!match || Number.isNaN(Date.parse(value))) {
        return false;
    }
    const [, year, month, day, hour, minute, second, , offsetHour, offsetMinute] = match;
    const monthNumber = Number(month);
    const dayNumber = Number(day);
    const daysInMonth = new Date(Date.UTC(Number(year), monthNumber, 0)).getUTCDate();
    return (
        monthNumber >= 1 &&
        monthNumber <= 12 &&
        dayNumber >= 1 &&
        dayNumber <= daysInMonth &&
        Number(hour) <= 23 &&
        Number(minute) <= 59 &&
        Number(second) <= 59 &&
        (offsetHour === undefined || (Number(offsetHour) <= 23 && Number(offsetMinute) <= 59))
    );
}

export function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
    }
    if (value && typeof value === "object") {
        const entries = Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
        return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value);
}

export function digestJson(value) {
    return sha256(Buffer.from(canonicalJson(value), "utf8"));
}

export function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        fail(`Cannot parse JSON at ${path}: ${error.message}`);
    }
}

export function sanitizedSubprocessEnvironment(environment = process.env, overrides = {}) {
    const merged = { ...environment, ...overrides };
    const sanitized = {};
    for (const [key, value] of Object.entries(merged)) {
        const normalized = key.toLocaleUpperCase("en-US");
        if (normalized.startsWith("GIT_") || nodeInjectionVariables.has(normalized)) {
            continue;
        }
        sanitized[key] = value;
    }
    return {
        ...sanitized,
        GIT_ATTR_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: nullDevice,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_SYSTEM: nullDevice,
        GIT_NO_REPLACE_OBJECTS: "1",
        GIT_OPTIONAL_LOCKS: "0",
        GIT_PAGER: "cat",
        GIT_TERMINAL_PROMPT: "0",
        DO_NOT_TRACK: "1",
        OPENSPEC_TELEMETRY: "0",
    };
}

export function gitExecutableArguments(root, args) {
    const normalizedRoot = root.replaceAll("\\", "/");
    return [
        "-c",
        `safe.directory=${normalizedRoot}`,
        "-c",
        `core.attributesFile=${nullDevice}`,
        "-c",
        `core.excludesFile=${nullDevice}`,
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.whitespace=blank-at-eol,blank-at-eof,space-before-tab",
        "-c",
        "core.abbrev=40",
        "-c",
        "color.ui=false",
        "-c",
        "diff.noprefix=false",
        "-c",
        "diff.mnemonicPrefix=false",
        ...args,
    ];
}

function schemaTypeMatches(value, type) {
    switch (type) {
        case "array":
            return Array.isArray(value);
        case "integer":
            return Number.isInteger(value);
        case "null":
            return value === null;
        case "object":
            return value !== null && typeof value === "object" && !Array.isArray(value);
        default:
            return typeof value === type;
    }
}

function resolveSchemaReference(rootSchema, reference) {
    if (!reference.startsWith("#/")) {
        fail(`Unsupported JSON Schema reference: ${reference}`);
    }
    return reference
        .slice(2)
        .split("/")
        .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
        .reduce((value, part) => value?.[part], rootSchema);
}

function collectSchemaErrors(value, schema, rootSchema, location) {
    const errors = [];
    if (schema.$ref) {
        const referenced = resolveSchemaReference(rootSchema, schema.$ref);
        if (!referenced) {
            return [`${location}: unresolved JSON Schema reference ${schema.$ref}`];
        }
        errors.push(...collectSchemaErrors(value, referenced, rootSchema, location));
    }
    if (schema.const !== undefined && canonicalJson(value) !== canonicalJson(schema.const)) {
        errors.push(`${location}: value does not match const`);
    }
    if (
        schema.enum &&
        !schema.enum.some((entry) => canonicalJson(entry) === canonicalJson(value))
    ) {
        errors.push(`${location}: value is not in enum`);
    }
    if (schema.type && !schemaTypeMatches(value, schema.type)) {
        errors.push(`${location}: expected ${schema.type}`);
        return errors;
    }
    if (typeof value === "string") {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
            errors.push(`${location}: shorter than minLength ${schema.minLength}`);
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            errors.push(`${location}: longer than maxLength ${schema.maxLength}`);
        }
        if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) {
            errors.push(`${location}: does not match pattern`);
        }
        if (schema.format === "date-time" && !isRfc3339DateTime(value)) {
            errors.push(`${location}: invalid date-time`);
        }
    }
    if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${location}: smaller than minimum ${schema.minimum}`);
    }
    if (Array.isArray(value)) {
        if (schema.minItems !== undefined && value.length < schema.minItems) {
            errors.push(`${location}: has fewer than ${schema.minItems} items`);
        }
        if (schema.maxItems !== undefined && value.length > schema.maxItems) {
            errors.push(`${location}: has more than ${schema.maxItems} items`);
        }
        if (schema.uniqueItems) {
            const identities = value.map(canonicalJson);
            if (new Set(identities).size !== identities.length) {
                errors.push(`${location}: items are not unique`);
            }
        }
        if (schema.items) {
            value.forEach((entry, index) => {
                errors.push(
                    ...collectSchemaErrors(
                        entry,
                        schema.items,
                        rootSchema,
                        `${location}[${index}]`,
                    ),
                );
            });
        }
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        for (const required of schema.required ?? []) {
            if (!(required in value)) {
                errors.push(`${location}: missing required property ${required}`);
            }
        }
        for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
            if (key in value) {
                errors.push(
                    ...collectSchemaErrors(
                        value[key],
                        propertySchema,
                        rootSchema,
                        `${location}.${key}`,
                    ),
                );
            }
        }
        if (schema.additionalProperties === false) {
            for (const key of Object.keys(value)) {
                if (!(key in (schema.properties ?? {}))) {
                    errors.push(`${location}: unexpected property ${key}`);
                }
            }
        }
    }
    for (const clause of schema.allOf ?? []) {
        errors.push(...collectSchemaErrors(value, clause, rootSchema, location));
    }
    if (schema.anyOf) {
        const alternatives = schema.anyOf.map((clause) =>
            collectSchemaErrors(value, clause, rootSchema, location),
        );
        if (!alternatives.some((alternative) => alternative.length === 0)) {
            errors.push(`${location}: does not satisfy anyOf`);
        }
    }
    if (schema.if) {
        const conditionMatches =
            collectSchemaErrors(value, schema.if, rootSchema, location).length === 0;
        const branch = conditionMatches ? schema.then : schema.else;
        if (branch) {
            errors.push(...collectSchemaErrors(value, branch, rootSchema, location));
        }
    }
    return errors;
}

export function validateJsonAgainstSchema(value, schemaPath, label = "JSON document") {
    const schema = readJson(schemaPath);
    const errors = collectSchemaErrors(value, schema, schema, "$");
    if (errors.length > 0) {
        fail(`${label} violates ${basename(schemaPath)}: ${errors.slice(0, 5).join("; ")}`);
    }
    return value;
}

export function run(executable, args, options = {}) {
    const result = spawnSync(executable, args, {
        cwd: options.cwd ?? repositoryRoot,
        encoding: null,
        env: sanitizedSubprocessEnvironment(options.env ?? process.env, options.envOverrides),
        maxBuffer: 64 * 1024 * 1024,
        shell: false,
        windowsHide: true,
    });
    if (result.error) {
        fail(`Cannot run ${executable}: ${result.error.message}`);
    }
    if (!options.allowFailure && result.status !== 0) {
        const stderr = result.stderr?.toString("utf8").trim();
        fail(`${executable} ${args.join(" ")} failed (${result.status}): ${stderr}`);
    }
    return result;
}

export function git(args, options = {}) {
    return run("git", gitExecutableArguments(repositoryRoot, args), options);
}

export function gitText(args, options = {}) {
    return git(args, options).stdout.toString("utf8").trim();
}

export function parseCliArgs(argv, supported) {
    const result = {};
    for (let index = 0; index < argv.length; index += 2) {
        const key = argv[index];
        const value = argv[index + 1];
        if (!supported.includes(key) || !value) {
            fail(`Expected ${supported.join(" or ")} with a value`);
        }
        result[key] = value;
    }
    return result;
}

export function repositoryPathKey(value, platform = process.platform) {
    validateRepositoryPath(value);
    return platform === "win32" ? value.toLocaleLowerCase("en-US") : value;
}

export function normalizeRepositoryPath(value) {
    return repositoryPathKey(value);
}

export function repositoryPathIsWithin(path, root) {
    const pathKey = repositoryPathKey(path);
    const rootKey = repositoryPathKey(root);
    return pathKey === rootKey || pathKey.startsWith(`${rootKey}/`);
}

export function validateRepositoryPath(value) {
    if (typeof value !== "string" || value.length === 0) {
        fail("Repository paths must be non-empty strings");
    }
    if (
        isAbsolute(value) ||
        value.includes("\\") ||
        value.includes(":") ||
        value.includes("//") ||
        value.endsWith("/") ||
        value.split("/").some((segment) => segment === "." || segment === ".." || segment === "") ||
        /[\u0000-\u001f\u007f*?"<>|]/u.test(value)
    ) {
        fail(`Invalid repository-relative POSIX path: ${value}`);
    }
    return value;
}

function assertExactKeys(value, allowed, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        fail(`${label} must be an object`);
    }
    const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
    if (unexpected.length > 0) {
        fail(`${label} has unexpected fields: ${unexpected.join(", ")}`);
    }
}

function assertString(value, label, pattern) {
    if (typeof value !== "string" || value.length === 0 || (pattern && !pattern.test(value))) {
        fail(`${label} is invalid`);
    }
}

function assertStringArray(value, label, pattern, allowEmpty = true) {
    if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
        fail(`${label} must be ${allowEmpty ? "an array" : "a non-empty array"}`);
    }
    const seen = new Set();
    for (const entry of value) {
        assertString(entry, `${label} entry`, pattern);
        if (seen.has(entry)) {
            fail(`${label} has a duplicate entry: ${entry}`);
        }
        seen.add(entry);
    }
}

function assertPathArray(value, label, allowEmpty = true) {
    assertStringArray(value, label, undefined, allowEmpty);
    const seen = new Set();
    for (const entry of value) {
        validateRepositoryPath(entry);
        const normalized = normalizeRepositoryPath(entry);
        if (seen.has(normalized)) {
            fail(`${label} has a duplicate or case-ambiguous entry: ${entry}`);
        }
        seen.add(normalized);
    }
}

function assertTextArray(value, label) {
    assertStringArray(value, label, undefined, false);
    if (value.some((entry) => entry.trim().length === 0)) {
        fail(`${label} contains blank text`);
    }
}

function assertShellFreeCommand(command) {
    assertExactKeys(command, new Set(["commandId", "cwd", "argv"]), "focused command");
    assertString(command.commandId, "focused command id", identifierPattern);
    if (command.cwd !== ".") {
        validateRepositoryPath(command.cwd);
    }
    if (!Array.isArray(command.argv) || command.argv.length === 0) {
        fail("Focused command argv must be a non-empty fixed argument array");
    }
    for (const argument of command.argv) {
        if (
            typeof argument !== "string" ||
            argument.length === 0 ||
            /[\u0000\r\n]/u.test(argument)
        ) {
            fail(`Focused command ${command.commandId} contains an invalid argument`);
        }
    }
    const executableToken = command.argv[0];
    const executableLeaf = (value) => value.split(/[\\/]/u).at(-1);
    const normalizedExecutable = (value) =>
        executableLeaf(value)
            .replace(/\.(?:cmd|com|exe)$/i, "")
            .toLocaleLowerCase("en-US");
    const executable = normalizedExecutable(executableToken);
    if (shellExecutables.has(executable) || /\.(?:bat|cmd|ps1|sh)$/iu.test(executableToken)) {
        fail(`Focused command ${command.commandId} uses a shell executable`);
    }
    if (shellWrapperExecutables.has(executable)) {
        fail(`Focused command ${command.commandId} uses an indirect shell wrapper`);
    }
}

export function focusedCommandIdentity(command) {
    return {
        commandId: command.commandId,
        cwd: command.cwd,
        executable: command.argv[0],
        arguments: command.argv.slice(1),
    };
}

export function validateWorkOrder(workOrder) {
    validateJsonAgainstSchema(
        workOrder,
        resolve(repositoryRoot, ".agents/templates/work-order.schema.json"),
        "Work order",
    );
    assertExactKeys(workOrder, workOrderKeys, "work order");
    for (const key of requiredWorkOrderKeys) {
        if (!(key in workOrder)) {
            fail(`Work order is missing ${key}`);
        }
    }
    if (workOrder.schemaVersion !== 1) {
        fail("Unsupported work-order schemaVersion");
    }
    assertString(workOrder.workOrderId, "workOrderId", identifierPattern);
    assertString(workOrder.changeId, "changeId", identifierPattern);
    if (!["implementer", "integration"].includes(workOrder.role)) {
        fail("Work-order role must be implementer or integration");
    }
    assertStringArray(workOrder.taskIds, "taskIds", taskIdPattern, false);
    assertString(workOrder.acceptedArtifactDigest, "acceptedArtifactDigest", sha256Pattern);
    assertString(workOrder.baseSha, "baseSha", gitShaPattern);
    assertString(workOrder.issuedBy, "issuedBy", identifierPattern);
    if (!isRfc3339DateTime(workOrder.issuedAt)) {
        fail("issuedAt must be an RFC 3339 timestamp");
    }
    for (const key of [
        "allowedPaths",
        "forbiddenPaths",
        "protectedPaths",
        "expectedAdditions",
        "expectedModifications",
        "expectedDeletions",
        "requiredDocuments",
    ]) {
        assertPathArray(workOrder[key], key, !["allowedPaths", "requiredDocuments"].includes(key));
    }
    if (!Array.isArray(workOrder.expectedRenames)) {
        fail("expectedRenames must be an array");
    }
    const renameKeys = new Set();
    for (const rename of workOrder.expectedRenames) {
        assertExactKeys(rename, new Set(["from", "to"]), "rename");
        validateRepositoryPath(rename.from);
        validateRepositoryPath(rename.to);
        if (normalizeRepositoryPath(rename.from) === normalizeRepositoryPath(rename.to)) {
            fail(`Rename source and destination conflict: ${rename.from}`);
        }
        const key = `${normalizeRepositoryPath(rename.from)}\0${normalizeRepositoryPath(rename.to)}`;
        if (renameKeys.has(key)) {
            fail(`Duplicate rename: ${rename.from} -> ${rename.to}`);
        }
        renameKeys.add(key);
    }
    assertStringArray(workOrder.conventionIds, "conventionIds", conventionPattern, false);
    assertTextArray(workOrder.nonGoals, "nonGoals");
    assertTextArray(workOrder.stopConditions, "stopConditions");
    if (!Array.isArray(workOrder.focusedCommands) || workOrder.focusedCommands.length === 0) {
        fail("focusedCommands must be a non-empty array");
    }
    for (const command of workOrder.focusedCommands) {
        assertShellFreeCommand(command);
    }

    const allowed = new Set(workOrder.allowedPaths.map(normalizeRepositoryPath));
    const overrides = new Map();
    for (const [kind, paths] of [
        ["forbidden", workOrder.forbiddenPaths],
        ["protected", workOrder.protectedPaths],
    ]) {
        for (const path of paths) {
            const normalized = normalizeRepositoryPath(path);
            const conflictsWithAllowed = workOrder.allowedPaths.some((allowedPath) =>
                repositoryPathIsWithin(allowedPath, path),
            );
            const conflictsWithOverride = [...overrides.keys()].some(
                (overridePath) =>
                    repositoryPathIsWithin(path, overridePath) ||
                    repositoryPathIsWithin(overridePath, path),
            );
            if (conflictsWithAllowed || conflictsWithOverride) {
                fail(`Conflicting ${kind} path: ${path}`);
            }
            overrides.set(normalized, kind);
        }
    }
    const operationPaths = [
        ...workOrder.expectedAdditions,
        ...workOrder.expectedModifications,
        ...workOrder.expectedDeletions,
        ...workOrder.expectedRenames.flatMap((rename) => [rename.from, rename.to]),
    ];
    const operationSeen = new Set();
    for (const path of operationPaths) {
        const normalized = normalizeRepositoryPath(path);
        if (!allowed.has(normalized)) {
            fail(`Expected operation is outside allowedPaths: ${path}`);
        }
        if (operationSeen.has(normalized)) {
            fail(`Expected operations overlap at ${path}`);
        }
        operationSeen.add(normalized);
    }
    return workOrder;
}

function listPlanningPathsAtRoot(changeRoot, revision = "HEAD") {
    validateRepositoryPath(changeRoot);
    const prefix = `${changeRoot}/`;
    const paths = gitText(["ls-tree", "-r", "--name-only", revision, "--", prefix])
        .split(/\r?\n/u)
        .filter(Boolean);
    return paths
        .filter(
            (path) =>
                path === `${prefix}proposal.md` ||
                path === `${prefix}design.md` ||
                path === `${prefix}tasks.md` ||
                (path.startsWith(`${prefix}specs/`) && path.endsWith(".md")),
        )
        .sort();
}

function assertCompletePlanningPaths(paths, changeRoot) {
    const required = ["proposal.md", "design.md", "tasks.md"].map(
        (name) => `${changeRoot}/${name}`,
    );
    if (
        required.some((path) => !paths.includes(path)) ||
        !paths.some((path) => path.startsWith(`${changeRoot}/specs/`))
    ) {
        fail(`Planning artifacts are incomplete at ${changeRoot}`);
    }
}

function listPlanningPaths(changeId, revision = "HEAD") {
    return listPlanningPathsAtRoot(`openspec/changes/${changeId}`, revision);
}

function normalizeTaskBytes(buffer) {
    return Buffer.from(
        buffer
            .toString("utf8")
            .replace(/^(\s*-\s*)\[[xX]\]/gmu, (_match, prefix) => `${prefix}[ ]`),
        "utf8",
    );
}

export function computeAcceptedArtifactDigest(changeId, revision = "HEAD") {
    return computeAcceptedArtifactDigestAtRoot(`openspec/changes/${changeId}`, revision, changeId);
}

export function computeAcceptedArtifactDigestAtRoot(
    changeRoot,
    revision = "HEAD",
    logicalChangeId,
) {
    const paths = listPlanningPathsAtRoot(changeRoot, revision);
    assertCompletePlanningPaths(paths, changeRoot);
    const hash = createHash("sha256");
    for (const path of paths) {
        const raw = git(["show", `${revision}:${path}`]).stdout;
        const content = path.endsWith("/tasks.md") ? normalizeTaskBytes(raw) : raw;
        const digestPath = logicalChangeId
            ? `openspec/changes/${logicalChangeId}/${path.slice(`${changeRoot}/`.length)}`
            : path;
        hash.update(Buffer.from(digestPath, "utf8"));
        hash.update(Buffer.from([0]));
        hash.update(Buffer.from(String(content.length), "ascii"));
        hash.update(Buffer.from([0]));
        hash.update(content);
    }
    return hash.digest("hex");
}

export function acceptedScenarioIdentitiesAtRoot(changeRoot, revision = "HEAD") {
    const paths = listPlanningPathsAtRoot(changeRoot, revision);
    assertCompletePlanningPaths(paths, changeRoot);
    return paths
        .filter((path) => path.startsWith(`${changeRoot}/specs/`))
        .flatMap((path) => {
            const text = git(["show", `${revision}:${path}`]).stdout.toString("utf8");
            const requirements = [...text.matchAll(/^### Requirement: (.+)$/gmu)];
            return requirements.flatMap((match, index) => {
                const end = requirements[index + 1]?.index ?? text.length;
                const body = text.slice(match.index, end);
                return [...body.matchAll(/^#### Scenario: (.+)$/gmu)].map((scenario) => ({
                    requirement: match[1],
                    scenario: scenario[1],
                }));
            });
        });
}

export function acceptedScenarioIdentities(changeId, revision = "HEAD") {
    return acceptedScenarioIdentitiesAtRoot(`openspec/changes/${changeId}`, revision);
}

function readJsonFromRevision(revision, path) {
    try {
        return JSON.parse(git(["show", `${revision}:${path}`]).stdout.toString("utf8"));
    } catch (error) {
        fail(`Cannot read JSON at ${revision}:${path}: ${error.message}`);
    }
}

function assertGitObject(sha, label) {
    const result = git(["cat-file", "-e", `${sha}^{commit}`], {
        allowFailure: true,
    });
    if (result.status !== 0) {
        fail(`${label} commit is unavailable: ${sha}`);
    }
}

function assertAncestor(ancestor, descendant, label) {
    const result = git(["merge-base", "--is-ancestor", ancestor, descendant], {
        allowFailure: true,
    });
    if (result.status !== 0) {
        fail(`${label}: ${ancestor} is not an ancestor of ${descendant}`);
    }
}

function validateAcceptanceBinding(workOrder, acceptance, changeRoot, revision) {
    const activeChangeRoot = `openspec/changes/${workOrder.changeId}`;
    const activeAcceptancePath = `${activeChangeRoot}/acceptance.json`;
    const revisionAcceptancePath = `${changeRoot}/acceptance.json`;
    const revisionAcceptanceBytes = git(["show", `${revision}:${revisionAcceptancePath}`]).stdout;
    const baseAcceptance = git(["show", `${workOrder.baseSha}:${activeAcceptancePath}`], {
        allowFailure: true,
    });
    if (baseAcceptance.status !== 0) {
        fail("Acceptance is not committed at the work-order base");
    }
    const baseAcceptanceBytes = baseAcceptance.stdout;
    if (
        sha256(revisionAcceptanceBytes) !== sha256(baseAcceptanceBytes) ||
        canonicalJson(JSON.parse(revisionAcceptanceBytes.toString("utf8"))) !==
            canonicalJson(acceptance)
    ) {
        fail("Acceptance record differs from the work-order base");
    }
    if (
        git(["cat-file", "-e", `${acceptance.planningSha}:${activeAcceptancePath}`], {
            allowFailure: true,
        }).status === 0
    ) {
        fail("Accepted planning SHA must precede the acceptance record");
    }
    if (Date.parse(acceptance.acceptedAt) > Date.parse(workOrder.issuedAt)) {
        fail("Work order predates accepted planning");
    }
    const planningDigest = computeAcceptedArtifactDigestAtRoot(
        activeChangeRoot,
        acceptance.planningSha,
        workOrder.changeId,
    );
    const currentDigest = computeAcceptedArtifactDigestAtRoot(
        changeRoot,
        revision,
        workOrder.changeId,
    );
    if (
        planningDigest !== currentDigest ||
        planningDigest !== acceptance.artifactDigest ||
        planningDigest !== workOrder.acceptedArtifactDigest
    ) {
        fail("Accepted planning-artifact digest is stale");
    }
    return planningDigest;
}

export function validateAcceptedPlanningSnapshot(workOrder, changeRoot, revision) {
    validateWorkOrder(workOrder);
    assertGitObject(revision, "Evidence revision");
    const acceptance = readJsonFromRevision(revision, `${changeRoot}/acceptance.json`);
    if (
        acceptance.schemaVersion !== 1 ||
        acceptance.changeId !== workOrder.changeId ||
        !gitShaPattern.test(acceptance.baselineSha ?? "") ||
        !gitShaPattern.test(acceptance.planningSha ?? "") ||
        !sha256Pattern.test(acceptance.artifactDigest ?? "") ||
        typeof acceptance.acceptedBy !== "string" ||
        acceptance.acceptedBy.length === 0 ||
        !isRfc3339DateTime(acceptance.acceptedAt)
    ) {
        fail("Committed acceptance record is invalid");
    }
    for (const [sha, label] of [
        [acceptance.baselineSha, "Accepted baseline"],
        [acceptance.planningSha, "Accepted planning"],
        [workOrder.baseSha, "Work-order base"],
    ]) {
        assertGitObject(sha, label);
    }
    assertAncestor(acceptance.baselineSha, workOrder.baseSha, "Invalid work-order base");
    assertAncestor(acceptance.planningSha, workOrder.baseSha, "Invalid planning ancestry");
    assertAncestor(workOrder.baseSha, revision, "Evidence revision ancestry is stale");
    if (workOrder.issuedBy !== acceptance.acceptedBy) {
        fail("Work-order issuer does not match the committed accepted coordinator");
    }
    const artifactDigest = validateAcceptanceBinding(workOrder, acceptance, changeRoot, revision);
    return { acceptance, artifactDigest };
}

function assertPlanningWorktreeClean(changeRoot) {
    const paths = listPlanningPathsAtRoot(changeRoot);
    assertCompletePlanningPaths(paths, changeRoot);
    const tasksPath = paths.find((path) => path.endsWith("/tasks.md"));
    const otherPaths = paths.filter((path) => path !== tasksPath);
    if (gitText(["status", "--porcelain=v1", "--", ...otherPaths])) {
        fail("Accepted planning artifacts have uncommitted semantic changes");
    }
    if (tasksPath && gitText(["status", "--porcelain=v1", "--", tasksPath])) {
        const head = normalizeTaskBytes(git(["show", `HEAD:${tasksPath}`]).stdout);
        const worktree = normalizeTaskBytes(readFileSync(resolve(repositoryRoot, tasksPath)));
        const indexResult = git(["show", `:${tasksPath}`], { allowFailure: true });
        const index = indexResult.status === 0 ? normalizeTaskBytes(indexResult.stdout) : worktree;
        if (!head.equals(worktree) || !head.equals(index)) {
            fail("OpenSpec tasks contain changes beyond completion markers");
        }
    }
    const untrackedPlanning = gitText([
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        "--",
        `${changeRoot}/specs`,
        `${changeRoot}/proposal.md`,
        `${changeRoot}/design.md`,
        `${changeRoot}/tasks.md`,
    ])
        .split(/\r?\n/u)
        .filter((line) => line.startsWith("?? "));
    if (untrackedPlanning.length > 0) {
        fail("Accepted planning artifacts contain untracked additions");
    }
}

function archivedChangeRootsAtRevision(changeId, revision) {
    assertString(changeId, "changeId", identifierPattern);
    assertGitObject(revision, "Change-root revision");
    const escapedChangeId = changeId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const archiveEntry = new RegExp(
        `^(openspec/changes/archive/[0-9]{4}-[0-9]{2}-[0-9]{2}-${escapedChangeId})(?:/|$)`,
        "u",
    );
    const roots = new Set();
    for (const path of zeroSeparated(
        git(["ls-tree", "-r", "--name-only", "-z", revision, "--", "openspec/changes/archive"])
            .stdout,
    )) {
        const match = archiveEntry.exec(path);
        if (match) {
            roots.add(match[1]);
        }
    }
    return [...roots].sort();
}

function treeRootExistsAtRevision(root, revision) {
    const prefix = `${root}/`;
    return zeroSeparated(
        git(["ls-tree", "-r", "--name-only", "-z", revision, "--", root]).stdout,
    ).some((path) => path === root || path.startsWith(prefix));
}

export function resolveArchivedChangeRootAtRevision(changeId, revision = "HEAD") {
    const activeRoot = `openspec/changes/${changeId}`;
    if (treeRootExistsAtRevision(activeRoot, revision)) {
        fail(`Final integration candidate still contains active change ${changeId}`);
    }
    const candidates = archivedChangeRootsAtRevision(changeId, revision);
    if (candidates.length !== 1) {
        fail(`Expected exactly one archived change root for ${changeId} at ${revision}`);
    }
    return candidates[0];
}

export function resolveChangeRootAtRevision(changeId, revision = "HEAD") {
    assertString(changeId, "changeId", identifierPattern);
    assertGitObject(revision, "Change-root revision");
    const activeRoot = `openspec/changes/${changeId}`;
    if (treeRootExistsAtRevision(activeRoot, revision)) {
        return activeRoot;
    }
    const candidates = archivedChangeRootsAtRevision(changeId, revision);
    if (candidates.length !== 1) {
        fail(`Expected exactly one active or archived change root for ${changeId} at ${revision}`);
    }
    return candidates[0];
}

function assertTasksExist(workOrder, changeDirectory) {
    const tasksPath = resolve(changeDirectory, "tasks.md");
    if (!existsSync(tasksPath)) {
        fail(`OpenSpec tasks do not exist for ${workOrder.changeId}`);
    }
    const tasks = readFileSync(tasksPath, "utf8");
    for (const taskId of workOrder.taskIds) {
        const escaped = taskId.replaceAll(".", "\\.");
        if (!new RegExp(`^- \\[.\\] ${escaped}(?:\\s|$)`, "mu").test(tasks)) {
            fail(`Assigned OpenSpec task does not exist: ${taskId}`);
        }
    }
}

function assertRequiredDocuments(workOrder) {
    for (const path of workOrder.requiredDocuments) {
        const absolute = resolve(repositoryRoot, path.split("/").join(sep));
        assertInsideRepository(absolute, path);
        if (!existsSync(absolute)) {
            fail(`Required document does not exist: ${path}`);
        }
        assertPhysicalPathInside(path);
        if (!statSync(realpathSync(absolute)).isFile()) {
            fail(`Required document is not a file: ${path}`);
        }
    }
}

function assertFocusedCommandDirectories(workOrder) {
    for (const command of workOrder.focusedCommands) {
        const absolute =
            command.cwd === "."
                ? repositoryRoot
                : resolve(repositoryRoot, command.cwd.split("/").join(sep));
        assertInsideRepository(absolute, command.cwd);
        if (!existsSync(absolute)) {
            fail(`Focused command cwd does not exist: ${command.cwd}`);
        }
        assertPhysicalPathInside(command.cwd);
        if (!statSync(realpathSync(absolute)).isDirectory()) {
            fail(`Focused command cwd is not a directory: ${command.cwd}`);
        }
    }
}

export function assertInsideRepository(absolutePath, label = absolutePath) {
    const fromRoot = relative(repositoryRoot, absolutePath);
    if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
        fail(`Path escapes repository: ${label}`);
    }
}

function lstatIfPresent(absolute) {
    try {
        return lstatSync(absolute);
    } catch (error) {
        if (error.code === "ENOENT") {
            return undefined;
        }
        throw error;
    }
}

function assertExistingAncestorInside(absolute, label) {
    let candidate = absolute;
    for (;;) {
        const stat = lstatIfPresent(candidate);
        if (stat) {
            assertInsideRepository(realpathSync(candidate), label);
            return;
        }
        const parent = dirname(candidate);
        if (parent === candidate) {
            fail(`${label} has no resolvable ancestor`);
        }
        candidate = parent;
    }
}

export function assertPhysicalPathInside(path) {
    const segments = path.split("/");
    const candidates = segments.map((_segment, index) =>
        resolve(repositoryRoot, ...segments.slice(0, index + 1)),
    );
    for (const candidate of candidates) {
        const stat = lstatIfPresent(candidate);
        if (!stat) {
            continue;
        }
        if (stat.isSymbolicLink()) {
            const target = readlinkSync(candidate);
            const targetAbsolute = isAbsolute(target)
                ? resolve(target)
                : resolve(dirname(candidate), target);
            assertInsideRepository(targetAbsolute, path);
            assertExistingAncestorInside(targetAbsolute, path);
        } else {
            assertInsideRepository(realpathSync(candidate), path);
        }
    }
}

export function assertProtocolStatePath(path, label = path) {
    const absolute = resolve(path);
    assertInsideRepository(absolute, label);
    const fromWorkDirectory = relative(workDirectory, absolute);
    if (
        fromWorkDirectory === ".." ||
        fromWorkDirectory.startsWith(`..${sep}`) ||
        isAbsolute(fromWorkDirectory)
    ) {
        fail(`Protocol state path is outside .agents/work: ${label}`);
    }
    const relativePath = relative(repositoryRoot, absolute);
    let candidate = repositoryRoot;
    for (const segment of relativePath.split(sep)) {
        candidate = resolve(candidate, segment);
        const stat = lstatIfPresent(candidate);
        if (!stat) {
            continue;
        }
        if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) {
            fail(`Protocol state path escapes repository-owned .agents/work: ${label}`);
        }
        const physical = realpathSync(candidate);
        if (relative(candidate, physical) !== "") {
            fail(`Protocol state path escapes repository-owned .agents/work: ${label}`);
        }
    }
    return absolute;
}

function zeroSeparated(buffer) {
    return buffer.toString("utf8").split("\0").filter(Boolean);
}

export function currentChangedPaths(baseSha, exactPaths = []) {
    const tracked = zeroSeparated(git(["diff", "--name-only", "-z", baseSha]).stdout);
    const untracked = zeroSeparated(
        git(["ls-files", "--others", "--exclude-standard", "-z"]).stdout,
    );
    const exactPresent = exactPaths.filter((path) => {
        validateRepositoryPath(path);
        return !indexIdentity(path).present && hashPath(path).kind !== "missing";
    });
    return [...new Set([...tracked, ...untracked, ...exactPresent])].sort();
}

function protectedDescendantGitIdentity(path) {
    return {
        classification: classifyPath(path),
        index: indexIdentity(path),
    };
}

function hashDirectoryTree(absolute, repositoryPath) {
    const entries = [];
    const visit = (directory, parentPath) => {
        const names = readdirSync(directory).sort((left, right) =>
            left < right ? -1 : left > right ? 1 : 0,
        );
        for (const name of names) {
            const childAbsolute = resolve(directory, name);
            const childPath = parentPath ? `${parentPath}/${name}` : name;
            const childRepositoryPath = `${repositoryPath}/${childPath}`;
            const stat = lstatSync(childAbsolute);
            const mode = stat.mode & 0o777;
            if (stat.isSymbolicLink()) {
                const target = readlinkSync(childAbsolute, "buffer");
                entries.push({
                    path: childPath,
                    ...protectedDescendantGitIdentity(childRepositoryPath),
                    kind: "symbolic-link",
                    mode,
                    size: target.length,
                    sha256: sha256(target),
                });
                continue;
            }
            if (stat.isDirectory()) {
                entries.push({
                    path: childPath,
                    ...protectedDescendantGitIdentity(childRepositoryPath),
                    kind: "directory",
                    mode,
                    size: stat.size,
                });
                visit(childAbsolute, childPath);
                continue;
            }
            if (!stat.isFile()) {
                fail(`Unsupported protected path kind: ${childPath}`);
            }
            entries.push({
                path: childPath,
                ...protectedDescendantGitIdentity(childRepositoryPath),
                kind: "file",
                mode,
                size: stat.size,
                sha256: sha256(readFileSync(childAbsolute)),
            });
        }
    };
    visit(absolute, "");
    return sha256(Buffer.from(canonicalJson(entries), "utf8"));
}

export function hashPath(path) {
    const absolute = resolve(repositoryRoot, path.split("/").join(sep));
    const stat = lstatIfPresent(absolute);
    if (!stat) {
        return {
            kind: "missing",
            mode: 0,
            size: 0,
            sha256: sha256(Buffer.from("missing", "utf8")),
        };
    }
    const mode = stat.mode & 0o777;
    if (stat.isSymbolicLink()) {
        const target = readlinkSync(absolute, "buffer");
        return {
            kind: "symbolic-link",
            mode,
            size: target.length,
            sha256: sha256(target),
        };
    }
    if (stat.isDirectory()) {
        return {
            kind: "directory",
            mode,
            size: stat.size,
            sha256: hashDirectoryTree(absolute, path),
        };
    }
    if (!stat.isFile()) {
        fail(`Unsupported protected path kind: ${path}`);
    }
    return {
        kind: "file",
        mode,
        size: stat.size,
        sha256: sha256(readFileSync(absolute)),
    };
}

export function classifyPath(path) {
    if (indexIdentity(path).present) {
        return "tracked";
    }
    if (git(["check-ignore", "--quiet", "--", path], { allowFailure: true }).status === 0) {
        return "ignored";
    }
    return "untracked";
}

export function indexIdentity(path) {
    validateRepositoryPath(path);
    const records = zeroSeparated(
        git(["ls-files", "--stage", "-z", "--", `:(literal)${path}`]).stdout,
    );
    const entries = records.map((record) => {
        const match = record.match(/^([0-7]{6}) ([0-9a-f]+) ([0-3])\t(.+)$/u);
        if (!match || !repositoryPathIsWithin(match[4], path)) {
            fail(`Cannot parse index identity for ${path}`);
        }
        return {
            path: match[4],
            mode: match[1],
            objectId: match[2],
            stage: Number(match[3]),
        };
    });
    return { present: entries.length > 0, entries };
}

function baselineEntry(path, scope) {
    assertPhysicalPathInside(path);
    return {
        path,
        scope,
        classification: classifyPath(path),
        index: indexIdentity(path),
        ...hashPath(path),
    };
}

function baselineEntries(workOrder, changeRoot) {
    const allowedSet = new Set(workOrder.allowedPaths.map(normalizeRepositoryPath));
    const expectedSet = new Set(
        [
            ...workOrder.expectedAdditions,
            ...workOrder.expectedModifications,
            ...workOrder.expectedDeletions,
            ...workOrder.expectedRenames.flatMap((rename) => [rename.from, rename.to]),
        ].map(normalizeRepositoryPath),
    );
    const tasksPath = `${changeRoot}/tasks.md`;
    const changed = currentChangedPaths(workOrder.baseSha, [
        ...workOrder.protectedPaths,
        ...workOrder.forbiddenPaths,
    ]);
    const entries = [];
    for (const path of changed) {
        validateRepositoryPath(path);
        assertPhysicalPathInside(path);
        if (normalizeRepositoryPath(path) === normalizeRepositoryPath(tasksPath)) {
            continue;
        }
        const normalized = normalizeRepositoryPath(path);
        const forbiddenRoot = workOrder.forbiddenPaths.find((root) =>
            repositoryPathIsWithin(path, root),
        );
        if (forbiddenRoot) {
            fail(`Worktree contains a forbidden path: ${path}`);
        }
        const protectedRoot = workOrder.protectedPaths.find((root) =>
            repositoryPathIsWithin(path, root),
        );
        if (protectedRoot) {
            continue;
        }
        if (allowedSet.has(normalized)) {
            if (workOrder.role === "integration" && expectedSet.has(normalized)) {
                continue;
            }
            fail(`Assigned path contains pre-existing work: ${path}`);
        }
        fail(`Worktree contains an unexplained pre-existing change: ${path}`);
    }
    for (const path of workOrder.protectedPaths) {
        if (
            entries.some(
                (entry) => normalizeRepositoryPath(entry.path) === normalizeRepositoryPath(path),
            )
        ) {
            continue;
        }
        entries.push(baselineEntry(path, "protected"));
    }
    return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export function loadAndValidateContext(workOrderPath = defaultWorkOrderPath, options = {}) {
    const absoluteWorkOrderPath = resolve(repositoryRoot, workOrderPath);
    assertProtocolStatePath(absoluteWorkOrderPath, workOrderPath);
    if (!existsSync(absoluteWorkOrderPath)) {
        fail(`Work order is missing: ${workOrderPath}`);
    }
    const workOrder = validateWorkOrder(readJson(absoluteWorkOrderPath));
    const changeRoot = options.changeRoot ?? resolveChangeRootAtRevision(workOrder.changeId);
    validateRepositoryPath(changeRoot);
    const changeDirectory = resolve(repositoryRoot, changeRoot.split("/").join(sep));
    assertInsideRepository(changeDirectory, changeRoot);
    const acceptancePath = resolve(changeDirectory, "acceptance.json");
    if (!existsSync(acceptancePath)) {
        fail(`Acceptance is missing for ${workOrder.changeId}`);
    }
    const acceptance = readJson(acceptancePath);
    if (
        acceptance.schemaVersion !== 1 ||
        acceptance.changeId !== workOrder.changeId ||
        !gitShaPattern.test(acceptance.baselineSha ?? "") ||
        !gitShaPattern.test(acceptance.planningSha ?? "") ||
        !sha256Pattern.test(acceptance.artifactDigest ?? "") ||
        !isRfc3339DateTime(acceptance.acceptedAt)
    ) {
        fail("Acceptance record is invalid");
    }
    if (workOrder.issuedBy !== acceptance.acceptedBy) {
        fail("Work order was not issued by the accepted coordinator");
    }
    assertGitObject(workOrder.baseSha, "Work-order base");
    assertGitObject(acceptance.baselineSha, "Accepted baseline");
    assertGitObject(acceptance.planningSha, "Accepted planning");
    assertAncestor(acceptance.baselineSha, workOrder.baseSha, "Invalid work-order base");
    assertAncestor(acceptance.planningSha, workOrder.baseSha, "Invalid planning ancestry");
    assertAncestor(workOrder.baseSha, "HEAD", "Invalid current branch ancestry");
    assertPlanningWorktreeClean(changeRoot);
    if (gitText(["status", "--porcelain=v1", "--", acceptancePath])) {
        fail("Acceptance record has uncommitted changes");
    }
    const artifactDigest = validateAcceptanceBinding(workOrder, acceptance, changeRoot, "HEAD");
    assertTasksExist(workOrder, changeDirectory);
    assertRequiredDocuments(workOrder);
    assertFocusedCommandDirectories(workOrder);
    if (options.requireFeatureBranch !== false) {
        const branch = gitText(["symbolic-ref", "--quiet", "--short", "HEAD"], {
            allowFailure: true,
        });
        if (!branch) {
            fail("Detached HEAD is not permitted for implementation");
        }
        if (branch === "master") {
            fail("Implementation work orders cannot run on master");
        }
    }
    return {
        acceptance,
        artifactDigest,
        changeRoot,
        changeDirectory,
        workOrder,
        workOrderPath: absoluteWorkOrderPath,
    };
}

export function writeJson(path, value) {
    const absolute = assertProtocolStatePath(path);
    mkdirSync(dirname(absolute), { recursive: true });
    assertProtocolStatePath(absolute);
    writeFileSync(absolute, `${JSON.stringify(value, null, 4)}\n`, "utf8");
}

export function runPreflight(workOrderPath = defaultWorkOrderPath) {
    const context = loadAndValidateContext(workOrderPath);
    const baseline = {
        schemaVersion: 1,
        workOrderId: context.workOrder.workOrderId,
        workOrderDigest: digestJson(context.workOrder),
        acceptedArtifactDigest: context.artifactDigest,
        baseSha: context.workOrder.baseSha,
        recordedAt: new Date().toISOString(),
        entries: baselineEntries(context.workOrder, context.changeRoot),
    };
    writeJson(baselinePath, baseline);
    return baseline;
}

function main() {
    const args = parseCliArgs(process.argv.slice(2), ["--work-order"]);
    const baseline = runPreflight(args["--work-order"]);
    console.log(
        `Preflight passed for ${baseline.workOrderId}; protected baseline entries: ${baseline.entries.length}`,
    );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
    try {
        main();
    } catch (error) {
        console.error(`Preflight failed: ${error.message}`);
        process.exitCode = 1;
    }
}
