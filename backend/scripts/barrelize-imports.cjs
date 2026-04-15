const fs = require("fs");
const path = require("path");
const { Project } = require("ts-morph");

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

function toPosix(value) {
    return value.replace(/\\/g, "/");
}

function ensureRelativeSpecifier(fromDir, toDir) {
    let value = toPosix(path.relative(fromDir, toDir));
    if (!value.startsWith(".")) {
        value = `./${value}`;
    }
    return value;
}

function resolveImportTarget(importerPath, specifier) {
    const importerDir = path.dirname(importerPath);
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
        return path.resolve(importerDir, specifier);
    }
    if (specifier.startsWith("@/")) {
        const withoutAlias = specifier.slice(2);
        return path.resolve(srcRoot, withoutAlias);
    }
    return null;
}

function resolveTsFilePath(targetBase) {
    const directTs = `${targetBase}.ts`;
    const directTsx = `${targetBase}.tsx`;
    const asIndex = path.join(targetBase, "index.ts");

    if (fs.existsSync(directTs)) {
        return directTs;
    }
    if (fs.existsSync(directTsx)) {
        return directTsx;
    }
    if (fs.existsSync(asIndex)) {
        return asIndex;
    }
    return null;
}

function buildBarrelSpecifier(importerPath, barrelDir, isAliasImport) {
    if (isAliasImport) {
        const relativeToSrc = toPosix(path.relative(srcRoot, barrelDir));
        return relativeToSrc ? `@/${relativeToSrc}` : "@";
    }
    const importerDir = path.dirname(importerPath);
    return ensureRelativeSpecifier(importerDir, barrelDir);
}

function isDeepSpecifier(specifier) {
    const normalized = specifier.replace(/\\/g, "/");
    const slashCount = (normalized.match(/\//g) || []).length;

    if (normalized.startsWith("./") || normalized.startsWith("../")) {
        return slashCount >= 2;
    }
    if (normalized.startsWith("@/")) {
        return slashCount >= 2;
    }
    return false;
}

/**
 * Rewrites deep imports in a single source file to use folder barrel paths.
 * Returns true if any declaration was changed.
 */
function barrelizeFile(sourceFile) {
    let changed = false;

    for (const importDecl of sourceFile.getImportDeclarations()) {
        const specifier = importDecl.getModuleSpecifierValue();
        if (!isDeepSpecifier(specifier)) {
            continue;
        }

        const resolvedBase = resolveImportTarget(sourceFile.getFilePath(), specifier);
        if (!resolvedBase) {
            continue;
        }

        const resolvedFile = resolveTsFilePath(resolvedBase);
        if (!resolvedFile) {
            continue;
        }
        if (resolvedFile.endsWith(".schema.ts")) {
            continue;
        }
        if (resolvedFile.endsWith("index.ts")) {
            continue;
        }

        const targetDir = path.dirname(resolvedFile);
        const barrelPath = path.join(targetDir, "index.ts");
        if (!fs.existsSync(barrelPath)) {
            continue;
        }

        const replacement = buildBarrelSpecifier(
            sourceFile.getFilePath(),
            targetDir,
            specifier.startsWith("@/"),
        );

        if (replacement && replacement !== specifier) {
            importDecl.setModuleSpecifier(replacement);
            changed = true;
        }
    }

    return changed;
}

/**
 * Merges duplicate import declarations that share the same module specifier
 * into a single declaration. Returns true if any merges occurred.
 *
 * Rules:
 *  - `import type { … }` statements are kept separate from value imports.
 *  - Namespace imports (`* as X`) are never merged with named imports.
 *  - If two declarations both have a default import, they are not merged.
 */
function mergeImportsInFile(sourceFile) {
    let merged = false;

    // Loop until stable — each iteration removes at most one duplicate.
    let changed = true;
    while (changed) {
        changed = false;

        const seen = new Map(); // `${isTypeOnly}:${specifier}` → ImportDeclaration

        for (const decl of sourceFile.getImportDeclarations()) {
            const specifier = decl.getModuleSpecifierValue();
            const isTypeOnly = decl.isTypeOnly();
            const key = `${isTypeOnly}:${specifier}`;

            // Namespace imports cannot be safely merged with named imports.
            if (decl.getNamespaceImport()) {
                seen.set(key, decl);
                continue;
            }

            if (!seen.has(key)) {
                seen.set(key, decl);
                continue;
            }

            const primary = seen.get(key);

            // Skip if the primary uses a namespace import.
            if (primary.getNamespaceImport()) {
                continue;
            }

            const primaryDefault = primary.getDefaultImport();
            const secondDefault = decl.getDefaultImport();

            // Can't merge when both carry a default import.
            if (primaryDefault && secondDefault) {
                continue;
            }

            // Move the default import onto the primary if the duplicate owns it.
            if (secondDefault && !primaryDefault) {
                primary.setDefaultImport(secondDefault.getText());
            }

            // Merge named imports, avoiding duplicates.
            const existingNames = new Set(primary.getNamedImports().map((ni) => ni.getName()));
            for (const ni of decl.getNamedImports()) {
                if (!existingNames.has(ni.getName())) {
                    primary.addNamedImport(ni.getStructure());
                    existingNames.add(ni.getName());
                }
            }

            // Remove the now-redundant declaration.
            decl.remove();
            changed = true;
            merged = true;
            break; // Restart — the AST was mutated.
        }
    }

    return merged;
}

function run() {
    const project = new Project({
        tsConfigFilePath: path.join(projectRoot, "tsconfig.json"),
        skipAddingFilesFromTsConfig: false,
    });

    const sourceFiles = project
        .getSourceFiles("src/**/*.ts")
        .filter((sourceFile) => !sourceFile.getFilePath().endsWith("index.ts"));

    let rewrittenCount = 0;
    let mergedCount = 0;

    for (const sourceFile of sourceFiles) {
        const barrelChanged = barrelizeFile(sourceFile);
        const mergeChanged = mergeImportsInFile(sourceFile);

        if (barrelChanged || mergeChanged) {
            sourceFile.saveSync();
            if (barrelChanged) rewrittenCount += 1;
            if (mergeChanged) mergedCount += 1;
        }
    }

    console.log(
        `Barrelized imports in ${rewrittenCount} file(s). Merged duplicates in ${mergedCount} file(s).`,
    );
}

run();
