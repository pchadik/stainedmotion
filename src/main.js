// Entry point: wires the shared core to a chosen mode and runs the loop.
// The build bakes in a specific mode per Wallpaper Engine wallpaper.
(function (App) {
  App.start = function (modeName) {
    var view;
    var settings = App.createSettings({ background: '#0a0a0a' }, function (s) {
      if (view) view.setBackground(s.background);
    });

    view = App.createCanvas({ mount: '#root', background: settings.background });

    var color, mode;
    if (modeName === 'stained-glass') {
      color = App.createColorEngine(App.palettes.stainedGlass);
      mode = App.createStainedGlass({ color: color });
    } else {
      throw new Error('Unknown mode: ' + modeName);
    }

    mode.init(view.width, view.height);

    App.createLoop(function () {
      var w = view.width, h = view.height;
      mode.update(w, h);
      mode.render(view.ctx, w, h, { background: settings.background });
      color.tick(w, h);
    }).start();
  };
})(window.App = window.App || {});
