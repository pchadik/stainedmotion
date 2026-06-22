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

    var TREE_SEGS = 14;
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

    // Draw the part of one tree segment that lies OUTSIDE the ribbon corridor, so
    // no vertical line shows between the two wavy lines. When the segment crosses
    // an edge of the corridor, bisect to clip cleanly at the boundary.
    function drawTreeSeg(ctx, a, b, style, width, ax, ay, w, h) {
      var ai = inCorridor(a.x, a.y, ax, ay, w, h);
      var bi = inCorridor(b.x, b.y, ax, ay, w, h);
      if (ai && bi) return;
      if (!ai && !bi) { App.strokePolyline(ctx, [a, b], style, width); return; }
      var inP = ai ? a : b, outP = ai ? b : a;
      for (var k = 0; k < 14; k++) {
        var mx = (inP.x + outP.x) * 0.5, my = (inP.y + outP.y) * 0.5;
        if (inCorridor(mx, my, ax, ay, w, h)) { inP = { x: mx, y: my }; }
        else { outP = { x: mx, y: my }; }
      }
      App.strokePolyline(ctx, [outP, ai ? b : a], style, width);
    }

    // Back layer: the far trees, drawn behind the ribbons as a faded backdrop.
    function drawTreesBack(ctx, w, h, t, ax, ay) {
      for (var i = 0; i < trees.length; i++) {
        var tr = trees[i];
        if (tr.z > FRONT_Z) continue;
        var pts = treePoints(tr, w, h, t);
        var midY = h * (0.3 + tr.seedY * 0.4);
        var c = color.getCellColor(tr.x, midY, w, h);
        var l = Math.min(44, c.l * (0.45 + 0.28 * tr.z)); // capped so none read near-white
        var alpha = 0.22 + 0.30 * tr.z;
        var style = 'hsla(' + (c.h + tr.hueJ) + ', ' + Math.min(52, c.s * 1.1) + '%, ' + l + '%, ' + alpha.toFixed(3) + ')';
        for (var s = 0; s < TREE_SEGS; s++) drawTreeSeg(ctx, pts[s], pts[s + 1], style, tr.width, ax, ay, w, h);
      }
    }

    // Front layer: the nearest trees, drawn OVER the ribbons. Darker silhouettes,
    // strongest near the bottom (the foreground) and fading upward, so the path
    // appears to run between and behind them. Also cleared from the corridor.
    function drawTreesFront(ctx, w, h, t, ax, ay) {
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
          var style = 'hsla(' + hue + ', ' + sat + '%, ' + l + '%, ' + alpha.toFixed(3) + ')';
          drawTreeSeg(ctx, pts[s], pts[s + 1], style, width, ax, ay, w, h);
        }
      }
    }

    // ---- the two converging ribbons ----
    var RPTS = 64;
    var apexFrac = { x: 0.5, y: 0.40 }; // shared destination, ~60% up (mid-screen)

    // Centre-line x of a ribbon at parameter t (0 = apex, 1 = just past bottom).
    // side = -1 (left) / +1 (right). Shared breath + wavePhase -> the two ribbons
    // move in sync; left x < right x, so [leftX, rightX] is the cleared corridor.
    function ribbonX(side, t, ax, w) {
      var topHalf = w * 0.012;                            // near each other at the apex
      var botHalf = w * 0.205 * (1 + breath * 0.06);      // wide at the bottom, gap breathes
      var swayMax = w * 0.055, waveAmp = w * 0.02;
      var widen = Math.pow(t, 1.25);                      // splay accelerates downward
      var halfGap = topHalf + (botHalf - topHalf) * widen;
      var damp = Math.sin(Math.PI * t);                   // anchored at apex & roots
      var sway = swayMax * breath * damp;                 // shared -> both lean together
      var wave = waveAmp * Math.sin(t * 1.6 * Math.PI * 2 + wavePhase) * damp;
      return ax + side * halfGap + sway + wave;
    }

    function ribbonCenter(side, w, h, ax, ay) {
      var pts = [];
      for (var i = 0; i < RPTS; i++) {
        var t = i / (RPTS - 1);
        var y = ay + (h * 1.06 - ay) * t;                 // apex -> just past the bottom
        pts.push({ x: ribbonX(side, t, ax, w), y: y, t: t });
      }
      return pts;
    }

    // True when (x,y) lies in the funnel between the two ribbons (below the apex),
    // so the forest can be cleared from between the lines.
    function inCorridor(x, y, ax, ay, w, h) {
      if (y <= ay) return false;
      var t = (y - ay) / (h * 1.06 - ay);
      if (t > 1) t = 1;
      return x > ribbonX(-1, t, ax, w) && x < ribbonX(1, t, ax, w);
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

    // ---- apex marker: a dim burgundy glow at the convergence point, crowned by
    // three large, very thin gold half-rings with short pendant lines. ----
    function drawGlow(ctx, ax, ay, w, h) {
      var pulse = 0.5 + 0.5 * breath;
      var R = minDim * (0.09 + 0.025 * pulse);
      var rings = 5;
      for (var i = rings; i >= 1; i--) {
        var f = i / rings;
        var alpha = (0.06 * (1 - f) + 0.015) * (0.6 + 0.4 * pulse); // dimmer than before
        App.fillCircle(ctx, ax, ay, R * f, 'hsla(345, 50%, 30%, ' + alpha.toFixed(3) + ')'); // burgundy
      }
    }

    // Three large, very thin gold half-rings centred on the apex, flat (diameter)
    // side level with it (upper semicircles), each with short pendant lines that
    // hang straight down — longest over the crown, vanishing at the flat ends.
    function drawArcs(ctx, ax, ay, w, h) {
      var GOLD = 'rgba(201, 170, 96, 0.6)';
      var maxR = Math.min(ay * 0.96, minDim * 0.62);
      var radii = [maxR * 0.55, maxR * 0.77, maxR];
      var segs = 48, nP = 13;
      for (var r = 0; r < radii.length; r++) {
        var R = radii[r], arc = [];
        for (var i = 0; i <= segs; i++) {
          var a = Math.PI + Math.PI * (i / segs);         // upper half
          arc.push({ x: ax + R * Math.cos(a), y: ay + R * Math.sin(a) });
        }
        App.strokePolyline(ctx, arc, GOLD, 1);            // very thin
        for (var p = 1; p < nP; p++) {                    // short pendant lines going down
          var a2 = Math.PI + Math.PI * (p / nP);
          var px = ax + R * Math.cos(a2), py = ay + R * Math.sin(a2);
          var len = minDim * 0.045 * Math.pow(Math.sin(Math.PI * p / nP), 0.8);
          if (len < 1) continue;
          App.strokePolyline(ctx, [{ x: px, y: py }, { x: px, y: py + len }], GOLD, 1);
        }
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
      var ax = w * apexFrac.x + breath * w * 0.02;        // destination drifts a touch
      var ay = h * apexFrac.y;

      drawTreesBack(ctx, w, h, t, ax, ay);
      drawGlow(ctx, ax, ay, w, h);
      drawRibbon(ctx, ribbonCenter(-1, w, h, ax, ay), w, h);
      drawRibbon(ctx, ribbonCenter(1, w, h, ax, ay), w, h);
      drawTreesFront(ctx, w, h, t, ax, ay);               // nearest trees in front, near the bottom
      drawArcs(ctx, ax, ay, w, h);                         // gold half-rings crowning the apex
    }

    return { init: init, update: update, render: render };
  };
})(window.App = window.App || {});
