import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

const EXCLUDED = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', '.artifacts']);
const SECRET_NAMES = new Set(['.env', '.env.local', '.env.production', 'id_rsa', 'id_ed25519']);
export const DEFAULT_LIMITS = Object.freeze({ maxFiles: 2000, maxFileBytes: 1024 * 1024, maxTotalBytes: 20 * 1024 * 1024, maxDepth: 24, maxPathBytes: 512 });

export class SnapshotError extends Error {
  constructor(code, message) { super(message); this.name = 'SnapshotError'; this.code = code; }
}
function reject(code, message) { throw new SnapshotError(code, message); }
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function sortCanonical(a, b) { return Buffer.compare(Buffer.from(a), Buffer.from(b)); }
function within(root, path) {
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
}
function nameCheck(name) {
  if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\') || name.includes('\0')) reject('INVALID_PATH', 'Unsafe filename');
  if (name.normalize('NFC') !== name) reject('INVALID_PATH', 'Non-normalized filename');
}
function checkLimits(limits) {
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) reject('INVALID_LIMITS', `Invalid positive limit: ${key}`);
  }
}

export async function snapshotLocalFixture({ sourceDir, storeDir, limits = DEFAULT_LIMITS }) {
  if (typeof sourceDir !== 'string' || typeof storeDir !== 'string') reject('INVALID_INPUT', 'sourceDir and storeDir are required');
  checkLimits(limits);
  const source = resolve(sourceDir);
  const store = resolve(storeDir);
  if (within(source, store) || within(store, source)) reject('UNSAFE_STORE', 'Snapshot store must be separate from source');
  const sourceStat = await lstat(source);
  if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) reject('INVALID_ROOT', 'Root must be a real directory');
  const canonicalRoot = await realpath(source);
  if (canonicalRoot !== source) reject('INVALID_ROOT', 'Source root cannot traverse symlinks');

  const seenPaths = new Set();
  const files = [];
  let total = 0;
  async function visit(dir, depth) {
    if (depth > limits.maxDepth) reject('LIMIT_DEPTH', 'Maximum directory depth exceeded');
    const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => sortCanonical(a.name, b.name));
    for (const entry of entries) {
      nameCheck(entry.name);
      if (EXCLUDED.has(entry.name)) continue;
      if (SECRET_NAMES.has(entry.name) || entry.name.startsWith('.env.')) reject('SECRET_FILE', 'Secret-named file is not permitted in a snapshot');
      const full = join(dir, entry.name);
      const rel = relative(source, full).split(sep).join('/');
      if (!within(source, full)) reject('PATH_ESCAPE', 'Path escapes root');
      if (Buffer.byteLength(rel, 'utf8') > limits.maxPathBytes) reject('LIMIT_PATH', 'Path exceeds limit');
      const key = rel.normalize('NFC').toLowerCase();
      if (seenPaths.has(key)) reject('PATH_COLLISION', 'Normalized path collision');
      seenPaths.add(key);
      const info = await lstat(full);
      if (info.isSymbolicLink()) reject('SYMLINK', 'Symbolic links are not supported');
      if (info.isDirectory()) {
        await visit(full, depth + 1);
        continue;
      }
      if (!info.isFile() || info.nlink !== 1) reject('UNSUPPORTED_FILE', 'Only regular non-hardlinked files are permitted');
      if (++fileCount > limits.maxFiles) reject('LIMIT_FILES', 'File count exceeded');
      if (info.size > limits.maxFileBytes || total + info.size > limits.maxTotalBytes) reject('LIMIT_BYTES', 'Source exceeds byte limit');

      // O_NOFOLLOW prevents the final component becoming a symlink between lstat/open.
      // Trusted local fixture mode only: parent-directory rename races are NOT fully eliminated.
      const handle = await open(full, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      let bytes;
      try {
        const fdStat = await handle.stat();
        if (!fdStat.isFile() || fdStat.nlink !== 1 || fdStat.dev !== info.dev || fdStat.ino !== info.ino) reject('INPUT_CHANGED', 'File changed while snapshotting');
        bytes = await handle.readFile();
        const after = await handle.stat();
        if (after.size !== bytes.length || after.mtimeMs !== fdStat.mtimeMs || after.ctimeMs !== fdStat.ctimeMs) reject('INPUT_CHANGED', 'File changed during read');
      } finally { await handle.close(); }
      total += bytes.length;
      if (bytes.length > limits.maxFileBytes || total > limits.maxTotalBytes) reject('LIMIT_BYTES', 'Source exceeds byte limit');
      files.push({ path: rel, bytes, sha256: sha(bytes), size: bytes.length });
    }
  }

  let fileCount = 0;
  await visit(source, 0);
  if (!files.length) reject('EMPTY_SNAPSHOT', 'No permitted files found');
  files.sort((a, b) => sortCanonical(a.path, b.path));
  const manifestBody = { schemaVersion: 1, sourceKind: 'local-fixture', files: files.map(({ path, sha256, size }) => ({ path, sha256, size })) };
  const manifestDigest = sha(Buffer.from(JSON.stringify(manifestBody)));
  // The store is independent from source, but it must be controlled by the caller.
  await mkdir(join(store, 'objects'), { recursive: true });
  await mkdir(join(store, 'manifests'), { recursive: true });
  for (const item of files) {
    const dest = join(store, 'objects', item.sha256);
    try {
      await writeFile(dest, item.bytes, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const existing = await readFile(dest);
      if (sha(existing) !== item.sha256) reject('CORRUPT_OBJECT', 'Existing content-addressed object does not match its name');
    }
  }
  const manifest = { ...manifestBody, manifestDigest };
  const tmp = join(store, 'manifests', `.${manifestDigest}.${randomUUID()}.tmp`);
  await writeFile(tmp, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const final = join(store, 'manifests', manifestDigest + '.json');
  try {
    const existing = await readFile(final, 'utf8').catch(error => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    if (existing && JSON.parse(existing).manifestDigest !== manifestDigest) reject('CORRUPT_MANIFEST', 'Manifest digest mismatch');
    if (!existing) await rename(tmp, final);
  } finally {
    await rm(tmp, { force: true });
  }
  return manifest;
}
