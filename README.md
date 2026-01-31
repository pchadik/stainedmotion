# Stained Motion

An animated stained glass screensaver that generates procedural geometric patterns with harmonic color schemes.

## Implementations

### Standalone (Browser)

Open `stained-glass.html` directly in any modern browser. No build step or server required.

### React Component

Import `stained-glass-screensaver.jsx` into your React project:

```jsx
import StainedGlassScreensaver from './stained-glass-screensaver';

function App() {
  return <StainedGlassScreensaver />;
}
```

### Wallpaper Engine

Import `wallpaper-engine-stained-glass.zip` through Wallpaper Engine's "Open from file" option.

## How It Works

Animated lines move and bounce across the canvas. Their intersections define a planar subdivision, creating polygon faces that are filled using a harmonic color system. Colors shift smoothly over time through various schemes (analogous, triadic, complementary, etc.).
