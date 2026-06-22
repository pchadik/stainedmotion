// Heartwood mode — public name "Heartwood". A surreal Art Nouveau forest.
//
// Two wavy ribbons descend from a shared point high on the canvas: near each
// other at the top and splaying wide at the bottom — at once a PATH converging
// to a far destination and two great TRUNKS. They breathe and sway in sync.
// Behind them a field of restless vertical "trees" dances. Earthy harmonic
// color throughout (greens, golds, umbers).
//
// Layers, back to front:
//   ground      - flat dark backdrop (env.background)
//   forest      - swaying vertical tree-lines, faded by depth
//   apex glow   - soft warm breathing light at the shared convergence point
//   ribbons     - the two converging trunks/paths: segmented earthy-green fill
//                 with a nouveau contour; breathe + sway in sync
//   (future overlays: canopy at the top, root flare + leaf litter at the bottom)
(function (App) {
  App.createHeartwood = function (deps) {
    var color = deps.color;
    var motion = deps.motion;
    var palette = deps.palette || {};
    var outline = palette.outline || '#8a7a45';
    var outlineWidth = palette.outlineWidth || 1.4;

    var GLOBAL_SPEED = 0.7; // uniform slow-down of the whole piece

    var W = 1, H = 1, minDim = 1, builtW = 0, builtH = 0;
    var animTime = 0, wavePhase = 0, breath = 0;

    // Breathing: two incommensurate sines so the rhythm never quite repeats.
    // Both ribbons read this same value, so they move in sympathy.
    var BO1 = Math.random() * Math.PI * 2, BO2 = Math.random() * Math.PI * 2;
    function breathAt(ts) {
      return 0.62 * Math.sin(ts * (2 * Math.PI / 11) + BO1) +
             0.38 * Math.sin(ts * (2 * Math.PI / 6.5) + BO2);
    }

    // ---- forest of vertical tree-lines ----
    var trees = [];
    function buildTrees(w, h) {
      trees = [];
      var spacing = minDim * 0.024;
      var n = Math.max(24, Math.round(w / spacing));
      for (var i = 0; i < n; i++) {
        var z = Math.random();                            // depth: 0 far, 1 near
        var baseX = (i + 0.5) / n * w + (Math.random() - 0.5) * spacing * 0.9;
        trees.push({
          x: baseX,
          z: z,
          lean: (Math.random() - 0.5) * minDim * 0.03,    // static lean over height
          wob: (Math.random() - 0.5) * minDim * 0.024,    // static mid-height waviness
          wobF: 1.0 + Math.random() * 1.5,
          amp: minDim * (0.004 + 0.013 * z),              // dance amplitude (near sways more)
          spd: (2 * Math.PI) / (4 + Math.random() * 6),   // dance speed
          phase: Math.random() * Math.PI * 2,
          width: 0.8 + 2.6 * z,
          hueJ: (Math.random() - 0.5) * 16,
          seedY: Math.random()
        });
      }
    }

    var TREE_SEGS = 10;
    var FRONT_Z = 0.62; // trees nearer than this are foreground (drawn over the ribbons)

    function treePoints(tr, w, h, t) {
      var dance = Math.sin(t * tr.spd + tr.phase);
      var pts = [];
      for (var s = 0; s <= TREE_SEGS; s++) {
        var yN = s / TREE_SEGS;                          // 0 top, 1 bottom
        var y = -h * 0.06 + yN * (h * 1.12);
        var crown = Math.pow(1 - yN, 1.2);               // tops sway more, roots anchored
        var statics = tr.lean * (1 - yN) + tr.wob * Math.sin(yN * Math.PI * tr.wobF);
        var x = tr.x + statics + tr.amp * dance * (0.25 + 0.85 * crown);
        pts.push({ x: x, y: y });
      }
      return pts;
    }

    // Back layer: the far trees, drawn behind the ribbons as a faded backdrop.
    function drawTreesBack(ctx, w, h, t) {
      for (var i = 0; i < trees.length; i++) {
        var tr = trees[i];
        if (tr.z > FRONT_Z) continue;
        var pts = treePoints(tr, w, h, t);
        var midY = h * (0.3 + tr.seedY * 0.4);
        var c = color.getCellColor(tr.x, midY, w, h);
        var l = Math.min(44, c.l * (0.45 + 0.28 * tr.z)); // capped so none read near-white
        var alpha = 0.22 + 0.30 * tr.z;
        App.strokePolyline(ctx, pts,
          'hsla(' + (c.h + tr.hueJ) + ', ' + Math.min(52, c.s * 1.1) + '%, ' + l + '%, ' + alpha.toFixed(3) + ')',
          tr.width);
      }
    }

    // Front layer: the nearest trees, drawn OVER the ribbons. Darker silhouettes,
    // strongest near the bottom (the foreground) and fading upward, so the path
    // appears to run between and behind them.
    function drawTreesFront(ctx, w, h, t) {
      for (var i = 0; i < trees.length; i++) {
        var tr = trees[i];
        if (tr.z <= FRONT_Z) continue;
        var pts = treePoints(tr, w, h, t);
        var midY = h * (0.3 + tr.seedY * 0.4);
        var c = color.getCellColor(tr.x, midY, w, h);
        var l = Math.min(38, c.l * 0.42);                 // darker, silhouette-like
        var hue = c.h + tr.hueJ, sat = Math.min(50, c.s * 1.05), width = tr.width * 1.5;
        for (var s = 0; s < TREE_SEGS; s++) {
          var yN = (s + 0.5) / TREE_SEGS;
          var ramp = 0.20 + 0.80 * Math.pow(yN, 1.4);     // strongest at the bottom
          var alpha = (0.32 + 0.45 * tr.z) * ramp;
          App.strokePolyline(ctx, [pts[s], pts[s + 1]],
            'hsla(' + hue + ', ' + sat + '%, ' + l + '%, ' + alpha.toFixed(3) + ')', width);
        }
      }
    }

    // ---- the two converging ribbons ----
    var RPTS = 64;
    var apexFrac = { x: 0.5, y: 0.05 }; // shared destination, high on the canvas

    function ribbonCenter(side, w, h, ax, ay) {
      var topHalf = w * 0.012;                            // near each other at the top
      var botHalf = w * 0.205 * (1 + breath * 0.06);      // wide at the bottom, gap breathes
      var swayMax = w * 0.055, waveAmp = w * 0.02;
      var pts = [];
      for (var i = 0; i < RPTS; i++) {
        var t = i / (RPTS - 1);
        var y = ay + (h * 1.06 - ay) * t;                 // apex -> just past the bottom
        var widen = Math.pow(t, 1.25);                    // splay accelerates downward
        var halfGap = topHalf + (botHalf - topHalf) * widen;
        var damp = Math.sin(Math.PI * t);                 // anchored at apex & roots
        var sway = swayMax * breath * damp;               // shared -> both lean together
        var wave = waveAmp * Math.sin(t * 1.6 * Math.PI * 2 + wavePhase) * damp;
        pts.push({ x: ax + side * halfGap + sway + wave, y: y, t: t });
      }
      return pts;
    }

    function ribbonWidth(t) {                             // thin (far apex) -> thick (near)
      var top = minDim * 0.0035, bot = minDim * 0.021;
      return top + (bot - top) * Math.pow(t, 0.8);
    }

    function drawRibbon(ctx, center, w, h) {
      var n = center.length, left = [], right = [];
      for (var i = 0; i < n; i++) {
        var p = center[i];
        var a = center[Math.max(0, i - 1)], b = center[Math.min(n - 1, i + 1)];
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        var nx = -dy / len, ny = dx / len, hw = ribbonWidth(p.t) * 0.5;
        left.push({ x: p.x + nx * hw, y: p.y + ny * hw });
        right.push({ x: p.x - nx * hw, y: p.y - ny * hw });
      }
      // Segmented fill: each quad takes its local earthy color pulled toward
      // forest green and darkened, so the trunk's color flows far -> near.
      for (i = 0; i < n - 1; i++) {
        var mx = (center[i].x + center[i + 1].x) * 0.5, my = (center[i].y + center[i + 1].y) * 0.5;
        var c = color.getCellColor(mx, my, w, h);
        var hue = c.h + (116 - c.h) * 0.5;                // pull halfway to forest green
        var quad = [left[i], left[i + 1], right[i + 1], right[i]];
        App.fillPolygon(ctx, quad, 'hsl(' + hue + ', ' + (c.s * 0.95) + '%, ' + (c.l * 0.5) + '%)');
      }
      App.strokePolyline(ctx, left, outline, outlineWidth);
      App.strokePolyline(ctx, right, outline, outlineWidth);
    }

    // ---- apex glow (the shared destination / light through the canopy) ----
    function drawGlow(ctx, ax, ay, w, h) {
      var c = color.getCellColor(ax, ay, w, h);
      var gh = c.h + (50 - c.h) * 0.4;                    // warm it toward gold
      var pulse = 0.5 + 0.5 * breath;
      var R = minDim * (0.10 + 0.03 * pulse);
      var rings = 5;
      for (var i = rings; i >= 1; i--) {
        var f = i / rings;
        var alpha = (0.10 * (1 - f) + 0.02) * (0.6 + 0.4 * pulse);
        App.fillCircle(ctx, ax, ay, R * f,
          'hsla(' + gh + ', ' + (c.s * 0.7) + '%, ' + Math.min(82, c.l * 1.7) + '%, ' + alpha.toFixed(3) + ')');
      }
    }

    // ---- lifecycle ----
    function rebuild(w, h) {
      W = w; H = h; minDim = Math.min(w, h);
      buildTrees(w, h);
      builtW = w; builtH = h;
    }
    function init(w, h) { rebuild(w, h); }

    function update(w, h, t, dt) {
      if (Math.abs(w - builtW) > 2 || Math.abs(h - builtH) > 2) rebuild(w, h);
      var effDt = dt * GLOBAL_SPEED;
      animTime += effDt;
      var ts = animTime / 1000;
      var m = motion.sample(animTime);
      breath = breathAt(ts);
      wavePhase += (effDt / 1000) * (0.10 + 0.25 * m.u); // slow travelling wander
      color.tick(w, h);
    }

    function render(ctx, w, h, env) {
      App.clear(ctx, w, h, env.background);
      W = w; H = h; minDim = Math.min(w, h);
      var t = animTime / 1000;

      drawTreesBack(ctx, w, h, t);

      var ax = w * apexFrac.x + breath * w * 0.02;        // destination drifts a touch
      var ay = h * apexFrac.y;
      drawGlow(ctx, ax, ay, w, h);

      drawRibbon(ctx, ribbonCenter(-1, w, h, ax, ay), w, h);
      drawRibbon(ctx, ribbonCenter(1, w, h, ax, ay), w, h);

      drawTreesFront(ctx, w, h, t);                        // nearest trees in front, near the bottom
    }

    return { init: init, update: update, render: render };
  };
})(window.App = window.App || {});
