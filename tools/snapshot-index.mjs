import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const byBytes = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

export class IndexError extends Error {
  constructor(code, message) { super(message); this.code = code; this.name = 'IndexError'; }
}
function fail(code, message) { throw new IndexError(code, message); }

function checkPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') ||
      path.split('/').some(part => !part || part === '.' || part === '..') ||
      path.includes('\0') || path.normalize('NFC') !== path) fail('INVALID_PATH', 'Invalid snapshot-relative path');
}

export function validateManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.sourceKind !== 'local-fixture' ||
      !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 2000 ||
      !/^[a-f0-9]{64}$/.test(manifest.manifestDigest ?? '')) fail('INVALID_MANIFEST', 'Unsupported snapshot manifest');
  const keys = new Set();
  let previous = null;
  let total = 0;
  for (const file of manifest.files) {
    checkPath(file.path);
    const key = file.path.toLowerCase();
    if (keys.has(key) || (previous !== null && byBytes(previous, file.path) >= 0)) fail('INVALID_MANIFEST', 'Manifest paths must be unique and sorted');
    keys.add(key);
    previous = file.path;
    if (!/^[a-f0-9]{64}$/.test(file.sha256 ?? '') || !Number.isSafeInteger(file.size) ||
        file.size < 0 || file.size > 1024 * 1024) fail('INVALID_MANIFEST', 'Invalid file metadata');
    total += file.size;
    if (total > 20 * 1024 * 1024) fail('INVALID_MANIFEST', 'Manifest size exceeds limit');
  }
  const body = { schemaVersion: 1, sourceKind: 'local-fixture', files: manifest.files };
  if (sha256(Buffer.from(JSON.stringify(body))) !== manifest.manifestDigest) fail('MANIFEST_DIGEST_MISMATCH', 'Manifest content does not match digest');
}

const sourceKind = filename => filename.endsWith('.tsx') ? ts.ScriptKind.TSX :
  filename.endsWith('.jsx') ? ts.ScriptKind.JSX :
  filename.endsWith('.ts') || filename.endsWith('.mts') || filename.endsWith('.cts') ? ts.ScriptKind.TS :
  filename.endsWith('.js') || filename.endsWith('.mjs') || filename.endsWith('.cjs') ? ts.ScriptKind.JS : null;

function makeSpan(node, source, file) {
  const startOffset = node.getStart(source);
  const endOffset = node.getEnd();
  const a = source.getLineAndCharacterOfPosition(startOffset);
  const b = source.getLineAndCharacterOfPosition(endOffset);
  return { path: file.path, fileSha256: file.sha256, startOffset, endOffset,
    startLine: a.line + 1, startColumn: a.character + 1,
    endLine: b.line + 1, endColumn: b.character + 1 };
}
function nodeName(name) {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return name.getText();
}
function stableRecords(a, b) {
  return byBytes(a.span.path, b.span.path) || a.span.startOffset - b.span.startOffset || byBytes(a.kind, b.kind);
}

/**
 * Parse only immutable stored objects. Does not create a Program, load tsconfig,
 * resolve imports, follow node_modules, or execute user-supplied code.
 */
export async function indexSnapshot({ manifest, storeDir }) {
  validateManifest(manifest);
  if (typeof storeDir !== 'string') fail('INVALID_STORE', 'Store directory required');
  const store = resolve(storeDir);
  const sources = [];
  const symbols = [];
  const imports = [];
  const calls = [];
  for (const file of manifest.files) {
    const kind = sourceKind(file.path);
    if (kind === null) continue;
    const bytes = await readFile(join(store, 'objects', file.sha256));
    if (bytes.length !== file.size || sha256(bytes) !== file.sha256) fail('OBJECT_DIGEST_MISMATCH', 'Stored source object was modified');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const source = ts.createSourceFile(file.path, text, ts.ScriptTarget.Latest, true, kind);
    const diagnosticCount = source.parseDiagnostics.length;
    sources.push({ path: file.path, sha256: file.sha256, language: ts.ScriptKind[kind], diagnosticCount });
    function walk(node) {
      let symbolKind = null;
      if (ts.isFunctionDeclaration(node)) symbolKind = 'function';
      else if (ts.isClassDeclaration(node)) symbolKind = 'class';
      else if (ts.isMethodDeclaration(node)) symbolKind = 'method';
      else if (ts.isInterfaceDeclaration(node)) symbolKind = 'interface';
      else if (ts.isTypeAliasDeclaration(node)) symbolKind = 'type';
      else if (ts.isEnumDeclaration(node)) symbolKind = 'enum';
      else if (ts.isVariableDeclaration(node)) symbolKind = 'variable';
      if (symbolKind) {
        const name = nodeName(node.name);
        if (name) symbols.push({ kind: symbolKind, name, span: makeSpan(node, source, file) });
      }
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push({ kind: ts.isImportDeclaration(node) ? 'import' : 'reexport',
          specifier: node.moduleSpecifier.text, span: makeSpan(node, source, file),
          resolved: false });
      }
      if (ts.isCallExpression(node)) {
        calls.push({ expression: node.expression.getText(source), span: makeSpan(node, source, file),
          resolved: false });
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  sources.sort((a, b) => byBytes(a.path, b.path));
  symbols.sort(stableRecords);
  imports.sort(stableRecords);
  calls.sort((a, b) => byBytes(a.span.path, b.span.path) || a.span.startOffset - b.span.startOffset);
  const result = {
    schemaVersion: 1,
    inputManifestDigest: manifest.manifestDigest,
    indexer: { name: 'typescript-ast-only', typescriptVersion: ts.version, resolution: 'disabled' },
    sources, symbols, imports, calls,
    limitations: ['syntax-only', 'no-transitive-call-graph', 'imports-not-resolved', 'parse-errors-not-vulnerabilities'],
  };
  return { ...result, indexDigest: sha256(Buffer.from(JSON.stringify(result))) };
}
