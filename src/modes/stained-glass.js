// Stained-glass mode: straight infinite lines drift across the canvas; the
// planar subdivision they form is extracted into faces, each filled with a
// harmonic color and separated by dark "leading".
(function (App) {
  App.createStainedGlass = function (deps) {
    var color = deps.color;
    var lines = [];

    function init(w, h) {
      lines = [];

      var numHorizontal = 3 + Math.floor(Math.random() * 4);
      var hSpacing = h / (numHorizontal + 1);
      for (var i = 0; i < numHorizontal; i++) {
        lines.push({
          px: w / 2,
          py: hSpacing * (i + 1) + (Math.random() - 0.5) * hSpacing * 0.5,
          angle: (Math.random() - 0.5) * Math.PI * 0.5,
          velocity: (Math.random() - 0.5) * 0.08,
          angleVelocity: (Math.random() - 0.5) * 0.00008,
          isHorizontal: true
        });
      }

      var numVertical = 5 + Math.floor(Math.random() * 5);
      var vSpacing = w / (numVertical + 1);
      for (var j = 0; j < numVertical; j++) {
        lines.push({
          px: vSpacing * (j + 1) + (Math.random() - 0.5) * vSpacing * 0.5,
          py: h / 2,
          angle: Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5,
          velocity: (Math.random() - 0.5) * 0.1,
          angleVelocity: (Math.random() - 0.5) * 0.00008,
          isHorizontal: false
        });
      }
    }

    function update(w, h) {
      lines.forEach(function (line) {
        if (line.isHorizontal) {
          line.py += line.velocity;
          if (line.py < 50 || line.py > h - 50) {
            line.velocity *= -1;
            line.py = Math.max(50, Math.min(h - 50, line.py));
          }
        } else {
          line.px += line.velocity;
          if (line.px < 50 || line.px > w - 50) {
            line.velocity *= -1;
            line.px = Math.max(50, Math.min(w - 50, line.px));
          }
        }

        line.angle += line.angleVelocity;

        var baseAngle = line.isHorizontal ? 0 : Math.PI / 2;
        var angleDiff = line.angle - baseAngle;
        if (Math.abs(angleDiff) > Math.PI * 0.33) {
          line.angleVelocity *= -1;
        }

        if (Math.random() < 0.002) {
          line.velocity += (Math.random() - 0.5) * 0.02;
          var maxV = line.isHorizontal ? 0.15 : 0.18;
          line.velocity = Math.max(-maxV, Math.min(maxV, line.velocity));
        }
      });
    }

    var lineIntersection = function (line1, line2) {
      var dx1 = Math.cos(line1.angle);
      var dy1 = Math.sin(line1.angle);
      var dx2 = Math.cos(line2.angle);
      var dy2 = Math.sin(line2.angle);

      var cross = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(cross) < 1e-10) return null;

      var dpx = line2.px - line1.px;
      var dpy = line2.py - line1.py;
      var t = (dpx * dy2 - dpy * dx2) / cross;

      return { x: line1.px + dx1 * t, y: line1.py + dy1 * t };
    };

    var centroid = function (vertices) {
      var cx = 0, cy = 0;
      vertices.forEach(function (v) { cx += v.x; cy += v.y; });
      return { x: cx / vertices.length, y: cy / vertices.length };
    };

    var signedArea = function (vertices) {
      var area = 0;
      for (var i = 0; i < vertices.length; i++) {
        var j = (i + 1) % vertices.length;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
      }
      return area / 2;
    };

    var extractFaces = function (lines, w, h) {
      var margin = 50;
      var allLines = [
        { px: -margin, py: 0, angle: Math.PI / 2 },
        { px: w + margin, py: 0, angle: Math.PI / 2 },
        { px: 0, py: -margin, angle: 0 },
        { px: 0, py: h + margin, angle: 0 }
      ].concat(lines);

      var vertices = [];
      var vertexMap = new Map();

      var addVertex = function (x, y) {
        var key = Math.round(x) + ',' + Math.round(y);
        if (vertexMap.has(key)) return vertexMap.get(key);
        var idx = vertices.length;
        vertices.push({ x: x, y: y, edges: [] });
        vertexMap.set(key, idx);
        return idx;
      };

      var vertexLines = new Map();

      for (var i = 0; i < allLines.length; i++) {
        for (var j = i + 1; j < allLines.length; j++) {
          var pt = lineIntersection(allLines[i], allLines[j]);
          if (pt && pt.x >= -margin - 1 && pt.x <= w + margin + 1 &&
              pt.y >= -margin - 1 && pt.y <= h + margin + 1) {
            var vIdx = addVertex(pt.x, pt.y);
            if (!vertexLines.has(vIdx)) vertexLines.set(vIdx, new Set());
            vertexLines.get(vIdx).add(i);
            vertexLines.get(vIdx).add(j);
          }
        }
      }

      var edges = [];
      var edgeMap = new Map();

      var addEdge = function (v1, v2) {
        if (v1 === v2) return -1;
        var key = v1 < v2 ? v1 + ',' + v2 : v2 + ',' + v1;
        if (edgeMap.has(key)) return edgeMap.get(key);
        var idx = edges.length;
        edges.push({ v1: v1, v2: v2 });
        edgeMap.set(key, idx);
        vertices[v1].edges.push(idx);
        vertices[v2].edges.push(idx);
        return idx;
      };

      for (var lineIdx = 0; lineIdx < allLines.length; lineIdx++) {
        var line = allLines[lineIdx];
        var dx = Math.cos(line.angle);
        var dy = Math.sin(line.angle);

        var onLine = [];
        vertices.forEach(function (v, vIdx) {
          if (vertexLines.has(vIdx) && vertexLines.get(vIdx).has(lineIdx)) {
            var t = (v.x - line.px) * dx + (v.y - line.py) * dy;
            onLine.push({ idx: vIdx, t: t });
          }
        });

        onLine.sort(function (a, b) { return a.t - b.t; });

        for (var k = 0; k < onLine.length - 1; k++) {
          addEdge(onLine[k].idx, onLine[k + 1].idx);
        }
      }

      vertices.forEach(function (v, vIdx) {
        v.edges.sort(function (e1, e2) {
          var edge1 = edges[e1];
          var edge2 = edges[e2];
          var other1 = edge1.v1 === vIdx ? edge1.v2 : edge1.v1;
          var other2 = edge2.v1 === vIdx ? edge2.v2 : edge2.v1;
          var angle1 = Math.atan2(vertices[other1].y - v.y, vertices[other1].x - v.x);
          var angle2 = Math.atan2(vertices[other2].y - v.y, vertices[other2].x - v.x);
          return angle1 - angle2;
        });
      });

      var faces = [];
      var usedHalfEdges = new Set();
      var getHalfEdgeKey = function (edgeIdx, fromVertex) { return edgeIdx + ',' + fromVertex; };

      for (var startVIdx = 0; startVIdx < vertices.length; startVIdx++) {
        var startVertex = vertices[startVIdx];

        for (var ei = 0; ei < startVertex.edges.length; ei++) {
          var startEdgeIdx = startVertex.edges[ei];
          var startKey = getHalfEdgeKey(startEdgeIdx, startVIdx);
          if (usedHalfEdges.has(startKey)) continue;

          var faceVertices = [];
          var currentV = startVIdx;
          var currentE = startEdgeIdx;
          var safety = 0;

          while (safety < 100) {
            safety++;
            var key = getHalfEdgeKey(currentE, currentV);
            if (usedHalfEdges.has(key)) break;
            usedHalfEdges.add(key);

            var edge = edges[currentE];
            var nextV = edge.v1 === currentV ? edge.v2 : edge.v1;
            faceVertices.push({ x: vertices[nextV].x, y: vertices[nextV].y });

            var nextVertex = vertices[nextV];
            if (nextVertex.edges.length < 2) break;

            var currentEdgePos = nextVertex.edges.indexOf(currentE);
            if (currentEdgePos === -1) break;

            var nextEdgePos = (currentEdgePos + nextVertex.edges.length - 1) % nextVertex.edges.length;
            var nextE = nextVertex.edges[nextEdgePos];

            currentV = nextV;
            currentE = nextE;

            if (currentV === startVIdx && currentE === startEdgeIdx) break;
          }

          if (faceVertices.length >= 3) {
            var area = signedArea(faceVertices);
            var maxArea = (w + 2 * margin) * (h + 2 * margin) * 0.8;
            if (Math.abs(area) > 10 && Math.abs(area) < maxArea) {
              if (area < 0) faceVertices.reverse();
              faces.push(faceVertices);
            }
          }
        }
      }

      return faces;
    };

    function render(ctx, w, h, env) {
      App.clear(ctx, w, h, env.background);

      var faces = extractFaces(lines, w, h);
      faces.forEach(function (face) {
        var c = centroid(face);
        var col = color.getCellColor(c.x, c.y, w, h);
        App.fillPolygon(ctx, face, color.colorToHsl(col));
      });

      var lineThickness = 6 + Math.sin(Date.now() * 0.0001) * 1;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = lineThickness;
      ctx.lineCap = 'round';

      lines.forEach(function (line) {
        var dx = Math.cos(line.angle);
        var dy = Math.sin(line.angle);
        var t = Math.max(w, h);
        ctx.beginPath();
        ctx.moveTo(line.px - dx * t, line.py - dy * t);
        ctx.lineTo(line.px + dx * t, line.py + dy * t);
        ctx.stroke();
      });
    }

    return { init: init, update: update, render: render };
  };
})(window.App = window.App || {});
