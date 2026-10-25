# ZeroTrace AI — System Design v1.0

**Date:** 2026-10-25  
**Status:** Architecture baseline; pending implementation and design review  
**Repository:** `nHallecn/zerotrace-ai`  
**Scope:** Authorized JavaScript/TypeScript software and deliberately vulnerable test fixtures.

## 1. Purpose and research question

ZeroTrace AI is a security research system that combines source-code intelligence, AI-assisted vulnerability hypothesis generation, isolated test execution, and evidence-based verification.

**Research question:** Can a memory-augmented AI security testing system combining static analysis and execution feedback discover and verify more genuine vulnerabilities per unit of testing budget than static analysis or single-pass LLM analysis alone?

The system never assumes that an AI-generated suspicion is an actual vulnerability. Findings are verified against reproducible test evidence.

## 2. Five-phase roadmap

| Phase | Goal | Exit criteria |
| --- | --- | --- |
| 1. Repository intelligence | Parse authorized JS/TS repositories and extract symbols, relations and suspicious code paths | Deterministic AST index and normalized candidates |
| 2. AI security researcher | Produce grounded, ranked security hypotheses | Structured hypotheses with evidence and bounded budgets |
| 3. Autonomous verification | Generate and run controlled tests | Reproducible local evidence and failure traces |
| 4. Benchmark evaluation | Evaluate hybrid approach against baselines | Repeatable metrics, reports and ablation results |
| 5. Controlled bounty research | Support permitted bounty workflows | Scope enforcement, human approvals and disclosure workflow |

Security gates, audit logs and automated tests apply from the first phase; they are not postponed until Phase 5.

## 3. Architecture

```text
Next.js UI / CLI
       |
Fastify API (auth, Zod validation, scope checks)
       |
Research Orchestrator (state machine, budgets, queues)
       |
+----------------------+----------------------+
| Repository Indexer   | AI Hypothesis Engine |
| AST, symbols, graphs | tools, memory, rank  |
+----------------------+----------------------+
       |
Controlled Test Planner
       |
Isolated Verification Worker (no external network by default)
       |
Evidence Validator / Report Generator
       |
PostgreSQL + Redis + Artifact Store + Audit Logs
```

**Deployment choice:** modular monolith for the initial API, with separate untrusted-code workers. Modules communicate through typed contracts; workers are the security and scaling boundary.

### Modules

- **API:** Authentication, project registration, scope approvals, analysis sessions, reports and access control.
- **Repository ingestion:** Pin Git commit, validate ownership/authorization, enforce size and file rules, create immutable snapshots.
- **Code intelligence:** TypeScript compiler API for ASTs, symbols and reference relations; normalized analyzer output.
- **AI researcher:** Generate hypotheses based on cited code evidence; remember tested hypotheses and outcomes.
- **Verification:** Propose bounded test plans; enforce scope and execute in disposable, restricted environments.
- **Evaluation:** Baseline integrations and reproducible metrics.
- **Policy:** Central authorization validation, budget limits, tool allowlisting and auditable decisions.

## 4. Requirements

### Functional

- FR-01: Register projects and define an explicit, versioned authorization scope.
- FR-02: Ingest immutable JS/TS repository snapshots at pinned commit hashes.
- FR-03: Parse source files and index symbols, imports, functions, classes and source ranges.
- FR-04: Generate normalized vulnerability candidates grounded in code evidence.
- FR-05: Generate and rank AI hypotheses with confidence and supporting code references.
- FR-06: Store research memory, including negative test results and duplicate hypotheses.
- FR-07: Propose isolated test plans without automatically acquiring additional privileges.
- FR-08: Record test runs, captured artifacts, execution outcomes and reproducibility metadata.
- FR-09: Separate candidate, hypothesis, verified finding and rejected finding states.
- FR-10: Export human-reviewable findings and benchmark reports.
- FR-11: Require human approval for any report submission.
- FR-12: Provide audit logs for material user, agent and worker actions.

### Nonfunctional

- NFR-01: Default-deny authorization across API, tool use and worker orchestration.
- NFR-02: Validate external inputs using versioned schemas.
- NFR-03: Idempotent orchestration and durable state transitions.
- NFR-04: Traceability to repository commit, analyzer version and model settings.
- NFR-05: Resource and cost budgets per research session.
- NFR-06: Restricted, ephemeral sandbox execution with no network by default.
- NFR-07: Automated unit, integration and policy security tests.
- NFR-08: Deterministic static results for identical inputs/tool versions.
- NFR-09: Secrets must not be stored in model context or reported evidence.
- NFR-10: All experimental comparisons must document dataset and limitations.

### Out of scope for initial release

Live internet scanning, exploitation of third-party systems without explicit authorization, persistence, credential theft, denial of service, automatic bounty submissions, and support for arbitrary programming languages.

## 5. Domain model

```text
users (id, email, created_at)
projects (id, owner_id, name, created_at)
authorizations (id, project_id, scope_json, status, expires_at, approved_by)
repository_snapshots (id, project_id, commit_sha, content_digest, created_at)
source_files (id, snapshot_id, path, digest, language)
symbols (id, source_file_id, name, kind, start_line, end_line)
analysis_sessions (id, snapshot_id, authorization_id, status, config_json, created_at)
candidates (id, session_id, rule_id, location_json, evidence_json, status)
hypotheses (id, session_id, candidate_id, rationale, confidence, status)
test_plans (id, hypothesis_id, plan_json, policy_decision_id, status)
test_runs (id, test_plan_id, status, started_at, completed_at, result_json)
evidence_artifacts (id, test_run_id, digest, storage_key, media_type)
findings (id, session_id, hypothesis_id, classification, severity, evidence_json, status)
research_memory (id, session_id, hypothesis_id, outcome, summary, embedding_ref)
audit_events (id, actor_type, actor_id, action, subject_id, decision, timestamp)
benchmark_runs (id, dataset_id, method, config_json, result_json)
```

All primary IDs are UUIDs; revisions and immutable content hashes support reproducibility. Store large test artifacts outside PostgreSQL with digests and controlled references.

### State transitions

- Analysis: `created → authorized → queued → indexing → analyzing → completed | failed | cancelled`.
- Hypothesis: `proposed → prioritized → planned → testing → verified | rejected | inconclusive`.
- Finding: `draft → evidence_review → verified → approved_for_disclosure | closed`.
- Invalid transitions must be rejected and logged; no state is changed solely because an LLM outputs a matching string.

## 6. AI tools and contracts

The agent is a bounded planner and evidence interpreter, **not** a privileged execution service. The orchestrator validates every tool call.

| Tool | Example input | Output | Restrictions |
| --- | --- | --- | --- |
| `repository.getSource` | snapshotId, path, line range | Pinned source excerpt | Only approved snapshot/path |
| `code.searchSymbols` | snapshotId, query, limit | Symbol references | Bound result count |
| `analysis.getCandidates` | sessionId, filters | Candidate evidence | Session-local only |
| `hypothesis.propose` | sessionId, evidenceIds, rationale | Hypothesis ID | Schema and evidence validation |
| `verification.proposePlan` | hypothesisId, test strategy | Pending test plan | Cannot directly execute |
| `verification.getResults` | testRunId | Test result/evidence references | Authorized access |
| `memory.search` | sessionId, terms | Relevant past outcomes | Isolation by project |

**Agent loop:** retrieve bounded context → form evidence-grounded hypothesis → deduplicate → rank by impact/likelihood/test cost → propose test plan → policy evaluation → isolated execution → interpret results → persist research memory.

Use Zod schemas for all request/response payloads. Version prompts and model configs. Never treat repository content, tool results or README text as instructions with authority.

## 7. API boundary (v1)

All API routes are prefixed with `/v1`; requests use authenticated principals, Zod validation and structured errors.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/projects` | Create research project |
| `GET` | `/projects/:projectId` | Read project |
| `POST` | `/projects/:projectId/authorizations` | Register authorized scope |
| `POST` | `/projects/:projectId/snapshots` | Create pinned local repository snapshot |
| `GET` | `/snapshots/:snapshotId/symbols` | Query code index |
| `POST` | `/analysis-sessions` | Queue authorized analysis |
| `GET` | `/analysis-sessions/:sessionId` | Retrieve state |
| `GET` | `/analysis-sessions/:sessionId/candidates` | List candidates |
| `GET` | `/analysis-sessions/:sessionId/hypotheses` | List hypotheses |
| `POST` | `/verification-plans` | Propose bounded test |
| `GET` | `/test-runs/:testRunId` | View execution and evidence |
| `GET` | `/findings/:findingId` | Read finding |
| `GET` | `/benchmark-runs/:runId` | Evaluate research run |

Write requests should support idempotency keys where replay may create duplicate state. Cursor pagination and error shape should be consistent.

**Standard error envelope:** `{ error: { code, message, requestId, details? } }` (avoid leaking internal traces).

## 8. Security architecture

### Trust boundaries

1. **Untrusted repository:** source files can contain malicious instructions, build scripts and hostile test fixtures.
2. **AI model:** output is untrusted and cannot grant authorization.
3. **API:** authenticated users remain limited to explicitly granted projects.
4. **Sandbox:** untrusted code never runs in the API process or with host privileges.
5. **Artifacts:** logs and reports may contain secrets and must be redacted and access-controlled.

### Policy gates

- Require scope declarations for repository, commit, fixture paths and any endpoints; expired or unapproved scopes are denied.
- Network access disabled for sandbox jobs by default. External targets require a separately reviewed, explicit authorized policy.
- Ephemeral worker filesystem; read-only input mount; bounded writable scratch space.
- Non-root execution; drop capabilities; no privileged containers; no host Docker socket; seccomp/AppArmor and cgroup resource limits.
- CPU, memory, disk, time, process-count and output-size limits per run.
- Pin tools, dependencies, images and fixture versions where possible.
- Separate worker credentials from API credentials; never expose secrets to repository scripts.
- Require human review before any disclosure or bounty submission.

Containerization alone is not a complete security boundary; consider microVM isolation for higher-risk untrusted execution.

### Threat model summary

| Threat | Mitigation |
| --- | --- |
| Prompt injection from repository content | Treat source content as data; validate model tool calls |
| Unauthorized target expansion | Central scope-policy check before every action |
| Dependency/script abuse | No privileged execution; locked deps; isolated network |
| Data exfiltration | Deny egress, redact logs, enforce output limits |
| Cross-project information leak | Tenant checks on every data query and artifact access |
| Model runaway/cost spikes | Token, tool-call, duration and run budgets |
| Duplicate work/retries | Idempotency keys and state-machine constraints |
| False security claims | Independent deterministic evidence checks |

## 9. Research evaluation plan

### Baselines

- **B0:** Conventional static analysis alone.
- **B1:** Single-pass LLM analysis without repository memory or test feedback.
- **B2:** Repository-aware AI hypothesis generation without test feedback.
- **B3:** Full hybrid ZeroTrace approach with isolated verification.
- **Ablation:** B3 with research memory disabled.

### Dataset

Begin with authorized, intentionally vulnerable JS/TS fixtures and secure controls. Include representative authentication, authorization, injection, race-condition and business-logic defects. Record ground-truth location and expected triggering conditions. Separate development/tuning fixtures from held-out evaluation fixtures.

### Metrics

- Recall: known vulnerabilities found / known vulnerabilities in the labeled set.
- Precision: verified true vulnerabilities / all claimed vulnerabilities.
- False-positive rate and false discoveries per project.
- Localization accuracy at file, function and line/range level.
- Reproducibility: repeated verification success under pinned environments.
- Median/p95 time and model cost per verified finding.
- Coverage improvement and session failure rate.

Use matched evaluation budgets, repeated runs for stochastic models, confidence intervals where appropriate and transparent limitations. Do not claim novel vulnerabilities without independently reproducible evidence.

## 10. Architecture decision records

| ADR | Decision | Why | Tradeoff |
| --- | --- | --- | --- |
| ADR-001 | TypeScript-first monorepo | Fits target ecosystem and developer expertise | Narrow initial language scope |
| ADR-002 | Modular monolith + isolated workers | Simpler deployment, explicit isolation | May require future service separation |
| ADR-003 | PostgreSQL as system of record | Transactions, relational integrity and audits | Additional migrations |
| ADR-004 | Redis/BullMQ for background jobs | Async analysis orchestration and retries | Operational dependency |
| ADR-005 | Deterministic tooling + AI | Evidence-based security research | More integration work |
| ADR-006 | Immutable pinned repository snapshots | Reproducibility and stable citations | Storage overhead |
| ADR-007 | Default-deny scope model | Prevent unauthorized actions | Additional setup |
| ADR-008 | Disposable, restricted execution | Isolate untrusted fixtures | Operational complexity |
| ADR-009 | Human-controlled disclosure | Reduce inappropriate submissions | No fully autonomous bounty flow |
| ADR-010 | Benchmark-first evaluation | Academic credibility and regressions | Requires curated labeled fixtures |

## 11. Sprint 1 — Codex-ready implementation backlog

| Ticket | Priority | Dependency | Deliverable / acceptance |
| --- | --- | --- | --- |
| ZT-001 | P0 | None | pnpm workspace with strict TypeScript, lint, formatting and tests |
| ZT-002 | P0 | ZT-001 | Shared Zod schemas for projects, scopes, snapshots and sessions |
| ZT-003 | P0 | ZT-001/002 | Fastify app, health endpoint, structured errors and request IDs |
| ZT-004 | P0 | ZT-002 | PostgreSQL migrations for core entities, indexes and constraints |
| ZT-005 | P0 | ZT-002/003 | Default-deny policy engine, explicit approved scope, audit events |
| ZT-006 | P0 | ZT-004/005 | Authorized immutable local snapshot ingestion with SHA/digest |
| ZT-007 | P0 | ZT-006 | Deterministic AST source indexer with symbols and line ranges |
| ZT-008 | P0 | ZT-003/004/006 | Project/snapshot/session APIs, validated and permission-checked |
| ZT-009 | P1 | ZT-004/008 | Durable session state machine and idempotent job startup |
| ZT-010 | P0 | ZT-001/004 | Development Docker Compose, env template, no production secrets |
| ZT-011 | P0 | ZT-001 | CI pipeline for lint, typecheck, unit and integration tests |
| ZT-012 | P0 | ZT-005/006/007 | Unauthorized-path tests, malformed-repo tests and ADR docs |

### Sprint 1 demonstration

Register an authorized local JS/TS fixture → create a pinned repository snapshot → produce a source/symbol index → persist an analysis session → query index via authenticated API. Unauthorized scopes and paths must fail closed. CI must pass.

### First Codex task

> Implement ZT-001 in `nHallecn/zerotrace-ai` using the Stage 0 design as the architecture contract. Set up a pnpm/TypeScript workspace with `apps/api`, `apps/web`, `packages/shared`, `packages/repository-intelligence`, and `workers`. Configure strict types, ESLint, Prettier, Vitest, Node.js environment validation, README development commands and basic CI. Include runnable examples and green tests; avoid implementing vulnerability exploitation, network scanners or unapproved test execution. Make a focused PR with verification evidence.

## 12. Completion criteria and review

Stage 0 is complete when the team reviews and approves architecture, boundaries, requirements, contracts, threat model, evaluation protocol and Sprint 1 dependencies. Design refinements must be tracked in ADRs and versioned docs. The document is a **planned specification**, not a claim of implemented functionality or completed security audit.

## 13. License and responsible use

The license remains undecided. Authorized software testing only. The project does not guarantee vulnerability detection, bounty eligibility or payment.
