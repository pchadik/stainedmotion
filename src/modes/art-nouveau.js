// Art Nouveau mode — STAGE 1: flowing ribbons.
// Whiplash curves traced as streamlines through a smooth flow field, drawn as
// tapered ribbons filled with harmonic color and outlined in gold (cloisonné).
// The flow field's phase advances with motion axis u (undulation), so the
// ribbons breathe and ripple in place rather than travelling across the screen.
// Roundels, polar mosaic and motes (axes r, p) arrive in later stages.
(function (App) {
  App.createArtNouveau = function (deps) {
    var color = deps.color;
    var motion = deps.motion;
    var palette = deps.palette || {};
    var outline = palette.outline || '#b89a5e';
    var outlineWidth = palette.outlineWidth || 1.6;

    var ribbons = [];
    var W = 1, H = 1;
    var fieldPhase = 0;

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

    function init(w, h) {
      W = w; H = h;
      ribbons = [];
      var cols = 4, rows = 4;
      var minDim = Math.min(w, h);
      for (var i = 0; i < cols * rows; i++) {
        var c = i % cols, r = Math.floor(i / cols);
        ribbons.push({
          sx: (c + 0.5) / cols * w + (Math.random() - 0.5) * (w / cols) * 0.6,
          sy: (r + 0.5) / rows * h + (Math.random() - 0.5) * (h / rows) * 0.6,
          steps: 70 + Math.floor(Math.random() * 60),
          ds: minDim * (0.008 + Math.random() * 0.006),
          width: minDim * (0.012 + Math.random() * 0.02)
        });
      }
    }

    function trace(rb) {
      var pts = [];
      var x = rb.sx, y = rb.sy;
      for (var i = 0; i < rb.steps; i++) {
        pts.push({ x: x, y: y });
        var a = fieldAngle(x, y);
        x += Math.cos(a) * rb.ds;
        y += Math.sin(a) * rb.ds;
      }
      return pts;
    }

    // Build a tapered ribbon polygon by offsetting the centerline along its
    // normal; width fades to zero at both ends.
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
      // Undulation drives how fast the field morphs (with a gentle floor).
      fieldPhase += (dt / 1000) * (0.05 + 0.35 * m.u);
    }

    function render(ctx, w, h, env) {
      App.clear(ctx, w, h, env.background);
      W = w; H = h;

      for (var i = 0; i < ribbons.length; i++) {
        var rb = ribbons[i];
        var pts = trace(rb);
        var poly = ribbonPolygon(pts, rb.width);
        var mid = pts[Math.floor(pts.length / 2)];
        var col = color.getCellColor(mid.x, mid.y, w, h);
        App.fillPolygon(ctx, poly, color.colorToHsl(col));
        App.strokePolygon(ctx, poly, outline, outlineWidth);
      }
    }

    return { init: init, update: update, render: render };
  };
})(window.App = window.App || {});
