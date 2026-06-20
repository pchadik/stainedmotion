// Full-screen canvas bootstrap shared by every mode.
(function (App) {
  App.createCanvas = function (opts) {
    opts = opts || {};
    var canvas = document.createElement('canvas');
    var s = canvas.style;
    s.position = 'fixed';
    s.top = '0';
    s.left = '0';
    s.width = '100%';
    s.height = '100%';
    s.background = opts.background || '#0a0a0a';
    s.cursor = 'none';

    var mount = opts.mount ? document.querySelector(opts.mount) : null;
    (mount || document.body).appendChild(canvas);

    var ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    return {
      canvas: canvas,
      ctx: ctx,
      get width() { return canvas.width; },
      get height() { return canvas.height; },
      setBackground: function (c) { s.background = c; },
      destroy: function () {
        window.removeEventListener('resize', resize);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  };
})(window.App = window.App || {});
