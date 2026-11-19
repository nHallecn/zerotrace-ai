import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { indexSnapshot } from './snapshot-index.mjs';
import { generateResearchLeads } from './research-leads.mjs';

const [manifestPath, storeDir, ...rest] = process.argv.slice(2);
if (!manifestPath || !storeDir || rest.length) {
  process.stderr.write('Usage: node tools/leads-cli.mjs <manifest-json> <store-dir>\n');
  process.exitCode = 2;
} else {
  try {
    const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
    const index = await indexSnapshot({ manifest, storeDir: resolve(storeDir) });
    const report = generateResearchLeads(index);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`${error.code ?? 'LEADS_FAILED'}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
