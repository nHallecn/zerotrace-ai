# Foundation A — Safe local snapshotting (ZT-A03)

**Status:** Feature branch implementation; no arbitrary repository execution or AI inference.

## User story

As a developer with an approved local test fixture, I can freeze its byte content into a deterministic manifest and content-addressed artifact store before any code inspection begins. Re-running unchanged input produces the same digest; a changed file produces a new snapshot without mutating the previous evidence.

## Local demo

```sh
node tools/snapshot-cli.mjs benchmarks/fixtures/snapshot-demo .local-snapshots
node --test tools/snapshot.test.mjs
```

The CLI operates on **trusted local fixtures** only. It is **not** a proof of authorization for third-party targets. The snapshot does not run `npm install`, scripts, or tests from the input.

## Contract

Input: `{ sourceDir, storeDir, limits? }`. Output: `{ schemaVersion:1, sourceKind:'local-fixture', files:[{path,sha256,size}], manifestDigest }`.

Canonical manifest sorts normalized slash-separated paths by UTF-8 bytes, preserves original file bytes, hashes with SHA-256, excludes `.git`, `node_modules`, build directories, and refuses symlinks, secret-named files, non-regular entries, hardlinks and unsafe store roots.

Default limits: 2,000 files, 1 MiB/file, 20 MiB total, depth 24, path 512 bytes. Symlink and directory race protection is **not** complete against an actively hostile concurrent writer. This is explicitly a trusted-fixture feature; untrusted inputs require an isolated worker, safe directory-descriptor traversal and independent security review.

## Acceptance tests

Stable digest; immutable prior objects; symlink rejection; secret-name rejection; size/count limits; output-in-source rejection; dependency folder exclusion; no input execution. This is a safe ingestion prerequisite, not yet AST analysis, AI planning or vulnerability discovery.

## Next

Implement a snapshot-only TypeScript compiler host and deterministic index on stored objects (ZT-A04), not on mutable paths. Add snapshot authorization and full manifest/tool provenance as separate security gates.
