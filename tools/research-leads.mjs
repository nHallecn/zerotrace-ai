import { createHash } from 'node:crypto';

const digest = text => createHash('sha256').update(text).digest('hex');
const compare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

/**
 * Deliberately conservative syntax-only candidates. These are NOT confirmed bugs.
 * No user source code is executed, and no source excerpts leave the local machine.
 */
const RULES = Object.freeze([
  {
    id: 'ZT-JS-001',
    cwe: 'CWE-95',
    title: 'Dynamic evaluation requires review',
    description: 'A call named eval may execute dynamically constructed code. Check whether untrusted input can reach this call.',
    matches: expression => expression === 'eval' || expression === 'globalThis.eval',
  },
  {
    id: 'ZT-JS-002',
    cwe: 'CWE-78',
    title: 'Shell command execution requires review',
    description: 'A shell execution API is called. Check command construction and whether untrusted input reaches the shell.',
    matches: expression => /^(?:exec|execSync|child_process\.exec|child_process\.execSync|cp\.exec|cp\.execSync)$/.test(expression),
  },
]);

function validateIndex(index) {
  if (!index || index.schemaVersion !== 1 ||
      !/^[a-f0-9]{64}$/.test(index.inputManifestDigest ?? '') ||
      !/^[a-f0-9]{64}$/.test(index.indexDigest ?? '') ||
      !Array.isArray(index.calls)) throw new TypeError('A valid snapshot AST index is required');
  const { indexDigest, ...body } = index;
  if (digest(JSON.stringify(body)) !== indexDigest) throw new TypeError('AST index digest mismatch');
}

export function generateResearchLeads(index) {
  validateIndex(index);
  const leads = [];
  for (const call of index.calls) {
    if (typeof call.expression !== 'string' || typeof call.span?.path !== 'string' ||
        !Number.isSafeInteger(call.span.startOffset) || !Number.isSafeInteger(call.span.endOffset) ||
        call.span.startOffset < 0 || call.span.endOffset < call.span.startOffset ||
        !/^[a-f0-9]{64}$/.test(call.span.fileSha256 ?? '')) {
      throw new TypeError('Malformed call evidence');
    }
    for (const rule of RULES) {
      if (!rule.matches(call.expression)) continue;
      const evidence = {
        sourceSpan: call.span,
        observedCall: call.expression,
        astIndexDigest: index.indexDigest,
      };
      const leadId = digest(JSON.stringify([index.inputManifestDigest, rule.id, evidence.sourceSpan]));
      leads.push({
        schemaVersion: 1,
        leadId,
        origin: 'static-rule',
        ruleId: rule.id,
        title: rule.title,
        description: rule.description,
        cwe: [rule.cwe],
        status: 'suspected',
        verification: 'not-run',
        confidence: 'requires-investigation',
        evidence: [evidence],
      });
    }
  }
  leads.sort((a, b) =>
    compare(a.evidence[0].sourceSpan.path, b.evidence[0].sourceSpan.path) ||
    a.evidence[0].sourceSpan.startOffset - b.evidence[0].sourceSpan.startOffset ||
    compare(a.ruleId, b.ruleId));
  const body = {
    schemaVersion: 1,
    inputManifestDigest: index.inputManifestDigest,
    inputIndexDigest: index.indexDigest,
    ruleset: { id: 'zerotrace-js-syntax', version: '1.0.0', ruleIds: RULES.map(rule => rule.id) },
    leads,
    limitations: [
      'syntax-only; no taint tracking or reachability proof',
      'callee spelling may be an alias, harmless wrapper or shadowed variable',
      'no claims of vulnerability verification or exploitability',
      'unrecognized calls and computed properties are not detected',
    ],
  };
  return { ...body, reportDigest: digest(JSON.stringify(body)) };
}
