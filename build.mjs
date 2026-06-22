// Zero-dependency build: concatenate the App-namespace source files and inline
// them into one self-contained index.html per mode (no CDN, no module loading),
// then emit each mode's Wallpaper Engine project.json plus its standalone demo
// page at the repo root (served by GitHub Pages). The root index.html is the
// hand-written landing page and is NOT generated here. Run `npm run package`
// to also generate preview images and the Wallpaper Engine .zip modules.
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
  'src/core/color.js',
  'src/core/motion.js'
];

// Public mode keys (build folder / page / zip names). Source files keep their
// historical names: art-nouveau-v1.js is "Sparse", art-nouveau.js is "Organic".
const MODES = {
  'stained-glass': {
    title: 'Stained Glass',
    description: 'Animated stained glass: leaded lines drift across the canvas and the panes they form fill with slowly shifting harmonic color.',
    tags: ['Abstract', 'Relaxing'],
    sources: ['src/palettes/stained-glass.js', 'src/modes/stained-glass.js'],
    bootstrap: "App.start('stained-glass');",
    rootFiles: ['stained-glass.html']
  },
  // Art Nouveau "Sparse" — the frozen v1 composition.
  'art-nouveau-sparse': {
    title: 'Art Nouveau — Sparse',
    description: 'Art Nouveau: gold-outlined vines splay from two concentric halos over a mosaic field, with filigree scrolls and drifting motes. The earlier, airier composition.',
    tags: ['Abstract', 'Relaxing'],
    sources: ['src/palettes/art-nouveau-v1.js', 'src/modes/art-nouveau-v1.js'],
    bootstrap: "App.start('art-nouveau-sparse');",
    rootFiles: ['art-nouveau-sparse.html']
  },
  // Art Nouveau "Organic" — the current v2 composition.
  'art-nouveau-organic': {
    title: 'Art Nouveau — Organic',
    description: 'Art Nouveau: leafy, budding vines sprout in clusters from two haloed roundels whose sunbursts reach toward a drifting meeting point, all over a mosaic field.',
    tags: ['Abstract', 'Relaxing'],
    sources: ['src/palettes/art-nouveau.js', 'src/modes/art-nouveau.js'],
    bootstrap: "App.start('art-nouveau-organic');",
    rootFiles: ['art-nouveau-organic.html']
  },
  // Heartwood — surreal Art Nouveau forest with two converging ribbons.
  'heartwood': {
    title: 'Heartwood',
    description: 'A surreal Art Nouveau forest: two wavy ribbons descend from a shared glowing point high on the canvas — at once a path converging to a far destination and two great trunks — breathing and swaying in sync over a field of dancing trees, in earthy harmonic color.',
    tags: ['Abstract', 'Relaxing', 'Nature'],
    sources: ['src/palettes/heartwood.js', 'src/modes/heartwood.js'],
    bootstrap: "App.start('heartwood');",
    rootFiles: ['heartwood.html']
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
  preview: 'preview.png',
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

  for (const rf of m.rootFiles || []) {
    // Keep the Pages-served files in sync with the build.
    writeFileSync(join(ROOT, rf), html);
    console.log(`  -> copied to root ${rf}`);
  }
}
