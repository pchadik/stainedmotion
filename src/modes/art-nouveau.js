// Art Nouveau mode. Layers, back to front:
//   mosaic field  - low-contrast tessellation covering the whole canvas
//   sunburst rays - gold rays radiating from each roundel (halo) center
//   roundels      - concentric polar mosaics, rings rotate with axis r
//   beads         - pearl strings around roundels and along free arcs
//   spirals       - whiplash filigree scrolls tucked into the gaps
//   vines         - tendrils growing from the roundel rims, undulate with
//                   axis u; they stop at any roundel they reach (no overlap)
//   motes         - gold glints advecting along the field, axis p
// A global time-scale slows the whole piece uniformly (including the motion
// axes' own variation).
(function (App) {
  App.createArtNouveau = function (deps) {
    var color = deps.color;
    var motion = deps.motion;
    var palette = deps.palette || {};
    var outline = palette.outline || '#b89a5e';
    var outlineWidth = palette.outlineWidth || 1.6;

    var GLOBAL_SPEED = 0.6;            // <1 slows everything
    var GROUT = 'rgba(184,154,94,0.16)';
    var RAY = 'rgba(190,160,100,0.20)';
    var BEAD = 'rgba(214,190,130,0.55)';
    var SCROLL = 'rgba(184,154,94,0.30)';

    var vines = [], roundels = [], motes = [], mosaic = [], spirals = [], beadArcs = [];
    var curP = 0, animTime = 0, fieldPhase = 0;
    var W = 1, H = 1;
    var SMOOTH_TAU = 470;
    var MOTE_COUNT = 90, MOTE_LIFE = 4200;

    var P1 = Math.random() * Math.PI * 2, P2 = Math.random() * Math.PI * 2, P3 = Math.random() * Math.PI * 2;
    var FA = 2.6 + Math.random() * 0.8, FB = 2.6 + Math.random() * 0.8, FC = 3.8 + Math.random() * 0.8;

    function fieldAngle(x, y) {
      var nx = x / W, ny = y / H;
      return Math.PI * (
        Math.sin(nx * FA + fieldPhase * 0.7 + P1) +
        Math.sin(ny * FB + fieldPhase * 1.0 + P2) +
        0.5 * Math.sin((nx + ny) * FC + fieldPhase * 1.3 + P3)
      );
    }

    // ---- mosaic field (static jittered grid; colors drift with rootHue) ----
    function buildMosaic(w, h) {
      mosaic = [];
      var cell = Math.min(w, h) * 0.085;
      var cols = Math.ceil((w + 2 * cell) / cell), rows = Math.ceil((h + 2 * cell) / cell);
      var v = [];
      for (var r = 0; r <= rows; r++) {
        v[r] = [];
        for (var c = 0; c <= cols; c++) {
          v[r][c] = {
            x: -cell + c * cell + (Math.random() - 0.5) * cell * 0.5,
            y: -cell + r * cell + (Math.random() - 0.5) * cell * 0.5
          };
        }
      }
      for (var rr = 0; rr < rows; rr++) {
        for (var cc = 0; cc < cols; cc++) {
          var pts = [v[rr][cc], v[rr][cc + 1], v[rr + 1][cc + 1], v[rr + 1][cc]];
          mosaic.push({ pts: pts, cx: (pts[0].x + pts[2].x) / 2, cy: (pts[0].y + pts[2].y) / 2 });
        }
      }
    }

    function drawMosaic(ctx, w, h) {
      for (var i = 0; i < mosaic.length; i++) {
        var m = mosaic[i];
        var c = color.getCellColor(m.cx, m.cy, w, h);
        // Darker, more muted than the foreground so it reads as background.
        App.fillPolygon(ctx, m.pts, 'hsl(' + c.h + ', ' + (c.s * 0.6) + '%, ' + (c.l * 0.48) + '%)');
        App.strokePolygon(ctx, m.pts, GROUT, 1);
      }
    }

    // ---- roundels (+ rays + bead ring) ----
    function makeRoundel(cx, cy, R) {
      var bandDefs = [
        { rIn: 0.18, rOut: 0.45, sectors: 12, rate: 0.12 },
        { rIn: 0.45, rOut: 0.72, sectors: 18, rate: -0.09 },
        { rIn: 0.72, rOut: 0.95, sectors: 24, rate: 0.07 }
      ];
      var bands = bandDefs.map(function (b) {
        return { rIn: R * b.rIn, rOut: R * b.rOut, sectors: b.sectors, rate: b.rate, phase: Math.random() * Math.PI * 2 };
      });
      var rayCount = 40;
      var lens = [];
      for (var i = 0; i < rayCount; i++) lens.push(R * (1.4 + Math.random() * 0.8));
      return {
        cx: cx, cy: cy, R: R, disc: R * 0.18, bands: bands,
        rays: { count: rayCount, lens: lens, phase: Math.random() * Math.PI * 2, rate: 0.05 },
        bead: { r: R * 1.05, count: Math.max(16, Math.round(R * 1.05 * Math.PI * 2 / 16)), phase: Math.random() * Math.PI * 2, rate: 0.04 }
      };
    }

    function buildRoundels(w, h) {
      var minDim = Math.min(w, h);
      return [
        makeRoundel(w * 0.66, h * 0.40, minDim * 0.34),
        makeRoundel(w * 0.20, h * 0.74, minDim * 0.18)
      ];
    }

    function drawRays(ctx, rd) {
      var ry = rd.rays, step = Math.PI * 2 / ry.count, r0 = rd.R * 0.9;
      for (var i = 0; i < ry.count; i++) {
        var a = ry.phase + i * step;
        var ca = Math.cos(a), sa = Math.sin(a);
        App.strokePolyline(ctx, [
          { x: rd.cx + ca * r0, y: rd.cy + sa * r0 },
          { x: rd.cx + ca * ry.lens[i], y: rd.cy + sa * ry.lens[i] }
        ], RAY, 1);
      }
    }

    function drawBeadRing(ctx, cx, cy, r, count, phase) {
      var step = Math.PI * 2 / count;
      for (var i = 0; i < count; i++) {
        var a = phase + i * step;
        App.fillCircle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, BEAD);
      }
    }

    function arcPoints(cx, cy, r, a0, a1, segs, out) {
      for (var i = 0; i <= segs; i++) {
        var a = a0 + (a1 - a0) * i / segs;
        out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
    }

    function annularSector(cx, cy, rIn, rOut, a0, a1) {
      var segs = Math.max(2, Math.ceil((a1 - a0) / 0.25));
      var pts = [];
      arcPoints(cx, cy, rOut, a0, a1, segs, pts);
      for (var i = segs; i >= 0; i--) {
        var a = a0 + (a1 - a0) * i / segs;
        pts.push({ x: cx + rIn * Math.cos(a), y: cy + rIn * Math.sin(a) });
      }
      return pts;
    }

    function circlePoly(cx, cy, r) {
      var pts = [];
      arcPoints(cx, cy, r, 0, Math.PI * 2, 48, pts);
      return pts;
    }

    function drawRoundel(ctx, rd, w, h) {
      var disc = circlePoly(rd.cx, rd.cy, rd.disc);
      App.fillPolygon(ctx, disc, color.colorToHsl(color.getCellColor(rd.cx, rd.cy, w, h)));
      App.strokePolygon(ctx, disc, outline, outlineWidth);

      for (var bi = 0; bi < rd.bands.length; bi++) {
        var band = rd.bands[bi];
        var step = Math.PI * 2 / band.sectors;
        var midR = (band.rIn + band.rOut) * 0.5;
        for (var k = 0; k < band.sectors; k++) {
          var a0 = band.phase + k * step, a1 = a0 + step;
          var poly = annularSector(rd.cx, rd.cy, band.rIn, band.rOut, a0, a1);
          var midA = a0 + step * 0.5;
          var mx = rd.cx + midR * Math.cos(midA), my = rd.cy + midR * Math.sin(midA);
          App.fillPolygon(ctx, poly, color.colorToHsl(color.getCellColor(mx, my, w, h)));
          App.strokePolygon(ctx, poly, outline, outlineWidth);
        }
      }
      App.strokePolygon(ctx, circlePoly(rd.cx, rd.cy, rd.R * 0.97), outline, outlineWidth * 1.4);
    }

    // ---- spirals (whiplash scrolls) ----
    var SPIRAL_UNIT = (function () {
      var pts = [], b = 0.16, tmax = 2.6 * Math.PI * 2, mx = 0;
      for (var th = 0; th <= tmax; th += 0.2) {
        var r = 0.04 * Math.exp(b * th);
        pts.push({ x: r * Math.cos(th), y: r * Math.sin(th) });
      }
      pts.forEach(function (p) { mx = Math.max(mx, Math.hypot(p.x, p.y)); });
      pts.forEach(function (p) { p.x /= mx; p.y /= mx; });
      return pts;
    })();

    function buildSpirals(w, h) {
      spirals = [];
      var minDim = Math.min(w, h);
      for (var i = 0; i < 7; i++) {
        spirals.push({
          cx: (0.08 + Math.random() * 0.84) * w,
          cy: (0.08 + Math.random() * 0.84) * h,
          scale: minDim * (0.05 + Math.random() * 0.09),
          rot: Math.random() * Math.PI * 2,
          handed: Math.random() < 0.5 ? 1 : -1,
          phase: 0,
          rate: (Math.random() < 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.04),
          width: 1.1 + Math.random() * 0.8
        });
      }
    }

    function drawSpiral(ctx, sp) {
      var ang = sp.rot + sp.phase, ca = Math.cos(ang), sa = Math.sin(ang);
      var pts = SPIRAL_UNIT.map(function (u) {
        var x = u.x * sp.scale * sp.handed, y = u.y * sp.scale;
        return { x: sp.cx + (x * ca - y * sa), y: sp.cy + (x * sa + y * ca) };
      });
      App.strokePolyline(ctx, pts, SCROLL, sp.width);
    }

    // ---- free bead arcs ----
    function buildBeadArcs(w, h) {
      beadArcs = [];
      var minDim = Math.min(w, h);
      for (var i = 0; i < 4; i++) {
        var a0 = Math.random() * Math.PI * 2;
        beadArcs.push({
          cx: Math.random() * w, cy: Math.random() * h,
          r: minDim * (0.1 + Math.random() * 0.18),
          a0: a0, a1: a0 + (0.6 + Math.random() * 1.2) * Math.PI,
          count: 10 + Math.floor(Math.random() * 14),
          phase: 0, rate: (Math.random() < 0.5 ? 1 : -1) * 0.03
        });
      }
    }

    function drawBeadArc(ctx, ba) {
      for (var i = 0; i < ba.count; i++) {
        var a = ba.a0 + (ba.a1 - ba.a0) * i / (ba.count - 1) + ba.phase;
        App.fillCircle(ctx, ba.cx + Math.cos(a) * ba.r, ba.cy + Math.sin(a) * ba.r, 1.8, BEAD);
      }
    }

    // ---- motes ----
    function spawnMote(w, h, ageFrac) {
      return { x: Math.random() * w, y: Math.random() * h, age: ageFrac * MOTE_LIFE, life: MOTE_LIFE * (0.7 + Math.random() * 0.6), r: 1.3 + Math.random() * 1.8 };
    }
    function initMotes(w, h) {
      motes = [];
      for (var i = 0; i < MOTE_COUNT; i++) motes.push(spawnMote(w, h, Math.random()));
    }

    // ---- vines (tendrils growing from the roundel rims) ----
    function insideRoundel(x, y) {
      for (var i = 0; i < roundels.length; i++) {
        var rd = roundels[i], dx = x - rd.cx, dy = y - rd.cy, lim = rd.R * 0.96;
        if (dx * dx + dy * dy < lim * lim) return true;
      }
      return false;
    }

    // Trace a vine from its rim anchor: radial outward bias at the base eases
    // into the flow field, a gentle curl near the tip, and it stops (collapses
    // its remaining points) on reaching any roundel so it never overlaps one.
    function traceVineInto(v, dst) {
      var x = v.sx, y = v.sy, clipped = false, n = v.steps;
      for (var i = 0; i < n; i++) {
        if (!dst[i]) dst[i] = { x: x, y: y };
        else { dst[i].x = x; dst[i].y = y; }
        if (clipped) continue;
        var t = i / (n - 1);
        var fa = fieldAngle(x, y);
        var fvx = Math.cos(fa), fvy = Math.sin(fa);
        var rad = Math.atan2(y - v.srcCy, x - v.srcCx);
        var w = Math.exp(-i / 10); // outward bias, decays over ~10 steps
        var vx = w * Math.cos(rad) + (1 - w) * fvx;
        var vy = w * Math.sin(rad) + (1 - w) * fvy;
        if (t > 0.6) { // tendril curl near the tip
          var ca = v.curl * (t - 0.6), cs = Math.sin(ca), cc = Math.cos(ca);
          var rx = vx * cc - vy * cs, ry = vx * cs + vy * cc;
          vx = rx; vy = ry;
        }
        var L = Math.hypot(vx, vy) || 1;
        var nx = x + vx / L * v.ds, ny = y + vy / L * v.ds;
        if (i >= 3 && insideRoundel(nx, ny)) { clipped = true; continue; }
        x = nx; y = ny;
      }
      return dst;
    }

    var scratch = [];
    function vinePolygon(pts, maxWidth) {
      var n = pts.length, left = [], right = [];
      for (var i = 0; i < n; i++) {
        var p = pts[i];
        var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        var dx = b.x - a.x, dy = b.y - a.y;
        var len = Math.hypot(dx, dy) || 1;
        var nxp = -dy / len, nyp = dx / len;
        // Asymmetric taper: thick at the root (rim), fine at the tip.
        var taper = Math.pow(1 - i / (n - 1), 0.7);
        var hw = maxWidth * taper * 0.5;
        left.push({ x: p.x + nxp * hw, y: p.y + nyp * hw });
        right.push({ x: p.x - nxp * hw, y: p.y - nyp * hw });
      }
      return left.concat(right.reverse());
    }

    function buildVines(w, h) {
      vines = [];
      var minDim = Math.min(w, h);
      for (var ri = 0; ri < roundels.length; ri++) {
        var rd = roundels[ri];
        var count = Math.max(6, Math.round(rd.R / (minDim * 0.03)));
        var r0 = rd.R * 0.98;
        for (var k = 0; k < count; k++) {
          var ang = k / count * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          var v = {
            srcCx: rd.cx, srcCy: rd.cy,
            sx: rd.cx + Math.cos(ang) * r0, sy: rd.cy + Math.sin(ang) * r0,
            steps: 70 + Math.floor(Math.random() * 60),
            ds: minDim * (0.008 + Math.random() * 0.006),
            width: minDim * (0.007 + Math.random() * 0.013),
            curl: (Math.random() < 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.25),
            pts: []
          };
          traceVineInto(v, v.pts);
          vines.push(v);
        }
      }
    }

    // ---- lifecycle ----
    function init(w, h) {
      W = w; H = h;
      roundels = buildRoundels(w, h);
      buildVines(w, h);
      buildMosaic(w, h);
      buildSpirals(w, h);
      buildBeadArcs(w, h);
      initMotes(w, h);
    }

    function update(w, h, t, dt) {
      W = w; H = h;
      var effDt = dt * GLOBAL_SPEED;
      animTime += effDt;
      var m = motion.sample(animTime);
      var rSpin = 0.15 + 0.85 * m.r;

      fieldPhase += (effDt / 1000) * (0.025 + 0.18 * m.u);

      // Vine inertia uses real dt so the glide stays ~0.5s in wall-clock time.
      var alpha = 1 - Math.exp(-dt / SMOOTH_TAU);
      for (var i = 0; i < vines.length; i++) {
        var v = vines[i];
        traceVineInto(v, scratch);
        for (var j = 0; j < v.steps; j++) {
          v.pts[j].x += (scratch[j].x - v.pts[j].x) * alpha;
          v.pts[j].y += (scratch[j].y - v.pts[j].y) * alpha;
        }
      }

      for (var ri = 0; ri < roundels.length; ri++) {
        var rd = roundels[ri];
        for (var bi = 0; bi < rd.bands.length; bi++) rd.bands[bi].phase += (effDt / 1000) * rd.bands[bi].rate * rSpin;
        rd.rays.phase += (effDt / 1000) * rd.rays.rate * rSpin;
        rd.bead.phase += (effDt / 1000) * rd.bead.rate * rSpin;
      }
      for (var si = 0; si < spirals.length; si++) spirals[si].phase += (effDt / 1000) * spirals[si].rate * rSpin;
      for (var ai = 0; ai < beadArcs.length; ai++) beadArcs[ai].phase += (effDt / 1000) * beadArcs[ai].rate * rSpin;

      curP = m.p;
      var spd = (10 + 50 * m.p) * effDt / 1000;
      for (var mi = 0; mi < motes.length; mi++) {
        var mo = motes[mi];
        var a = fieldAngle(mo.x, mo.y);
        mo.x += Math.cos(a) * spd;
        mo.y += Math.sin(a) * spd;
        mo.age += effDt;
        if (mo.age > mo.life || mo.x < -10 || mo.x > w + 10 || mo.y < -10 || mo.y > h + 10) motes[mi] = spawnMote(w, h, 0);
      }
    }

    function render(ctx, w, h, env) {
      App.clear(ctx, w, h, env.background);
      W = w; H = h;

      drawMosaic(ctx, w, h);
      for (var ri = 0; ri < roundels.length; ri++) drawRays(ctx, roundels[ri]);
      for (ri = 0; ri < roundels.length; ri++) drawRoundel(ctx, roundels[ri], w, h);
      for (ri = 0; ri < roundels.length; ri++) drawBeadRing(ctx, roundels[ri].cx, roundels[ri].cy, roundels[ri].bead.r, roundels[ri].bead.count, roundels[ri].bead.phase);
      for (var ai = 0; ai < beadArcs.length; ai++) drawBeadArc(ctx, beadArcs[ai]);
      for (var si = 0; si < spirals.length; si++) drawSpiral(ctx, spirals[si]);

      for (var i = 0; i < vines.length; i++) {
        var v = vines[i];
        var poly = vinePolygon(v.pts, v.width);
        var cp = v.pts[Math.floor(v.pts.length * 0.25)]; // color near the live base
        App.fillPolygon(ctx, poly, color.colorToHsl(color.getCellColor(cp.x, cp.y, w, h)));
        App.strokePolygon(ctx, poly, outline, outlineWidth);
      }

      for (var mi = 0; mi < motes.length; mi++) {
        var mo = motes[mi];
        var env2 = Math.sin(Math.PI * mo.age / mo.life);
        var alpha = 0.65 * curP * (env2 > 0 ? env2 : 0);
        if (alpha < 0.012) continue;
        App.fillCircle(ctx, mo.x, mo.y, mo.r, 'rgba(228,208,150,' + alpha.toFixed(3) + ')');
      }
    }

    return { init: init, update: update, render: render };
  };
})(window.App = window.App || {});
