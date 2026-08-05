import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    existsSync,
    lstatSync,
    readFileSync,
    readdirSync,
    readlinkSync,
    realpathSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { runCheckpoint } from "./checkpoint.mjs";
import {
    canonicalJson,
    defaultWorkOrderPath,
    fail,
    gitExecutableArguments,
    isRfc3339DateTime,
    loadAndValidateContext,
    nodeInjectionEnvironmentVariables,
    readJson,
    repositoryRoot,
    repositoryPathKey,
    sanitizedSubprocessEnvironment,
    sha256,
    validateJsonAgainstSchema,
} from "./preflight.mjs";

const generatedIgnoredRoots = [
    ".agents/work",
    "backend/dist",
    "backend/node_modules",
    "docs/architecture/dist",
    "docs/architecture/export",
    "docs/architecture/node_modules",
    "frontend/dist",
    "frontend/node_modules",
    "node_modules",
];
const generatedIgnoredPathspecs = generatedIgnoredRoots.map((root) => `:(exclude)${root}/**`);
const openspecInstallationIdentities = new Map([
    [
        "22.22.0\u0000@fission-ai/openspec\u00001.6.0",
        {
            installedTreeSha256: "0eafead61d54180f461bb154a64d8d83cdf78375c5c0eb2a1a5e6fc9131f58c7",
            lockGraphSha256: "07ccb1051770e6078964bd7c80e0573ee3398aac964b4123e815653dc864ab73",
            packageCount: 80,
        },
    ],
]);

const markdownLinkExceptions = new Map([
    ["docs/adr/template.md", new Set(["NNNN-title.md"])],
    [
        ".github/prompts/directive-driven-design.prompt.md",
        new Set([
            "../directive/conventions.design.yaml",
            "../directive/conventions.architecture.yaml",
            "../directive/conventions.roles.yaml",
            "../directive/conventions.design.pattern.yaml",
            "../directive/conventions.structure.yaml",
        ]),
    ],
]);
const ambientNodeInjectionVariables = new Set(
    nodeInjectionEnvironmentVariables.filter((key) => key !== "NPM_EXECPATH"),
);

export function assertNoAmbientNodeInjection(environment = process.env) {
    const active = Object.entries(environment)
        .filter(
            ([key, value]) =>
                ambientNodeInjectionVariables.has(key.toLocaleUpperCase("en-US")) &&
                typeof value === "string" &&
                value.length > 0,
        )
        .map(([key]) => key)
        .sort();
    if (active.length > 0) {
        fail(`Repository verification rejects ambient Node injection: ${active.join(", ")}`);
    }
}

export function runProcess(executable, args, options = {}) {
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
    if (options.echo !== false) {
        if (result.stdout?.length) {
            process.stdout.write(result.stdout);
        }
        if (result.stderr?.length) {
            process.stderr.write(result.stderr);
        }
    }
    if (!options.allowFailure && result.status !== 0) {
        fail(`${options.label ?? executable} failed with exit code ${result.status}`);
    }
    return result;
}

function gitAt(root, args, options = {}) {
    return runProcess("git", gitExecutableArguments(root, args), {
        ...options,
        cwd: root,
        echo: options.echo ?? false,
    });
}

function zeroSeparated(buffer) {
    return buffer.toString("utf8").split("\0").filter(Boolean);
}

function isGeneratedIgnoredPath(path) {
    return generatedIgnoredRoots.some((root) => path === root || path.startsWith(`${root}/`));
}

function physicalSymbolicLinkPaths(root) {
    const paths = [];
    const visit = (absoluteDirectory, relativeDirectory = "") => {
        for (const entry of readdirSync(absoluteDirectory, {
            withFileTypes: true,
        })) {
            const path = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
            if (path === ".git" || path.startsWith(".git/") || isGeneratedIgnoredPath(path)) {
                continue;
            }
            const absolute = resolve(root, path.split("/").join(sep));
            const stat = lstatIfPresent(absolute);
            if (!stat) {
                continue;
            }
            if (stat.isSymbolicLink()) {
                paths.push(path);
            } else if (stat.isDirectory()) {
                visit(absolute, path);
            }
        }
    };
    visit(root);
    return paths;
}

function repositoryPaths(root) {
    const classifications = new Map();
    const tracked = zeroSeparated(gitAt(root, ["ls-files", "-z"]).stdout);
    const untracked = zeroSeparated(
        gitAt(root, ["ls-files", "--others", "--exclude-standard", "-z"]).stdout,
    );
    const ignored = zeroSeparated(
        gitAt(root, [
            "ls-files",
            "--others",
            "--ignored",
            "--exclude-standard",
            "-z",
            "--",
            ".",
            ...generatedIgnoredPathspecs,
        ]).stdout,
    );
    for (const [classification, paths] of [
        ["tracked", tracked],
        ["untracked", untracked],
        ["ignored", ignored],
    ]) {
        for (const path of paths) {
            if (classification !== "ignored" || !isGeneratedIgnoredPath(path)) {
                classifications.set(path, classification);
            }
        }
    }
    for (const path of physicalSymbolicLinkPaths(root)) {
        if (!classifications.has(path)) {
            classifications.set(path, "filesystem-link");
        }
    }
    const paths = [...classifications.keys()].sort();
    const seen = new Map();
    for (const path of paths) {
        const normalized = repositoryPathKey(path);
        const prior = seen.get(normalized);
        if (prior && prior !== path) {
            fail(`Case-ambiguous repository paths: ${prior} and ${path}`);
        }
        seen.set(normalized, path);
    }
    return paths.map((path) => ({
        classification: classifications.get(path),
        path,
    }));
}

function assertInside(root, absolute, label) {
    const fromRoot = relative(root, absolute);
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

function assertExistingAncestorInside(root, absolute, label) {
    let candidate = absolute;
    for (;;) {
        const stat = lstatIfPresent(candidate);
        if (stat) {
            assertInside(root, realpathSync(candidate), label);
            return;
        }
        const parent = dirname(candidate);
        if (parent === candidate) {
            throw new Error(`${label} has no resolvable ancestor`);
        }
        candidate = parent;
    }
}

export function fileIdentity(root, path) {
    const absolute = resolve(root, path.split("/").join(sep));
    assertInside(root, absolute, path);
    const stat = lstatIfPresent(absolute);
    if (!stat) {
        return {
            kind: "missing",
            sha256: sha256(Buffer.from("missing", "utf8")),
            size: 0,
        };
    }
    const mode = stat.mode & 0o777;
    if (stat.isSymbolicLink()) {
        const targetText = readlinkSync(absolute);
        const target = Buffer.from(targetText, "utf8");
        const targetAbsolute = isAbsolute(targetText)
            ? resolve(targetText)
            : resolve(dirname(absolute), targetText);
        assertInside(root, targetAbsolute, `${path} target`);
        assertExistingAncestorInside(root, targetAbsolute, `${path} target`);
        return {
            kind: "symbolic-link",
            mode,
            sha256: sha256(target),
            size: stat.size,
        };
    }
    const real = realpathSync(absolute);
    assertInside(root, real, path);
    if (stat.isDirectory()) {
        return {
            kind: "directory",
            mode,
            sha256: sha256(Buffer.from("directory", "utf8")),
            size: 0,
        };
    }
    return {
        kind: "file",
        mode,
        sha256: sha256(readFileSync(absolute)),
        size: stat.size,
    };
}

export function captureRepositoryState(root = repositoryRoot) {
    const entries = repositoryPaths(root).map(({ classification, path }) => ({
        classification,
        path,
        ...fileIdentity(root, path),
    }));
    const head = gitAt(root, ["rev-parse", "HEAD"]).stdout.toString("utf8").trim();
    const branch = gitAt(root, ["symbolic-ref", "--quiet", "--short", "HEAD"], {
        allowFailure: true,
    })
        .stdout.toString("utf8")
        .trim();
    const index = captureRawIndexState(root);
    return { branch, entries, head, index };
}

export function assertRepositoryStateUnchanged(before, after) {
    if (
        before.head !== after.head ||
        before.branch !== after.branch ||
        canonicalJson(before.index) !== canonicalJson(after.index)
    ) {
        fail("Verification changed repository HEAD, branch, or index state");
    }
    const beforeEntries = new Map(before.entries.map((entry) => [entry.path, entry]));
    const afterEntries = new Map(after.entries.map((entry) => [entry.path, entry]));
    const changed = [...new Set([...beforeEntries.keys(), ...afterEntries.keys()])].filter(
        (path) => {
            const previous = beforeEntries.get(path);
            const current = afterEntries.get(path);
            return canonicalJson(previous) !== canonicalJson(current);
        },
    );
    if (changed.length > 0) {
        fail(`Verification changed tracked or user state: ${changed.join(", ")}`);
    }
}

function rawGitFileIdentity(root, gitPath) {
    if (!gitPath) {
        return {
            path: "",
            present: false,
            size: 0,
            sha256: sha256(Buffer.from("missing")),
        };
    }
    const absolute = isAbsolute(gitPath) ? resolve(gitPath) : resolve(root, gitPath);
    const stat = lstatIfPresent(absolute);
    if (!stat) {
        return {
            path: absolute,
            present: false,
            size: 0,
            sha256: sha256(Buffer.from("missing")),
        };
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
        fail(`Git index path is not a regular file: ${absolute}`);
    }
    const bytes = readFileSync(absolute);
    return {
        path: absolute,
        present: true,
        size: bytes.length,
        sha256: sha256(bytes),
    };
}

export function captureRawIndexState(root = repositoryRoot) {
    const indexPath = gitAt(root, ["rev-parse", "--path-format=absolute", "--git-path", "index"])
        .stdout.toString("utf8")
        .trim();
    if (lstatIfPresent(`${indexPath}.lock`)) {
        fail("Git index lock is present");
    }
    const sharedResult = gitAt(root, ["rev-parse", "--shared-index-path"], {
        allowFailure: true,
    });
    const sharedIndexPath =
        sharedResult.status === 0 ? sharedResult.stdout.toString("utf8").trim() : "";
    return {
        index: rawGitFileIdentity(root, indexPath),
        sharedIndex: rawGitFileIdentity(root, sharedIndexPath),
    };
}

function markdownTargets(markdown) {
    const targets = [];
    const inline = /!?\[[^\]]*\]\(([^)]+)\)/gu;
    const definitions = /^\s*\[[^\]]+\]:\s*(\S+)/gmu;
    for (const match of markdown.matchAll(inline)) {
        targets.push(match[1]);
    }
    for (const match of markdown.matchAll(definitions)) {
        targets.push(match[1]);
    }
    return targets;
}

function linkDestination(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("<")) {
        return trimmed.slice(1, trimmed.indexOf(">"));
    }
    return trimmed.split(/\s+/u)[0];
}

function isExternalLink(target) {
    return (
        target.startsWith("#") || target.startsWith("//") || /^[a-z][a-z0-9+.-]*:/iu.test(target)
    );
}

export function validateMarkdownLinks(root = repositoryRoot, options = {}) {
    const exceptions = options.exceptions ?? markdownLinkExceptions;
    const markdownPaths = gitAt(root, ["ls-files", "-z", "--", "*.md"]).stdout;
    const failures = [];
    for (const source of zeroSeparated(markdownPaths)) {
        const markdown = readFileSync(resolve(root, source), "utf8");
        for (const rawTarget of markdownTargets(markdown)) {
            const target = linkDestination(rawTarget);
            if (!target || isExternalLink(target)) {
                continue;
            }
            const pathPart = target.split(/[?#]/u)[0];
            if (!pathPart || exceptions.get(source)?.has(pathPart)) {
                continue;
            }
            if (pathPart.includes("\\")) {
                failures.push(`${source} -> ${target} (backslash path)`);
                continue;
            }
            let decoded;
            try {
                decoded = decodeURIComponent(pathPart);
            } catch {
                failures.push(`${source} -> ${target} (invalid URI encoding)`);
                continue;
            }
            const absolute = resolve(root, dirname(source), decoded);
            try {
                assertInside(root, absolute, `${source} -> ${target}`);
            } catch (error) {
                failures.push(error.message);
                continue;
            }
            if (!existsSync(absolute)) {
                failures.push(`${source} -> ${target} (missing target)`);
            }
        }
    }
    if (failures.length > 0) {
        fail(`Markdown link validation failed:\n${failures.join("\n")}`);
    }
    return { checkedFiles: zeroSeparated(markdownPaths).length };
}

export function validateSchemaExamples(root = repositoryRoot) {
    const validated = [];
    for (const name of ["work-order", "review-report", "integration-report"]) {
        const examplePath = resolve(root, ".agents/templates", `${name}.example.json`);
        const schemaPath = resolve(root, ".agents/templates", `${name}.schema.json`);
        validateJsonAgainstSchema(readJson(examplePath), schemaPath, `${name} example`);
        validated.push(name);
    }
    return validated;
}

function addPackageDigestRecord(hash, path, kind, content) {
    hash.update(Buffer.from(path, "utf8"));
    hash.update(Buffer.from([0]));
    hash.update(Buffer.from(kind, "ascii"));
    hash.update(Buffer.from([0]));
    hash.update(Buffer.from(String(content.length), "ascii"));
    hash.update(Buffer.from([0]));
    hash.update(content);
}

function visitInstalledPackageFiles(root, packageKey, directory, prefix, hash) {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const entry of entries) {
        if (entry.name === "node_modules" && entry.isDirectory()) {
            continue;
        }
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        const absolute = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            visitInstalledPackageFiles(root, packageKey, absolute, path, hash);
            continue;
        }
        if (entry.isSymbolicLink()) {
            fail(`Installed OpenSpec dependency contains a symbolic link: ${packageKey}/${path}`);
            continue;
        }
        if (!entry.isFile()) {
            fail(
                `Installed OpenSpec dependency contains an unsupported entry: ${packageKey}/${path}`,
            );
        }
        assertInside(
            root,
            realpathSync(absolute),
            `installed OpenSpec entry ${packageKey}/${path}`,
        );
        addPackageDigestRecord(hash, `${packageKey}/${path}`, "file", readFileSync(absolute));
    }
}

function parentPackageKey(packageKey) {
    const marker = "/node_modules/";
    const index = packageKey.lastIndexOf(marker);
    return index < 0 ? "" : packageKey.slice(0, index);
}

function resolveLockedDependency(packages, packageKey, dependency) {
    let owner = packageKey;
    while (owner) {
        const candidate = `${owner}/node_modules/${dependency}`;
        if (packages[candidate]) {
            return candidate;
        }
        owner = parentPackageKey(owner);
    }
    const topLevel = `node_modules/${dependency}`;
    return packages[topLevel] ? topLevel : undefined;
}

function openSpecClosure(lock) {
    const packages = lock.packages ?? {};
    const rootKey = "node_modules/@fission-ai/openspec";
    const queue = [rootKey];
    const closure = new Set();
    while (queue.length > 0) {
        const packageKey = queue.shift();
        if (closure.has(packageKey)) {
            continue;
        }
        const entry = packages[packageKey];
        if (!entry) {
            fail(`OpenSpec lock graph is missing ${packageKey}`);
        }
        if (entry.link || entry.optional || entry.os || entry.cpu) {
            fail(`OpenSpec lock graph contains a platform-conditioned package: ${packageKey}`);
        }
        closure.add(packageKey);
        const dependencyGroups = [
            [entry.dependencies ?? {}, false],
            [entry.optionalDependencies ?? {}, true],
            [entry.peerDependencies ?? {}, false],
        ];
        for (const [dependencies, optionalGroup] of dependencyGroups) {
            for (const dependency of Object.keys(dependencies).sort()) {
                const resolved = resolveLockedDependency(packages, packageKey, dependency);
                const optionalPeer = entry.peerDependenciesMeta?.[dependency]?.optional === true;
                if (!resolved) {
                    if (optionalGroup || optionalPeer) {
                        continue;
                    }
                    fail(`OpenSpec lock graph cannot resolve ${dependency} from ${packageKey}`);
                }
                queue.push(resolved);
            }
        }
    }
    const allPackageKeys = Object.keys(packages).filter(Boolean).sort();
    const closureKeys = [...closure].sort();
    if (canonicalJson(closureKeys) !== canonicalJson(allPackageKeys)) {
        fail("Root package-lock.json contains packages outside the OpenSpec dependency closure");
    }
    return closureKeys;
}

function discoverInstalledPackageKeys(root) {
    const discovered = [];
    const visitPackage = (absolute, packageKey) => {
        discovered.push(packageKey);
        const nested = resolve(absolute, "node_modules");
        const nestedStat = lstatIfPresent(nested);
        if (nestedStat) {
            if (nestedStat.isSymbolicLink() || !nestedStat.isDirectory()) {
                fail(`Installed dependency has an invalid node_modules entry: ${packageKey}`);
            }
            visitContainer(nested, `${packageKey}/node_modules`);
        }
    };
    const visitContainer = (absolute, logicalPrefix) => {
        for (const entry of readdirSync(absolute, { withFileTypes: true }).sort((left, right) =>
            left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
        )) {
            if ([".bin", ".cache", ".package-lock.json"].includes(entry.name)) {
                continue;
            }
            const entryAbsolute = resolve(absolute, entry.name);
            if (entry.name.startsWith("@")) {
                if (entry.isSymbolicLink() || !entry.isDirectory()) {
                    fail(
                        `Installed dependency scope is not a directory: ${logicalPrefix}/${entry.name}`,
                    );
                }
                for (const scoped of readdirSync(entryAbsolute, {
                    withFileTypes: true,
                }).sort((left, right) =>
                    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
                )) {
                    visitPackage(
                        resolve(entryAbsolute, scoped.name),
                        `${logicalPrefix}/${entry.name}/${scoped.name}`,
                    );
                }
            } else {
                visitPackage(entryAbsolute, `${logicalPrefix}/${entry.name}`);
            }
        }
    };
    visitContainer(resolve(root, "node_modules"), "node_modules");
    return discovered.sort();
}

function canonicalLockGraph(lock, closureKeys) {
    return {
        lockfileVersion: lock.lockfileVersion,
        name: lock.name,
        packages: Object.fromEntries(
            ["", ...closureKeys].map((packageKey) => [packageKey, lock.packages[packageKey]]),
        ),
        requires: lock.requires,
        version: lock.version,
    };
}

export function inspectInstalledOpenSpecClosure(root = repositoryRoot) {
    const lock = readJson(resolve(root, "package-lock.json"));
    const closureKeys = openSpecClosure(lock);
    const discoveredKeys = discoverInstalledPackageKeys(root);
    if (canonicalJson(discoveredKeys) !== canonicalJson(closureKeys)) {
        fail("Installed package roots do not exactly match the OpenSpec lock closure");
    }
    const hash = createHash("sha256");
    for (const packageKey of closureKeys) {
        const packageRoot = resolve(root, packageKey.split("/").join(sep));
        const stat = lstatIfPresent(packageRoot);
        if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
            fail(`Installed OpenSpec dependency is missing or unsafe: ${packageKey}`);
        }
        assertInside(
            root,
            realpathSync(packageRoot),
            `installed OpenSpec dependency ${packageKey}`,
        );
        visitInstalledPackageFiles(root, packageKey, packageRoot, "", hash);
    }
    return {
        closureKeys,
        installedTreeSha256: hash.digest("hex"),
        lockGraphSha256: sha256(Buffer.from(canonicalJson(canonicalLockGraph(lock, closureKeys)))),
        packageCount: closureKeys.length,
    };
}

export function digestInstalledOpenSpecPackage(root = repositoryRoot) {
    return inspectInstalledOpenSpecClosure(root).installedTreeSha256;
}

export function validatePinnedToolchain(root = repositoryRoot, options = {}) {
    const expectedNode = "22.22.0";
    const nvmVersion = readFileSync(resolve(root, ".nvmrc"), "utf8").trim();
    const packageJson = readJson(resolve(root, "package.json"));
    const lock = readJson(resolve(root, "package-lock.json"));
    const packageVersion = packageJson.devDependencies?.["@fission-ai/openspec"];
    const lockEntry = lock.packages?.["node_modules/@fission-ai/openspec"];
    const installedLockPath = resolve(root, "node_modules/.package-lock.json");
    const installedManifestPath = resolve(root, "node_modules/@fission-ai/openspec/package.json");
    const installedCliPath = resolve(root, "node_modules/@fission-ai/openspec/bin/openspec.js");
    if (
        process.version !== `v${expectedNode}` ||
        nvmVersion !== expectedNode ||
        packageJson.engines?.node !== expectedNode ||
        packageVersion !== "1.6.0" ||
        lock.packages?.[""]?.devDependencies?.["@fission-ai/openspec"] !== packageVersion ||
        lockEntry?.version !== packageVersion ||
        !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(lockEntry?.integrity ?? "") ||
        !existsSync(installedLockPath) ||
        !existsSync(installedManifestPath) ||
        !existsSync(installedCliPath)
    ) {
        fail("Pinned Node or OpenSpec toolchain identity is stale");
    }
    const installedLock = readJson(installedLockPath);
    const installedEntry = installedLock.packages?.["node_modules/@fission-ai/openspec"];
    const installedManifest = readJson(installedManifestPath);
    const closureKeys = openSpecClosure(lock);
    const installedLockKeys = Object.keys(installedLock.packages ?? {})
        .filter(Boolean)
        .sort();
    if (
        installedLock.lockfileVersion !== lock.lockfileVersion ||
        canonicalJson(installedLockKeys) !== canonicalJson(closureKeys) ||
        closureKeys.some(
            (packageKey) =>
                canonicalJson(installedLock.packages[packageKey]) !==
                canonicalJson(lock.packages[packageKey]),
        ) ||
        installedEntry?.version !== lockEntry.version ||
        installedEntry?.resolved !== lockEntry.resolved ||
        installedEntry?.integrity !== lockEntry.integrity ||
        installedManifest.name !== "@fission-ai/openspec" ||
        installedManifest.version !== lockEntry.version ||
        installedManifest.bin?.openspec?.replace(/^\.\//u, "") !== "bin/openspec.js" ||
        !lstatSync(installedCliPath).isFile() ||
        lstatSync(installedCliPath).size === 0
    ) {
        fail("Installed OpenSpec package identity does not match package-lock.json");
    }
    const packageRoot = realpathSync(resolve(root, "node_modules/@fission-ai/openspec"));
    assertInside(root, packageRoot, "installed OpenSpec package");
    assertInside(packageRoot, realpathSync(installedCliPath), "installed OpenSpec CLI");
    // Registry integrity covers tarballs, not the extracted dependency graph that Node executes.
    // Pin the complete semantic lock graph and every installed package byte in that closure.
    const installation = inspectInstalledOpenSpecClosure(root);
    const expectedInstallation =
        options.expectedInstallationIdentity ??
        openspecInstallationIdentities.get(
            `${expectedNode}\u0000@fission-ai/openspec\u0000${lockEntry.version}`,
        );
    if (
        !expectedInstallation ||
        installation.packageCount !== expectedInstallation.packageCount ||
        installation.lockGraphSha256 !== expectedInstallation.lockGraphSha256 ||
        installation.installedTreeSha256 !== expectedInstallation.installedTreeSha256
    ) {
        fail("Installed OpenSpec dependency closure does not match the pinned identity");
    }
    return {
        installedCliSha256: sha256(readFileSync(installedCliPath)),
        installedManifestSha256: sha256(readFileSync(installedManifestPath)),
        lockIntegrity: lockEntry.integrity,
        node: expectedNode,
        openspec: packageVersion,
        installedTreeSha256: installation.installedTreeSha256,
        lockGraphSha256: installation.lockGraphSha256,
        packageCount: installation.packageCount,
    };
}

export function bundledNpmCliPath(nodeExecutable = process.execPath) {
    const nodeDirectory = dirname(realpathSync(nodeExecutable));
    const candidates = [
        resolve(nodeDirectory, "node_modules/npm/bin/npm-cli.js"),
        resolve(nodeDirectory, "../lib/node_modules/npm/bin/npm-cli.js"),
    ];
    const npmCli = candidates.find((candidate) => existsSync(candidate));
    if (!npmCli) {
        fail(`Cannot resolve the npm CLI from the pinned Node runtime at ${nodeExecutable}`);
    }
    return realpathSync(npmCli);
}

export function discoverWorkflowTests(root = repositoryRoot) {
    const directory = resolve(root, "test/agent-workflow");
    if (!existsSync(directory)) {
        fail("Agent workflow test directory is missing");
    }
    return readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
        .map((entry) => `test/agent-workflow/${entry.name}`)
        .sort();
}

export function discoverWorkflowFormattingPaths(root = repositoryRoot) {
    const paths = ["package.json", "package-lock.json"].filter((path) =>
        existsSync(resolve(root, path)),
    );
    for (const [directory, suffix] of [
        [".agents/templates", ".json"],
        ["scripts/agent-workflow", ".mjs"],
        ["test/agent-workflow", ".mjs"],
    ]) {
        const absoluteDirectory = resolve(root, directory);
        if (!existsSync(absoluteDirectory)) {
            continue;
        }
        paths.push(
            ...readdirSync(absoluteDirectory, { withFileTypes: true })
                .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
                .map((entry) => `${directory}/${entry.name}`),
        );
    }
    return paths.sort();
}

export function validateWorkflowLineEndings(root = repositoryRoot) {
    const paths = discoverWorkflowFormattingPaths(root);
    const result = gitAt(root, ["check-attr", "-z", "text", "eol", "--", ...paths]);
    const fields = zeroSeparated(result.stdout);
    if (fields.length !== paths.length * 6) {
        fail("Cannot resolve repository line-ending attributes");
    }
    for (let index = 0; index < fields.length; index += 6) {
        const path = fields[index];
        const textAttribute = fields[index + 2];
        const eolPath = fields[index + 3];
        const eolAttribute = fields[index + 5];
        if (path !== eolPath || !["set", "auto"].includes(textAttribute) || eolAttribute !== "lf") {
            fail(`Workflow file lacks repository-owned LF normalization: ${path}`);
        }
    }
}

export function repositoryCommandPlan(root = repositoryRoot) {
    const npmCli = bundledNpmCliPath();
    const openspecXdgRoot = resolve(root, ".agents/work/openspec-xdg");
    assertInside(root, openspecXdgRoot, ".agents/work/openspec-xdg");
    assertExistingAncestorInside(root, openspecXdgRoot, ".agents/work/openspec-xdg");
    return [
        {
            arguments: [npmCli, "run", "verify"],
            cwd: resolve(root, "backend"),
            executable: process.execPath,
            label: "backend verify",
        },
        {
            arguments: [npmCli, "run", "verify"],
            cwd: resolve(root, "frontend"),
            executable: process.execPath,
            label: "frontend verify",
        },
        {
            arguments: [
                resolve(root, "backend/node_modules/prettier/bin/prettier.cjs"),
                "--config",
                resolve(root, "backend/.prettierrc"),
                "--check",
                ...discoverWorkflowFormattingPaths(root),
            ],
            cwd: root,
            executable: process.execPath,
            label: "root workflow formatting",
        },
        {
            arguments: ["--test", ...discoverWorkflowTests(root)],
            cwd: root,
            executable: process.execPath,
            label: "agent workflow tests",
        },
        {
            arguments: [
                resolve(root, "node_modules/@fission-ai/openspec/bin/openspec.js"),
                "validate",
                "--all",
            ],
            cwd: root,
            executable: process.execPath,
            label: "pinned OpenSpec validation",
            envOverrides: {
                DO_NOT_TRACK: "1",
                XDG_CONFIG_HOME: resolve(openspecXdgRoot, "config"),
                XDG_DATA_HOME: resolve(openspecXdgRoot, "data"),
            },
            revalidateToolchain: true,
        },
    ];
}

function assertAssignedTasksComplete(context) {
    const tasks = readFileSync(resolve(context.changeDirectory, "tasks.md"), "utf8");
    for (const taskId of context.workOrder.taskIds) {
        const escaped = taskId.replaceAll(".", "\\.");
        if (!new RegExp(`^- \\[x\\] ${escaped}(?:\\s|$)`, "imu").test(tasks)) {
            fail(`Assigned OpenSpec task is incomplete: ${taskId}`);
        }
    }
}

export function validateChangeState(changeId) {
    if (!changeId) {
        fail("Change verification requires a change id");
    }
    const context = loadAndValidateContext(defaultWorkOrderPath);
    if (context.workOrder.role !== "integration") {
        fail("Change verification requires an integration work order");
    }
    if (context.workOrder.changeId !== changeId) {
        fail("Change verification id does not match the active work order");
    }
    assertAssignedTasksComplete(context);
    assertCheckpointTemporalConsistency(context.workOrder, {
        recordedAt: new Date().toISOString(),
    });
    const checkpoint = runCheckpoint(defaultWorkOrderPath);
    assertCheckpointTemporalConsistency(context.workOrder, checkpoint);
    return checkpoint;
}

export function assertCheckpointTemporalConsistency(workOrder, checkpoint) {
    if (
        !isRfc3339DateTime(workOrder.issuedAt) ||
        !isRfc3339DateTime(checkpoint.recordedAt) ||
        Date.parse(checkpoint.recordedAt) < Date.parse(workOrder.issuedAt)
    ) {
        fail("Checkpoint predates its work order");
    }
}

function candidateComparisonBase(root, requestedBase) {
    if (requestedBase) {
        const requested = gitAt(root, ["rev-parse", "--verify", `${requestedBase}^{commit}`], {
            allowFailure: true,
        });
        if (requested.status !== 0) {
            fail(`Whitespace comparison base is unavailable: ${requestedBase}`);
        }
        return requested.stdout.toString("utf8").trim();
    }
    const branch = gitAt(root, ["symbolic-ref", "--quiet", "--short", "HEAD"], {
        allowFailure: true,
    })
        .stdout.toString("utf8")
        .trim();
    const master = gitAt(root, ["rev-parse", "--verify", "refs/heads/master^{commit}"], {
        allowFailure: true,
    });
    if (branch !== "master" && master.status === 0) {
        return gitAt(root, ["merge-base", "HEAD", "refs/heads/master"])
            .stdout.toString("utf8")
            .trim();
    }
    const parent = gitAt(root, ["rev-parse", "--verify", "HEAD^{commit}^"], {
        allowFailure: true,
    });
    return parent.status === 0 ? parent.stdout.toString("utf8").trim() : "HEAD";
}

function throwPreservingFailures(primaryError, stateError) {
    if (primaryError && stateError) {
        fail(`${primaryError.message}\nState preservation also failed: ${stateError.message}`);
    }
    if (primaryError) {
        throw primaryError;
    }
    if (stateError) {
        throw stateError;
    }
}

export function runRepositoryVerification(options = {}) {
    assertNoAmbientNodeInjection(options.environment ?? process.env);
    const root = options.root ?? repositoryRoot;
    const before = options.beforeState ?? captureRepositoryState(root);
    let steps = options.steps;
    let primaryError;
    try {
        if (!options.skipStaticChecks) {
            validatePinnedToolchain(root, options.toolchainOptions);
            validateSchemaExamples(root);
            validateMarkdownLinks(root);
            validateWorkflowLineEndings(root);
        }
        steps ??= repositoryCommandPlan(root);
        for (const step of steps) {
            console.log(`\n==> ${step.label}`);
            if (step.revalidateToolchain) {
                validatePinnedToolchain(root, options.toolchainOptions);
            }
            runProcess(step.executable, step.arguments, {
                cwd: step.cwd,
                envOverrides: step.envOverrides,
                label: step.label,
            });
        }
        const comparisonBase = candidateComparisonBase(root, options.comparisonBase);
        const diffCheck = gitAt(root, ["diff", "--check", comparisonBase], {
            allowFailure: true,
        });
        if (diffCheck.status !== 0) {
            process.stderr.write(diffCheck.stdout);
            fail(`git diff --check failed from ${comparisonBase}`);
        }
    } catch (error) {
        primaryError = error;
    }
    let after;
    let stateError;
    try {
        after = captureRepositoryState(root);
        assertRepositoryStateUnchanged(before, after);
    } catch (error) {
        stateError = error;
    }
    throwPreservingFailures(primaryError, stateError);
    return { stateEntries: after.entries.length, steps: steps.length };
}

export function runChangeVerification(changeId, options = {}) {
    assertNoAmbientNodeInjection(options.environment ?? process.env);
    const root = options.root ?? repositoryRoot;
    const before = captureRepositoryState(root);
    const changeValidator = options.changeValidator ?? validateChangeState;
    let checkpoint;
    let checkpointError;
    try {
        checkpoint = changeValidator(changeId);
    } catch (error) {
        checkpointError = error;
    }
    let checkpointStateError;
    try {
        assertRepositoryStateUnchanged(before, captureRepositoryState(root));
    } catch (error) {
        checkpointStateError = error;
    }
    throwPreservingFailures(checkpointError, checkpointStateError);
    const result = runRepositoryVerification({
        ...options,
        beforeState: before,
        comparisonBase: options.comparisonBase ?? checkpoint.baseSha,
        root,
    });
    return { checkpoint, result };
}

function main() {
    const [mode, changeId, ...unexpected] = process.argv.slice(2);
    if (unexpected.length > 0 || !["repository", "change"].includes(mode)) {
        fail("Usage: verify-local.mjs repository | verify-local.mjs change <change-id>");
    }
    const verification =
        mode === "change"
            ? runChangeVerification(changeId)
            : { checkpoint: undefined, result: runRepositoryVerification() };
    const { checkpoint, result } = verification;
    if (checkpoint) {
        console.log(`Change inventory: ${JSON.stringify(checkpoint.fileOperations)}`);
    }
    console.log(
        `Repository verification passed; ${result.steps} commands, ${result.stateEntries} state entries preserved`,
    );
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
    try {
        main();
    } catch (error) {
        console.error(`Repository verification failed: ${error.message}`);
        process.exitCode = 1;
    }
}
