# ZeroTrace AI — Action-first product reconstruction (decision ADR-013)

**Status:** Product direction agreed; first deterministic verification harness implemented on this PR. **Not yet an AI-powered vulnerability discovery engine.**

## Product promise

**On an authorized repository, ZeroTrace will discover a plausible security failure, create a bounded reproduction plan, execute it in isolation, validate the security property independently, then propose a patch and regression test for human review.**

The main output is a **reproducible failing test + evidence**, later a **reviewable fix with a passing regression test**. A vulnerability explanation alone does not complete the task.

## Core action loop

```text
Authorized input → code analysis / evidence → AI hypothesis
→ typed reproducible test plan → policy gate → sandbox execution
→ deterministic security oracle → verified or refuted evidence
→ [optional] generated patch + regression test → human-reviewed PR
```

**Critical distinction:** The AI proposes investigative work and, eventually, patches. Deterministic oracles and independent tests decide whether an issue is verified. The agent cannot grant itself extra permissions or label its own hypothesis verified.

## First killer demo

A user selects an **approved local fixture** containing an access-control bug. ZeroTrace creates and executes an unauthorized-access test, proves data was exposed to the wrong user, records evidence, and produces a verifiable artifact. A fixed fixture must fail the exploit attempt and be classified correctly. Add at least two other cases rather than relying on one canned success.

The first merged increment must be a **real executable vertical slice**, not a mock dashboard. This PR adds a zero-dependency proof harness with four *trusted, bundled* test scenarios to establish the oracle; it does **not** yet ingest arbitrary source code, invoke an LLM, or execute code from user repositories. Treat it as a test-engine baseline, not the claimed product.

## Definition of done for the MVP

- Local authorized JS/TS input is immutable and scope checked.
- AI generates a structured hypothesis and test plan from unfamiliar source excerpts (explicit user consent required for external LLM transmission).
- Only typed, allowlisted, bounded test operations execute in a worker with denied network, non-root identity and resource caps.
- At least 5 benchmark scenarios with positives, negative controls and an unseen variant are evaluated; no fake outcomes.
- A deterministic oracle distinguishes reproduced behavior from a confirmed security-property violation.
- A machine-readable evidence artifact includes source digest, plan, test outcome, failures, and tool/model provenance.
- When permitted, a proposed code patch is reviewed and exercised against regression tests; no automatic changes to live systems.
- CI and honest CLI walkthrough are ready. A polished dashboard is optional.

## Existing-product comparison (hypotheses; validate with current documentation before external claims)

| Alternative | Established capability | What ZeroTrace must prove instead |
| --- | --- | --- |
| CodeRabbit | Code review and code-fix assistance | Independent runtime reproduction of claimed authorization failures |
| Semgrep | Static detection with rules/data-flow capabilities | Grounded AI hypotheses beyond scanner patterns, confirmed by a security oracle |
| Sentry / Seer | Runtime diagnosis and remediation assistance | On-demand authorized defect reproduction from a pinned source snapshot, not only an observed incident |

These are **differentiation hypotheses, not claims that competitors cannot do these tasks**. Our comparative benchmark must test the precise workflow, not branding.

## Priorities / rebuilt phases

1. **Foundation A:** Prove deterministic security oracles and artifact creation; then safe local snapshots and AST intelligence.
2. **Phase 1 — Repository intelligence:** Read and index approved unfamiliar code; record paths, symbols, source hashes and candidate evidence.
3. **Phase 2 — AI security researcher:** Generate novel, structured, source-grounded hypotheses and constrained test plans; bound budgets and retain negative outcomes.
4. **Phase 3 — Autonomous verification:** Harden the isolated worker, reproduce controlled flaws and verify security impact; support human-reviewed fix proposals and regression tests.
5. **Phase 4 — Quality benchmarking:** Compare scanner only, LLM only, scanner+LLM and full loop under common adjudication; publish precision, recall, verification success, costs, failures.
6. **Phase 5 — Controlled bounty research:** Only after independently audited isolation, validated authorization and manual disclosure approval.

Phases retain original numbering; Foundation A is the early vertical slice. This product is an SWE *solution*, not a research-only deliverable.

## Honest demonstration sequence

1. Show the allowed local fixture and its vulnerability.
2. Show a real generated plan (**currently predefined** in the baseline harness, not AI generated).
3. Show executed checks and their observed output.
4. Show the independently computed oracle and evidence JSON.
5. Show the fixed negative control and any failed or inconclusive case.
6. Show source code and tests in the PR.

## Security constraints

No unrestricted shell commands, no live network targets, no secrets, no external repository execution, and no self-certified authorizations. Only bundled trusted fixtures can run in the initial proof harness. Full sandboxing is a later hard gate **before** user-supplied code execution.

## Implementation sequencing

**PR A (this PR):** executable local oracle baseline + test coverage + product architecture amendment.

**PR B:** immutable snapshot and safe AST indexing over approved local fixture input.

**PR C:** LLM adapter producing typed, source-grounded test-plan proposals with permissions, budgets, provenance and deterministic rejection on malformed plans.

**PR D:** isolated worker plus bounded plan execution and independent evidence checking.

**PR E:** optional patch generation + regression verification and benchmark suite.

Never represent a built-in fixture as an unseen model discovery. Report actual model calls and execution only when run logs demonstrate them.
