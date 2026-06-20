# Stained Motion

**[Live Demo](https://pchadik.github.io/stainedmotion/)**

Generative animated wallpapers with harmonic color. The first mode is a stained
glass effect; an Art Nouveau mode is planned, sharing the same core.

## Structure

```
src/core/      shared engine: canvas, loop, color harmony, Wallpaper Engine props, paint helpers
src/palettes/  per-mode color configuration
src/modes/     per-mode geometry/scene generators (stained-glass.js)
src/main.js    wires the core to a chosen mode
build.mjs      inlines the source into one self-contained index.html per mode
build/<mode>/  build output: index.html + project.json (a Wallpaper Engine wallpaper)
```

The source files are plain browser scripts that register onto a single `App`
namespace — no framework, no CDN, no module loader. `build.mjs` concatenates and
inlines them so each build is a single self-contained HTML file that runs
offline (which is what Wallpaper Engine needs).

## Build

```sh
npm run build
```

This regenerates `build/stained-glass/` and copies it to the repo root
`index.html` (served by GitHub Pages) and `stained-glass.html`.

## Run

### Browser / GitHub Pages

Open `index.html` (or `stained-glass.html`) directly in any modern browser, or
visit the live demo. No server required.

### Wallpaper Engine

Import `wallpaper-engine-stained-glass.zip` through Wallpaper Engine's
"Open from file" option. The wallpaper exposes a Scheme Color property for the
background.

## How It Works

Animated lines drift and bounce across the canvas. Their intersections define a
planar subdivision, creating polygon faces filled by a harmonic color system.
The root hue drifts slowly, and harmony schemes (analogous, triadic,
complementary, …) cross-fade when they switch. Hue is interpolated continuously
across each face's position, so cells transition smoothly rather than flipping.
