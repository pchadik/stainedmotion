// Wallpaper Engine user-property plumbing, with sane fallbacks when run
// outside WE (e.g. the GitHub Pages demo, where the listener never fires).
(function (App) {
  // WE sends colors as space-separated floats in 0..1, e.g. "0.04 0.04 0.04".
  function weColorToCss(v) {
    var parts = String(v).split(' ').map(parseFloat);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return 'rgb(' + Math.round(parts[0] * 255) + ',' +
                    Math.round(parts[1] * 255) + ',' +
                    Math.round(parts[2] * 255) + ')';
  }

  App.createSettings = function (defaults, onChange) {
    var settings = Object.assign({}, defaults);

    window.wallpaperPropertyListener = {
      applyUserProperties: function (props) {
        if (props.schemecolor && props.schemecolor.value != null) {
          var css = weColorToCss(props.schemecolor.value);
          if (css) settings.background = css;
        }
        if (onChange) onChange(settings);
      }
    };

    return settings;
  };
})(window.App = window.App || {});
