# ZT-A04 — Immutable snapshot AST indexer

**Product capability:** The CLI reads a previously stored local-fixture manifest plus content-addressed source objects and emits deterministic JSON about source files, symbol declarations, import/re-export statements and call expressions.

## Run

```sh
node tools/snapshot-cli.mjs benchmarks/fixtures/snapshot-demo .local-snapshots
# Copy the manifestDigest printed by snapshot-cli:
node tools/index-cli.mjs .local-snapshots/manifests/<digest>.json .local-snapshots
node --test tools/snapshot-index.test.mjs
```

Requires the TypeScript compiler dependency in the root workspace (`pnpm install`).

## Safety boundaries

The indexer deliberately uses `typescript.createSourceFile` rather than `createProgram`. It parses stored bytes **only**; it never loads `tsconfig.json`, resolves imports, follows external paths, executes build scripts or evaluates source. Manifest file paths and SHA-256 digests are checked before parsing, and the index is deterministic for identical input and TypeScript version.

**Limitations:** This is syntax-level intelligence, not yet semantic data flow or vulnerability detection. Import/call links are unresolved; malformed code yields parse diagnostic counts. Source offsets use TypeScript's UTF-16 conventions. Snapshot intake currently supports *trusted bundled/local fixtures only*. Parser resource isolation, worker CPU/memory/time enforcement, authorization, and hardened hostile-repository ingestion remain independent product gates.

## Next increment

ZT-A05: add evidence-backed research leads from source index plus simple baseline scanner integration, preserving AI-origin leads as independently representable objects. Follow with typed AI test plans and controlled execution oracles.
