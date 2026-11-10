import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { trustedCases } from './proof-fixtures.mjs';

export function runProofLoop(cases = trustedCases) {
  const findings = cases.map(({ id, category, expectedViolation, run }) => {
    try {
      const result = run();
      if (typeof result?.violated !== 'boolean') throw new Error('invalid oracle output');
      return {
        id, category, expectedViolation,
        actualViolation: result.violated,
        verdict: result.violated ? 'verified-fixture-violation' : 'no-violation-observed',
        oracle: result.oracle,
        observed: result.observed,
        correct: result.violated === expectedViolation,
      };
    } catch (err) {
      return { id, category, expectedViolation, actualViolation: null, verdict: 'inconclusive', correct: false,
        error: err instanceof Error ? err.message : 'unknown failure' };
    }
  });
  const truePositives = findings.filter(x => x.actualViolation === true && x.expectedViolation === true).length;
  const falsePositives = findings.filter(x => x.actualViolation === true && x.expectedViolation === false).length;
  const falseNegatives = findings.filter(x => x.actualViolation !== true && x.expectedViolation === true).length;
  const negatives = findings.filter(x => x.actualViolation === false && x.expectedViolation === false).length;
  const report = {
    schemaVersion: '1', engine: 'trusted-fixture-oracle-baseline', aiUsed: false,
    authorization: 'bundled-trusted-fixtures-only',
    inputDigest: createHash('sha256').update(cases.map(x => x.id).join('|')).digest('hex'),
    cases: findings,
    metrics: {
      caseCount: findings.length, truePositives, falsePositives, falseNegatives, trueNegatives: negatives,
      precision: truePositives + falsePositives ? truePositives / (truePositives + falsePositives) : null,
      recall: truePositives + falseNegatives ? truePositives / (truePositives + falseNegatives) : null,
    },
    passed: findings.length > 0 && findings.every(x => x.correct),
  };
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 1 && args[0] === '--write-artifact')) {
    process.stderr.write('Usage: node tools/proof-loop.mjs [--write-artifact]\n');
    process.exitCode = 2;
    return;
  }
  const result = runProofLoop();
  if (args[0] === '--write-artifact') {
    const out = new URL('../.artifacts/proof-loop.json', import.meta.url);
    await mkdir(new URL('../.artifacts/', import.meta.url), { recursive: true });
    await writeFile(out, JSON.stringify(result, null, 2) + '\n');
    process.stdout.write('Evidence artifact: .artifacts/proof-loop.json\n');
  } else {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  }
  if (!result.passed) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
