import { snapshotLocalFixture } from './snapshot.mjs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
if (args.length !== 2) {
  process.stderr.write('Usage: node tools/snapshot-cli.mjs <trusted-local-fixture-dir> <independent-store-dir>\n');
  process.exitCode = 2;
} else {
  try {
    // This is a trusted-fixture developer tool, NOT external authorization verification.
    const manifest = await snapshotLocalFixture({ sourceDir: resolve(args[0]), storeDir: resolve(args[1]) });
    process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`${error.code ?? 'SNAPSHOT_FAILED'}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
