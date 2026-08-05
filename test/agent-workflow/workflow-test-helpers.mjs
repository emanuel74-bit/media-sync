import { mkdtempSync, mkdirSync, cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import {
    gitExecutableArguments,
    sanitizedSubprocessEnvironment,
} from "../../scripts/agent-workflow/preflight.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function write(root, path, content) {
    const absolute = resolve(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content, "utf8");
}

export function readJson(root, path) {
    return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

export function writeJson(root, path, value) {
    write(root, path, `${JSON.stringify(value, null, 4)}\n`);
}

export function command(root, executable, args, options = {}) {
    const { env = {}, ...spawnOptions } = options;
    return spawnSync(executable, args, {
        cwd: root,
        encoding: "utf8",
        env: sanitizedSubprocessEnvironment(process.env, {
            XDG_CONFIG_HOME: resolve(root, ".git/test-xdg-config"),
            ...env,
        }),
        shell: false,
        windowsHide: true,
        ...spawnOptions,
    });
}

export function git(root, args, options = {}) {
    const result = command(root, "git", gitExecutableArguments(root, args));
    if (!options.allowFailure && result.status !== 0) {
        throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
    }
    return result.stdout.trim();
}

export function commitAll(root, message) {
    git(root, ["add", "-A"]);
    git(root, ["commit", "-m", message]);
    return git(root, ["rev-parse", "HEAD"]);
}

export function commitPaths(root, paths, message) {
    git(root, ["add", "--", ...paths]);
    git(root, ["commit", "-m", message]);
    return git(root, ["rev-parse", "HEAD"]);
}

export async function setupFixture(options = {}) {
    const root = mkdtempSync(resolve(tmpdir(), "media-sync-agent-workflow-"));
    git(root, ["init", "-b", "master"]);
    git(root, ["config", "user.name", "Agent Workflow Test"]);
    git(root, ["config", "user.email", "agent-workflow@example.test"]);
    cpSync(resolve(sourceRoot, "scripts/agent-workflow"), resolve(root, "scripts/agent-workflow"), {
        recursive: true,
    });
    cpSync(resolve(sourceRoot, ".agents/templates"), resolve(root, ".agents/templates"), {
        recursive: true,
    });
    cpSync(resolve(sourceRoot, ".gitattributes"), resolve(root, ".gitattributes"));
    write(root, "README.md", "# fixture\n");
    const baselineSha = commitAll(root, "fixture baseline");

    write(root, "openspec/changes/test-change/proposal.md", "# Proposal\n");
    write(root, "openspec/changes/test-change/design.md", "# Design\n");
    write(
        root,
        "openspec/changes/test-change/specs/test-capability/spec.md",
        options.specContent ??
            "## ADDED Requirements\n\n### Requirement: Test\nThe tool MUST validate.\n",
    );
    write(
        root,
        "openspec/changes/test-change/tasks.md",
        "## 1. Protocol\n\n- [ ] 1.1 Implement fixture work\n- [ ] 1.2 Validate fixture work\n",
    );
    const planningSha = commitAll(root, "fixture planning");
    const module = await import(
        `${pathToFileURL(resolve(root, "scripts/agent-workflow/preflight.mjs")).href}?fixture=${Date.now()}`
    );
    const artifactDigest = module.computeAcceptedArtifactDigest("test-change");
    writeJson(root, "openspec/changes/test-change/acceptance.json", {
        schemaVersion: 1,
        changeId: "test-change",
        baselineSha,
        planningSha,
        artifactDigest,
        acceptedBy: "test-coordinator",
        acceptedAt: "2026-07-31T00:00:00.000Z",
    });
    write(root, ".gitignore", "/.agents/work/\n");
    for (const [path, content] of Object.entries(options.baseFiles ?? {})) {
        write(root, path, content);
    }
    const baseSha = commitAll(root, "fixture accepted base");
    git(root, ["checkout", "-b", options.branch ?? "feature/test"]);
    git(root, ["branch", "-f", "master", baselineSha]);

    const workOrder = {
        schemaVersion: 1,
        workOrderId: "test-work-order",
        changeId: "test-change",
        role: options.role ?? "implementer",
        taskIds: options.taskIds ?? ["1.1"],
        acceptedArtifactDigest: artifactDigest,
        baseSha,
        issuedBy: "test-coordinator",
        issuedAt: "2026-07-31T00:01:00.000Z",
        allowedPaths: options.allowedPaths ?? ["src/new.txt"],
        forbiddenPaths: options.forbiddenPaths ?? ["forbidden.txt"],
        protectedPaths: options.protectedPaths ?? [".claude/settings.local.json"],
        expectedAdditions: options.expectedAdditions ?? ["src/new.txt"],
        expectedModifications: options.expectedModifications ?? [],
        expectedDeletions: options.expectedDeletions ?? [],
        expectedRenames: options.expectedRenames ?? [],
        requiredDocuments: options.requiredDocuments ?? [
            "openspec/changes/test-change/proposal.md",
            "openspec/changes/test-change/design.md",
            "openspec/changes/test-change/specs/test-capability/spec.md",
            "openspec/changes/test-change/tasks.md",
        ],
        conventionIds: options.conventionIds ?? ["TOOL-09"],
        focusedCommands: options.focusedCommands ?? [
            {
                commandId: "focused-pass",
                cwd: ".",
                argv: ["node", "-e", "process.exit(0)"],
            },
        ],
        nonGoals: ["Do not change product behavior."],
        stopConditions: ["Stop on undeclared paths."],
    };
    writeJson(root, ".agents/work/active-work-order.json", workOrder);
    if (options.userFile !== false) {
        write(root, ".claude/settings.local.json", "secret-local-state\n");
    }
    return {
        artifactDigest,
        baseSha,
        baselineSha,
        planningSha,
        root,
        workOrder,
    };
}

export function runScript(fixture, script, args) {
    return command(fixture.root, "node", [`scripts/agent-workflow/${script}`, ...args]);
}

export function runPreflight(fixture) {
    return runScript(fixture, "preflight.mjs", [
        "--work-order",
        ".agents/work/active-work-order.json",
    ]);
}

export function runCheckpoint(fixture) {
    return runScript(fixture, "checkpoint.mjs", [
        "--work-order",
        ".agents/work/active-work-order.json",
    ]);
}

export function updateWorkOrder(fixture, update) {
    const workOrder = readJson(fixture.root, ".agents/work/active-work-order.json");
    const next = typeof update === "function" ? update(workOrder) : { ...workOrder, ...update };
    writeJson(fixture.root, ".agents/work/active-work-order.json", next);
    fixture.workOrder = next;
    return next;
}

export function cleanupFixture(fixture) {
    rmSync(fixture.root, { force: true, recursive: true });
}
