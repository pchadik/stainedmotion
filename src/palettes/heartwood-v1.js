// Heartwood "Simple" palette — a frozen copy of the Heartwood palette, kept
// independent so the Simple variant never shifts when the flagship palette is
// tuned. Earthy harmonic color: forest greens reaching into olive, moss, gold,
// amber and umber, with the drifting root hue held to an earth band.
(function (App) {
  App.palettes = App.palettes || {};
  App.palettes.heartwoodV1 = {
    harmonies: {
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
    hueRange: { min: 65, max: 115 },
    outline: '#8a7a45',
    outlineWidth: 1.4
  };
})(window.App = window.App || {});
