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
    var basePhase = Math.random() * Math.PI * 2; // slow lateral wander of the path's base

    // Breathing: two incommensurate sines so the rhythm never quite repeats.
    // Both ribbons read this same value, so they move in sympathy. Slow periods
    // keep the path varying gently.
    var BO1 = Math.random() * Math.PI * 2, BO2 = Math.random() * Math.PI * 2;
    function breathAt(ts) {
      return 0.62 * Math.sin(ts * (2 * Math.PI / 18) + BO1) +
             0.38 * Math.sin(ts * (2 * Math.PI / 11) + BO2);
    }

    // Per-tree scintillation (fast twinkle), kept within [0.3, 1].
    function shimmer(tr, t) {
      var s = 0.5 + 0.5 * (0.6 * Math.sin(t * tr.shimSpd + tr.shimPh) +
                           0.4 * Math.sin(t * tr.shimSpd2 + tr.shimPh2));
      if (s < 0) s = 0; else if (s > 1) s = 1;
      return 0.3 + 0.7 * s;
    }

    // Vertical lines fade out toward the bottom.
    function fadeLower(yN) {
      var f = 1.1 - yN * 1.25;
      return f < 0 ? 0 : (f > 1 ? 1 : f);
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
        var dxc = Math.max(-1, Math.min(1, (baseX - w * 0.5) / (w * 0.5))); // -1 left .. +1 right
        var edge = Math.max(0, (Math.abs(dxc) - 0.25) / 0.75);            // 0 near path, 1 at edge
        trees.push({
          x: baseX,
          z: z,
          wob: (Math.random() - 0.5) * minDim * 0.024,    // static mid-height waviness
          wobF: 1.0 + Math.random() * 1.5,
          amp: minDim * (0.004 + 0.013 * z),              // dance amplitude (near sways more)
          spd: (2 * Math.PI) / (4 + Math.random() * 6),   // dance speed
          phase: Math.random() * Math.PI * 2,
          width: 0.8 + 2.6 * z,
          hueJ: (Math.random() - 0.5) * 16,
          seedY: Math.random(),
          // Tilt outward toward the screen edges (right leans right, left leans
          // left), curving toward flat; trees near the path stay upright.
          bendDir: dxc >= 0 ? 1 : -1,
          bendMax: 1.15 * Math.pow(edge, 1.2),
          shimSpd: (2 * Math.PI) / (0.4 + Math.random() * 0.8),
          shimPh: Math.random() * Math.PI * 2,
          shimSpd2: (2 * Math.PI) / (0.25 + Math.random() * 0.5),
          shimPh2: Math.random() * Math.PI * 2
        });
      }
    }

    var TREE_SEGS = 14;
    var FRONT_Z = 0.62; // trees nearer than this are foreground (drawn over the ribbons)

    function treePoints(tr, w, h, t) {
      var dance = Math.sin(t * tr.spd + tr.phase);
      var by = 1.06 * h, segLen = (1.12 * h) / TREE_SEGS;
      var px = tr.x, py = by;                            // root, anchored at the bottom
      var arr = [];
      arr[TREE_SEGS] = { x: px, y: py };
      for (var s = TREE_SEGS - 1; s >= 0; s--) {        // integrate upward from the root
        var g = (TREE_SEGS - s - 0.5) / TREE_SEGS;       // height fraction (0 root .. 1 top)
        var theta = tr.bendMax * Math.pow(g, 1.6);       // tilt grows toward the top
        px += Math.sin(theta) * tr.bendDir * segLen;
        py += -Math.cos(theta) * segLen;
        arr[s] = { x: px, y: py };
      }
      for (var s2 = 0; s2 <= TREE_SEGS; s2++) {         // dance + waviness, scaled up the trunk
        var gg = (TREE_SEGS - s2) / TREE_SEGS;
        arr[s2].x += (tr.wob * Math.sin(gg * Math.PI * tr.wobF) + tr.amp * dance) * Math.pow(gg, 1.1);
      }
      return arr;
    }

    // Draw the part of one tree segment that lies OUTSIDE the hidden region (the
    // funnel between the ribbons + inside the rings), so no vertical line shows
    // there. When the segment crosses the boundary, bisect to clip it cleanly.
    function drawTreeSeg(ctx, a, b, style, width, ax, ay, w, h) {
      var ai = hidden(a.x, a.y, ax, ay, w, h);
      var bi = hidden(b.x, b.y, ax, ay, w, h);
      if (ai && bi) return;
      if (!ai && !bi) { App.strokePolyline(ctx, [a, b], style, width); return; }
      var inP = ai ? a : b, outP = ai ? b : a;
      for (var k = 0; k < 14; k++) {
        var mx = (inP.x + outP.x) * 0.5, my = (inP.y + outP.y) * 0.5;
        if (hidden(mx, my, ax, ay, w, h)) { inP = { x: mx, y: my }; }
        else { outP = { x: mx, y: my }; }
      }
      App.strokePolyline(ctx, [outP, ai ? b : a], style, width);
    }

    // Back layer: the far trees, behind the ribbons. Fade out toward the bottom
    // and scintillate.
    function drawTreesBack(ctx, w, h, t, ax, ay) {
      for (var i = 0; i < trees.length; i++) {
        var tr = trees[i];
        if (tr.z > FRONT_Z) continue;
        var pts = treePoints(tr, w, h, t);
        var midY = h * (0.3 + tr.seedY * 0.4);
        var c = color.getCellColor(tr.x, midY, w, h);
        var l = Math.min(44, c.l * (0.45 + 0.28 * tr.z)); // capped so none read near-white
        var hsl = (c.h + tr.hueJ) + ', ' + Math.min(52, c.s * 1.1) + '%, ' + l + '%';
        var baseA = (0.22 + 0.30 * tr.z) * shimmer(tr, t);
        for (var s = 0; s < TREE_SEGS; s++) {
          var a = baseA * fadeLower((pts[s].y + pts[s + 1].y) * 0.5 / h);
          if (a < 0.01) continue;
          drawTreeSeg(ctx, pts[s], pts[s + 1], 'hsla(' + hsl + ', ' + a.toFixed(3) + ')', tr.width, ax, ay, w, h);
        }
      }
    }

    // Front layer: the nearest trees, drawn OVER the ribbons as darker
    // silhouettes. Also fade out toward the bottom and scintillate; cleared from
    // the funnel and the rings.
    function drawTreesFront(ctx, w, h, t, ax, ay) {
      for (var i = 0; i < trees.length; i++) {
        var tr = trees[i];
        if (tr.z <= FRONT_Z) continue;
        var pts = treePoints(tr, w, h, t);
        var midY = h * (0.3 + tr.seedY * 0.4);
        var c = color.getCellColor(tr.x, midY, w, h);
        var l = Math.min(38, c.l * 0.42);                 // darker, silhouette-like
        var hsl = (c.h + tr.hueJ) + ', ' + Math.min(50, c.s * 1.05) + '%, ' + l + '%';
        var baseA = (0.34 + 0.40 * tr.z) * shimmer(tr, t);
        var width = tr.width * 1.5;
        for (var s = 0; s < TREE_SEGS; s++) {
          var a = baseA * fadeLower((pts[s].y + pts[s + 1].y) * 0.5 / h);
          if (a < 0.01) continue;
          drawTreeSeg(ctx, pts[s], pts[s + 1], 'hsla(' + hsl + ', ' + a.toFixed(3) + ')', width, ax, ay, w, h);
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
      var swayMax = w * 0.04, waveAmp = w * 0.026, baseAmp = w * 0.035;
      var widen = Math.pow(t, 1.25);                      // splay accelerates downward
      var halfGap = topHalf + (botHalf - topHalf) * widen;
      var openDamp = Math.pow(t, 0.85);                   // anchored at the apex, free at the base
      var sway = swayMax * breath * openDamp;             // shared -> both lean together
      var wave = waveAmp * Math.sin(t * 2.4 * Math.PI * 2 + wavePhase) * openDamp; // winds more
      var baseWander = baseAmp * Math.sin(basePhase) * t; // slow lateral drift of the base
      return ax + side * halfGap + sway + wave + baseWander;
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

    function ringMaxR(ay) { return Math.min(ay * 0.96, minDim * 0.62); }

    // True when (x,y) should be cleared of forest: in the funnel between the two
    // ribbons (below the apex) OR inside the ring crown (the half-disc above the
    // apex). Keeps vertical lines out from between the lines and inside the rings.
    function hidden(x, y, ax, ay, w, h) {
      if (y > ay) {
        var t = (y - ay) / (h * 1.06 - ay);
        if (t > 1) t = 1;
        return x > ribbonX(-1, t, ax, w) && x < ribbonX(1, t, ax, w);
      }
      var dx = x - ax, dy = y - ay, R = ringMaxR(ay);
      return dx * dx + dy * dy < R * R;
    }

    function ribbonWidth(t) {                             // thin (far apex) -> thicker (near)
      var top = minDim * 0.0026, bot = minDim * 0.015;
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

    // Three large gold-trimmed half-rings centred on the apex, flat (diameter)
    // side level with it (upper semicircles). The curved part is a green band
    // with gold trim, like the path; short gold pendant lines hang straight down
    // — longest over the crown, vanishing at the flat ends.
    function drawArcs(ctx, ax, ay, w, h) {
      var GOLD = 'rgba(201, 170, 96, 0.7)';
      var maxR = ringMaxR(ay);
      var radii = [maxR * 0.55, maxR * 0.77, maxR];
      var segs = 56, nP = 13, bandHalf = minDim * 0.006;
      var cc = color.getCellColor(ax, ay, w, h);
      var green = 'hsl(' + (cc.h + (116 - cc.h) * 0.5) + ', ' + (cc.s * 0.9) + '%, ' + (cc.l * 0.55) + '%)';
      for (var r = 0; r < radii.length; r++) {
        var R = radii[r], outer = [], inner = [];
        for (var i = 0; i <= segs; i++) {
          var a = Math.PI + Math.PI * (i / segs), ca = Math.cos(a), sa = Math.sin(a); // upper half
          outer.push({ x: ax + (R + bandHalf) * ca, y: ay + (R + bandHalf) * sa });
          inner.push({ x: ax + (R - bandHalf) * ca, y: ay + (R - bandHalf) * sa });
        }
        App.fillPolygon(ctx, outer.concat(inner.slice().reverse()), green); // green band
        App.strokePolyline(ctx, outer, GOLD, 1);          // gold trim on both curved edges
        App.strokePolyline(ctx, inner, GOLD, 1);
        for (var p = 1; p < nP; p++) {                    // short gold pendant lines going down
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
      wavePhase += (effDt / 1000) * (0.04 + 0.10 * m.u); // slower travelling wander
      basePhase += (effDt / 1000) * 0.08;                // slow lateral base wander
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
