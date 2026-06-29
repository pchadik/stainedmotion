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
//   forest      - vined, swaying tree-lines that fan toward the edges
//   apex glow   - dim burgundy light at the shared convergence point
//   roots       - undulating root flare from each trunk base, kept clear of the path
//   ribbons     - the two converging trunks/paths: segmented earthy-green fill
//                 with a nouveau contour; breathe + sway in sync
//   canopy      - leaf branches hanging from the top edge, framing the crown
//   rings       - tapered, gold-dripping half-ring crown at the convergence
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
    var crowns = []; // precomputed canopy crowns (see buildCanopy)
    var groundPts = []; // jagged ground line the root clusters anchor to
    function buildTrees(w, h) {
      trees = [];
      var spacing = minDim * 0.024;
      var n = Math.max(24, Math.round(w / spacing));
      for (var i = 0; i < n; i++) {
        var z = Math.random();                            // depth: 0 far, 1 near
        var baseX = (i + 0.5) / n * w + (Math.random() - 0.5) * spacing * 0.9;
        var dxc = Math.max(-1, Math.min(1, (baseX - w * 0.5) / (w * 0.5))); // -1 left .. +1 right
        var edge = Math.max(0, (Math.abs(dxc) - 0.25) / 0.75);            // 0 near path, 1 at edge
        var centerF = 1 + 0.35 * (1 - Math.abs(dxc));                     // trees nearer centre thicker
        var rootDefs = [];                                               // a clustered fan of descending roots
        if (Math.random() < 0.72) {
          var nrk = 2 + Math.floor(Math.random() * 3);                   // 2-4 roots per cluster
          for (var rk = 0; rk < nrk; rk++) {
            var rfrac = nrk > 1 ? rk / (nrk - 1) : 0.5;
            rootDefs.push({
              dx: (rfrac - 0.5) * minDim * 0.028 + (Math.random() - 0.5) * minDim * 0.006, // clustered fan offset
              dir: (rfrac - 0.5) * 0.95 + (Math.random() - 0.5) * 0.25, lenF: 0.75 + Math.random() * 0.55,
              coil: 0.08 + Math.random() * 0.24, amp: 0.16 + Math.random() * 0.3,
              ph: Math.random() * Math.PI * 2, spd: 0.4 + Math.random() * 0.6, thick: 1.0 + Math.random() * 1.3
            });
          }
        }
        trees.push({
          x: baseX,
          z: z,
          wob: (Math.random() - 0.5) * minDim * 0.024,    // static mid-height waviness
          wobF: 1.0 + Math.random() * 1.5,
          amp: minDim * (0.004 + 0.013 * z),              // dance amplitude (near sways more)
          spd: (2 * Math.PI) / (4 + Math.random() * 6),   // dance speed
          phase: Math.random() * Math.PI * 2,
          width: (0.8 + 2.6 * z) * centerF,
          hueJ: (Math.random() - 0.5) * 16,
          seedY: Math.random(),
          // Tilt outward toward the screen edges (right leans right, left leans
          // left), curving toward flat; trees near the path stay upright.
          bendDir: dxc >= 0 ? 1 : -1,
          bendMax: 1.15 * Math.pow(edge, 1.2),
          shimSpd: (2 * Math.PI) / (0.4 + Math.random() * 0.8),
          shimPh: Math.random() * Math.PI * 2,
          shimSpd2: (2 * Math.PI) / (0.25 + Math.random() * 0.5),
          shimPh2: Math.random() * Math.PI * 2,
          // A vine that climbs and weaves up the trunk, bearing the odd leaf.
          // Faint, phasing slowly in and out, with its own shimmer cadence.
          hasVine: Math.random() < 0.85,
          vineH: 0.5 + Math.random() * 0.4,               // climbs 50-90% up the trunk
          vineCoils: 2.5 + Math.random() * 3,
          vineAmp: minDim * (0.004 + 0.005 * Math.random()),
          vinePhase: Math.random() * Math.PI * 2,
          vinePhaseSpeed: (2 * Math.PI) / (8 + Math.random() * 8), // 8-16s phase in/out
          roots: rootDefs
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

    // A vine climbing a trunk: weaves across the trunk as it rises, bearing the
    // odd small leaf. Clipped to the visible region and faded toward the bottom.
    function drawVine(ctx, tr, pts, t, ax, ay, w, h) {
      if (!tr.hasVine) return;
      var topIdx = Math.max(1, Math.round(TREE_SEGS * (1 - tr.vineH)));
      var midY = h * (0.3 + tr.seedY * 0.4), c = color.getCellColor(tr.x, midY, w, h);
      var vhue = c.h + (122 - c.h) * 0.6, vsat = Math.min(55, c.s * 1.2), vl = Math.min(48, c.l * 0.9);
      // Faint; phases slowly in and out; shimmer on a different cadence from the
      // trees (related — same base shimmer speed, scaled).
      var inout = 0.1 + 0.9 * (0.5 + 0.5 * Math.sin(t * tr.vinePhaseSpeed + tr.vinePhase));
      var vmul = 0.56 * inout * (0.6 + 0.4 * Math.sin(t * tr.shimSpd * 1.7 + tr.shimPh2));
      var prev = null;
      for (var s = TREE_SEGS; s >= topIdx; s--) {
        var p = pts[s];
        var pa = pts[Math.min(TREE_SEGS, s + 1)], pb = pts[Math.max(0, s - 1)];
        var dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.hypot(dx, dy) || 1;
        var perpx = -dy / len, perpy = dx / len;
        var prog = (TREE_SEGS - s) / TREE_SEGS;
        var wv = Math.sin(prog * tr.vineCoils * Math.PI * 2 + tr.vinePhase), off = tr.vineAmp * wv;
        var vx = p.x + perpx * off, vy = p.y + perpy * off;
        if (prev) {
          var a = vmul * fadeLower((vy + prev.y) * 0.5 / h);
          if (a > 0.02) {
            var style = 'hsla(' + vhue + ', ' + vsat + '%, ' + vl + '%, ' + a.toFixed(3) + ')';
            drawTreeSeg(ctx, prev, { x: vx, y: vy }, style, 1.3, ax, ay, w, h);
            if (Math.abs(wv) > 0.82) {                    // a small leaf at the weave extremes
              var lo = off >= 0 ? 1 : -1;
              drawTreeSeg(ctx, { x: vx, y: vy },
                { x: vx + perpx * lo * tr.vineAmp, y: vy + perpy * lo * tr.vineAmp - minDim * 0.007 },
                style, 1.1, ax, ay, w, h);
            }
          }
        }
        prev = { x: vx, y: vy };
      }
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
        var l = Math.min(46, c.l * (0.48 + 0.29 * tr.z)); // capped so none read near-white
        var hsl = (c.h + tr.hueJ) + ', ' + Math.min(52, c.s * 1.1) + '%, ' + l + '%';
        var baseA = (0.24 + 0.31 * tr.z) * shimmer(tr, t);
        for (var s = 0; s < TREE_SEGS; s++) {
          var a = baseA * fadeLower((pts[s].y + pts[s + 1].y) * 0.5 / h);
          if (a < 0.01) continue;
          drawTreeSeg(ctx, pts[s], pts[s + 1], 'hsla(' + hsl + ', ' + a.toFixed(3) + ')', tr.width, ax, ay, w, h);
        }
        drawVine(ctx, tr, pts, t, ax, ay, w, h);
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
        var l = Math.min(40, c.l * 0.46);                 // darker, silhouette-like
        var hsl = (c.h + tr.hueJ) + ', ' + Math.min(50, c.s * 1.05) + '%, ' + l + '%';
        var baseA = (0.36 + 0.41 * tr.z) * shimmer(tr, t);
        var width = tr.width * 1.5;
        for (var s = 0; s < TREE_SEGS; s++) {
          var a = baseA * fadeLower((pts[s].y + pts[s + 1].y) * 0.5 / h);
          if (a < 0.01) continue;
          drawTreeSeg(ctx, pts[s], pts[s + 1], 'hsla(' + hsl + ', ' + a.toFixed(3) + ')', width, ax, ay, w, h);
        }
        drawVine(ctx, tr, pts, t, ax, ay, w, h);
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

    function ringMaxR(ay) { return Math.min(ay * 0.96, minDim * 0.62) * (1 + breath * 0.012); }
    function ringCx(ax, w) { return ax - breath * w * 0.01; } // rings drift less than the path

    // True when (x,y) should be cleared of forest: inside the ring disc (the
    // crown AND the area just below it, so no trees show below the rings/tapers),
    // or in the funnel between the two ribbons.
    function hidden(x, y, ax, ay, w, h) {
      var dx = x - ringCx(ax, w), dy = y - ay, R = ringMaxR(ay);
      if (dx * dx + dy * dy < R * R) return true;
      if (y > ay) {
        var t = (y - ay) / (h * 1.06 - ay);
        if (t > 1) t = 1;
        return x > ribbonX(-1, t, ax, w) && x < ribbonX(1, t, ax, w);
      }
      return false;
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

    // A single drippy, watery pendant: a tapering, gently wavering gold drop with
    // a rounded bead at its tip. The phase + slow time give a watery undulation.
    function drawDrip(ctx, px, py, len, style, phase) {
      var segs = 8, cl = [], wob = minDim * 0.006, ph = phase + animTime * 0.0016;
      for (var u = 0; u <= segs; u++) {
        var f = u / segs;
        cl.push({ x: px + wob * Math.sin(f * Math.PI * 2.2 + ph) * f, y: py + f * len });
      }
      var left = [], right = [];
      for (var i = 0; i <= segs; i++) {
        var f2 = i / segs, hw = (1.7 * (1 - f2) + 0.35) * 0.5; // taper to a fine tip
        left.push({ x: cl[i].x - hw, y: cl[i].y });
        right.push({ x: cl[i].x + hw, y: cl[i].y });
      }
      App.fillPolygon(ctx, left.concat(right.reverse()), style);
      App.fillCircle(ctx, cl[segs].x, cl[segs].y, minDim * 0.0035, style); // the drop
    }

    // Three large gold-trimmed rings centred on the apex, the flat side level
    // with it but with the ends EXTENDED below and TAPERED to points. The curved
    // part is a green band with gold trim, like the path. Drippy watery pendants
    // hang down and are drawn first so the rings sit in front of where they hang.
    function drawArcs(ctx, ax, ay, w, h) {
      var GOLD = 'rgba(201, 170, 96, 0.7)', GOLDF = 'rgba(201, 170, 96, 0.6)';
      var cx = ringCx(ax, w), maxR = ringMaxR(ay);
      var radii = [maxR * 0.55, maxR * 0.77, maxR];
      var segs = 64, nP = 15, bandHalf = minDim * 0.007;
      var ext = 0.34, span = Math.PI + 2 * ext;           // extend the arc ends below the flat side
      var cc = color.getCellColor(cx, ay, w, h);
      var green = 'hsl(' + (cc.h + (116 - cc.h) * 0.5) + ', ' + (cc.s * 0.9) + '%, ' + (cc.l * 0.55) + '%)';

      // Pass 1: pendant drops, behind the rings.
      for (var r = 0; r < radii.length; r++) {
        var R0 = radii[r];
        for (var p = 1; p < nP; p++) {
          var f = p / nP, a2 = (Math.PI - ext) + span * f;
          var px = cx + R0 * Math.cos(a2), py = ay + R0 * Math.sin(a2);
          var hashv = Math.abs(Math.sin(p * 53.13 + r * 17.7));
          var len = minDim * 0.06 * Math.pow(Math.sin(Math.PI * f), 0.8) * (0.6 + 0.6 * hashv);
          if (len < 2) continue;
          drawDrip(ctx, px, py, len, GOLDF, p * 1.7 + r);
        }
      }

      // Pass 2: the rings — green band with gold trim, tapering at the ends.
      for (var r2 = 0; r2 < radii.length; r2++) {
        var R = radii[r2], outer = [], inner = [];
        for (var i = 0; i <= segs; i++) {
          var ff = i / segs, a = (Math.PI - ext) + span * ff, ca = Math.cos(a), sa = Math.sin(a);
          var hw = bandHalf * Math.min(1, Math.sin(Math.PI * ff) * 1.7); // full over the top, ->0 at ends
          outer.push({ x: cx + (R + hw) * ca, y: ay + (R + hw) * sa });
          inner.push({ x: cx + (R - hw) * ca, y: ay + (R - hw) * sa });
        }
        App.fillPolygon(ctx, outer.concat(inner.slice().reverse()), green);
        App.strokePolyline(ctx, outer, GOLD, 1);
        App.strokePolyline(ctx, inner, GOLD, 1);
      }
    }

    // ---- roots: each tree puts out a clustered fan of roots from a JAGGED
    // ground line (not a flat horizontal), descending toward the bottom.
    // Undulating; kept clear of the path + rings; faded in at the top so they
    // blend into the fading trunks. ----
    function buildGround(w, h) {
      groundPts = [];
      var base = h * 0.78, n = Math.max(6, Math.round(w / (minDim * 0.16)));
      for (var i = 0; i <= n; i++) groundPts.push({ x: i / n * w, y: base + (Math.random() - 0.5) * h * 0.08 });
    }
    function groundY(x) {
      var n = groundPts.length;
      if (n < 2) return 0.78 * H;
      if (x <= groundPts[0].x) return groundPts[0].y;
      for (var i = 1; i < n; i++) {
        if (x <= groundPts[i].x) { var a = groundPts[i - 1], b = groundPts[i]; return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x || 1); }
      }
      return groundPts[n - 1].y;
    }
    function nearPath(x, y, ax, ay, w, h, margin) {
      if (y < ay || y > h * 1.06) return false;
      var t = (y - ay) / (h * 1.06 - ay);
      var half = ribbonWidth(t) * 0.5 + margin;
      return Math.abs(x - ribbonX(-1, t, ax, w)) < half || Math.abs(x - ribbonX(1, t, ax, w)) < half;
    }
    function rootCleared(x, y, ax, ay, w, h, margin) {   // no roots where trees are hidden or near the path
      return hidden(x, y, ax, ay, w, h) || nearPath(x, y, ax, ay, w, h, margin);
    }

    // Draw only the part of a root segment that survives the clear test; bisect
    // to clip cleanly at the boundary.
    function drawRootSeg(ctx, a, b, style, width, ax, ay, w, h, margin) {
      var ai = rootCleared(a.x, a.y, ax, ay, w, h, margin);
      var bi = rootCleared(b.x, b.y, ax, ay, w, h, margin);
      if (ai && bi) return;
      if (!ai && !bi) { App.strokePolyline(ctx, [a, b], style, width); return; }
      var inP = ai ? a : b, outP = ai ? b : a;
      for (var k = 0; k < 12; k++) {
        var mx = (inP.x + outP.x) * 0.5, my = (inP.y + outP.y) * 0.5;
        if (rootCleared(mx, my, ax, ay, w, h, margin)) { inP = { x: mx, y: my }; }
        else { outP = { x: mx, y: my }; }
      }
      App.strokePolyline(ctx, [outP, ai ? b : a], style, width);
    }

    var ROOT_SEGS = 14;
    // One root descending from a tree's ground point toward the bottom of the
    // frame, leaning and wavering over time. rt holds its per-root variation.
    function growTreeRoot(ctx, gx, gy, rt, seed, t, ax, ay, w, h, baseThick, rhue, rsat, rl) {
      var targetLen = (h * 1.04 - gy) * rt.lenF;           // reach toward (or past) the bottom
      var step = targetLen / ROOT_SEGS, margin = minDim * 0.01;
      var x = gx + rt.dx, y = gy, prev = { x: x, y: y };
      var ang0 = Math.PI / 2 + rt.dir;                     // mostly straight down, slight lean
      for (var i = 1; i <= ROOT_SEGS; i++) {
        var prog = i / ROOT_SEGS;
        var ang = ang0 + Math.sin(prog * 3.5 + rt.ph + t * rt.spd) * rt.amp * (1 - 0.2 * prog)
                       + rt.coil * Math.sin(prog * 2 + rt.ph);
        ang += (Math.PI / 2 - ang) * 0.06;                 // gentle pull back toward down
        x += Math.cos(ang) * step; y += Math.sin(ang) * step;
        var wd = baseThick * rt.thick * Math.pow(1 - prog, 0.7) + 0.5;
        var aRoot = 0.55 * Math.min(1, prog * 4) * (1 - 0.3 * prog); // fade in at the top, taper at the tip
        var style = 'hsla(' + rhue + ', ' + rsat + '%, ' + rl + '%, ' + aRoot.toFixed(3) + ')';
        drawRootSeg(ctx, prev, { x: x, y: y }, style, wd, ax, ay, w, h, margin);
        prev = { x: x, y: y };
      }
    }

    function drawRoots(ctx, w, h, t, ax, ay) {
      var margin = minDim * 0.01;
      var rc = color.getCellColor(w * 0.5, h * 0.78, w, h);     // one colour for all roots (even L/R), dimmer
      var rhue = rc.h + (30 - rc.h) * 0.72, rsat = Math.min(50, rc.s * 1.1), rl = Math.min(33, rc.l * 0.7);
      for (var i = 0; i < trees.length; i++) {
        var tr = trees[i], gx = tr.x, gy = groundY(gx);          // jagged ground line
        if (rootCleared(gx, gy, ax, ay, w, h, margin)) continue; // no tree here -> no roots
        var baseThick = 1.6 + 2.4 * tr.z;
        for (var k = 0; k < tr.roots.length; k++) growTreeRoot(ctx, gx, gy, tr.roots[k], i * 7 + k, t, ax, ay, w, h, baseThick, rhue, rsat, rl);
      }
    }

    // ---- canopy: a bushy "crown shyness" canopy at the top. Each crown is a
    // Voronoi cell (seeds snapped to the trunks, kept out of the ring disc) whose
    // edges are inset along their own normals, so neighbours nearly-but-not-quite
    // touch and leave thin winding channels of BARE background — the faint
    // back-trees show through them as depth. Scalloped silhouettes + two-tone
    // leaf clumps + interior leaf dabs read as foliage, not flat blobs or drops.
    // Geometry/colour/clumps are precomputed in buildCanopy; each frame only the
    // scallop is animated. ----
    function leafShape(cx, cy, ang, L, Wd) {
      var cd = Math.cos(ang), sd = Math.sin(ang), nx = -sd, ny = cd, left = [], right = [];
      for (var s = 0; s <= 8; s++) {
        var f = s / 8, px = cx + cd * L * f, py = cy + sd * L * f, off = Wd * Math.sin(Math.PI * f);
        left.push({ x: px + nx * off, y: py + ny * off });
        right.push({ x: px - nx * off, y: py - ny * off });
      }
      return left.concat(right.reverse());
    }

    // Keep the part of poly where (p - M) . N <= 0 (Sutherland-Hodgman).
    function clipHalfPlane(poly, mx, my, nx, ny) {
      var out = [], n = poly.length;
      for (var i = 0; i < n; i++) {
        var a = poly[i], b = poly[(i + 1) % n];
        var da = (a.x - mx) * nx + (a.y - my) * ny, db = (b.x - mx) * nx + (b.y - my) * ny;
        if (da <= 0) out.push(a);
        if ((da < 0) !== (db < 0)) { var tt = da / (da - db); out.push({ x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt }); }
      }
      return out;
    }
    function polyArea(poly) {
      var a = 0;
      for (var i = 0, n = poly.length; i < n; i++) { var p = poly[i], q = poly[(i + 1) % n]; a += p.x * q.y - q.x * p.y; }
      return Math.abs(a) * 0.5;
    }
    function polyCentroid(poly) {
      var x = 0, y = 0, n = poly.length;
      for (var i = 0; i < n; i++) { x += poly[i].x; y += poly[i].y; }
      return { x: x / n, y: y / n };
    }
    // Resample the perimeter to M points, each with the outward unit normal of
    // the edge it sits on.
    function resampleEdges(poly, M, cx, cy) {
      var n = poly.length, edges = [], total = 0;
      for (var i = 0; i < n; i++) {
        var a = poly[i], b = poly[(i + 1) % n];
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = dy / len, ny = -dx / len, mx = (a.x + b.x) * 0.5, my = (a.y + b.y) * 0.5;
        if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        edges.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, len: len, nx: nx, ny: ny });
        total += len;
      }
      var samp = [], step = total / M, ei = 0, acc = 0;
      for (var k = 0; k < M; k++) {
        var target = k * step;
        while (ei < edges.length - 1 && acc + edges[ei].len < target) { acc += edges[ei].len; ei++; }
        var e = edges[ei], f = (target - acc) / e.len;
        samp.push({ x: e.ax + (e.bx - e.ax) * f, y: e.ay + (e.by - e.ay) * f, nx: e.nx, ny: e.ny });
      }
      return samp;
    }

    // A fractal frond: an angular, self-similar branch (precomputed segments).
    function buildFrond(x, y, ang, len, depth, out) {
      var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      out.push({ ax: x, ay: y, bx: ex, by: ey });
      if (depth <= 0) return;
      buildFrond(ex, ey, ang - 0.6, len * 0.6, depth - 1, out);
      buildFrond(ex, ey, ang + 0.6, len * 0.6, depth - 1, out);
    }

    function buildCanopy(w, h) {
      crowns = [];
      var ax = w * 0.5, ay = h * apexFrac.y;
      var Rbase = Math.min(ay * 0.96, minDim * 0.62) * 1.013;       // ring radius incl. max breath
      var CH = minDim * 0.014, LOBE = CH * 0.6, rimClamp = Rbase + CH + LOBE;
      var spacing = minDim * 0.13, bandTop = -h * 0.06, drawBot = h * 0.33, gridBot = h * 0.5;
      var cols = Math.max(4, Math.round(w / spacing));
      var rows = Math.max(3, Math.round((gridBot - bandTop) / spacing));
      var seeds = [];
      // Seed the whole region; only those in-band AND outside the disc are drawn.
      // The rest (below the band, inside the disc) are partition-only bounds.
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c <= cols; c++) {
          var sx = (c + (r % 2) * 0.5) / cols * w + (Math.random() - 0.5) * spacing * 0.45;
          var sy = bandTop + (gridBot - bandTop) * (r / (rows - 1)) + (Math.random() - 0.5) * spacing * 0.3;
          var best = sx, bd = 1e9;                                  // snap toward nearest trunk
          for (var ti = 0; ti < trees.length; ti++) { var d = Math.abs(trees[ti].x - sx); if (d < bd) { bd = d; best = trees[ti].x; } }
          sx += (best - sx) * 0.5;
          var ex = sx - ax, ey = sy - ay;
          var drawable = (sy < drawBot && ex * ex + ey * ey > (Rbase + CH) * (Rbase + CH));
          if (drawable && Math.random() < 0.3) continue;          // drop ~30% -> neighbours merge/grow (less uniform)
          seeds.push({ x: sx, y: sy, draw: drawable });
        }
      }
      for (var rs = 0; rs <= 9; rs++) {                            // ring seeds hug the dome cleanly
        var a = Math.PI + Math.PI * (rs / 9);
        seeds.push({ x: ax + Math.cos(a) * Rbase * 0.82, y: ay + Math.sin(a) * Rbase * 0.82, draw: false });
      }
      for (var i = 0; i < seeds.length; i++) {
        if (!seeds[i].draw) continue;
        var s = seeds[i];
        var poly = [
          { x: -w * 0.12, y: bandTop - h * 0.12 }, { x: w * 1.12, y: bandTop - h * 0.12 },
          { x: w * 1.12, y: gridBot + h * 0.05 }, { x: -w * 0.12, y: gridBot + h * 0.05 }
        ];
        for (var j = 0; j < seeds.length && poly.length >= 3; j++) {
          if (j === i) continue;
          var o = seeds[j];
          poly = clipHalfPlane(poly, (s.x + o.x) * 0.5, (s.y + o.y) * 0.5, o.x - s.x, o.y - s.y);
        }
        if (poly.length < 3 || polyArea(poly) < 0.004 * minDim * minDim) continue;
        var cen = polyCentroid(poly), samp = resampleEdges(poly, 40, cen.x, cen.y);
        for (var m = 0; m < samp.length; m++) {                    // safety: stay shy of the dome
          var p = samp[m], rx = p.x - ax, ry = p.y - ay, rd = Math.sqrt(rx * rx + ry * ry) || 1;
          if (rd < rimClamp) { var fz = rimClamp / rd; p.x = ax + rx * fz; p.y = ay + ry * fz; p.nx = rx / rd; p.ny = ry / rd; }
        }
        var col = color.getCellColor(cen.x, Math.max(0, cen.y), w, h), ext = Math.sqrt(polyArea(poly));
        var shards = [], fronds = [];
        for (var sh = 0; sh < 4; sh++) {                          // angular faceted shards (two-tone volume)
          var top = sh < 2, scx = cen.x + (Math.random() - 0.5) * ext * 0.5, scy = cen.y + (top ? -1 : 1) * ext * (0.06 + Math.random() * 0.16);
          var sr = ext * (0.12 + Math.random() * 0.1), nn = 6, base = Math.random() * Math.PI * 2, sp = [];
          for (var v = 0; v < nn; v++) { var aa = base + v / nn * Math.PI * 2, rr = sr * (v % 2 === 0 ? 1 : 0.45); sp.push({ x: scx + Math.cos(aa) * rr, y: scy + Math.sin(aa) * rr }); }
          shards.push({ pts: sp, light: top });
        }
        for (var fr = 0; fr < 2; fr++) {                          // fractal fronds (angular, self-similar)
          var fseg = [];
          buildFrond(cen.x + (Math.random() - 0.5) * ext * 0.35, cen.y + ext * (0.05 + Math.random() * 0.12), -Math.PI / 2 + (Math.random() - 0.5) * 1.0, ext * (0.22 + Math.random() * 0.1), 2, fseg);
          fronds.push(fseg);
        }
        crowns.push({
          samp: samp, cen: cen, CH: CH, LOBE: LOBE, seed: i * 1.7, seed2: i * 3.1,
          lobeMul: 0.7 + Math.random() * 0.5, warpAmp: Math.random() * 0.22, warpSeed: Math.random() * Math.PI * 2,
          hue: col.h + (112 - col.h) * 0.5, sat: Math.min(48, col.s * 1.0), lit: Math.min(40, col.l * 0.82),
          shards: shards, fronds: fronds
        });
      }
    }

    function drawCanopy(ctx, w, h, t, ax, ay) {
      var phase = breath * 0.6 + animTime * 0.00012;
      for (var i = 0; i < crowns.length; i++) {
        var cr = crowns[i], samp = cr.samp, M = samp.length, outer = [];
        for (var m = 0; m < M; m++) {
          var p = samp[m], f = m / M;
          var lobe = cr.LOBE * cr.lobeMul * (0.55 * Math.sin(7 * 2 * Math.PI * f + cr.seed) + 0.45 * Math.sin(13 * 2 * Math.PI * f + cr.seed2 + phase))
                   + cr.LOBE * cr.warpAmp * Math.sin(4 * Math.PI * f + cr.warpSeed); // per-crown mutation
          var inset = cr.CH - lobe;                                // both neighbours retreat -> channel
          if (inset < cr.CH * 0.2) inset = cr.CH * 0.2;            // keep the shyness channel open
          outer.push({ x: p.x - p.nx * inset, y: p.y - p.ny * inset });
        }
        App.fillPolygon(ctx, outer, 'hsl(' + cr.hue + ', ' + cr.sat + '%, ' + cr.lit + '%)');
        for (var sh = 0; sh < cr.shards.length; sh++) {           // angular shards (two-tone volume)
          var k = cr.shards[sh], ll = k.light ? Math.min(48, cr.lit * 1.22) : cr.lit * 0.58;
          App.fillPolygon(ctx, k.pts, 'hsl(' + cr.hue + ', ' + cr.sat + '%, ' + ll + '%)');
        }
        for (var fr = 0; fr < cr.fronds.length; fr++) {           // fractal fronds
          var fs = cr.fronds[fr];
          for (var sg = 0; sg < fs.length; sg++) App.strokePolyline(ctx, [{ x: fs[sg].ax, y: fs[sg].ay }, { x: fs[sg].bx, y: fs[sg].by }], 'rgba(150,130,80,0.5)', 0.9);
        }
        App.strokePolygon(ctx, outer, 'rgba(184,154,94,0.28)', 1);   // bronze cloisonne rim
        for (var v = 0; v < 4; v++) { var idx = Math.floor((v + 0.5) / 4 * M); App.strokePolyline(ctx, [cr.cen, outer[idx]], 'rgba(184,154,94,0.20)', 0.8); }
      }
    }

    // ---- lifecycle ----
    function rebuild(w, h) {
      W = w; H = h; minDim = Math.min(w, h);
      buildTrees(w, h);
      buildGround(w, h);
      buildCanopy(w, h);
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
      drawRoots(ctx, w, h, t, ax, ay);                    // roots along the ground, attached to the trees
      drawCanopy(ctx, w, h, t, ax, ay);                   // leaf branches hanging from the top edge
      drawArcs(ctx, ax, ay, w, h);                         // gold half-rings crowning the apex
    }

    return { init: init, update: update, render: render };
  };
})(window.App = window.App || {});
