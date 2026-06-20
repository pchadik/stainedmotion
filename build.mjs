// Zero-dependency build: concatenate the App-namespace source files and inline
// them into one self-contained index.html per mode (no CDN, no module loading),
// then emit each mode's Wallpaper Engine project.json. The stained-glass build
// is also copied to the repo root so the GitHub Pages demo keeps working.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// Order matters only in that everything must be defined before the bootstrap
// call at the end; within these, each file just registers onto window.App.
const CORE = [
  'src/core/canvas.js',
  'src/core/loop.js',
  'src/core/weprops.js',
  'src/core/paint.js',
  'src/core/color.js'
];

const MODES = {
  'stained-glass': {
    title: 'Stained Glass',
    description: 'Animated stained glass effect with slowly drifting lines and harmonically colored cells.',
    tags: ['Abstract', 'Relaxing'],
    sources: ['src/palettes/stained-glass.js', 'src/modes/stained-glass.js'],
    bootstrap: "App.start('stained-glass');",
    root: true // also written to repo root for GitHub Pages
  }
};

const htmlShell = (title, bundle, bootstrap) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
${bundle}
${bootstrap}
  </script>
</body>
</html>
`;

const projectJson = (m) => JSON.stringify({
  file: 'index.html',
  general: {
    properties: {
      schemecolor: { order: 0, text: 'Scheme Color', type: 'color', value: '0.04 0.04 0.04' }
    }
  },
  title: m.title,
  type: 'web',
  version: 1,
  visibility: 'private',
  tags: m.tags,
  description: m.description
}, null, 2) + '\n';

for (const [name, m] of Object.entries(MODES)) {
  const files = [...CORE, ...m.sources, 'src/main.js'];
  const bundle = files
    .map((f) => `/* ===== ${f} ===== */\n${read(f)}`)
    .join('\n');
  const html = htmlShell(m.title, bundle, '    ' + m.bootstrap);

  const outDir = join(ROOT, 'build', name);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  writeFileSync(join(outDir, 'project.json'), projectJson(m));
  console.log(`built build/${name}/  (${files.length} sources, ${html.length} bytes)`);

  if (m.root) {
    // Keep the existing Pages-served files in sync with the build.
    writeFileSync(join(ROOT, 'index.html'), html);
    writeFileSync(join(ROOT, 'stained-glass.html'), html);
    console.log('  -> copied to root index.html + stained-glass.html');
  }
}
