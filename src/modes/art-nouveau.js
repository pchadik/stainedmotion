// Art Nouveau mode — STAGE 2: flowing ribbons + roundels / polar mosaic.
//
// Ribbons: whiplash curves traced as streamlines through a smooth flow field,
// drawn as tapered ribbons filled with muted harmonic color and gold-outlined
// (cloisonné). The field phase advances with motion axis u (undulation). Each
// ribbon keeps inertia and eases toward its freshly traced path, so a sudden
// streamline swing glides instead of whipping.
//
// Roundels: concentric polar mosaics (Mucha's halo motif) drawn behind the
// ribbons to anchor the composition and fill open space. Their rings rotate
// (alternating direction) with motion axis r.
//
// Motes (axis p) arrive in a later stage.
(function (App) {
  App.createArtNouveau = function (deps) {
    var color = deps.color;
    var motion = deps.motion;
    var palette = deps.palette || {};
    var outline = palette.outline || '#b89a5e';
    var outlineWidth = palette.outlineWidth || 1.6;

    var ribbons = [];
    var roundels = [];
    var W = 1, H = 1;
    var fieldPhase = 0;
    var SMOOTH_TAU = 280; // ms; ribbon inertia time constant

    // Fixed per-run field constants so every run flows differently.
    var P1 = Math.random() * Math.PI * 2;
    var P2 = Math.random() * Math.PI * 2;
    var P3 = Math.random() * Math.PI * 2;
    var FA = 2.6 + Math.random() * 0.8;
    var FB = 2.6 + Math.random() * 0.8;
    var FC = 3.8 + Math.random() * 0.8;

    // Smooth direction field over normalized coordinates; phase animates it.
    function fieldAngle(x, y) {
      var nx = x / W, ny = y / H;
      return Math.PI * (
        Math.sin(nx * FA + fieldPhase * 0.7 + P1) +
        Math.sin(ny * FB + fieldPhase * 1.0 + P2) +
        0.5 * Math.sin((nx + ny) * FC + fieldPhase * 1.3 + P3)
      );
    }

    function traceInto(rb, dst) {
      var x = rb.sx, y = rb.sy;
      for (var i = 0; i < rb.steps; i++) {
        if (!dst[i]) dst[i] = { x: x, y: y };
        else { dst[i].x = x; dst[i].y = y; }
        var a = fieldAngle(x, y);
        x += Math.cos(a) * rb.ds;
        y += Math.sin(a) * rb.ds;
      }
      return dst;
    }

    // ---- roundels ----
    function makeRoundel(cx, cy, R) {
      var bandDefs = [
        { rIn: 0.18, rOut: 0.45, sectors: 12, rate: 0.12 },
        { rIn: 0.45, rOut: 0.72, sectors: 18, rate: -0.09 },
        { rIn: 0.72, rOut: 0.95, sectors: 24, rate: 0.07 }
      ];
      var bands = bandDefs.map(function (b) {
        return {
          rIn: R * b.rIn, rOut: R * b.rOut, sectors: b.sectors,
          rate: b.rate, phase: Math.random() * Math.PI * 2
        };
      });
      return { cx: cx, cy: cy, R: R, disc: R * 0.18, bands: bands };
    }

    function buildRoundels(w, h) {
      var minDim = Math.min(w, h);
      return [
        makeRoundel(w * 0.66, h * 0.40, minDim * 0.34),
        makeRoundel(w * 0.20, h * 0.74, minDim * 0.18)
      ];
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
      // inner arc back (reverse direction)
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
      // inner solid disc
      var disc = circlePoly(rd.cx, rd.cy, rd.disc);
      App.fillPolygon(ctx, disc, color.colorToHsl(color.getCellColor(rd.cx, rd.cy, w, h)));
      App.strokePolygon(ctx, disc, outline, outlineWidth);

      // mosaic bands
      for (var bi = 0; bi < rd.bands.length; bi++) {
        var band = rd.bands[bi];
        var step = Math.PI * 2 / band.sectors;
        var midR = (band.rIn + band.rOut) * 0.5;
        for (var k = 0; k < band.sectors; k++) {
          var a0 = band.phase + k * step;
          var a1 = a0 + step;
          var poly = annularSector(rd.cx, rd.cy, band.rIn, band.rOut, a0, a1);
          var midA = a0 + step * 0.5;
          var mx = rd.cx + midR * Math.cos(midA);
          var my = rd.cy + midR * Math.sin(midA);
          App.fillPolygon(ctx, poly, color.colorToHsl(color.getCellColor(mx, my, w, h)));
          App.strokePolygon(ctx, poly, outline, outlineWidth);
        }
      }
      // outer rim
      App.strokePolygon(ctx, circlePoly(rd.cx, rd.cy, rd.R * 0.97), outline, outlineWidth * 1.4);
    }

    // ---- ribbons ----
    function init(w, h) {
      W = w; H = h;
      ribbons = [];
      var cols = 4, rows = 4;
      var minDim = Math.min(w, h);
      for (var i = 0; i < cols * rows; i++) {
        var c = i % cols, r = Math.floor(i / cols);
        var rb = {
          sx: (c + 0.5) / cols * w + (Math.random() - 0.5) * (w / cols) * 0.6,
          sy: (r + 0.5) / rows * h + (Math.random() - 0.5) * (h / rows) * 0.6,
          steps: 70 + Math.floor(Math.random() * 60),
          ds: minDim * (0.008 + Math.random() * 0.006),
          width: minDim * (0.012 + Math.random() * 0.02),
          pts: []
        };
        traceInto(rb, rb.pts); // start settled on the field (no startup ease)
        ribbons.push(rb);
      }
      roundels = buildRoundels(w, h);
    }

    var scratch = [];
    function ribbonPolygon(pts, maxWidth) {
      var n = pts.length;
      var left = [], right = [];
      for (var i = 0; i < n; i++) {
        var p = pts[i];
        var a = pts[Math.max(0, i - 1)];
        var b = pts[Math.min(n - 1, i + 1)];
        var dx = b.x - a.x, dy = b.y - a.y;
        var len = Math.hypot(dx, dy) || 1;
        var nxp = -dy / len, nyp = dx / len;
        // Clamp the sine: at i = n-1, Math.PI*i/(n-1) can exceed PI by one ULP,
        // making sin slightly negative and Math.pow(negative, 0.7) => NaN.
        var s = Math.sin(Math.PI * i / (n - 1));
        var taper = Math.pow(s > 0 ? s : 0, 0.7);
        var hw = maxWidth * taper * 0.5;
        left.push({ x: p.x + nxp * hw, y: p.y + nyp * hw });
        right.push({ x: p.x - nxp * hw, y: p.y - nyp * hw });
      }
      return left.concat(right.reverse());
    }

    function update(w, h, t, dt) {
      W = w; H = h;
      var m = motion.sample(t);

      // Undulation drives how fast the field morphs (gentle, with a floor).
      fieldPhase += (dt / 1000) * (0.025 + 0.18 * m.u);

      // Ease each ribbon toward its freshly traced path (inertia damps whips).
      var alpha = 1 - Math.exp(-dt / SMOOTH_TAU);
      for (var i = 0; i < ribbons.length; i++) {
        var rb = ribbons[i];
        traceInto(rb, scratch);
        for (var j = 0; j < rb.steps; j++) {
          rb.pts[j].x += (scratch[j].x - rb.pts[j].x) * alpha;
          rb.pts[j].y += (scratch[j].y - rb.pts[j].y) * alpha;
        }
      }

      // Rotate roundel rings with axis r (alternating direction per band).
      var rSpin = 0.15 + 0.85 * m.r;
      for (var ri = 0; ri < roundels.length; ri++) {
        var bands = roundels[ri].bands;
        for (var bi = 0; bi < bands.length; bi++) {
          bands[bi].phase += (dt / 1000) * bands[bi].rate * rSpin;
        }
      }
    }

    function render(ctx, w, h, env) {
      App.clear(ctx, w, h, env.background);
      W = w; H = h;

      // Roundels behind, ribbons in front (Mucha figure-over-halo depth).
      for (var ri = 0; ri < roundels.length; ri++) drawRoundel(ctx, roundels[ri], w, h);

      for (var i = 0; i < ribbons.length; i++) {
        var rb = ribbons[i];
        var poly = ribbonPolygon(rb.pts, rb.width);
        var mid = rb.pts[Math.floor(rb.pts.length / 2)];
        var col = color.getCellColor(mid.x, mid.y, w, h);
        App.fillPolygon(ctx, poly, color.colorToHsl(col));
        App.strokePolygon(ctx, poly, outline, outlineWidth);
      }
    }

    return { init: init, update: update, render: render };
  };
})(window.App = window.App || {});
