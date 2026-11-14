import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotLocalFixture } from './snapshot.mjs';
import { indexSnapshot } from './snapshot-index.mjs';

async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'zerotrace-ast-'));
  const sourceDir = join(root, 'src');
  const storeDir = join(root, 'store');
  await mkdir(sourceDir);
  try { await fn({ sourceDir, storeDir }); } finally { await rm(root, { force: true, recursive: true }); }
}
test('indexes TypeScript and JSX deterministically with exact source spans', async () => fixture(async ({ sourceDir, storeDir }) => {
  await writeFile(join(sourceDir, 'a.ts'), "import {x} from './b';\nexport function greet(name: string) { return x(name); }\n");
  await writeFile(join(sourceDir, 'b.tsx'), "export const x = (name: string) => <div>{name}</div>;\n");
  const manifest = await snapshotLocalFixture({ sourceDir, storeDir });
  const a = await indexSnapshot({ manifest, storeDir });
  const b = await indexSnapshot({ manifest, storeDir });
  assert.deepEqual(a, b);
  assert.equal(a.sources.length, 2);
  assert.ok(a.symbols.some(x => x.kind === 'function' && x.name === 'greet' && x.span.startLine === 2));
  assert.ok(a.imports.some(x => x.specifier === './b' && x.resolved === false));
  assert.ok(a.calls.some(x => x.expression === 'x'));
  assert.equal(a.sources[1].diagnosticCount, 0);
}));
test('does not traverse imports or tsconfig extends outside snapshot', async () => fixture(async ({ sourceDir, storeDir }) => {
  await writeFile(join(sourceDir, 'index.ts'), "import 'https://example.invalid/untrusted';\nexport const item = 1;");
  await writeFile(join(sourceDir, 'tsconfig.json'), '{"extends":"../../secret-config.json"}');
  const manifest = await snapshotLocalFixture({ sourceDir, storeDir });
  const result = await indexSnapshot({ manifest, storeDir });
  assert.equal(result.imports[0].specifier, 'https://example.invalid/untrusted');
  assert.equal(result.imports[0].resolved, false);
  assert.equal(result.sources.length, 1);
}));
test('rejects modified objects and forged manifests', async () => fixture(async ({ sourceDir, storeDir }) => {
  await writeFile(join(sourceDir, 'a.ts'), 'export const x = 1;');
  const manifest = await snapshotLocalFixture({ sourceDir, storeDir });
  await assert.rejects(indexSnapshot({ manifest: { ...manifest, files: [{...manifest.files[0], path: '../outside'}] }, storeDir }), {code: 'INVALID_PATH'});
  await assert.rejects(indexSnapshot({ manifest: {...manifest, manifestDigest: '0'.repeat(64)}, storeDir }), {code: 'MANIFEST_DIGEST_MISMATCH'});
  await writeFile(join(storeDir, 'objects', manifest.files[0].sha256), 'tampered');
  await assert.rejects(indexSnapshot({ manifest, storeDir }), {code: 'OBJECT_DIGEST_MISMATCH'});
}));
test('preserves UTF-16 offsets and reports syntax diagnostics without execution', async () => fixture(async ({ sourceDir, storeDir }) => {
  await writeFile(join(sourceDir, 'emoji.ts'), "const emoji = '💡';\nfunction broken( {\n");
  const manifest = await snapshotLocalFixture({ sourceDir, storeDir });
  const result = await indexSnapshot({ manifest, storeDir });
  assert.ok(result.sources[0].diagnosticCount > 0);
  assert.equal(result.symbols.find(x => x.name === 'emoji').span.startLine, 1);
  assert.equal(result.indexer.resolution, 'disabled');
}));
