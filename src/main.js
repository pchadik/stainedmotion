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
    // Art Nouveau "Organic" (v2) — src/modes/art-nouveau.js.
    'art-nouveau-organic': {
      background: '#12100c',
      create: function () {
        var color = App.createColorEngine(App.palettes.artNouveau);
        var motion = App.createMotion();
        return {
          color: color,
          mode: App.createArtNouveau({ color: color, motion: motion, palette: App.palettes.artNouveau })
        };
      }
    },
    // Art Nouveau "Sparse" (v1, frozen) — src/modes/art-nouveau-v1.js.
    'art-nouveau-sparse': {
      background: '#12100c',
      create: function () {
        var color = App.createColorEngine(App.palettes.artNouveauV1);
        var motion = App.createMotion();
        return {
          color: color,
          mode: App.createArtNouveauV1({ color: color, motion: motion, palette: App.palettes.artNouveauV1 })
        };
      }
    },
    // Heartwood — two converging ribbons (path/trunks) over a dancing forest.
    'heartwood': {
      background: '#25272b',
      create: function () {
        var color = App.createColorEngine(App.palettes.heartwood);
        var motion = App.createMotion();
        return {
          color: color,
          mode: App.createHeartwood({ color: color, motion: motion, palette: App.palettes.heartwood })
        };
      }
    },
    // Heartwood "Simple" — frozen snapshot of the original Heartwood look.
    'heartwood-simple': {
      background: '#25272b',
      create: function () {
        var color = App.createColorEngine(App.palettes.heartwoodV1);
        var motion = App.createMotion();
        return {
          color: color,
          mode: App.createHeartwoodV1({ color: color, motion: motion, palette: App.palettes.heartwoodV1 })
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
