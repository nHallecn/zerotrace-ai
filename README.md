# ZeroTrace AI

**Autonomous Vulnerability Discovery and Verification Engine**

> Research-stage, authorization-first tooling for finding, reproducing, and explaining security defects in software repositories.

## Overview

ZeroTrace AI is an open-source-oriented final-year software engineering research project. It combines static program analysis, AI-assisted vulnerability hypothesis generation, and isolated, feedback-driven testing to uncover and validate security defects. Instead of simply flagging suspicious code, it aims to provide reproducible evidence and precise source-level explanations.

**Current status:** Planning / initial development. Features below are proposed, not yet implemented.

## Research question

Can a memory-augmented AI security testing system that combines static analysis and execution feedback discover and verify more genuine vulnerabilities per unit of testing budget than static analysis or single-pass LLM analysis alone?

## Intended capabilities

- **Repository ingestion:** Import explicitly authorized GitHub or local JavaScript/TypeScript projects at a pinned commit.
- **Code intelligence:** Index symbols, call relationships, data flows, dependencies, and trust boundaries.
- **Hybrid vulnerability discovery:** Combine conventional analyzers with structured AI-generated hypotheses.
- **Controlled test generation:** Generate targeted tests for authentication, authorization, injection, race conditions, and business-logic defects.
- **Verification:** Execute generated tests in disposable, resource-constrained sandboxes and capture traces and minimal reproduction cases.
- **Research memory:** Record investigated hypotheses, supporting evidence, test outcomes, and reasons for rejection.
- **Reporting:** Export human-reviewable findings, including affected files, severity rationale, reproduction instructions, and remediation suggestions.
- **Evaluation:** Compare against baseline static-analysis and prompt-only approaches, measuring precision, recall on labeled benchmarks, runtime, and model cost.

## Proposed architecture

```text
                  +--------------------------+
                  | Web dashboard / CLI      |
                  +------------+-------------+
                               |
                  +------------v-------------+
                  | API + Scope Policy Gate  |
                  +------------+-------------+
                               |
             +-----------------v-------------------+
             | Job Orchestrator + Research Memory  |
             +--------+---------------+------------+
                      |               |
              +-------v-------+ +-----v----------------+
              | Static        | | AI Hypothesis Engine  |
              | Analysis      | +-----+----------------+
              +-------+-------+       |
                      +-------+-------+
                              |
                    +---------v----------+
                    | Test Generator      |
                    +---------+----------+
                              |
                    +---------v----------+
                    | Isolated Sandbox    |
                    | + Runtime Feedback  |
                    +---------+----------+
                              |
                    +---------v----------+
                    | Evidence Validator  |
                    | + Report Generator  |
                    +--------------------+
```

## Proposed tech stack

| Area | Planned tooling |
| --- | --- |
| Dashboard | Next.js, React, TypeScript |
| API and orchestration | Node.js, Fastify, TypeScript |
| AI | Provider-agnostic model adapter with structured outputs |
| Static analysis | TypeScript Compiler API, tree-sitter, Semgrep and/or CodeQL |
| Test generation | Vitest, fast-check |
| Isolation | Docker sandbox workers with restricted network and resources |
| Queue | BullMQ and Redis |
| Persistence | PostgreSQL |
| Observability | OpenTelemetry |
| Git integration | GitHub API |

## Proposed monorepo layout

```text
zerotrace-ai/
├── apps/
│   ├── web/               # Research dashboard
│   └── api/               # API and job management
├── packages/
│   ├── shared/            # Schemas and types
│   ├── repository-index/  # Parsing and repository graph
│   ├── analyzers/         # Static analysis integrations
│   ├── ai-researcher/     # Hypothesis generation and memory
│   ├── test-generator/    # Security test generation
│   ├── sandbox/           # Isolated execution interface
│   └── reporting/         # Findings and evidence output
├── workers/               # Background analysis workers
├── benchmarks/            # Authorized, reproducible test fixtures
├── docs/                  # Architecture, methodology, threat model
└── README.md
```

## Initial milestones

1. **Foundation:** TypeScript workspace, configuration, CI, database schemas, and API.
2. **Repository indexing:** AST-aware ingestion of local/authorized JavaScript and TypeScript code.
3. **Detection baseline:** Conventional static-analysis integration and normalized findings.
4. **AI investigation:** Evidence-based vulnerability hypotheses with strict JSON schemas.
5. **Sandbox verification:** Deterministic test execution and reproducible local proofs of concept.
6. **Evaluation:** Seeded-vulnerability fixtures, baseline comparisons, and research report.

## Safety and authorization

ZeroTrace AI is designed for **owned software, deliberately vulnerable training projects, and explicitly authorized research scopes**.

- Public source availability **does not** imply permission to test a live service.
- The user must define allowed repositories, commit hashes, test endpoints, and boundaries before a run.
- Sandbox tests should default to **no external network access**, no privileged containers, and limited CPU, memory, time, and filesystem access.
- Never use production credentials or personal data in test environments.
- Do not conduct stealth scanning, denial-of-service tests, persistence, destructive exploitation, or unauthorized access.
- Findings intended for bug bounty programs require **human review** and compliance with the program's current scope and disclosure rules.
- No automatic report submission or live-target exploitation is part of the initial scope.

## Evaluation methodology

Start with labeled, intentionally vulnerable JavaScript/TypeScript applications and seeded test cases. Compare:

1. Conventional static-analysis baseline.
2. Single-pass LLM analysis baseline.
3. ZeroTrace hybrid analysis plus verification.

Metrics: verified true positives, false-positive rate, vulnerability recall on labeled fixtures, source-location accuracy, reproducibility, execution time, and AI inference cost.

## Contributing

The repository is in its research foundation stage. Contributions should include tests, clear reproduction cases, and documentation. Please do not submit vulnerability reports against systems without explicit authorization.

## License

To be selected before public release.

## Disclaimer

ZeroTrace AI is a research and engineering project. It does not guarantee detection of vulnerabilities, acceptance of bug bounty reports, or financial rewards.
