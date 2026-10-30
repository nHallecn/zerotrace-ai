# ZeroTrace AI — Product System Design v1.1

**Status:** Proposed software product architecture, review pending. **Date:** 2026-10-25. **Supersedes:** v1.0 after approval, not before. No implementation is claimed.

## Product vision and roadmap

**Product objective:** Deliver a working AI-powered security tool that helps developers inspect authorized repositories, investigate potential vulnerabilities and obtain reproducible, actionable findings. This is a Software Engineering product-development project. Evaluation and benchmarks are product quality assurance, not a separate academic research deliverable.

**Acceptance outcomes:** A usable CLI first, then an authenticated API and developer dashboard; reproducible detection and verification on authorized local fixtures; regression tests and documented false-positive behavior; controlled evolution toward authorized bounty workflows.

## Goal and roadmap

Build an authorization-first AI vulnerability research engine for JavaScript and TypeScript repositories. Preserve all five phases: (1) repository intelligence, (2) AI security researcher, (3) autonomous verification, (4) benchmarking and research evaluation, (5) controlled bounty research.

**Final-year product MVP:** local authorized fixtures; one TypeScript indexing implementation; one conventional scanner; one model adapter; typed constrained offline verification for 2–3 vulnerability classes; reproducible evaluation. **Long-term:** GitHub ingestion, broader languages/frameworks, advanced sandbox isolation, expanded memory/agents, real authorized bounty workflows. Never treat a publicly readable repository as authorization to attack its deployed service.

## Architecture

CLI / dashboard → API + scope-policy gate → research orchestrator → repository snapshot/index + scanner → AI research leads/hypotheses → policy-validated TestPlan DSL → isolated verification worker → evidence oracle → reporting/evaluation. PostgreSQL is source of record; artifact store holds immutable snapshot/test evidence; Redis queue may be introduced with DB recovery reconciler. Research provenance and authorization gates are cross-cutting.

Initial design: modular TypeScript monorepo with a separate sandbox worker. A locally running CLI prototype precedes service infrastructure. AI reasoning is untrusted; tools validate all parameters.

## Core data model and semantics

- `projects`, `authorization_grants` (immutable approved revisions, explicit operation list, provider list, expiry/revocation), `repository_snapshots` (content-addressed manifest, optional git commit).
- `source_files` and `symbols`, indexed within a canonical snapshot. `research_leads` are independent of scanners: `origin=scanner|ai|runtime|manual`. Zero or more candidates and hypotheses may reference a lead.
- `hypotheses` refer to leads, cited source spans and CWE tags; `test_plans` have typed, restricted operations; `test_runs` link to immutable artifacts and deterministic oracles; `findings` link to hypotheses **and** corroborating run/evidence, not obligatorily to scanner candidates.
- `run_manifests`, `model_tool_calls`, `scanner_runs`, `benchmark_datasets`, `ground_truth_labels`, `benchmark_runs`, `audit_events`, `idempotency_keys`, `artifacts`.
- Source span: snapshot ID, canonical path, content SHA-256, 0-based half-open start/end offsets, start/end line/column, optional AST kind/symbol ID.
- Assign keys and FKs; prohibit findings pointing to evidence from a different project/snapshot. Protect audit immutability with DB permissions; define delete/retention policies. Avoid an unimplemented `tenantId` claim in local-single-user MVP.
- States: a **lead** is unverified; **reproduced** means intended observable behavior was repeated; **verified** means the behavior satisfies a security-specific oracle with linked impact; **inconclusive** means insufficient evidence; **refuted** contradicts the claim. An LLM cannot self-promote statuses.
- Sessions and jobs use allowed-transition tables, compare-and-set/version numbers, leases/fencing tokens, cancellation and stale-worker protection.

## Typed verification contract

A `TestPlanV1` must specify `schemaVersion`, `snapshotId`, `hypothesisId`, `fixtureImageDigest`, `allowedFiles`, `setupOperations`, `testOperations`, `expectedObservables`, `validationOracle`, `limits` (CPU/memory/time/processes/disk/output), `networkMode:'none'`, `approvalRequired`.

Initial DSL operations are allowlisted fixtures and assertion templates only; **no free-form shell commands**. The validator rejects unknown operation types, escaping paths, unapproved images, network requests and targets outside scope. The worker returns machine-checkable evidence; an independent oracle assigns verification status. Prebuilt fixture images and vendored dependencies avoid online installation.

## Authorization and model-data policy

Grant lifecycle: `draft → submitted → approved → active → expired|revoked`. Changes produce new signed/hashed grant revisions. Self-asserted local test fixture grants are explicitly marked **unverified ownership** and cannot authorize external actions. External ownership/program rules require human-verified evidence. Every fetch/read, analysis, model transmission, job dispatch, execution, artifact export and report submission rechecks allowed operations and expiry/revocation. Revocation stops pending work and requests active worker cancellation. Frozen offline evidence replays are distinct from new target actions.

Add separate `llm-analysis` permission, approved providers, explicit external source-transmission approval, secret scanning/redaction, uncertainty fail-closed behavior, provider retention policy and bounded retrieval. Private code is sensitive even without secrets; do not place repository instructions in privileged model prompts.

## Repository and execution boundaries

- Copy approved input into content-addressed storage; never analyze mutable in-place symlink trees.
- Canonical manifest: normalized path ordering, fixed encoding/line endings policy, excluded `.git`, dependencies/build directories; enforce file-count, per-file, total-size and path/nesting limits; reject symlinks outside root, submodules/LFS and unsupported archive entries.
- TypeScript compiler host can resolve/read only files in snapshot. Indexer and scanners have CPU/memory/time budgets and run separately from the API.
- MVP executes only our deliberately vulnerable trusted fixture images with non-root containers, read-only rootfs, limited scratch space, no external network, disabled host networking, bounded resources, no Docker socket, no secrets, artifact extraction allowlist and process-tree cleanup. Verify DNS/IPv4/IPv6/loopback/host service denial by tests.
- This is **not** sufficient evidence for safe arbitrary hostile-code execution. Dedicated VM/microVM-style isolation and independent security review are future gates.

## Provenance and privacy

Every result refers to an immutable `run_manifest`: source/lockfile/image/tool/ruleset digests; runtime OS/architecture; compiler/scanner versions; model/provider/version/sampling; prompt and retrieval versions; seed when available; tool-call ordering; timeouts/retries; sandbox policy digest; budgets. Cache and access-control redacted model inputs/outputs for experimental replay; note provider model deprecation and nondeterminism.

Artifacts have content digest, owning project, classification, encryption/access controls, size and retention policy. Consent, data minimization, institution ethics review if needed, secure deletion, and human-approved private disclosure are mandatory. No automatic bounty reports.

## API conventions

Versioned `/v1` API (Foundation B): projects, authorization grants (including revoke), snapshots, sessions (including cancel), leads/hypotheses, verification plans/runs, findings, researcher labels, benchmark datasets/experiments, artifact retrieval/deletion. Validate Zod contracts, auth, body size/rate limits and project scope. Scoped `idempotency_keys` by requester + endpoint + request hash; never scope session creation keys to nonexistent session IDs. Safe external error envelope separate from protected diagnostic logs. CLI/Foundation A works before APIs.

## Product quality evaluation and benchmarking

Methods: B0 scanner alone; B1 LLM alone; B2 LLM triage of scanner output; B3 repository-aware AI hypotheses without feedback; B4 full hybrid AI + verification; ablation B4 without persistent memory. All methods submit findings to the **same blinded or deterministic adjudication process**, not just B4. Report precision for all emitted reports, verified yield separately, recall, false positives, CWE/location matching, elapsed compute, and model-token costs.

Pre-register dataset, project-level held-out split, secure hard negatives, sample size and paired tests/bootstrap CI, stochastic repeated runs, per-class and per-project outputs, equivalent budget where reasonable, contamination threats (public known benchmarks vs mutated fixtures), and explicit stopping conditions. Initial results are a feasibility study unless statistical evidence supports broader claims. Ranking weights are empirical hypotheses, not scientifically established constants.

## Architecture decisions (ADRs)

ADR-001 TypeScript-first; ADR-002 modular monolith + separate isolated worker; ADR-003 PostgreSQL system of record; ADR-004 Redis/BullMQ later with reconciliation rather than unqualified durability; ADR-005 evidence-gated AI hypotheses; ADR-006 immutable snapshots and run manifests; ADR-007 default-deny scope and external inference permissions; ADR-008 restricted local fixture Docker tier, stronger isolation gate later; ADR-009 human-reviewed disclosures; ADR-010 independent comparative evaluation; ADR-011 typed DSL verification; ADR-012 single-user local thesis MVP with future multi-user architecture.

## Product delivery milestones and Codex backlog

**Foundation A:** ZT-A01 pnpm strict TS workspace/tests; ZT-A02 shared Zod models and `TestPlanV1`; ZT-A03 canonical immutable snapshotter; ZT-A04 snapshot-only TypeScript indexer and source spans; ZT-A05 source research leads/CLI JSON output; ZT-A06 run manifest + local content-addressed artifacts; ZT-A07 unit/security tests and CI.

**Foundation B:** ZT-B01 Fastify versioned API; ZT-B02 PostgreSQL schema/migrations including research leads and evidence FKs; ZT-B03 explicit authorization/LLM data grants; ZT-B04 sessions/leases/idempotency/cancellation; ZT-B05 queue consistency/recovery; ZT-B06 artifact API/protection/retention; ZT-B07 isolated worker and resource/network tests; ZT-B08 telemetry and API security tests.

**Release acceptance gate:** Local authorized JS/TS fixture is snapshot-pinned, safely indexed, produces deterministic research leads and provenance; malformed/path-escaping fixtures are rejected; CI runs. No unsupervised external execution. Foundation B requires verified policy denial and integration tests. Later phases must meet their own exit criteria.

## Stage 0 product design approval gates

Confirm selected MVP vulnerability classes, fixture dataset, external model provider/data policy, trusted sandbox host OS, benchmark sample and acceptable research budget **before** implementing their dependent features. Keep design-review status distinct from production security approval.

> This is a repository-ready architecture revision summary. The expanded working design artifact should remain the source for detailed tables and schemata until a line-by-line reconciliation is performed.
