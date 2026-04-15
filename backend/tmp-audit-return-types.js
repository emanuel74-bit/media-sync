const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const root = path.join(process.cwd(), "backend", "src");
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && p.endsWith('.ts')) out.push(p);
  }
  return out;
}
const files = walk(root);
const missing = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) {
      if (!ts.isConstructorDeclaration(node)) {
        const name = node.name && node.name.getText(sf);
        if (!node.type && name) {
          const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          missing.push({ file, line: pos.line + 1, kind: ts.isMethodDeclaration(node) ? "method" : "function", name });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
missing.sort((a,b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const m of missing) {
  console.log(`${path.relative(process.cwd(), m.file).replace(/\\/g, "/")}:${m.line} ${m.kind} ${m.name}`);
}
console.log(`TOTAL ${missing.length}`);
