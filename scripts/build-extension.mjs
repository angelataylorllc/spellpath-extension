import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const edition = process.env.VITE_EDITION === 'consumer' ? 'consumer' : 'byok';
const outDir = edition === 'consumer' ? 'dist-consumer' : 'dist-byok';

const env = {
  ...process.env,
  VITE_EDITION: edition,
  SPELLPATH_OUT_DIR: outDir,
};

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env });
}

run(`npx vite build --outDir ${outDir}`);
run(`cp -r extension/* ${outDir}/`);
run('node scripts/patch-manifest.mjs');
