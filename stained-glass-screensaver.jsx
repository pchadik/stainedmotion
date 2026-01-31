import React, { useRef, useEffect, useState } from 'react';

const StainedGlassScreensaver = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const linesRef = useRef([]);
  const colorsRef = useRef(new Map());

  // Harmonic color system
  const rootHueRef = useRef(Math.random() * 360);
  const harmonyTypeRef = useRef(0);
  
  const harmonies = {
    analogous: [0, 30, -30, 15, -15],
    triadic: [0, 120, 240],
    splitComplementary: [0, 150, 210],
    tetradic: [0, 90, 180, 270],
    complementary: [0, 180, 30, 210],
  };
  const harmonyNames = Object.keys(harmonies);

  // Get harmonic hue based on centroid position - smooth function
  const getHarmonicHue = (cx, cy, w, h) => {
    const harmony = harmonies[harmonyNames[harmonyTypeRef.current]];
    // Use sine waves to smoothly blend between harmony offsets across the screen
    const blend = (Math.sin(cx / w * Math.PI * 2) + Math.sin(cy / h * Math.PI * 3)) / 2;
    const index = Math.floor((blend + 1) / 2 * harmony.length) % harmony.length;
    return (rootHueRef.current + harmony[index] + 360) % 360;
  };

  const hueToColor = (hue, cx, cy, w, h) => {
    // Smooth variation using sine waves instead of floor/modulo
    const sVal = Math.sin(cx / w * Math.PI * 1.5 + cy / h * Math.PI);
    const lVal = Math.sin(cx / w * Math.PI + cy / h * Math.PI * 1.7);
    const s = 35 + sVal * 10; // 25-45%
    const l = 38 + lVal * 8;  // 30-46%
    return { h: hue, s, l };
  };

  const colorToHsl = (color) => `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

  const getCellColor = (face, cx, cy, w, h) => {
    const clampedX = Math.max(0, Math.min(w, cx));
    const clampedY = Math.max(0, Math.min(h, cy));
    const hue = getHarmonicHue(clampedX, clampedY, w, h);
    return hueToColor(hue, clampedX, clampedY, w, h);
  };

  const shiftColors = (w, h) => {
    rootHueRef.current = (rootHueRef.current + 0.003) % 360; // Very slow drift
    
    if (Math.random() < 0.00005) { // Rare harmony changes
      harmonyTypeRef.current = (harmonyTypeRef.current + 1) % harmonyNames.length;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize lines - now unified, each line defined by a point and angle
    const initLines = () => {
      const w = canvas.width;
      const h = canvas.height;
      linesRef.current = [];
      
      // "Horizontal-ish" lines (3-6)
      const numHorizontal = 3 + Math.floor(Math.random() * 4);
      const hSpacing = h / (numHorizontal + 1);
      
      for (let i = 0; i < numHorizontal; i++) {
        linesRef.current.push({
          // Point on the line (we use center-x, variable y)
          px: w / 2,
          py: hSpacing * (i + 1) + (Math.random() - 0.5) * hSpacing * 0.5,
          angle: (Math.random() - 0.5) * Math.PI * 0.5,
          velocity: (Math.random() - 0.5) * 0.08,
          angleVelocity: (Math.random() - 0.5) * 0.00008,
          isHorizontal: true,
        });
      }

      // "Vertical-ish" lines (5-9)
      const numVertical = 5 + Math.floor(Math.random() * 5);
      const vSpacing = w / (numVertical + 1);
      
      for (let i = 0; i < numVertical; i++) {
        linesRef.current.push({
          px: vSpacing * (i + 1) + (Math.random() - 0.5) * vSpacing * 0.5,
          py: h / 2,
          angle: Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5,
          velocity: (Math.random() - 0.5) * 0.1,
          angleVelocity: (Math.random() - 0.5) * 0.00008,
          isHorizontal: false,
        });
      }
    };

    initLines();

    // Find intersection of two lines
    const lineIntersection = (line1, line2) => {
      const dx1 = Math.cos(line1.angle);
      const dy1 = Math.sin(line1.angle);
      const dx2 = Math.cos(line2.angle);
      const dy2 = Math.sin(line2.angle);
      
      const cross = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(cross) < 1e-10) return null; // Parallel
      
      const dpx = line2.px - line1.px;
      const dpy = line2.py - line1.py;
      
      const t = (dpx * dy2 - dpy * dx2) / cross;
      
      return {
        x: line1.px + dx1 * t,
        y: line1.py + dy1 * t
      };
    };

    // Compute polygon centroid
    const centroid = (vertices) => {
      let cx = 0, cy = 0;
      vertices.forEach(v => { cx += v.x; cy += v.y; });
      return { x: cx / vertices.length, y: cy / vertices.length };
    };

    // Compute signed area (for winding order)
    const signedArea = (vertices) => {
      let area = 0;
      for (let i = 0; i < vertices.length; i++) {
        const j = (i + 1) % vertices.length;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
      }
      return area / 2;
    };

    // Build planar subdivision and extract faces
    const extractFaces = (lines, w, h) => {
      const margin = 50;
      const allLines = [
        // Add boundary lines
        { px: -margin, py: 0, angle: Math.PI / 2 },      // Left
        { px: w + margin, py: 0, angle: Math.PI / 2 },   // Right
        { px: 0, py: -margin, angle: 0 },                // Top
        { px: 0, py: h + margin, angle: 0 },             // Bottom
        ...lines
      ];

      // Step 1: Find all intersection points
      const vertices = [];
      const vertexMap = new Map();
      
      const addVertex = (x, y) => {
        const key = `${Math.round(x)},${Math.round(y)}`;
        if (vertexMap.has(key)) return vertexMap.get(key);
        const idx = vertices.length;
        vertices.push({ x, y, edges: [] });
        vertexMap.set(key, idx);
        return idx;
      };

      // Track which lines each vertex belongs to
      const vertexLines = new Map(); // vertex index -> set of line indices

      // Find all line-line intersections
      for (let i = 0; i < allLines.length; i++) {
        for (let j = i + 1; j < allLines.length; j++) {
          const pt = lineIntersection(allLines[i], allLines[j]);
          if (pt && pt.x >= -margin - 1 && pt.x <= w + margin + 1 && 
              pt.y >= -margin - 1 && pt.y <= h + margin + 1) {
            const vIdx = addVertex(pt.x, pt.y);
            if (!vertexLines.has(vIdx)) vertexLines.set(vIdx, new Set());
            vertexLines.get(vIdx).add(i);
            vertexLines.get(vIdx).add(j);
          }
        }
      }

      // Step 2: For each line, collect vertices on it and create edges
      const edges = [];
      const edgeMap = new Map();
      
      const addEdge = (v1, v2) => {
        if (v1 === v2) return -1;
        const key = v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`;
        if (edgeMap.has(key)) return edgeMap.get(key);
        const idx = edges.length;
        edges.push({ v1, v2 });
        edgeMap.set(key, idx);
        vertices[v1].edges.push(idx);
        vertices[v2].edges.push(idx);
        return idx;
      };

      // For each line, find vertices on it using the vertexLines map
      for (let lineIdx = 0; lineIdx < allLines.length; lineIdx++) {
        const line = allLines[lineIdx];
        const dx = Math.cos(line.angle);
        const dy = Math.sin(line.angle);
        
        const onLine = [];
        vertices.forEach((v, vIdx) => {
          if (vertexLines.has(vIdx) && vertexLines.get(vIdx).has(lineIdx)) {
            const t = (v.x - line.px) * dx + (v.y - line.py) * dy;
            onLine.push({ idx: vIdx, t });
          }
        });
        
        onLine.sort((a, b) => a.t - b.t);
        
        for (let i = 0; i < onLine.length - 1; i++) {
          addEdge(onLine[i].idx, onLine[i + 1].idx);
        }
      }

      // Step 3: For each vertex, sort edges by angle
      vertices.forEach((v, vIdx) => {
        v.edges.sort((e1, e2) => {
          const edge1 = edges[e1];
          const edge2 = edges[e2];
          const other1 = edge1.v1 === vIdx ? edge1.v2 : edge1.v1;
          const other2 = edge2.v1 === vIdx ? edge2.v2 : edge2.v1;
          const angle1 = Math.atan2(vertices[other1].y - v.y, vertices[other1].x - v.x);
          const angle2 = Math.atan2(vertices[other2].y - v.y, vertices[other2].x - v.x);
          return angle1 - angle2;
        });
      });

      // Step 4: Extract faces
      const faces = [];
      const usedHalfEdges = new Set();

      const getHalfEdgeKey = (edgeIdx, fromVertex) => `${edgeIdx},${fromVertex}`;

      for (let startVIdx = 0; startVIdx < vertices.length; startVIdx++) {
        const startVertex = vertices[startVIdx];
        
        for (let ei = 0; ei < startVertex.edges.length; ei++) {
          const startEdgeIdx = startVertex.edges[ei];
          const startKey = getHalfEdgeKey(startEdgeIdx, startVIdx);
          if (usedHalfEdges.has(startKey)) continue;

          const faceVertices = [];
          let currentV = startVIdx;
          let currentE = startEdgeIdx;
          let safety = 0;

          while (safety < 100) {
            safety++;
            const key = getHalfEdgeKey(currentE, currentV);
            if (usedHalfEdges.has(key)) break;
            usedHalfEdges.add(key);

            const edge = edges[currentE];
            const nextV = edge.v1 === currentV ? edge.v2 : edge.v1;
            faceVertices.push({ x: vertices[nextV].x, y: vertices[nextV].y });

            const nextVertex = vertices[nextV];
            if (nextVertex.edges.length < 2) break;

            // Find index of current edge in next vertex's sorted edge list
            const currentEdgePos = nextVertex.edges.indexOf(currentE);
            if (currentEdgePos === -1) break;

            // Next edge is the next one counterclockwise (previous in sorted order)
            const nextEdgePos = (currentEdgePos + nextVertex.edges.length - 1) % nextVertex.edges.length;
            const nextE = nextVertex.edges[nextEdgePos];

            currentV = nextV;
            currentE = nextE;

            if (currentV === startVIdx && currentE === startEdgeIdx) break;
          }

          if (faceVertices.length >= 3) {
            const area = signedArea(faceVertices);
            const maxArea = (w + 2 * margin) * (h + 2 * margin) * 0.8;
            if (Math.abs(area) > 10 && Math.abs(area) < maxArea) {
              // Ensure consistent winding
              if (area < 0) faceVertices.reverse();
              faces.push(faceVertices);
            }
          }
        }
      }

      return faces;
    };

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      const lines = linesRef.current;

      // Update line positions and angles (unchanged logic)
      lines.forEach(line => {
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
        
        // Constrain angles
        const baseAngle = line.isHorizontal ? 0 : Math.PI / 2;
        const angleDiff = line.angle - baseAngle;
        if (Math.abs(angleDiff) > Math.PI * 0.33) {
          line.angleVelocity *= -1;
        }
        
        if (Math.random() < 0.002) {
          line.velocity += (Math.random() - 0.5) * 0.02;
          const maxV = line.isHorizontal ? 0.15 : 0.18;
          line.velocity = Math.max(-maxV, Math.min(maxV, line.velocity));
        }
      });

      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);

      // Extract and draw faces
      const faces = extractFaces(lines, w, h);
      
      faces.forEach(face => {
        const c = centroid(face);
        const color = getCellColor(face, c.x, c.y, w, h);
        
        ctx.fillStyle = colorToHsl(color);
        ctx.beginPath();
        ctx.moveTo(face[0].x, face[0].y);
        for (let i = 1; i < face.length; i++) {
          ctx.lineTo(face[i].x, face[i].y);
        }
        ctx.closePath();
        ctx.fill();
      });

      // Draw lines on top
      const lineThickness = 6 + Math.sin(Date.now() * 0.0001) * 1;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = lineThickness;
      ctx.lineCap = 'round';

      lines.forEach(line => {
        const dx = Math.cos(line.angle);
        const dy = Math.sin(line.angle);
        const t = Math.max(w, h);
        
        ctx.beginPath();
        ctx.moveTo(line.px - dx * t, line.py - dy * t);
        ctx.lineTo(line.px + dx * t, line.py + dy * t);
        ctx.stroke();
      });

      shiftColors(w, h);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#0a0a0a',
        cursor: 'none'
      }}
    />
  );
};

export default StainedGlassScreensaver;
