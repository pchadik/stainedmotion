// requestAnimationFrame loop with start/stop. Passes (dt, time) in ms.
(function (App) {
  App.createLoop = function (fn) {
    var raf = null;
    var last = 0;
    var running = false;

    function frame(t) {
      if (!running) return;
      var dt = last ? t - last : 16.7;
      last = t;
      fn(dt, t);
      raf = requestAnimationFrame(frame);
    }

    return {
      start: function () {
        if (running) return;
        running = true;
        last = 0;
        raf = requestAnimationFrame(frame);
      },
      stop: function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      }
    };
  };
})(window.App = window.App || {});
