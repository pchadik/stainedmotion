// Heartwood palette: earthy harmonic color — forest greens reaching into olive,
// moss, gold, amber and umber. Unlike the Art Nouveau palette (which keeps the
// full hue wheel), this one constrains the drifting root hue to an earth band
// via `hueRange`, so the scene stays in greens/golds/browns while still moving.
// Lower lightness than the Art Nouveau modes for a deep, woodland feel.
(function (App) {
  App.palettes = App.palettes || {};
  App.palettes.heartwood = {
    harmonies: {
      // All offsets kept small so root-hue + offset never leaves the earth band.
      forest:    [0, -15, 12, -28],   // green core, olive + gold neighbours
      mossGold:  [0, -25, -40, 14],   // green -> amber -> sienna
      barkUmber: [0, 18, -30, 8]      // green <-> umber/brown
    },
    satBase: 34, satAmp: 12,
    lightBase: 40, lightAmp: 12,
    blendFreqX: 1.2, blendFreqY: 1.8,
    satFreqX: 1.0, satFreqY: 0.7,
    lightFreqX: 0.8, lightFreqY: 1.2,
    hueDrift: 0.003,
    harmonySwitchProb: 0.00003,
    crossfadeStep: 0.006,
    // Keep the root hue ping-ponging in the yellow-green..green range; the small
    // harmony offsets above carry it down into amber/umber without leaving earth.
    hueRange: { min: 65, max: 115 },
    // Earthy bronze contour — the nouveau cloisonné line, woodland-tinted.
    outline: '#8a7a45',
    outlineWidth: 1.4
  };
})(window.App = window.App || {});
