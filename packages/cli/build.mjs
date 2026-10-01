import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
  console.log('[*] Bundling Martinari CLI into a single standalone file...');

  const outDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const entry = path.join(__dirname, 'index.js');
  const outfile = path.join(outDir, 'martina.cjs');

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: outfile,
    format: 'cjs',
    external: [],
    minify: false,
    logLevel: 'info',
  });

  // Make executable
  try {
    fs.chmodSync(outfile, 0o755);
  } catch {
    // ignore on windows
  }

  // Also copy to root as martina.js for quick standalone access
  const rootMartina = path.join(__dirname, '../../martina.js');
  try {
    fs.copyFileSync(outfile, rootMartina);
  } catch {}

  const stat = fs.statSync(outfile);
  console.log(`[OK] Standalone bundle created at packages/cli/dist/martina.cjs & martina.js (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log('You can now run: node martina.js join <ROOM_CODE>');
}

build().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
