// Entry point: wires the shared core to a chosen mode and runs the loop.
// The build bakes in a specific mode per Wallpaper Engine wallpaper; each
// build only bundles the sources for its own mode, so unused registry entries
// below are simply never invoked.
(function (App) {
  var MODES = {
    'stained-glass': {
      background: '#0a0a0a',
      create: function () {
        var color = App.createColorEngine(App.palettes.stainedGlass);
        return { color: color, mode: App.createStainedGlass({ color: color }) };
      }
    },
    'art-nouveau': {
      background: '#12100c',
      create: function () {
        var color = App.createColorEngine(App.palettes.artNouveau);
        var motion = App.createMotion();
        return {
          color: color,
          mode: App.createArtNouveau({ color: color, motion: motion, palette: App.palettes.artNouveau })
        };
      }
    }
  };

  App.start = function (modeName) {
    var def = MODES[modeName];
    if (!def) throw new Error('Unknown mode: ' + modeName);

    var view;
    var settings = App.createSettings({ background: def.background }, function (s) {
      if (view) view.setBackground(s.background);
    });

    view = App.createCanvas({ mount: '#root', background: settings.background });

    var built = def.create();
    var color = built.color, mode = built.mode;

    mode.init(view.width, view.height);

    App.createLoop(function (dt, t) {
      var w = view.width, h = view.height;
      mode.update(w, h, t, dt);
      mode.render(view.ctx, w, h, { background: settings.background });
      color.tick(w, h);
    }).start();
  };
})(window.App = window.App || {});
