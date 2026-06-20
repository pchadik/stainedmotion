// Art Nouveau v1 palette — FROZEN SNAPSHOT (copy of the Art Nouveau palette
// at this point). Kept stable for the saved v1 variant; tweak art-nouveau.js's
// palette for the working version.
(function (App) {
  App.palettes = App.palettes || {};
  App.palettes.artNouveauV1 = {
    harmonies: {
      analogous: [0, 25, -25, 40, -40],
      triadic: [0, 120, 240],
      splitComplementary: [0, 150, 210],
      tetradic: [0, 90, 180, 270],
      complementary: [0, 160, 40, 200]
    },
    satBase: 30, satAmp: 10,
    lightBase: 55, lightAmp: 12,
    blendFreqX: 1.5, blendFreqY: 2,
    satFreqX: 1.2, satFreqY: 0.8,
    lightFreqX: 0.9, lightFreqY: 1.3,
    hueDrift: 0.004,
    harmonySwitchProb: 0.00004,
    crossfadeStep: 0.008,
    // Cloisonné outline (gold) — Mucha's contour lines.
    outline: '#b89a5e',
    outlineWidth: 1.6
  };
})(window.App = window.App || {});
