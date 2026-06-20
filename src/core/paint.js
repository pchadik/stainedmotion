// Low-level drawing helpers shared by the renderers.
(function (App) {
  App.clear = function (ctx, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  };

  function tracePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  App.fillPolygon = function (ctx, pts, fillStyle) {
    ctx.fillStyle = fillStyle;
    tracePath(ctx, pts);
    ctx.fill();
  };

  // Cloisonné-style outline around a closed polygon.
  App.strokePolygon = function (ctx, pts, strokeStyle, width) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    tracePath(ctx, pts);
    ctx.stroke();
  };

  // Open polyline (rays, spirals).
  App.strokePolyline = function (ctx, pts, strokeStyle, width) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  };

  App.fillCircle = function (ctx, cx, cy, r, style) {
    ctx.fillStyle = style;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
})(window.App = window.App || {});
