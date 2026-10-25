# ZeroTrace AI — Phase 1 Repository Intelligence Design v1.0

**Status:** Draft detailed design (not implementation). **Related:** [System Design v1.1](../00-system-design/SYSTEM_DESIGN_V1_1.md). **Purpose:** deliver reproducible, scope-checked TypeScript/JavaScript source understanding that supports both scanner-origin and independent AI-origin research leads.

## Phase 1 goals and boundaries

Input: explicitly approved **local fixture directory**. Output: immutable source snapshot, deterministic file/symbol index, source locations, candidate research leads, and versioned provenance. GitHub ingestion is part of the platform roadmap but not a prerequisite for the local prototype. No code execution, online dependency installation, live security probing or LLM calls in this initial indexer milestone.

## Pipeline

```text
local fixture + scope grant
   → path and size validation
   → immutable content-addressed source snapshot
   → restricted virtual TypeScript compiler host
   → source files / symbols / imports / references
   → deterministic candidate generation
   → research leads + artifacts + run manifest
   → CLI JSON result (later exposed through API)
```

## Canonical snapshot contract

`SnapshotManifestV1` contains: schemaVersion, snapshotId, sourceKind=`local-fixture`, rootDigest, optional gitCommitSha, manifestDigest, normalized relative paths with SHA-256 and byte count, timestamps only in run metadata (not content digest). Sort entries bytewise; use original file bytes for hashing and separate text decoding/line-ending mapping for source ranges. Reject path traversal, symlinks, special device files, duplicate normalized/casefolded paths and unexpected external references. Exclude `.git`, `node_modules`, build outputs and secrets by policy. For v1 choose 2,000 file and 20 MiB total limits, individual file 1 MiB, path 512 bytes; configurable only within policy-approved maxima.

Snapshots are **copied**, never referenced in place; keep immutable source evidence or explicitly declare replay unavailable after deletion. Revision identity is content SHA-256 for local fixture, Git SHA only when applicable.

## Source index contract

`SourceSpanV1` = snapshotId, relativePath, fileDigest, 0-based half-open start/end UTF-16 offsets, 1-based line and column, optional nodeKind and symbolId. Compiler API uses UTF-16 offsets: record this explicitly and provide byte-offset conversion only via verified mapping when needed. Normalize path separator to `/`, preserve original case, never reference a path outside manifest.

`SourceFileRecord`: path/digest/language/parse diagnostics/imports/exports. `SymbolRecord`: symbolId, qualifiedName, kind, declarationSpan, declaration file, referenced symbols (best effort). Minimal scope includes imports, exports, functions, classes, methods, variables and call expressions; framework-specific HTTP entry points and rich interprocedural data flow are follow-up features and must be marked unsupported, not guessed.

The virtual compiler host resolves modules only from content-addressed snapshot and whitelisted vendored typings, never the developer filesystem. Do not run build scripts or execute tsconfig plugins. Cap indexer CPU, wall time and memory even for local fixtures.

## Research lead contract

`ResearchLeadV1` = leadId, snapshotId, origin (`scanner|ai|runtime|manual`), title, CWE tags, associated source spans, evidence refs, confidence claim and state (`new|triaged|rejected|investigating`). Scanner candidate is **optional**. Phase 1 uses deterministic source patterns and possible scanner integration only; Phase 2 will add independent AI-origin leads. A lead is not a verified vulnerability.

Initial examples for controlled demonstrations: hazardous user-controlled input flow candidate; missing apparent authorization guard candidate; concurrency-sensitive state update candidate. Where AST cannot establish end-to-end semantics, report uncertainty and evidence limitations.

## Module interfaces

- `authorizeSnapshot(request, grant) -> PolicyDecision`: deny unless local approved fixture and digest matches.
- `createSnapshot(fixturePath, policy) -> SnapshotManifestV1`: returns content-addressed manifest and stored objects.
- `indexSnapshot(snapshotId, limits) -> SourceIndexV1`: deterministic parse and symbol ranges.
- `generateLeads(indexId, rulesetVersion) -> ResearchLeadV1[]`: evidence-cited leads.
- `exportAnalysis(sessionId) -> AnalysisExportV1`: status, snapshot/run IDs, sources/symbols/leads and diagnostics.

All boundaries have versioned Zod schemas; return typed errors without embedding unredacted source text. Stable ordering and input hashing are required for deterministic outputs.

## Safety and failure handling

Malformed UTF-8, deeply nested syntax, huge files, path collision, TOCTOU symlink swap, tsconfig extends escaping root, unsupported imports and timeouts must not cause unauthorized reads or host execution. Record rejects with machine-readable error code and safe diagnostic. Analyze trusted fixtures within limited worker process; move to stronger isolation before accepting arbitrary hosted repos.

## Acceptance criteria

1. Identical fixtures and settings yield identical snapshot/manifest/index digests.
2. Editing one file changes snapshot digest; existing snapshots remain unchanged.
3. AST indexing identifies known symbols, import relations and precise spans on JS and TS fixture.
4. Out-of-root path, symlink, oversize input, malformed manifest and compiler resolution escape are rejected.
5. No scanner result is required to represent an AI-origin research lead.
6. Missing or invalid scope fails closed; no network required.
7. CLI outputs a valid `AnalysisExportV1` containing provenance and safe diagnostic fields.
8. Unit tests cover parser errors, UTF-16 span handling, path normalization and stable ordering; CI passes.

## Foundation A tickets and dependencies

| Ticket | Scope | Prerequisite | Definition of done |
| --- | --- | --- | --- |
| ZT-A01 | Workspace/strict TS/CI | none | pnpm build, lint, typecheck, test |
| ZT-A02 | Shared schemas/types | A01 | Zod contracts versioned and tested |
| ZT-A03 | Immutable snapshotter | A02 | canonical manifests, adversarial path tests |
| ZT-A04 | Virtual compiler host/indexer | A03 | deterministic symbols/spans, escape tests |
| ZT-A05 | Leads + CLI | A04 | stable machine-readable report |
| ZT-A06 | Local artifacts/run manifests | A03 | hashes and replay metadata |
| ZT-A07 | Security & integration fixtures | A05/A06 | end-to-end repeatability and deny tests |

**Codex kickoff for ZT-A01:** scaffold a strict, tested pnpm TypeScript workspace containing `apps/cli`, `packages/shared`, `packages/repository-intelligence`, `packages/policy`, and `packages/provenance`. Include ESM boundaries, lint, test, CI, and documented commands. Do not execute untrusted repository code or implement live network scanning. Submit a focused PR with passing test evidence.

## Design review gate

Confirm fixture set, implementation machine/OS, max source corpus, span conventions and reporting format; record deviations as ADRs. Approval of design is separate from certification for hostile inputs or deployment.
