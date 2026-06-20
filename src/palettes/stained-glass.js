// Saturated stained-glass palette. These constants reproduce the original
// look exactly; a future Art Nouveau palette supplies its own muted values.
(function (App) {
  App.palettes = App.palettes || {};
  App.palettes.stainedGlass = {
    harmonies: {
      analogous: [0, 30, -30, 15, -15],
      triadic: [0, 120, 240],
      splitComplementary: [0, 150, 210],
      tetradic: [0, 90, 180, 270],
      complementary: [0, 180, 30, 210]
    },
    satBase: 35, satAmp: 10,
    lightBase: 38, lightAmp: 8,
    blendFreqX: 2, blendFreqY: 3,
    satFreqX: 1.5, satFreqY: 1,
    lightFreqX: 1, lightFreqY: 1.7,
    hueDrift: 0.003,
    harmonySwitchProb: 0.00005,
    crossfadeStep: 0.01
  };
})(window.App = window.App || {});
