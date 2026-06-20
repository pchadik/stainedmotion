// Harmonic color engine: a slowly drifting root hue, harmony palettes that
// cross-fade when they switch, and smooth (non-quantized) hue interpolation so
// cells never flip abruptly. Driven entirely by a palette config so each mode
// can supply its own harmonies and saturation/lightness ranges.
(function (App) {
  App.createColorEngine = function (palette) {
    var p = palette;
    var harmonyNames = Object.keys(p.harmonies);

    var rootHue = Math.random() * 360;
    var harmonyType = 0;
    var prevHarmony = 0;
    var harmonyMix = 1; // 1 = fully on current harmony, <1 = mid cross-fade

    // Interpolate between two hues along the shortest angular path.
    function lerpHue(a, b, t) {
      var d = ((b - a + 540) % 360) - 180;
      return (a + d * t + 360) % 360;
    }

    function harmonicHueFor(harmony, cx, cy, w, h) {
      var blend = (Math.sin(cx / w * Math.PI * p.blendFreqX) +
                   Math.sin(cy / h * Math.PI * p.blendFreqY)) / 2;
      // Continuous position within the palette (no hard quantization step).
      var pos = (blend + 1) / 2 * harmony.length;
      var i0 = Math.floor(pos) % harmony.length;
      var i1 = (i0 + 1) % harmony.length;
      var frac = pos - Math.floor(pos);
      var h0 = (rootHue + harmony[i0] + 360) % 360;
      var h1 = (rootHue + harmony[i1] + 360) % 360;
      return lerpHue(h0, h1, frac);
    }

    function getHarmonicHue(cx, cy, w, h) {
      var toHue = harmonicHueFor(p.harmonies[harmonyNames[harmonyType]], cx, cy, w, h);
      if (harmonyMix >= 1) return toHue;
      // Cross-fade from the previous harmony so a switch sweeps in smoothly.
      var fromHue = harmonicHueFor(p.harmonies[harmonyNames[prevHarmony]], cx, cy, w, h);
      return lerpHue(fromHue, toHue, harmonyMix);
    }

    function hueToColor(hue, cx, cy, w, h) {
      var sVal = Math.sin(cx / w * Math.PI * p.satFreqX + cy / h * Math.PI * p.satFreqY);
      var lVal = Math.sin(cx / w * Math.PI * p.lightFreqX + cy / h * Math.PI * p.lightFreqY);
      return { h: hue, s: p.satBase + sVal * p.satAmp, l: p.lightBase + lVal * p.lightAmp };
    }

    function colorToHsl(c) {
      return 'hsl(' + c.h + ', ' + c.s + '%, ' + c.l + '%)';
    }

    function getCellColor(cx, cy, w, h) {
      var x = Math.max(0, Math.min(w, cx));
      var y = Math.max(0, Math.min(h, cy));
      return hueToColor(getHarmonicHue(x, y, w, h), x, y, w, h);
    }

    // Advance the slow hue drift and any in-progress harmony cross-fade.
    function tick() {
      rootHue = (rootHue + p.hueDrift) % 360;
      if (harmonyMix < 1) {
        harmonyMix = Math.min(1, harmonyMix + p.crossfadeStep);
      } else if (Math.random() < p.harmonySwitchProb) {
        prevHarmony = harmonyType;
        harmonyType = (harmonyType + 1) % harmonyNames.length;
        harmonyMix = 0;
      }
    }

    return {
      getCellColor: getCellColor,
      colorToHsl: colorToHsl,
      tick: tick
    };
  };
})(window.App = window.App || {});
