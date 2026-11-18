import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotLocalFixture } from './snapshot.mjs';
import { indexSnapshot } from './snapshot-index.mjs';
import { generateResearchLeads } from './research-leads.mjs';

async function withSource(code, run) {
  const root = await mkdtemp(join(tmpdir(), 'zt-leads-'));
  const sourceDir = join(root, 'fixture');
  const storeDir = join(root, 'store');
  await mkdir(sourceDir);
  try {
    await writeFile(join(sourceDir, 'sample.ts'), code);
    const manifest = await snapshotLocalFixture({ sourceDir, storeDir });
    const index = await indexSnapshot({ manifest, storeDir });
    return await run(index);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('produces reproducible leads with evidence and CWE identifiers', async () => {
  await withSource("export function decode(payload: string) { return eval(payload); }\n", index => {
    const first = generateResearchLeads(index);
    const second = generateResearchLeads(index);
    assert.deepEqual(first, second);
    assert.equal(first.leads.length, 1);
    assert.equal(first.leads[0].ruleId, 'ZT-JS-001');
    assert.deepEqual(first.leads[0].cwe, ['CWE-95']);
    assert.equal(first.leads[0].status, 'suspected');
    assert.equal(first.leads[0].verification, 'not-run');
    assert.equal(first.leads[0].evidence[0].sourceSpan.startLine, 1);
    assert.equal(first.leads[0].evidence[0].observedCall, 'eval');
  });
});

test('detects shell execution calls but does not claim confirmed impact', async () => {
  await withSource("import * as cp from 'node:child_process';\ncp.execSync('echo test');\n", index => {
    const report = generateResearchLeads(index);
    assert.equal(report.leads.length, 1);
    assert.equal(report.leads[0].ruleId, 'ZT-JS-002');
    assert.equal(report.leads[0].verification, 'not-run');
  });
});

test('negative control does not emit leads', async () => {
  await withSource("export const sum = (x: number, y: number) => x + y;\n", index => {
    assert.equal(generateResearchLeads(index).leads.length, 0);
  });
});

test('rejects a forged index digest', async () => {
  await withSource("eval('1');", index => {
    assert.throws(() => generateResearchLeads({...index, indexDigest: '0'.repeat(64)}), /digest mismatch/);
  });
});

test('an alias is not silently treated as proven safe or exploitable', async () => {
  await withSource("const execute = eval; execute('1');", index => {
    assert.equal(generateResearchLeads(index).leads.length, 0);
  });
});
