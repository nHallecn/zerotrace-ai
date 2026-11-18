# ZT-A05 — Evidence-backed research leads

**Status:** First deterministic detection baseline. These leads are hypotheses, not verified vulnerabilities. AI investigation and sandbox verification are later product increments.

## Developer action

An authorized local fixture is frozen to an immutable snapshot, parsed with the AST indexer, and inspected for specific risky call expressions. ZeroTrace emits a machine-readable lead report with exact source spans and a content digest.

```sh
pnpm install
node --test tools/research-leads.test.mjs
node tools/snapshot-cli.mjs benchmarks/fixtures/leads-demo .local-snapshots
node tools/leads-cli.mjs .local-snapshots/manifests/<digest>.json .local-snapshots
```

## v1 deterministic rules

- `ZT-JS-001`: direct `eval`/ `globalThis.eval` call; potential CWE-95 *requires review*.
- `ZT-JS-002`: syntactic shell execution call `exec`, `execSync`, `cp.exec`, `cp.execSync`, `child_process.exec`, `child_process.execSync`; potential CWE-78 *requires review*.

These are *call-name heuristics*, not taint or variable-binding analysis. A harmless wrapper, local function with the same name or constant string can be flagged. Aliases may be missed. The report explicitly states that exploitability and runtime behavior were not checked.

## Contract

`ResearchLeadReportV1` includes `inputManifestDigest`, `inputIndexDigest`, versioned ruleset, a sorted `leads` array with stable `leadId`, `origin=static-rule`, CWE tags, source-span evidence, `status=suspected`, `verification=not-run`, limitations and `reportDigest`.

The model for future AI-origin and runtime-origin leads is independent of scanner findings; it can be broadened without changing the verified-finding lifecycle.

## Product verification gate

Tests must cover two true call examples, a negative control, stable digests and malformed index rejection. CI must run both the AST and lead tests. No user source execution, network target scanning, external LLM calls or confirmed vulnerability claims.

## Next

ZT-A06: provenance and safe artifact persistence, followed by Phase 2 typed AI hypothesis generation. Phase 3 will provide a security-specific oracle and permissioned sandbox for confirming or refuting leads. A verified vulnerability must never be inferred from these heuristics alone.
