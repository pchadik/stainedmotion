// Packaging: build all modes, render a preview image for each (used both as the
// Wallpaper Engine preview and as the landing-page thumbnail), and zip each
// build folder into a Wallpaper Engine module (wallpaper-engine-<mode>.zip).
// Requires the `zip` CLI. Run with `npm run package`.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const MODES = ['stained-glass', 'art-nouveau-sparse', 'art-nouveau-organic', 'heartwood'];
const run = (cmd, cwd) => execSync(cmd, { cwd: cwd || ROOT, stdio: 'inherit' });

run('node build.mjs');
mkdirSync(join(ROOT, 'thumbs'), { recursive: true });
const stageRoot = join(ROOT, 'build', '_pkg');
rmSync(stageRoot, { recursive: true, force: true });

for (const m of MODES) {
  // One render: serves as the WE preview (inside the module) and the thumbnail.
  run(`node tools/preview.mjs ${m} build/${m}/preview.png 0.5`);
  copyFileSync(join(ROOT, 'build', m, 'preview.png'), join(ROOT, 'thumbs', `${m}.png`));

  // Stage <folder>/{index.html,project.json,preview.png} and zip it.
  const folder = `wallpaper-engine-${m}`;
  const stage = join(stageRoot, folder);
  mkdirSync(stage, { recursive: true });
  for (const f of ['index.html', 'project.json', 'preview.png']) {
    copyFileSync(join(ROOT, 'build', m, f), join(stage, f));
  }
  const zipPath = join(ROOT, `${folder}.zip`);
  rmSync(zipPath, { force: true });
  run(`zip -r -q "${zipPath}" "${folder}"`, stageRoot);
  console.log(`packaged ${folder}.zip`);
}

rmSync(stageRoot, { recursive: true, force: true });
console.log('done');
