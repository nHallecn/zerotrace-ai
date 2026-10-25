# ZeroTrace AI

**AI-Powered Vulnerability Discovery and Verification Platform**

> A software security product designed to help developers and authorized security teams discover, reproduce, understand, and resolve vulnerabilities in their applications.

## Product overview

ZeroTrace AI is a final-year **Software Engineering product-development project**. We are building a practical developer tool, not conducting a research-only study.

Developers will be able to connect authorized JavaScript/TypeScript codebases, inspect security-relevant code paths, discover potential defects with static analysis and AI, verify selected findings through controlled tests, and receive actionable evidence-based reports.

**Status:** Architecture and detailed design in progress. The capabilities described below are planned; the application has not yet been implemented.

## Problem we solve

Existing tools may identify suspicious code without demonstrating whether the issue is exploitable under intended conditions. Teams spend time reviewing false positives and reproducing defects manually. ZeroTrace aims to combine code understanding, AI investigation, constrained testing, and evidence-based reports in a single workflow.

## Intended users

- Software developers and teams maintaining JavaScript/TypeScript applications
- Application security engineers auditing software they own or are authorized to test
- Open-source maintainers investigating security defects
- Bug bounty researchers operating strictly within program-approved scopes (future phase)

## Core product capabilities

1. **Repository intelligence:** Import authorized local or GitHub repositories, create immutable source snapshots, and index code using AST analysis.
2. **AI vulnerability discovery:** Generate independent, evidence-grounded security leads and prioritize likely defects, even when a conventional scanner has not flagged them.
3. **Controlled verification:** Create typed test plans, execute permitted tests in isolated environments, and distinguish suspected, reproduced, verified, inconclusive, and refuted findings.
4. **Developer reports:** Display locations, relevant CWE classes, impact assessment, reproduction evidence, and recommended remediation.
5. **Product quality measurement:** Track detection accuracy, false positives, runtime, reproducibility, and model cost using repeatable test suites.
6. **Authorized bounty workflows:** Support explicitly permitted targets and human-reviewed disclosures as a later capability.

## Planned product workflow

```text
Authorized project / local fixture
        |
Repository snapshot & source index
        |
Static analysis + AI research leads
        |
Prioritized vulnerability hypotheses
        |
Policy-validated typed test plan
        |
Isolated verification & security oracle
        |
Evidence-backed finding and developer report
```

## Product development roadmap

| Phase | Product increment |
| --- | --- |
| **Foundation A** | Working CLI, local fixture snapshotting, safe AST indexer, artifacts, and tests |
| **Foundation B** | API, persistence, authorization, orchestration, and secure execution infrastructure |
| **Phase 1 — Repository Intelligence** | Reliable source understanding and normalized security leads |
| **Phase 2 — AI Security Researcher** | AI-assisted discovery, triage, prioritization and investigation memory |
| **Phase 3 — Autonomous Verification** | Typed test generation, controlled sandbox runs, and evidence-backed verdicts |
| **Phase 4 — Quality & Performance Evaluation** | Repeatable benchmarks, regression testing, accuracy and cost reports |
| **Phase 5 — Controlled Bounty Research** | Authorized program integration and human-reviewed disclosure workflows |

The final-year deliverable will be a functional, tested MVP. The complete architecture remains the longer-term product vision; later integrations are not graduation requirements.

## Proposed technology stack

| Component | Planned technologies |
| --- | --- |
| Web dashboard | Next.js, React, TypeScript |
| API | Node.js, Fastify, Zod |
| Code intelligence | TypeScript Compiler API, tree-sitter |
| Static analysis | Semgrep and/or CodeQL adapters |
| AI reasoning | Provider-agnostic model adapter, structured tool calls |
| Verification | Typed test plans, Vitest, fast-check, isolated workers |
| Database | PostgreSQL |
| Job orchestration | Redis, BullMQ (when service phase requires it) |
| Artifacts | Content-addressed, access-controlled object storage |
| Observability | OpenTelemetry |
| Infrastructure | Restricted Docker for controlled local fixtures; stronger isolation for untrusted targets |

## Proposed repository organization

```text
zerotrace-ai/
├── apps/
│   ├── cli/
│   ├── api/
│   └── web/
├── packages/
│   ├── shared/
│   ├── policy/
│   ├── repository-intelligence/
│   ├── ai-researcher/
│   ├── verification-engine/
│   ├── evaluation/
│   ├── provenance/
│   └── reporting/
├── workers/
├── benchmarks/
├── docs/
│   ├── 00-system-design/
│   └── 01-repository-intelligence/
└── README.md
```

## Engineering standards

The product will be developed incrementally with typed interfaces, automated tests, code review, continuous integration, immutable inputs, reproducible results, observability, explicit acceptance criteria, and security-oriented engineering practices.

Benchmarking is used to **validate product quality**; it does not redefine ZeroTrace as a research-only project.

## Safety and authorization

ZeroTrace is intended only for software owned by the user, deliberately vulnerable fixtures, or targets for which explicit testing permission has been independently established.

- Public source availability is not permission to test deployed systems.
- External code/model transmission requires explicit approval and protection of confidential source data.
- Initial executable testing is restricted to approved, disposable local fixtures with no network access by default.
- Results are evidence-graded; suspicious code is not automatically called a confirmed vulnerability.
- No unauthorized scanning, destructive testing, service disruption, or automated bounty submission.
- Human review is required before external vulnerability disclosure.

## Documentation

- [System Design v1.1](docs/00-system-design/SYSTEM_DESIGN_V1_1.md)
- [Phase 1 Detailed Design](docs/01-repository-intelligence/PHASE1_DESIGN_V1.md)

These documents specify the planned product architecture and development backlog. They are not claims of implemented features.

## Contributing

The product is in its design phase. Contributions should include tests, clear acceptance criteria, documentation, and safe, authorized reproduction cases.

## License

To be decided before public distribution.

## Disclaimer

ZeroTrace AI does not guarantee complete vulnerability detection, bug bounty acceptance, or rewards. Testing must stay within authorized scope.
