// Art Nouveau mode — public name "Organic" (v2). Layers, back to front:
//   mosaic field  - low-contrast tessellation covering the whole canvas
//   rays          - per-roundel sunburst whose length/weight peaks toward the
//                   other roundel; the peak spike reaches a shared meeting hub
//   hub           - concentric circles at the meeting point between roundels
//   roundels      - concentric polar mosaics, rings rotate with axis r
//   bead rings    - pearl string framing each halo
//   vines         - tendrils sprouting in clusters from points on the rims,
//                   undulate with axis u; stop at any roundel they reach
//   leaves/buds   - foliage embellishments riding on the vines
//   motes         - gold glints advecting along the field, axis p
// A global time-scale slows the whole piece uniformly.
(function (App) {
  App.createArtNouveau = function (deps) {
    var color = deps.color;
    var motion = deps.motion;
    var palette = deps.palette || {};
    var outline = palette.outline || '#b89a5e';
    var outlineWidth = palette.outlineWidth || 1.6;

    var GLOBAL_SPEED = 0.6;
    var HALO_EXTENT = 1.15; // size of the minimum-ray halo ringing each roundel
    var GROUT = 'rgba(184,154,94,0.16)';
    var BEAD = 'rgba(214,190,130,0.55)';

    var vines = [], roundels = [], motes = [], mosaic = [];
    var meet = { x: 0, y: 0, hubR: 1 }, meetBase = { x: 0, y: 0 };
    var hubPos = { x: 0, y: 0 }, hubAlpha = 0, hubInit = false; // hub rides between the two spike tips
    var ab = { ux: 1, uy: 0, px: 0, py: 1, dist: 1 }; // center-line unit vector + perpendicular
    var curP = 0, animTime = 0, fieldPhase = 0;
    var W = 1, H = 1, builtW = 0, builtH = 0;
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

    function wrapPi(a) {
      a = (a + Math.PI) % (Math.PI * 2);
      if (a < 0) a += Math.PI * 2;
      return a - Math.PI;
    }

    // ---- mosaic field ----
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
        App.fillPolygon(ctx, m.pts, 'hsl(' + c.h + ', ' + (c.s * 0.6) + '%, ' + (c.l * 0.48) + '%)');
        App.strokePolygon(ctx, m.pts, GROUT, 1);
      }
    }

    // ---- roundels ----
    function makeRoundel(cx, cy, R) {
      var bandDefs = [
        { rIn: 0.18, rOut: 0.45, sectors: 12, rate: 0.12 },
        { rIn: 0.45, rOut: 0.72, sectors: 18, rate: -0.09 },
        { rIn: 0.72, rOut: 0.95, sectors: 24, rate: 0.07 }
      ];
      var bands = bandDefs.map(function (b) {
        return { rIn: R * b.rIn, rOut: R * b.rOut, sectors: b.sectors, rate: b.rate, phase: Math.random() * Math.PI * 2 };
      });
      var rayCount = 48, jit = [];
      for (var i = 0; i < rayCount; i++) jit.push(0.85 + Math.random() * 0.3);
      return {
        cx: cx, cy: cy, R: R, disc: R * 0.18, bands: bands,
        // dirToM / reach filled in once both roundels exist.
        rays: { count: rayCount, jit: jit, phase: Math.random() * Math.PI * 2, rate: 0.05, P: 5, dirToM: 0, reach: R, base: R * 1.0 },
        bead: { r: R * 1.05, count: Math.max(16, Math.round(R * 1.05 * Math.PI * 2 / 16)), phase: Math.random() * Math.PI * 2, rate: 0.04 }
      };
    }

    function buildRoundels(w, h) {
      var minDim = Math.min(w, h);
      roundels = [
        makeRoundel(w * 0.66, h * 0.40, minDim * 0.34),
        makeRoundel(w * 0.20, h * 0.74, minDim * 0.18)
      ];
      var A = roundels[0], B = roundels[1];
      var dx = B.cx - A.cx, dy = B.cy - A.cy, d = Math.hypot(dx, dy) || 1;
      ab = { ux: dx / d, uy: dy / d, px: -dy / d, py: dx / d, dist: d };
      // Base meeting point biased toward the smaller (second) roundel so the
      // larger one's spike has room to be longer than its minimum. The actual
      // meeting point drifts around this in update().
      meetBase = { x: A.cx + dx * 0.6, y: A.cy + dy * 0.6 };
      meet = { x: meetBase.x, y: meetBase.y, hubR: minDim * 0.045 };
      // Seed each roundel's gap direction now so buildVines (called next, before
      // the first update) anchors vine clusters on the far side from the gap.
      for (var i = 0; i < roundels.length; i++) {
        var rd = roundels[i];
        rd.rays.dirToM = Math.atan2(meetBase.y - rd.cy, meetBase.x - rd.cx);
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

    // Sunburst whose length and weight peak toward the meeting point, so the
    // strongest spike points into the gap and reaches the hub. As the rays
    // rotate, whichever ray is nearest the peak direction reaches the hub, so
    // the long spike hands off seamlessly from one ray to the next.
    function drawRays(ctx, rd) {
      var ry = rd.rays, step = Math.PI * 2 / ry.count, r0 = rd.R * 0.9;
      for (var i = 0; i < ry.count; i++) {
        var a = ry.phase + i * step;
        var c = Math.cos(wrapPi(a - ry.dirToM));
        var bump = c > 0 ? Math.pow(c, ry.P) : 0;
        // Interpolate base->reach (don't add jit to the peak): at bump=1 the
        // tip is exactly reach (lands on the hub, no handoff jump); at bump=0
        // it is base*jit (the intended idle jitter of the short rays).
        var len = ry.base * ry.jit[i] * (1 - bump) + ry.reach * bump;
        // Minimum so rays ring the roundel, but never above reach, or the floor
        // would push the peak spike off the hub (and flatten the sunburst on
        // square/portrait canvases where reach < 1.1*R).
        var floor = Math.min(rd.R * 1.1 * HALO_EXTENT, ry.reach * 0.97);
        if (len < floor) len = floor;
        var ca = Math.cos(a), sa = Math.sin(a);
        var alpha = (0.30 + bump * 0.45).toFixed(3); // visible minimum halo, brighter spike
        App.strokePolyline(ctx, [
          { x: rd.cx + ca * r0, y: rd.cy + sa * r0 },
          { x: rd.cx + ca * len, y: rd.cy + sa * len }
        ], 'rgba(196,164,104,' + alpha + ')', 1.2 + bump * 1.5);
      }
    }

    // Tip of a roundel's longest spike (the ray nearest its gap direction).
    function longestTip(rd) {
      var ry = rd.rays, step = Math.PI * 2 / ry.count;
      var k = Math.round((ry.dirToM - ry.phase) / step);
      var idx = ((k % ry.count) + ry.count) % ry.count;
      var a = ry.phase + k * step;
      var c = Math.cos(wrapPi(a - ry.dirToM));
      var bump = c > 0 ? Math.pow(c, ry.P) : 0;
      var len = ry.base * ry.jit[idx] * (1 - bump) + ry.reach * bump;
      var floor = Math.min(rd.R * 1.1 * HALO_EXTENT, ry.reach * 0.97);
      if (len < floor) len = floor;
      return { x: rd.cx + Math.cos(a) * len, y: rd.cy + Math.sin(a) * len };
    }

    function drawHub(ctx, w, h) {
      if (hubAlpha < 0.02) return;
      var a = hubAlpha.toFixed(3);
      var c = color.getCellColor(hubPos.x, hubPos.y, w, h);
      App.fillCircle(ctx, hubPos.x, hubPos.y, meet.hubR * 0.34, 'hsla(' + c.h + ', ' + c.s + '%, ' + c.l + '%, ' + a + ')');
      App.strokePolygon(ctx, circlePoly(hubPos.x, hubPos.y, meet.hubR), 'rgba(184,154,94,' + a + ')', outlineWidth);
      App.strokePolygon(ctx, circlePoly(hubPos.x, hubPos.y, meet.hubR * 0.62), 'rgba(184,154,94,' + (hubAlpha * 0.85).toFixed(3) + ')', outlineWidth * 0.8);
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

    function drawBeadRing(ctx, rd) {
      var step = Math.PI * 2 / rd.bead.count;
      for (var i = 0; i < rd.bead.count; i++) {
        var a = rd.bead.phase + i * step;
        App.fillCircle(ctx, rd.cx + Math.cos(a) * rd.bead.r, rd.cy + Math.sin(a) * rd.bead.r, 2, BEAD);
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

    // ---- vines (clustered tendrils) ----
    function insideRoundel(x, y) {
      for (var i = 0; i < roundels.length; i++) {
        var rd = roundels[i], dx = x - rd.cx, dy = y - rd.cy, lim = rd.R * 0.96;
        if (dx * dx + dy * dy < lim * lim) return true;
      }
      return false;
    }

    // Trace a vine from its cluster base: a fixed initial heading (the fan
    // direction) eases into the flow field, a gentle curl near the tip, and it
    // stops on reaching any roundel. Records the live length and clip state for
    // foliage placement.
    function traceVineInto(v, dst) {
      var x = v.sx, y = v.sy, clipped = false, n = v.steps, live = n;
      var d0x = Math.cos(v.dir0), d0y = Math.sin(v.dir0);
      for (var i = 0; i < n; i++) {
        if (!dst[i]) dst[i] = { x: x, y: y };
        else { dst[i].x = x; dst[i].y = y; }
        if (clipped) continue;
        var t = i / (n - 1);
        var fa = fieldAngle(x, y), fvx = Math.cos(fa), fvy = Math.sin(fa);
        var w = Math.exp(-i / 9); // outward (fan) bias, decays into the field
        var vx = w * d0x + (1 - w) * fvx, vy = w * d0y + (1 - w) * fvy;
        if (t > 0.6) {
          var cl = v.curl * (t - 0.6), cs = Math.sin(cl), cc = Math.cos(cl);
          var rx = vx * cc - vy * cs, ry = vx * cs + vy * cc;
          vx = rx; vy = ry;
        }
        var L = Math.hypot(vx, vy) || 1;
        var nx = x + vx / L * v.ds, ny = y + vy / L * v.ds;
        if (i >= 3 && insideRoundel(nx, ny)) { clipped = true; live = i + 1; continue; }
        x = nx; y = ny;
      }
      v.clippedTarget = clipped; v.liveTarget = live;
      return dst;
    }

    function makeLeafPlan() {
      var nL = Math.random() < 0.25 ? 1 : 2, s0 = Math.random() < 0.5 ? 1 : -1, plan = [];
      plan.push({ f: 0.40 + Math.random() * 0.08, side: s0 });
      if (nL > 1) plan.push({ f: 0.68 + Math.random() * 0.08, side: -s0 });
      return plan;
    }

    function buildVines(w, h) {
      vines = [];
      var minDim = Math.min(w, h);
      for (var ri = 0; ri < roundels.length; ri++) {
        var rd = roundels[ri];
        var away = rd.rays.dirToM + Math.PI; // clusters on the far side from the gap
        var nClusters = 2 + Math.floor(Math.random() * 3); // up to 4 clusters
        var arc = 1.3; // half-arc the clusters fan across on the far side
        for (var ci = 0; ci < nClusters; ci++) {
          var frac = nClusters > 1 ? ci / (nClusters - 1) : 0.5;
          var ca = away + (frac - 0.5) * 2 * arc + (Math.random() - 0.5) * 0.25;
          var r0 = rd.R * 0.98;
          var bx = rd.cx + Math.cos(ca) * r0, by = rd.cy + Math.sin(ca) * r0;
          var nv = 3 + Math.floor(Math.random() * 3); // 3-5 vines per cluster
          for (var j = 0; j < nv; j++) {
            var fan = ((nv > 1 ? j / (nv - 1) : 0.5) - 0.5) * 1.1;
            var v = {
              sx: bx, sy: by, dir0: ca + fan,
              steps: 80 + Math.floor(Math.random() * 60),
              ds: minDim * (0.008 + Math.random() * 0.006),
              width: minDim * (0.006 + Math.random() * 0.011),
              curl: (Math.random() < 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.25),
              leaves: makeLeafPlan(), pts: [],
              liveTarget: 0, clippedTarget: false, liveF: 0, clipF: 0
            };
            traceVineInto(v, v.pts);
            v.liveF = v.liveTarget;            // smoothed display length
            v.clipF = v.clippedTarget ? 1 : 0; // smoothed clip state (bud fade)
            vines.push(v);
          }
        }
      }
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
        var taper = Math.pow(1 - i / (n - 1), 0.7); // thick root -> fine tip
        var hw = maxWidth * taper * 0.5;
        left.push({ x: p.x + nxp * hw, y: p.y + nyp * hw });
        right.push({ x: p.x - nxp * hw, y: p.y - nyp * hw });
      }
      return left.concat(right.reverse());
    }

    // ---- foliage ----
    function leafPoly(px, py, d, L, Wl) {
      var cd = Math.cos(d), sd = Math.sin(d), nx = -sd, ny = cd, left = [], right = [];
      for (var s = 0; s <= 10; s++) {
        var t = s / 10, cx = px + cd * L * t, cy = py + sd * L * t, off = Wl * Math.sin(Math.PI * t);
        left.push({ x: cx + nx * off, y: cy + ny * off });
        right.push({ x: cx - nx * off, y: cy - ny * off });
      }
      return left.concat(right.reverse());
    }

    function drawLeaf(ctx, px, py, d, L, Wl, fill) {
      var poly = leafPoly(px, py, d, L, Wl);
      App.fillPolygon(ctx, poly, fill);
      App.strokePolygon(ctx, poly, outline, outlineWidth * 0.8);
      App.strokePolyline(ctx, [{ x: px, y: py }, { x: px + Math.cos(d) * L, y: py + Math.sin(d) * L }], outline, outlineWidth * 0.6);
    }

    function drawFoliage(ctx, v, w, h) {
      // Use the smoothed length/clip state so foliage glides with the spine
      // instead of popping when the vine's clip point shifts.
      var live = Math.round(v.liveF);
      if (live < 5) return;
      for (var li = 0; li < v.leaves.length; li++) {
        var lf = v.leaves[li];
        var idx = Math.max(1, Math.min(live - 2, Math.round(lf.f * (live - 1))));
        var p = v.pts[idx], pa = v.pts[idx - 1], pb = v.pts[idx + 1];
        var tang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
        var L = v.width * 5, Wl = L * 0.34;
        drawLeaf(ctx, p.x, p.y, tang + lf.side * 1.0, L, Wl, color.colorToHsl(color.getCellColor(p.x, p.y, w, h)));
      }
      var budAlpha = 1 - v.clipF; // fades out as the vine clips into a roundel
      if (budAlpha > 0.04) {
        var tp = v.pts[live - 1];
        var c = color.getCellColor(tp.x, tp.y, w, h);
        var r = v.width * 1.4;
        App.fillCircle(ctx, tp.x, tp.y, r, 'hsla(' + c.h + ', ' + c.s + '%, ' + c.l + '%, ' + budAlpha.toFixed(3) + ')');
        App.strokePolygon(ctx, circlePoly(tp.x, tp.y, r), 'rgba(184,154,94,' + (budAlpha * 0.9).toFixed(3) + ')', outlineWidth * 0.8);
      }
    }

    // ---- lifecycle ----
    function rebuild(w, h) {
      buildRoundels(w, h);
      buildVines(w, h);
      buildMosaic(w, h);
      initMotes(w, h);
      builtW = w; builtH = h;
      hubInit = false; // re-snap the hub to the new geometry
    }

    function init(w, h) {
      W = w; H = h;
      rebuild(w, h);
    }

    function update(w, h, t, dt) {
      W = w; H = h;
      // Rebuild size-dependent geometry if the canvas was resized.
      if (Math.abs(w - builtW) > 2 || Math.abs(h - builtH) > 2) rebuild(w, h);
      var effDt = dt * GLOBAL_SPEED;
      animTime += effDt;
      var m = motion.sample(animTime);
      var rSpin = 0.15 + 0.85 * m.r;

      // Drift the meeting point gently around its biased base point; both
      // roundels' longest spikes aim at it (and reach it), so the two longest
      // lines cross at a point that wanders.
      var mp = animTime * 0.00018;
      var offA = ab.dist * 0.06 * Math.sin(mp);
      var offP = ab.dist * 0.09 * Math.sin(mp * 1.37 + 0.7);
      meet.x = meetBase.x + ab.ux * offA + ab.px * offP;
      meet.y = meetBase.y + ab.uy * offA + ab.py * offP;
      for (var qi = 0; qi < roundels.length; qi++) {
        var rq = roundels[qi];
        var ddx = meet.x - rq.cx, ddy = meet.y - rq.cy, dd = Math.hypot(ddx, ddy);
        rq.rays.dirToM = Math.atan2(ddy, ddx);
        rq.rays.reach = dd; // tip lands on the meeting point, so the two longest spikes just touch
        rq.rays.base = Math.min(rq.R * 1.2 * HALO_EXTENT, rq.rays.reach * 0.88);
      }

      fieldPhase += (effDt / 1000) * (0.025 + 0.18 * m.u);

      var alpha = 1 - Math.exp(-dt / SMOOTH_TAU); // real dt: ~0.5s glide
      for (var i = 0; i < vines.length; i++) {
        var v = vines[i];
        traceVineInto(v, scratch);
        for (var j = 0; j < v.steps; j++) {
          v.pts[j].x += (scratch[j].x - v.pts[j].x) * alpha;
          v.pts[j].y += (scratch[j].y - v.pts[j].y) * alpha;
        }
        // Smooth the discrete length/clip state alongside the spine.
        v.liveF += (v.liveTarget - v.liveF) * alpha;
        v.clipF += ((v.clippedTarget ? 1 : 0) - v.clipF) * alpha;
      }

      for (var ri = 0; ri < roundels.length; ri++) {
        var rd = roundels[ri];
        for (var bi = 0; bi < rd.bands.length; bi++) rd.bands[bi].phase += (effDt / 1000) * rd.bands[bi].rate * rSpin;
        rd.rays.phase += (effDt / 1000) * rd.rays.rate * rSpin;
        rd.bead.phase += (effDt / 1000) * rd.bead.rate * rSpin;
      }

      // Hub rides at the midpoint of the two longest-ray tips and fades in as
      // those tips converge (close = most visible). Lightly eased so the
      // discrete ray-handoff snaps don't pop.
      var tA = longestTip(roundels[0]), tB = longestTip(roundels[1]);
      var hmx = (tA.x + tB.x) / 2, hmy = (tA.y + tB.y) / 2;
      var gap = Math.hypot(tA.x - tB.x, tA.y - tB.y);
      var tAlpha = Math.max(0, 1 - gap / (meet.hubR * 1.4));
      if (!hubInit) { hubPos.x = hmx; hubPos.y = hmy; hubAlpha = tAlpha; hubInit = true; }
      else {
        var ke = 1 - Math.exp(-dt / 120);
        hubPos.x += (hmx - hubPos.x) * ke;
        hubPos.y += (hmy - hubPos.y) * ke;
        hubAlpha += (tAlpha - hubAlpha) * ke;
      }

      curP = m.p;
      var spd = (10 + 50 * m.p) * effDt / 1000;
      for (var mi = 0; mi < motes.length; mi++) {
        var mo = motes[mi];
        var a = fieldAngle(mo.x, mo.y);
        mo.x += Math.cos(a) * spd; mo.y += Math.sin(a) * spd; mo.age += effDt;
        if (mo.age > mo.life || mo.x < -10 || mo.x > w + 10 || mo.y < -10 || mo.y > h + 10) motes[mi] = spawnMote(w, h, 0);
      }
    }

    function render(ctx, w, h, env) {
      App.clear(ctx, w, h, env.background);
      W = w; H = h;

      drawMosaic(ctx, w, h);
      for (var ri = 0; ri < roundels.length; ri++) drawRays(ctx, roundels[ri]);
      drawHub(ctx, w, h);
      for (ri = 0; ri < roundels.length; ri++) drawRoundel(ctx, roundels[ri], w, h);
      for (ri = 0; ri < roundels.length; ri++) drawBeadRing(ctx, roundels[ri]);

      for (var i = 0; i < vines.length; i++) {
        var v = vines[i];
        var poly = vinePolygon(v.pts, v.width);
        var cp = v.pts[Math.floor(v.pts.length * 0.25)];
        App.fillPolygon(ctx, poly, color.colorToHsl(color.getCellColor(cp.x, cp.y, w, h)));
        App.strokePolygon(ctx, poly, outline, outlineWidth);
      }
      for (i = 0; i < vines.length; i++) drawFoliage(ctx, vines[i], w, h);

      for (var mi = 0; mi < motes.length; mi++) {
        var mo = motes[mi];
        var env2 = Math.sin(Math.PI * mo.age / mo.life);
        var al = 0.65 * curP * (env2 > 0 ? env2 : 0);
        if (al < 0.012) continue;
        App.fillCircle(ctx, mo.x, mo.y, mo.r, 'rgba(228,208,150,' + al.toFixed(3) + ')');
      }
    }

    return { init: init, update: update, render: render };
  };
})(window.App = window.App || {});
