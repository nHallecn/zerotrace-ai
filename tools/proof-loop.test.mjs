import test from 'node:test';
import assert from 'node:assert/strict';
import { runProofLoop } from './proof-loop.mjs';

test('trusted fixture security oracles distinguish vulnerable and fixed behavior', () => {
  const report = runProofLoop();
  assert.equal(report.aiUsed, false);
  assert.equal(report.passed, true);
  assert.equal(report.metrics.caseCount, 4);
  assert.equal(report.metrics.truePositives, 2);
  assert.equal(report.metrics.trueNegatives, 2);
  assert.equal(report.metrics.falsePositives, 0);
  assert.equal(report.metrics.falseNegatives, 0);
});

test('an invalid oracle remains inconclusive rather than verified', () => {
  const report = runProofLoop([{ id: 'invalid', category: 'CWE-0', expectedViolation: true, run: () => ({ violated: 'yes' }) }]);
  assert.equal(report.passed, false);
  assert.equal(report.cases[0].verdict, 'inconclusive');
});
