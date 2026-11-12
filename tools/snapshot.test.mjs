import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotLocalFixture, SnapshotError } from './snapshot.mjs';

async function withFixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'zerotrace-snapshot-test-'));
  const sourceDir = join(root, 'fixture');
  const storeDir = join(root, 'store');
  await mkdir(sourceDir);
  try { await fn({ root, sourceDir, storeDir }); } finally { await rm(root, { recursive: true, force: true }); }
}
test('canonical manifest and object bytes repeat across runs', async () => withFixture(async ({ sourceDir, storeDir }) => {
  await writeFile(join(sourceDir, 'z.ts'), 'export const z = 1;\n');
  await writeFile(join(sourceDir, 'a.ts'), 'export const a = 2;\n');
  const a = await snapshotLocalFixture({ sourceDir, storeDir });
  const b = await snapshotLocalFixture({ sourceDir, storeDir });
  assert.deepEqual(a, b);
  assert.deepEqual(a.files.map(x => x.path), ['a.ts', 'z.ts']);
  assert.equal(await readFile(join(storeDir, 'objects', a.files[0].sha256), 'utf8'), 'export const a = 2;\n');
  await writeFile(join(sourceDir, 'a.ts'), 'export const a = 3;\n');
  const c = await snapshotLocalFixture({ sourceDir, storeDir });
  assert.notEqual(c.manifestDigest, a.manifestDigest);
  assert.equal(await readFile(join(storeDir, 'objects', a.files[0].sha256), 'utf8'), 'export const a = 2;\n');
}));
test('rejects symlinks rather than following external files', async () => withFixture(async ({ root, sourceDir, storeDir }) => {
  await writeFile(join(root, 'secret'), 'SECRET');
  await symlink(join(root, 'secret'), join(sourceDir, 'link.ts'));
  await assert.rejects(snapshotLocalFixture({ sourceDir, storeDir }), { code: 'SYMLINK' });
}));
test('rejects secret-like files', async () => withFixture(async ({ sourceDir, storeDir }) => {
  await writeFile(join(sourceDir, '.env'), 'API_KEY=redacted');
  await assert.rejects(snapshotLocalFixture({ sourceDir, storeDir }), { code: 'SECRET_FILE' });
}));
test('enforces file-count, size and nesting limits', async () => withFixture(async ({ sourceDir, storeDir }) => {
  await writeFile(join(sourceDir, 'a.ts'), '123456');
  await assert.rejects(snapshotLocalFixture({ sourceDir, storeDir, limits: { maxFiles: 1, maxFileBytes: 3, maxTotalBytes: 10, maxDepth: 3, maxPathBytes: 512 } }), { code: 'LIMIT_BYTES' });
  await writeFile(join(sourceDir, 'b.ts'), 'ok');
  await assert.rejects(snapshotLocalFixture({ sourceDir, storeDir, limits: { maxFiles: 1, maxFileBytes: 20, maxTotalBytes: 50, maxDepth: 3, maxPathBytes: 512 } }), { code: 'LIMIT_FILES' });
}));
test('disallows snapshot output within source', async () => withFixture(async ({ sourceDir }) => {
  await writeFile(join(sourceDir, 'a.ts'), 'ok');
  await assert.rejects(snapshotLocalFixture({ sourceDir, storeDir: join(sourceDir, 'out') }), { code: 'UNSAFE_STORE' });
}));
test('excludes build and dependency folders', async () => withFixture(async ({ sourceDir, storeDir }) => {
  await writeFile(join(sourceDir, 'index.ts'), 'ok');
  await mkdir(join(sourceDir, 'node_modules'));
  await writeFile(join(sourceDir, 'node_modules', 'private.js'), 'ignore');
  const result = await snapshotLocalFixture({ sourceDir, storeDir });
  assert.deepEqual(result.files.map(x => x.path), ['index.ts']);
}));
