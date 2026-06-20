// Three independent motion axes, each a value in [0,1] that drifts on its own
// incommensurate cycle so the scene keeps recomposing instead of looping:
//   u - undulation (flow-field breathing)
//   r - rotation   (roundels / polar mosaic spin)
//   p - particles  (motes advecting along the streamlines)
// A soft floor on combined energy keeps it from ever going fully still.
// Master intensity and per-axis enable/cap hooks back the future WE properties.
(function (App) {
  App.createMotion = function (config) {
    config = config || {};
    var intensity = config.intensity != null ? config.intensity : 1;
    var enabled = Object.assign({ u: true, r: true, p: true }, config.enabled);
    var cap = Object.assign({ u: 1, r: 1, p: 1 }, config.cap);
    var minEnergy = config.minEnergy != null ? config.minEnergy : 0.6;

    // Each axis blends two sine components at incommensurate periods (seconds).
    // Randomized phase offsets make every run start differently.
    function axis(p1, p2) {
      return {
        w1: 2 * Math.PI / p1,
        w2: 2 * Math.PI / p2,
        o1: Math.random() * Math.PI * 2,
        o2: Math.random() * Math.PI * 2
      };
    }
    var defs = {
      u: axis(41, 17),
      r: axis(53, 23),
      p: axis(67, 29)
    };

    // Amplitudes 0.7 + 0.3 keep the result within [0,1].
    function raw(a, ts) {
      return 0.5 + 0.5 * (0.7 * Math.sin(a.w1 * ts + a.o1) + 0.3 * Math.sin(a.w2 * ts + a.o2));
    }

    var values = { u: 0, r: 0, p: 0 };

    function sample(timeMs) {
      var ts = timeMs / 1000;
      var u = raw(defs.u, ts);
      var r = raw(defs.r, ts);
      var p = raw(defs.p, ts);

      // Soft floor on combined energy so the scene never flatlines.
      var energy = u + r + p;
      if (energy < minEnergy) {
        var lift = (minEnergy - energy) / 3;
        u = Math.min(1, u + lift);
        r = Math.min(1, r + lift);
        p = Math.min(1, p + lift);
      }

      // Per-axis enable/cap and master intensity (a user override that can
      // suppress motion entirely, applied after the natural floor).
      values.u = (enabled.u ? cap.u : 0) * intensity * u;
      values.r = (enabled.r ? cap.r : 0) * intensity * r;
      values.p = (enabled.p ? cap.p : 0) * intensity * p;
      return values;
    }

    return {
      sample: sample,
      values: values,
      setIntensity: function (v) { intensity = v; },
      setEnabled: function (axisKey, on) { enabled[axisKey] = on; },
      setCap: function (axisKey, v) { cap[axisKey] = v; }
    };
  };
})(window.App = window.App || {});
