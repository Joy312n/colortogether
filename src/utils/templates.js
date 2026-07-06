// Beautiful procedural and parametric line-art templates for co-op coloring.
// Uses optimized polar coordinate geometry, bezier curve systems, and procedural fractals
// to produce beautiful high-res coloring outlines with multiple fillable regions.

function initCanvas(ctx, w, h) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

// Global cache for template thumbnails to avoid re-rendering
const thumbnailCache = {};

export function getTemplateThumbnailUrl(templateId, width = 180, height = 180) {
  if (thumbnailCache[templateId]) {
    return thumbnailCache[templateId];
  }
  const url = generateTemplateDataUrl(templateId, width, height);
  thumbnailCache[templateId] = url;
  return url;
}

// Line art and coloring book style geometry helpers
function strokeCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function strokeEllipse(ctx, cx, cy, rx, ry, rotation = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawLeaf(ctx, cx, cy, angle, length, width, drawVeins = true) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-width, -length / 3, -width, (-length * 2) / 3, 0, -length);
  ctx.bezierCurveTo(width, (-length * 2) / 3, width, -length / 3, 0, 0);
  ctx.closePath();
  ctx.stroke();

  if (drawVeins) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -length);
    ctx.stroke();

    for (let i = 1; i <= 3; i++) {
      const ly = -length * (i / 4);
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.quadraticCurveTo(-width * 0.4, ly - 5, -width * 0.7 * (1 - i * 0.25), ly - 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.quadraticCurveTo(width * 0.4, ly - 5, width * 0.7 * (1 - i * 0.25), ly - 10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFlowerPetal(ctx, cx, cy, angle, rInner, rOuter, petalWidth) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-petalWidth, -rInner);
  ctx.quadraticCurveTo(-petalWidth * 1.5, -rInner - (rOuter - rInner) / 2, 0, -rOuter);
  ctx.quadraticCurveTo(petalWidth * 1.5, -rInner - (rOuter - rInner) / 2, petalWidth, -rInner);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawRoseFlower(ctx, cx, cy, r) {
  ctx.save();
  const layers = [
    { count: 7, r1: r * 0.7, r2: r, w: r * 0.35, rot: 0 },
    { count: 6, r1: r * 0.45, r2: r * 0.75, w: r * 0.28, rot: 0.5 },
    { count: 5, r1: r * 0.25, r2: r * 0.5, w: r * 0.2, rot: 0.2 }
  ];
  layers.forEach((layer) => {
    for (let i = 0; i < layer.count; i++) {
      const angle = (i * Math.PI * 2) / layer.count + layer.rot;
      drawFlowerPetal(ctx, cx, cy, angle, layer.r1, layer.r2, layer.w);
    }
  });
  strokeCircle(ctx, cx, cy, r * 0.12);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.08, 0, Math.PI, false);
  ctx.stroke();
  ctx.restore();
}

function drawFluffyCloud(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y + size * 0.3);
  ctx.bezierCurveTo(x - size * 1.3, y - size * 0.3, x - size * 0.6, y - size * 0.8, x - size * 0.1, y - size * 0.5);
  ctx.bezierCurveTo(x + size * 0.4, y - size * 1.1, x + size * 1.2, y - size * 0.7, x + size * 1.1, y - size * 0.1);
  ctx.bezierCurveTo(x + size * 1.4, y + size * 0.4, x + size * 0.8, y + size * 0.9, x + size * 0.2, y + size * 0.7);
  ctx.bezierCurveTo(x - size * 0.3, y + size * 1.0, x - size * 1.1, y + size * 0.9, x - size, y + size * 0.3);
  ctx.closePath();
  ctx.stroke();
}

function drawPineTree(ctx, cx, cy, width, height) {
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const bottomWidth = width * (1 - i * 0.2);
    const bottomY = cy - (i * height) / layers;
    const topY = cy - ((i + 1) * height) / layers;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx - bottomWidth / 2, bottomY);
    ctx.lineTo(cx + bottomWidth / 2, bottomY);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(cx - width * 0.1, cy, width * 0.2, height * 0.2);
  ctx.stroke();
}

function drawStar(ctx, cx, cy, rOuter, rInner, points = 5) {
  ctx.beginPath();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = i * step - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.stroke();
}

// Core drawing engines for each category
function drawNature(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "rose") {
    // Rose Bouquet with Ribbon
    const rosePositions = [
      { x: cx - 65, y: cy - 40, r: 55 },
      { x: cx + 65, y: cy - 40, r: 55 },
      { x: cx, y: cy + 35, r: 60 }
    ];

    // Stems converging at bottom
    ctx.beginPath();
    ctx.moveTo(cx - 65, cy - 40);
    ctx.quadraticCurveTo(cx - 30, cy + 100, cx - 15, cy + 240);
    ctx.moveTo(cx + 65, cy - 40);
    ctx.quadraticCurveTo(cx + 30, cy + 100, cx + 15, cy + 240);
    ctx.moveTo(cx, cy + 35);
    ctx.lineTo(cx, cy + 240);
    ctx.stroke();

    // Leaves
    drawLeaf(ctx, cx - 110, cy - 80, -0.6, 60, 30);
    drawLeaf(ctx, cx + 110, cy - 80, 0.6, 60, 30);
    drawLeaf(ctx, cx - 100, cy + 40, -1.8, 60, 30);
    drawLeaf(ctx, cx + 100, cy + 40, 1.8, 60, 30);
    drawLeaf(ctx, cx - 40, cy + 125, -1.2, 50, 22);
    drawLeaf(ctx, cx + 40, cy + 125, 1.2, 50, 22);

    // Ribbon bow
    ctx.save();
    ctx.translate(cx, cy + 160);
    ctx.beginPath();
    ctx.bezierCurveTo(0, 0, -55, -35, -35, 15);
    ctx.bezierCurveTo(-15, 35, -5, 0, 0, 0);
    ctx.bezierCurveTo(0, 0, 55, -35, 35, 15);
    ctx.bezierCurveTo(15, 35, 5, 0, 0, 0);
    ctx.stroke();
    // knot
    ctx.beginPath();
    ctx.rect(-8, -8, 16, 16);
    ctx.stroke();
    // tails
    ctx.beginPath();
    ctx.moveTo(-4, 8); ctx.quadraticCurveTo(-20, 35, -30, 65);
    ctx.moveTo(4, 8); ctx.quadraticCurveTo(20, 35, 30, 65);
    ctx.stroke();
    ctx.restore();

    // Flowers on top
    rosePositions.forEach((p) => drawRoseFlower(ctx, p.x, p.y, p.r));

  } else if (type === "sunflower") {
    // Sunflower Garden
    const sy = cy - 40;
    ctx.beginPath();
    ctx.moveTo(cx, sy);
    ctx.lineTo(cx, h);
    ctx.stroke();

    drawLeaf(ctx, cx, sy + 120, -0.8, 70, 35);
    drawLeaf(ctx, cx, sy + 180, 0.8, 70, 35);

    // Central head concentric seed circles
    strokeCircle(ctx, cx, sy, 70);
    for (let r = 15; r < 70; r += 15) {
      strokeCircle(ctx, cx, sy, r);
    }
    // Radial seed lines
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 15, sy + Math.sin(a) * 15);
      ctx.lineTo(cx + Math.cos(a) * 70, sy + Math.sin(a) * 70);
      ctx.stroke();
    }

    // Two layers of pointed petals
    for (let layer = 0; layer < 2; layer++) {
      const pCount = 20;
      const rMin = 70;
      const rMax = 135 - layer * 15;
      const petalW = 18 - layer * 3;
      const rot = layer * 0.15;
      for (let i = 0; i < pCount; i++) {
        const angle = (i * Math.PI * 2) / pCount + rot;
        drawFlowerPetal(ctx, cx, sy, angle, rMin, rMax, petalW);
      }
    }

    // Small sunflowers in background
    const bgSuns = [
      { x: cx - 180, y: cy + 180, r: 35 },
      { x: cx + 180, y: cy + 180, r: 35 }
    ];
    bgSuns.forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, h);
      ctx.stroke();
      strokeCircle(ctx, s.x, s.y, s.r);
      for (let r = 10; r < s.r; r += 10) strokeCircle(ctx, s.x, s.y, r);
      for (let i = 0; i < 12; i++) {
        drawFlowerPetal(ctx, s.x, s.y, (i * Math.PI * 2) / 12, s.r, s.r * 1.6, 8);
      }
    });

  } else if (type === "cherry") {
    // Cherry Blossom
    ctx.beginPath();
    ctx.moveTo(0, h * 0.8);
    ctx.bezierCurveTo(w * 0.2, h * 0.72, w * 0.4, h * 0.52, cx, cy);
    ctx.bezierCurveTo(w * 0.6, cy - 40, w * 0.8, cy - 80, w, cy - 100);
    ctx.lineTo(w, cy - 118);
    ctx.bezierCurveTo(w * 0.8, cy - 98, w * 0.6, cy - 58, cx, cy - 18);
    ctx.bezierCurveTo(w * 0.38, h * 0.5, w * 0.18, h * 0.7, 0, h * 0.76);
    ctx.closePath();
    ctx.stroke();

    // Blossom cluster locations
    const blossoms = [
      { x: cx - 100, y: h * 0.56 },
      { x: cx - 60, y: h * 0.48 },
      { x: cx - 20, y: cy + 10 },
      { x: cx + 45, y: cy - 20 },
      { x: cx + 110, y: cy - 55 },
      { x: w * 0.8, y: cy - 130 }
    ];

    blossoms.forEach((b) => {
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-12, -10, -15, -28, -3, -26);
        ctx.lineTo(0, -22);
        ctx.lineTo(3, -26);
        ctx.bezierCurveTo(15, -28, 12, -10, 0, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      strokeCircle(ctx, b.x, b.y, 5);
    });

    // Drifting petals
    const petals = [
      { x: cx - 150, y: h * 0.35, rot: 0.5 },
      { x: cx + 120, y: cy + 140, rot: 1.2 }
    ];
    petals.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.bezierCurveTo(-12, -8, -10, -18, 0, -16);
      ctx.bezierCurveTo(10, -18, 12, -8, 6, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

  } else if (type === "leaves") {
    // Tropical Leaves
    // Monstera Leaf Left
    ctx.save();
    ctx.translate(cx - 90, cy);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.lineTo(0, 100);
    ctx.bezierCurveTo(-90, 80, -130, -10, 0, -110);
    ctx.bezierCurveTo(130, -10, 90, 80, 0, 100);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 100);
    ctx.lineTo(0, -105);
    ctx.stroke();

    const cuts = [-60, -25, 10, 45];
    cuts.forEach((y, idx) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(-20, y - 8, -90, y + idx * 4 - 15, -105, y);
      ctx.bezierCurveTo(-90, y + idx * 4 + 8, -20, y + 8, 0, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(20, y - 8, 90, y + idx * 4 - 15, 105, y);
      ctx.bezierCurveTo(90, y + idx * 4 + 8, 20, y + 8, 0, y);
      ctx.stroke();
    });
    ctx.restore();

    // Palm Leaf Right
    ctx.save();
    ctx.translate(cx + 100, cy);
    ctx.rotate(0.25);
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.quadraticCurveTo(-15, 0, 10, -130);
    ctx.stroke();

    for (let i = 0; i < 9; i++) {
      const pct = i / 8;
      const ly = 110 - pct * 220;
      const lx = -15 * (1 - pct);
      const len = 80 * Math.sin(pct * Math.PI);

      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx - len * 0.9, ly - 8, lx - len, ly - 25);
      ctx.quadraticCurveTo(lx - len * 0.8, ly, lx, ly + 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + len * 0.9, ly - 8, lx + len, ly - 25);
      ctx.quadraticCurveTo(lx + len * 0.8, ly, lx, ly + 4);
      ctx.stroke();
    }
    ctx.restore();

  } else if (type === "cabin") {
    // Forest Cabin
    ctx.beginPath();
    ctx.moveTo(50, cy + 100);
    ctx.lineTo(cx - 100, cy - 120);
    ctx.lineTo(cx + 50, cy + 100);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 100);
    ctx.lineTo(cx + 110, cy - 100);
    ctx.lineTo(w - 50, cy + 100);
    ctx.stroke();

    drawPineTree(ctx, cx - 210, cy + 80, 80, 110);
    drawPineTree(ctx, cx + 210, cy + 80, 80, 110);

    const cb = cy + 40;
    ctx.beginPath();
    ctx.rect(cx - 80, cb, 160, 110);
    ctx.stroke();
    for (let ly = cb + 20; ly < cb + 110; ly += 20) {
      ctx.beginPath();
      ctx.moveTo(cx - 80, ly);
      ctx.lineTo(cx + 80, ly);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(cx - 100, cb);
    ctx.lineTo(cx, cb - 60);
    ctx.lineTo(cx + 100, cb);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(cx + 45, cb - 55, 20, 35);
    ctx.stroke();
    drawFluffyCloud(ctx, cx + 55, cb - 75, 12);

    ctx.beginPath();
    ctx.rect(cx - 50, cb + 35, 35, 75);
    ctx.stroke();
    strokeCircle(ctx, cx - 22, cb + 72, 3.5);

    ctx.beginPath();
    ctx.rect(cx + 15, cb + 25, 40, 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 35, cb + 25); ctx.lineTo(cx + 35, cb + 65);
    ctx.moveTo(cx + 15, cb + 45); ctx.lineTo(cx + 55, cb + 45);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 30, cb + 110);
    ctx.bezierCurveTo(cx - 40, cy + 180, cx + 20, cy + 200, cx - 50, h);
    ctx.moveTo(cx + 5, cb + 110);
    ctx.bezierCurveTo(cx - 5, cy + 180, cx + 55, cy + 200, cx + 15, h);
    ctx.stroke();

    drawFluffyCloud(ctx, cx - 170, cy - 180, 30);
    drawFluffyCloud(ctx, cx + 170, cy - 180, 30);

  } else if (type === "mountain") {
    // Mountain Landscape
    strokeCircle(ctx, cx, cy - 130, 45);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 58, cy - 130 + Math.sin(a) * 58);
      ctx.lineTo(cx + Math.cos(a) * 75, cy - 130 + Math.sin(a) * 75);
      ctx.stroke();
    }

    const drawMtn = (mx, my, mw, mh) => {
      ctx.beginPath();
      ctx.moveTo(mx - mw / 2, my);
      ctx.lineTo(mx, my - mh);
      ctx.lineTo(mx + mw / 2, my);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mx, my - mh);
      ctx.lineTo(mx - mw * 0.08, my - mh * 0.65);
      ctx.lineTo(mx - mw * 0.03, my - mh * 0.6);
      ctx.lineTo(mx, my - mh * 0.68);
      ctx.lineTo(mx + mw * 0.03, my - mh * 0.6);
      ctx.lineTo(mx + mw * 0.08, my - mh * 0.65);
      ctx.closePath();
      ctx.stroke();
    };

    drawMtn(cx - 130, cy + 50, 280, 190);
    drawMtn(cx + 130, cy + 50, 290, 210);
    drawMtn(cx, cy + 50, 340, 240);

    ctx.beginPath();
    ctx.moveTo(0, cy + 50);
    ctx.lineTo(w, cy + 50);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 15, cy + 50);
    ctx.bezierCurveTo(cx - 25, cy + 100, cx + 45, cy + 170, cx - 70, h);
    ctx.moveTo(cx + 15, cy + 50);
    ctx.bezierCurveTo(cx, cy + 100, cx + 85, cy + 170, cx + 35, h);
    ctx.stroke();

    drawPineTree(ctx, cx - 220, cy + 100, 50, 70);
    drawPineTree(ctx, cx + 220, cy + 100, 50, 70);
    drawFluffyCloud(ctx, cx - 180, cy - 190, 28);
    drawFluffyCloud(ctx, cx + 180, cy - 190, 28);

  } else if (type === "butterfly") {
    // Butterfly Garden
    const by = cy - 40;
    ctx.save();
    ctx.translate(cx, by);

    strokeEllipse(ctx, 0, 0, 9, 40);
    strokeCircle(ctx, 0, -50, 9);
    ctx.beginPath();
    ctx.moveTo(-3, -56); ctx.quadraticCurveTo(-12, -85, -28, -75);
    ctx.moveTo(3, -56); ctx.quadraticCurveTo(12, -85, 28, -75);
    ctx.stroke();
    strokeCircle(ctx, -28, -75, 2.5);
    strokeCircle(ctx, 28, -75, 2.5);

    for (let side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);

      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.bezierCurveTo(80, -95, 170, -60, 140, 8);
      ctx.bezierCurveTo(110, 35, 35, 18, 0, 0);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(22, -12);
      ctx.bezierCurveTo(70, -65, 130, -42, 115, 0);
      ctx.bezierCurveTo(100, 18, 40, 12, 22, -12);
      ctx.closePath();
      ctx.stroke();

      strokeCircle(ctx, 65, -22, 10);
      strokeCircle(ctx, 95, -12, 7);

      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(90, 25, 105, 115, 35, 95);
      ctx.bezierCurveTo(0, 82, 0, 30, 0, 5);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(12, 22);
      ctx.bezierCurveTo(60, 35, 70, 82, 35, 75);
      ctx.bezierCurveTo(18, 65, 12, 40, 12, 22);
      ctx.closePath();
      ctx.stroke();
      strokeCircle(ctx, 38, 52, 7);

      ctx.restore();
    }
    ctx.restore();

    const flowers = [
      { x: cx - 160, y: cy + 200, r: 22 },
      { x: cx + 160, y: cy + 200, r: 22 },
      { x: cx, y: cy + 210, r: 26 }
    ];
    flowers.forEach((f) => {
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x, h);
      ctx.stroke();
      strokeCircle(ctx, f.x, f.y, f.r);
      for (let i = 0; i < 8; i++) {
        drawFlowerPetal(ctx, f.x, f.y, (i * Math.PI * 2) / 8, f.r, f.r * 1.7, 10);
      }
    });

  } else {
    // Koi Pond
    for (let rot of [0, Math.PI]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      ctx.beginPath();
      ctx.moveTo(0, -125);
      ctx.bezierCurveTo(-48, -80, -40, 35, 0, 90);
      ctx.bezierCurveTo(40, 35, 48, -80, 0, -125);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -80, 37, Math.PI, 0, true);
      ctx.stroke();

      strokeCircle(ctx, -18, -90, 4);
      strokeCircle(ctx, 18, -90, 4);

      ctx.beginPath();
      ctx.moveTo(-30, -55);
      ctx.bezierCurveTo(-80, -55, -85, 0, -25, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-45, -45); ctx.lineTo(-25, -22);
      ctx.moveTo(-62, -35); ctx.lineTo(-25, -13);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(30, -55);
      ctx.bezierCurveTo(80, -55, 85, 0, 25, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(45, -45); ctx.lineTo(25, -22);
      ctx.moveTo(62, -35); ctx.lineTo(25, -13);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 90);
      ctx.bezierCurveTo(-35, 115, -45, 170, -12, 165);
      ctx.bezierCurveTo(-2, 142, 0, 135, 0, 100);
      ctx.bezierCurveTo(0, 135, 2, 142, 12, 165);
      ctx.bezierCurveTo(45, 170, 35, 115, 0, 90);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.quadraticCurveTo(-8, 0, 0, 55);
      ctx.stroke();

      for (let sy = -35; sy <= 50; sy += 22) {
        ctx.beginPath();
        ctx.arc(0, sy, 30, 0.4, Math.PI - 0.4, false);
        ctx.stroke();
      }
      ctx.restore();
    }

    strokeEllipse(ctx, cx, cy, 235, 235);
    strokeEllipse(ctx, cx, cy, 310, 310);

    const drawPad = (px, py, r, rot) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0.4, Math.PI * 2 - 0.4);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.stroke();
      for (let a = 0; a < Math.PI * 2 - 0.5; a += Math.PI / 3) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.restore();
    };

    drawPad(cx - 210, cy - 180, 65, -0.8);
    drawPad(cx + 220, cy + 180, 58, 1.4);

    const lx = cx - 190;
    const ly = cy + 180;
    ctx.save();
    ctx.translate(lx, ly);
    const petalsLayer = [
      { count: 8, r1: 20, r2: 42, rot: 0 },
      { count: 6, r1: 12, r2: 30, rot: 0.3 }
    ];
    petalsLayer.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const a = (i * Math.PI * 2) / layer.count + layer.rot;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, -layer.r1);
        ctx.quadraticCurveTo(-10, -layer.r1 - 4, 0, -layer.r2);
        ctx.quadraticCurveTo(10, -layer.r1 - 4, 0, -layer.r1);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    });
    strokeCircle(ctx, 0, 0, 8);
    ctx.restore();
  }
}

function drawAnimals(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "kitten") {
    // Sleepy Kitten curled up in a wicker basket
    // Wicker basket outline
    strokeEllipse(ctx, cx, cy + 60, 160, 70);
    strokeEllipse(ctx, cx, cy + 60, 140, 55);
    // Wicker weave lines
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      if (sin > -0.2) {
        ctx.beginPath();
        ctx.moveTo(cx + cos * 140, cy + 60 + sin * 55);
        ctx.lineTo(cx + cos * 160, cy + 60 + sin * 70);
        ctx.stroke();
      }
    }

    // Curled up kitten
    ctx.save();
    ctx.translate(cx, cy + 10);
    // Kitten body
    ctx.beginPath();
    ctx.ellipse(-15, 10, 65, 45, 0.2, 0, Math.PI * 2);
    ctx.stroke();
    // Kitten head
    strokeCircle(ctx, 35, -15, 38);
    // Ears
    ctx.beginPath();
    ctx.moveTo(10, -40); ctx.quadraticCurveTo(20, -75, 32, -50);
    ctx.moveTo(20, -45); ctx.quadraticCurveTo(22, -65, 28, -48); // inner ear
    ctx.moveTo(48, -48); ctx.quadraticCurveTo(62, -72, 65, -36);
    ctx.moveTo(52, -42); ctx.quadraticCurveTo(58, -60, 60, -38); // inner ear
    ctx.stroke();
    // Sleepy eyes
    ctx.beginPath();
    ctx.arc(22, -15, 6, 0, Math.PI, false);
    ctx.moveTo(48, -15);
    ctx.arc(48, -15, 6, 0, Math.PI, false);
    ctx.stroke();
    // Nose and mouth
    ctx.beginPath();
    ctx.moveTo(35, -10); ctx.lineTo(32, -6); ctx.lineTo(38, -6); ctx.closePath();
    ctx.moveTo(35, -6); ctx.quadraticCurveTo(31, -2, 28, -4);
    ctx.moveTo(35, -6); ctx.quadraticCurveTo(39, -2, 42, -4);
    ctx.stroke();
    // Whiskers
    ctx.beginPath();
    ctx.moveTo(15, -6); ctx.lineTo(-10, -8);
    ctx.moveTo(15, -3); ctx.lineTo(-12, -2);
    ctx.moveTo(55, -6); ctx.lineTo(80, -8);
    ctx.moveTo(55, -3); ctx.lineTo(82, -2);
    ctx.stroke();
    // Tail wrapping around
    ctx.beginPath();
    ctx.moveTo(-65, 25);
    ctx.bezierCurveTo(-110, 10, -90, -45, -45, -35);
    ctx.bezierCurveTo(-30, -30, -50, -10, -65, 0);
    ctx.stroke();
    // Paws tucked
    ctx.beginPath();
    ctx.ellipse(15, 30, 16, 12, 0.4, 0, Math.PI * 2);
    ctx.ellipse(-15, 35, 18, 12, -0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

  } else if (type === "dog") {
    // Regal sitting Golden Retriever
    ctx.save();
    ctx.translate(cx, cy - 20);

    // Head
    strokeCircle(ctx, 0, -80, 42);
    // Muzzle/Snout
    ctx.beginPath();
    ctx.ellipse(0, -62, 24, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Nose
    ctx.beginPath();
    ctx.moveTo(-10, -70); ctx.lineTo(10, -70);
    ctx.bezierCurveTo(8, -58, -8, -58, -10, -70);
    ctx.closePath();
    ctx.stroke();
    // Mouth
    ctx.beginPath();
    ctx.moveTo(0, -62); ctx.lineTo(0, -52);
    ctx.quadraticCurveTo(-8, -48, -15, -54);
    ctx.moveTo(0, -52); ctx.quadraticCurveTo(8, -48, 15, -54);
    ctx.stroke();
    // Floppy ears
    ctx.beginPath();
    ctx.moveTo(-35, -90); ctx.bezierCurveTo(-75, -60, -65, -10, -30, -42);
    ctx.moveTo(35, -90); ctx.bezierCurveTo(75, -60, 75, -10, 30, -42);
    ctx.stroke();
    // Eyes
    strokeCircle(ctx, -16, -82, 5);
    strokeCircle(ctx, 16, -82, 5);
    strokeCircle(ctx, -15, -83, 1.5); // highlight
    strokeCircle(ctx, 17, -83, 1.5); // highlight

    // Fluffy chest and front legs
    ctx.beginPath();
    ctx.moveTo(-30, -40);
    ctx.bezierCurveTo(-50, 20, -55, 110, -45, 170);
    ctx.lineTo(-15, 170);
    ctx.lineTo(-20, 20);
    ctx.lineTo(20, 20);
    ctx.lineTo(15, 170);
    ctx.lineTo(45, 170);
    ctx.bezierCurveTo(55, 110, 50, 20, 30, -40);
    ctx.stroke();

    // Paws
    strokeEllipse(ctx, -30, 170, 16, 10);
    strokeEllipse(ctx, 30, 170, 16, 10);

    // Fluffy chest ruff detail
    for (let h = -20; h < 60; h += 25) {
      ctx.beginPath();
      ctx.moveTo(-15, h); ctx.quadraticCurveTo(0, h + 15, 15, h);
      ctx.stroke();
    }

    // Back legs (sitting)
    ctx.beginPath();
    ctx.moveTo(-46, 70);
    ctx.bezierCurveTo(-90, 90, -85, 170, -55, 170);
    ctx.lineTo(-45, 170);
    ctx.stroke();
    strokeEllipse(ctx, -62, 170, 14, 9);

    ctx.beginPath();
    ctx.moveTo(46, 70);
    ctx.bezierCurveTo(90, 90, 85, 170, 55, 170);
    ctx.lineTo(45, 170);
    ctx.stroke();
    strokeEllipse(ctx, 62, 170, 14, 9);

    // Wagging tail
    ctx.beginPath();
    ctx.moveTo(70, 130);
    ctx.bezierCurveTo(120, 130, 135, 70, 110, 50);
    ctx.bezierCurveTo(95, 38, 100, 90, 72, 115);
    ctx.stroke();

    ctx.restore();

  } else if (type === "panda") {
    // Panda sitting amidst detailed bamboo shoots
    // Background bamboo shoots
    const shoots = [-170, -130, 130, 170];
    shoots.forEach((bx) => {
      ctx.beginPath();
      ctx.moveTo(cx + bx, 0);
      ctx.lineTo(cx + bx, h);
      ctx.stroke();
      // segments
      for (let y = 40; y < h; y += 80) {
        ctx.beginPath();
        ctx.moveTo(cx + bx - 12, y);
        ctx.lineTo(cx + bx + 12, y);
        ctx.stroke();
        // bamboo leaves
        drawLeaf(ctx, cx + bx, y, bx < 0 ? -0.8 : 0.8, 45, 16, false);
      }
    });

    // Panda
    ctx.save();
    ctx.translate(cx, cy + 10);
    // Round body
    strokeCircle(ctx, 0, 40, 95);
    // Round face
    strokeCircle(ctx, 0, -50, 68);

    // Ears
    strokeCircle(ctx, -55, -110, 22);
    strokeCircle(ctx, 55, -110, 22);
    // Inner ears
    strokeCircle(ctx, -55, -110, 12);
    strokeCircle(ctx, 55, -110, 12);

    // Face details
    // Eye patches
    strokeEllipse(ctx, -24, -54, 18, 25, 0.3);
    strokeEllipse(ctx, 24, -54, 18, 25, -0.3);
    // Eyes
    strokeCircle(ctx, -22, -55, 5);
    strokeCircle(ctx, 22, -55, 5);
    // Nose
    ctx.beginPath();
    ctx.moveTo(-10, -32); ctx.lineTo(10, -32);
    ctx.bezierCurveTo(8, -24, -8, -24, -10, -32);
    ctx.closePath();
    ctx.stroke();
    // Mouth
    ctx.beginPath();
    ctx.moveTo(0, -25); ctx.quadraticCurveTo(-6, -20, -12, -24);
    ctx.moveTo(0, -25); ctx.quadraticCurveTo(6, -20, 12, -24);
    ctx.stroke();

    // Arms holding a bamboo twig
    // Left arm
    ctx.beginPath();
    ctx.ellipse(-50, 10, 22, 45, -0.6, 0, Math.PI * 2);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.ellipse(50, 10, 22, 45, 0.6, 0, Math.PI * 2);
    ctx.stroke();

    // Twig in paws
    ctx.beginPath();
    ctx.moveTo(-60, -5); ctx.lineTo(60, 10);
    ctx.stroke();
    drawLeaf(ctx, 20, 5, 0.9, 30, 12, false);
    drawLeaf(ctx, -20, 0, -0.9, 30, 12, false);

    // Legs
    strokeCircle(ctx, -52, 105, 34);
    strokeCircle(ctx, 52, 105, 34);
    // Foot pads
    strokeEllipse(ctx, -52, 105, 20, 24);
    strokeEllipse(ctx, 52, 105, 20, 24);
    // Small pads
    for (let i = 0; i < 3; i++) {
      strokeCircle(ctx, -68 + i * 16, 75, 5);
      strokeCircle(ctx, 36 + i * 16, 75, 5);
    }

    ctx.restore();

  } else if (type === "owl") {
    // Owl perched on a branch
    // Detailed textured branch
    ctx.beginPath();
    ctx.moveTo(0, cy + 120);
    ctx.bezierCurveTo(w * 0.3, cy + 90, w * 0.7, cy + 140, w, cy + 100);
    ctx.lineTo(w, cy + 125);
    ctx.bezierCurveTo(w * 0.7, cy + 160, w * 0.3, cy + 115, 0, cy + 145);
    ctx.closePath();
    ctx.stroke();

    // Leaves on branch
    drawLeaf(ctx, cx - 140, cy + 115, -1.8, 38, 18);
    drawLeaf(ctx, cx + 160, cy + 125, 1.2, 38, 18);

    // Owl
    ctx.save();
    ctx.translate(cx, cy - 10);

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 30, 75, 100, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Horns / Ears
    ctx.beginPath();
    ctx.moveTo(-60, -55); ctx.lineTo(-70, -100); ctx.lineTo(-25, -70);
    ctx.moveTo(60, -55); ctx.lineTo(70, -100); ctx.lineTo(25, -70);
    ctx.stroke();

    // Large eyes with concentric circles
    strokeCircle(ctx, -32, -35, 30);
    strokeCircle(ctx, 32, -35, 30);
    strokeCircle(ctx, -32, -35, 20);
    strokeCircle(ctx, 32, -35, 20);
    strokeCircle(ctx, -32, -35, 8);
    strokeCircle(ctx, 32, -35, 8);

    // Beak
    ctx.beginPath();
    ctx.moveTo(-8, -15); ctx.lineTo(0, 5); ctx.lineTo(8, -15);
    ctx.closePath();
    ctx.stroke();

    // Wings
    ctx.beginPath();
    ctx.ellipse(-70, 40, 22, 75, 0.2, 0, Math.PI * 2);
    ctx.ellipse(70, 40, 22, 75, -0.2, 0, Math.PI * 2);
    ctx.stroke();

    // Concentric chest feathers scale pattern
    for (let row = 0; row < 4; row++) {
      const count = 4 - row;
      const y = 15 + row * 22;
      const startX = -((count - 1) * 16) / 2;
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * 16, y, 10, 0, Math.PI, false);
        ctx.stroke();
      }
    }

    // Claws clutching branch
    strokeEllipse(ctx, -25, 125, 7, 14);
    strokeEllipse(ctx, -13, 126, 7, 14);
    strokeEllipse(ctx, 13, 126, 7, 14);
    strokeEllipse(ctx, 25, 125, 7, 14);

    ctx.restore();

  } else if (type === "fox") {
    // Detailed proud sitting Fox
    ctx.save();
    ctx.translate(cx, cy - 20);

    // Head
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.bezierCurveTo(-75, -75, -70, -25, -5, -12);
    ctx.bezierCurveTo(-3, -11, 3, -11, 5, -12);
    ctx.bezierCurveTo(70, -25, 75, -75, 0, -30);
    ctx.closePath();
    ctx.stroke();

    // Nose
    strokeCircle(ctx, 0, -15, 6);

    // Inner cheek fluff patterns
    ctx.beginPath();
    ctx.moveTo(-45, -50); ctx.quadraticCurveTo(-25, -40, 0, -25);
    ctx.moveTo(45, -50); ctx.quadraticCurveTo(25, -40, 0, -25);
    ctx.stroke();

    // Sleepy elegant eyes
    ctx.beginPath();
    ctx.arc(-22, -40, 10, 0.2, Math.PI - 0.2);
    ctx.moveTo(22, -40);
    ctx.arc(22, -40, 10, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Large ears
    ctx.beginPath();
    ctx.moveTo(-42, -62); ctx.lineTo(-58, -120); ctx.lineTo(-12, -75);
    ctx.moveTo(42, -62); ctx.lineTo(58, -120); ctx.lineTo(12, -75);
    ctx.stroke();
    // Inner ears
    ctx.beginPath();
    ctx.moveTo(-36, -68); ctx.lineTo(-48, -108); ctx.lineTo(-18, -76);
    ctx.moveTo(36, -68); ctx.lineTo(48, -108); ctx.lineTo(18, -76);
    ctx.stroke();

    // Sitting body
    ctx.beginPath();
    ctx.moveTo(-25, -12);
    ctx.bezierCurveTo(-45, 30, -55, 130, -45, 175);
    ctx.lineTo(-15, 175);
    ctx.bezierCurveTo(-15, 80, -22, 20, 0, 10);
    ctx.bezierCurveTo(22, 20, 15, 80, 15, 175);
    ctx.lineTo(45, 175);
    ctx.bezierCurveTo(55, 130, 45, 30, 25, -12);
    ctx.stroke();

    // Paws
    strokeEllipse(ctx, -30, 175, 12, 8);
    strokeEllipse(ctx, 30, 175, 12, 8);

    // Large Bushy tail wrapping around
    ctx.beginPath();
    ctx.moveTo(38, 110);
    ctx.bezierCurveTo(95, 110, 115, 30, 65, 10);
    ctx.bezierCurveTo(50, 0, 40, 50, 32, 135);
    ctx.stroke();

    // Tail white tip outline
    ctx.beginPath();
    ctx.moveTo(85, 35);
    ctx.quadraticCurveTo(68, 25, 54, 38);
    ctx.stroke();

    ctx.restore();

  } else if (type === "dolphin") {
    // Dolphin jumping out of water with splash & sun
    // Distant sunset circle
    strokeCircle(ctx, cx, cy - 20, 130);

    // Waves at bottom
    ctx.beginPath();
    for (let x = 40; x <= w - 40; x += 60) {
      ctx.moveTo(x, cy + 120);
      ctx.bezierCurveTo(x + 15, cy + 85, x + 45, cy + 85, x + 60, cy + 120);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let x = 10; x <= w - 10; x += 60) {
      ctx.moveTo(x, cy + 150);
      ctx.bezierCurveTo(x + 15, cy + 115, x + 45, cy + 115, x + 60, cy + 150);
    }
    ctx.stroke();

    // Dolphin
    ctx.save();
    ctx.translate(cx, cy - 10);
    ctx.rotate(-0.35);

    // Sleek body
    ctx.beginPath();
    ctx.moveTo(-160, 40); // tail tip
    ctx.bezierCurveTo(-110, -35, -40, -75, 80, -45); // top curve
    ctx.bezierCurveTo(115, -35, 150, -10, 140, 10); // snout top
    ctx.bezierCurveTo(110, 5, 80, 5, 50, 15); // snout bottom
    ctx.bezierCurveTo(-10, 35, -70, 75, -160, 40); // bottom curve
    ctx.closePath();
    ctx.stroke();

    // Fin on top
    ctx.beginPath();
    ctx.moveTo(-10, -62);
    ctx.quadraticCurveTo(10, -110, 35, -105);
    ctx.quadraticCurveTo(20, -72, 18, -58);
    ctx.stroke();

    // Flippers
    ctx.beginPath();
    ctx.moveTo(35, 0);
    ctx.quadraticCurveTo(55, 45, 45, 55);
    ctx.quadraticCurveTo(30, 35, 25, 10);
    ctx.stroke();

    // Tail fluke
    ctx.beginPath();
    ctx.moveTo(-150, 42);
    ctx.bezierCurveTo(-195, 75, -200, 25, -178, 12);
    ctx.bezierCurveTo(-165, 5, -160, 25, -150, 42);
    ctx.stroke();

    // Belly color separation line (coloring region)
    ctx.beginPath();
    ctx.moveTo(-140, 38);
    ctx.quadraticCurveTo(-50, 15, 60, 0);
    ctx.stroke();

    // Eye
    strokeCircle(ctx, 92, -26, 4);

    ctx.restore();

    // Splash drops
    strokeEllipse(ctx, cx - 110, cy + 95, 6, 12, -0.4);
    strokeEllipse(ctx, cx + 115, cy + 85, 6, 12, 0.4);

  } else if (type === "peacock") {
    // Peacock tail feathers fan
    ctx.save();
    ctx.translate(cx, cy + 110);

    // Giant fan of 15 tail feathers
    const fCount = 15;
    for (let i = 0; i < fCount; i++) {
      const a = (i * Math.PI) / (fCount - 1) - Math.PI;
      const rStem = 190;
      const fx = Math.cos(a) * rStem;
      const fy = Math.sin(a) * rStem;

      // Stem
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.lineTo(fx, fy);
      ctx.stroke();

      // Big feather eye
      strokeEllipse(ctx, fx, fy, 22, 32, a + Math.PI / 2);
      strokeEllipse(ctx, fx, fy, 12, 18, a + Math.PI / 2);
      strokeCircle(ctx, fx - Math.cos(a) * 4, fy - Math.sin(a) * 4, 5);
    }

    // Peacock Body
    ctx.beginPath();
    ctx.ellipse(0, -35, 28, 55, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Long elegant neck
    ctx.beginPath();
    ctx.moveTo(-15, -75);
    ctx.bezierCurveTo(-22, -130, 8, -140, -5, -170);
    ctx.lineTo(12, -170);
    ctx.bezierCurveTo(24, -130, 15, -75, 15, -75);
    ctx.stroke();

    // Head
    strokeCircle(ctx, 3, -178, 14);
    // Beak
    ctx.beginPath();
    ctx.moveTo(12, -182); ctx.lineTo(28, -176); ctx.lineTo(10, -170);
    ctx.stroke();
    // Eye
    strokeCircle(ctx, 2, -180, 2.5);

    // Head crest feathers
    for (let k = -4; k <= 4; k += 4) {
      const ka = -Math.PI / 2 + k * 0.15;
      ctx.beginPath();
      ctx.moveTo(3, -192);
      ctx.lineTo(3 + Math.cos(ka) * 22, -192 + Math.sin(ka) * 22);
      ctx.stroke();
      strokeCircle(ctx, 3 + Math.cos(ka) * 24, -192 + Math.sin(ka) * 24, 3.5);
    }

    ctx.restore();

  } else if (type === "elephant") {
    // Baby Elephant sitting
    ctx.save();
    ctx.translate(cx, cy - 20);

    // Giant round body
    strokeCircle(ctx, 0, 65, 85);

    // Head
    strokeCircle(ctx, 0, -30, 52);

    // Huge floppy ears
    ctx.beginPath();
    ctx.ellipse(-70, -25, 45, 58, 0.2, 0, Math.PI * 2);
    ctx.ellipse(70, -25, 45, 58, -0.2, 0, Math.PI * 2);
    ctx.stroke();
    // Inner ear lines
    ctx.beginPath();
    ctx.ellipse(-65, -25, 30, 42, 0.2, 0, Math.PI * 2);
    ctx.ellipse(65, -25, 30, 42, -0.2, 0, Math.PI * 2);
    ctx.stroke();

    // Trunk curving upward playfully
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.bezierCurveTo(-15, 65, 65, 60, 48, -5);
    ctx.bezierCurveTo(40, -20, 25, -2, 22, 12);
    ctx.bezierCurveTo(15, 40, -1, 38, 10, -12);
    ctx.stroke();
    // Trunk wrinkles
    ctx.beginPath();
    ctx.moveTo(-2, 10); ctx.lineTo(8, 12);
    ctx.moveTo(-4, 25); ctx.lineTo(6, 28);
    ctx.stroke();

    // Gentle eyes
    strokeCircle(ctx, -22, -35, 6);
    strokeCircle(ctx, 22, -35, 6);
    strokeCircle(ctx, -21, -36, 2);
    strokeCircle(ctx, 23, -36, 2);

    // Sitting legs with round toenails
    // Front legs
    ctx.beginPath();
    ctx.rect(-45, 75, 26, 75);
    ctx.rect(19, 75, 26, 75);
    ctx.stroke();
    // Toenails
    for (let i = 0; i < 3; i++) {
      strokeCircle(ctx, -41 + i * 9, 148, 4);
      strokeCircle(ctx, 23 + i * 9, 148, 4);
    }

    // Back feet sitting flat
    strokeEllipse(ctx, -75, 138, 26, 16);
    strokeEllipse(ctx, 75, 138, 26, 16);
    for (let i = 0; i < 3; i++) {
      strokeCircle(ctx, -83 + i * 8, 148, 3.5);
      strokeCircle(ctx, 67 + i * 8, 148, 3.5);
    }

    ctx.restore();

  } else if (type === "horse") {
    // Elegant galloping Horse
    ctx.save();
    ctx.translate(cx, cy - 10);

    // Horse neck & head
    ctx.beginPath();
    ctx.moveTo(-60, -90);
    ctx.bezierCurveTo(-25, -120, -15, -135, 20, -115); // forehead
    ctx.bezierCurveTo(45, -100, 75, -55, 65, -40); // muzzle
    ctx.bezierCurveTo(45, -30, 20, -60, 5, -55); // chin
    ctx.bezierCurveTo(-15, -50, -25, 45, -75, 55); // chest
    ctx.stroke();

    // Eye
    strokeCircle(ctx, 16, -88, 5);
    // Nostril
    strokeCircle(ctx, 52, -54, 3);

    // Torso body
    ctx.beginPath();
    ctx.moveTo(-75, 55);
    ctx.bezierCurveTo(-100, 55, -210, 40, -195, -25);
    ctx.bezierCurveTo(-160, -85, -100, -70, -60, -90);
    ctx.stroke();

    // Galloping legs
    // Front Leg 1
    ctx.beginPath();
    ctx.moveTo(-70, 50);
    ctx.quadraticCurveTo(-40, 95, -20, 115);
    ctx.lineTo(-5, 110);
    ctx.quadraticCurveTo(-25, 80, -50, 40);
    ctx.stroke();
    // hoof
    ctx.beginPath();
    ctx.rect(-20, 113, 15, 10);
    ctx.stroke();

    // Back Leg 1
    ctx.beginPath();
    ctx.moveTo(-190, -10);
    ctx.quadraticCurveTo(-215, 65, -195, 105);
    ctx.lineTo(-180, 100);
    ctx.quadraticCurveTo(-195, 60, -170, -15);
    ctx.stroke();
    // hoof
    ctx.beginPath();
    ctx.rect(-195, 103, 15, 10);
    ctx.stroke();

    // Flowing Mane (very colorable)
    for (let i = 0; i < 5; i++) {
      const y = -110 + i * 20;
      ctx.beginPath();
      ctx.moveTo(-35, y);
      ctx.bezierCurveTo(-95, y + 10, -105, y - 40, -45, y - 25);
      ctx.stroke();
    }

    // Elegant flowing tail
    ctx.beginPath();
    ctx.moveTo(-195, -25);
    ctx.bezierCurveTo(-275, -50, -260, 30, -225, 55);
    ctx.bezierCurveTo(-210, 65, -225, 0, -195, -12);
    ctx.stroke();

    ctx.restore();

  } else {
    // Wolf howling atop a cliff under a huge full moon
    // Massive full moon with crater rings
    strokeCircle(ctx, cx, cy - 30, 150);
    strokeCircle(ctx, cx - 60, cy - 90, 20);
    strokeCircle(ctx, cx + 55, cy - 10, 32);
    strokeCircle(ctx, cx + 35, cy - 25, 18);

    // Rocky cliff bottom
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(cx - 150, cy + 120);
    ctx.lineTo(cx - 40, cy + 110);
    ctx.lineTo(cx + 45, cy + 150);
    ctx.lineTo(w, cy + 115);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.stroke();

    // Wolf silhouette detailed with fur tufts
    ctx.save();
    ctx.translate(cx - 45, cy + 40);

    ctx.beginPath();
    // Howling head pointing straight up
    ctx.moveTo(-25, 20);
    ctx.bezierCurveTo(-40, -10, -22, -45, -12, -75); // snout bottom
    ctx.lineTo(-10, -110); // nose tip pointing skyward
    ctx.lineTo(5, -92); // jaw top
    ctx.bezierCurveTo(22, -72, 38, -55, 30, -35); // neck back
    ctx.lineTo(38, -55); // ear base
    ctx.lineTo(44, -78); ctx.lineTo(24, -50); // ear
    ctx.bezierCurveTo(45, 0, 75, 45, 60, 75); // back
    ctx.lineTo(-10, 75); // ground connect
    ctx.bezierCurveTo(-22, 60, -12, 45, -25, 20); // chest fluffy fur
    ctx.closePath();
    ctx.stroke();

    // Fur tuft details
    ctx.beginPath();
    ctx.moveTo(-20, 5); ctx.lineTo(-12, 12);
    ctx.moveTo(-18, 25); ctx.lineTo(-10, 32);
    ctx.stroke();

    ctx.restore();
  }
}

function drawFantasy(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "castle") {
    // Fantasy Castle
    // Ground
    ctx.beginPath();
    ctx.moveTo(0, cy + 120);
    ctx.bezierCurveTo(w * 0.3, cy + 90, w * 0.7, cy + 140, w, cy + 120);
    ctx.stroke();

    // Central keep
    ctx.strokeRect(cx - 50, cy - 50, 100, 170);
    // Left tower
    ctx.strokeRect(cx - 110, cy - 10, 45, 130);
    // Right tower
    ctx.strokeRect(cx + 65, cy - 10, 45, 130);

    // Brick texture lines (enclosed details)
    const drawBricks = (bx, by, bw, bh) => {
      for (let y = by + 20; y < by + bh; y += 35) {
        ctx.beginPath();
        ctx.moveTo(bx, y); ctx.lineTo(bx + bw, y);
        ctx.stroke();
      }
    };
    drawBricks(cx - 50, cy - 50, 100, 170);
    drawBricks(cx - 110, cy - 10, 45, 130);
    drawBricks(cx + 65, cy - 10, 45, 130);

    // Roof Cones
    // Central roof
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 50); ctx.lineTo(cx, cy - 120); ctx.lineTo(cx + 60, cy - 50);
    ctx.closePath();
    ctx.stroke();
    // Left roof
    ctx.beginPath();
    ctx.moveTo(cx - 118, cy - 10); ctx.lineTo(cx - 87, cy - 70); ctx.lineTo(cx - 57, cy - 10);
    ctx.closePath();
    ctx.stroke();
    // Right roof
    ctx.beginPath();
    ctx.moveTo(cx + 57, cy - 10); ctx.lineTo(cx + 87, cy - 70); ctx.lineTo(cx + 118, cy - 10);
    ctx.closePath();
    ctx.stroke();

    // Flags
    const drawFlag = (fx, fy) => {
      ctx.beginPath();
      ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 25);
      ctx.lineTo(fx + 22, fy - 17); ctx.lineTo(fx, fy - 9);
      ctx.stroke();
    };
    drawFlag(cx, cy - 120);
    drawFlag(cx - 87, cy - 70);
    drawFlag(cx + 87, cy - 70);

    // Large Arched Doorway
    ctx.beginPath();
    ctx.arc(cx, cy + 120, 25, Math.PI, 0, false);
    ctx.lineTo(cx + 25, cy + 120);
    ctx.lineTo(cx - 25, cy + 120);
    ctx.stroke();
    // Door division line
    ctx.beginPath();
    ctx.moveTo(cx, cy + 95); ctx.lineTo(cx, cy + 120);
    ctx.stroke();

    // Arched Windows
    const drawWin = (wx, wy) => {
      ctx.beginPath();
      ctx.arc(wx, wy, 10, Math.PI, 0, false);
      ctx.lineTo(wx + 10, wy + 20); ctx.lineTo(wx - 10, wy + 20);
      ctx.closePath();
      ctx.stroke();
    };
    drawWin(cx, cy - 15);
    drawWin(cx - 87, cy + 30);
    drawWin(cx + 87, cy + 30);

    // Floating fluffy clouds
    drawFluffyCloud(ctx, cx - 180, cy - 150, 32);
    drawFluffyCloud(ctx, cx + 180, cy - 150, 32);

  } else if (type === "dragon") {
    // Beautiful coiled Dragon
    ctx.save();
    ctx.translate(cx, cy - 10);

    // Large wings with rib lines
    for (let side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);

      ctx.beginPath();
      ctx.moveTo(5, -40);
      ctx.bezierCurveTo(80, -115, 150, -115, 175, -50);
      ctx.bezierCurveTo(150, -25, 110, -35, 95, -10);
      ctx.bezierCurveTo(80, -25, 50, -20, 35, 0);
      ctx.bezierCurveTo(20, -15, 5, -10, 5, -40);
      ctx.closePath();
      ctx.stroke();

      // Wing ribs
      ctx.beginPath();
      ctx.moveTo(40, -68); ctx.quadraticCurveTo(80, -95, 175, -50);
      ctx.moveTo(40, -68); ctx.quadraticCurveTo(75, -60, 95, -10);
      ctx.moveTo(40, -68); ctx.quadraticCurveTo(45, -35, 35, 0);
      ctx.stroke();

      ctx.restore();
    }

    // Coiled Tail/Body
    ctx.beginPath();
    ctx.arc(0, 50, 70, 0, Math.PI, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 50, 48, 0.1, Math.PI - 0.1, false);
    ctx.stroke();

    // Arrow tip tail
    ctx.beginPath();
    ctx.moveTo(70, 50);
    ctx.lineTo(105, 50);
    ctx.lineTo(82, 90);
    ctx.closePath();
    ctx.stroke();

    // Dragon chest & neck
    ctx.beginPath();
    ctx.moveTo(-15, 35);
    ctx.bezierCurveTo(-45, 10, -42, -50, -22, -80);
    ctx.moveTo(10, 35);
    ctx.bezierCurveTo(-15, 15, -15, -45, 0, -74);
    ctx.stroke();

    // Dragon head
    ctx.beginPath();
    ctx.moveTo(-22, -80);
    ctx.bezierCurveTo(-50, -95, -65, -85, -80, -95); // snout top
    ctx.lineTo(-85, -82); // jaw front
    ctx.bezierCurveTo(-65, -78, -35, -70, 0, -74);
    ctx.stroke();

    // Horns
    ctx.beginPath();
    ctx.moveTo(-18, -84); ctx.quadraticCurveTo(-10, -125, 10, -120);
    ctx.quadraticCurveTo(-5, -100, -11, -81);
    ctx.stroke();

    // Scales on underbelly (colorable stripes)
    for (let i = 0; i < 4; i++) {
      const y = -45 + i * 18;
      ctx.beginPath();
      ctx.moveTo(-33 + i * 2, y); ctx.quadraticCurveTo(-22, y + 8, -9 + i * 2, y + 2);
      ctx.stroke();
    }

    // Eye & nostril
    strokeCircle(ctx, -42, -86, 3.5);
    strokeCircle(ctx, -75, -91, 1.5);

    // Swirl of fire from snout
    ctx.beginPath();
    ctx.moveTo(-82, -88);
    ctx.bezierCurveTo(-145, -95, -125, -50, -165, -60);
    ctx.bezierCurveTo(-125, -35, -110, -75, -82, -82);
    ctx.stroke();

    ctx.restore();

  } else if (type === "unicorn") {
    // Majestic Unicorn Profile
    ctx.save();
    ctx.translate(cx, cy - 20);

    // Elegant head
    ctx.beginPath();
    ctx.moveTo(-85, -55);
    ctx.bezierCurveTo(-65, -65, -55, -80, -15, -80); // forehead
    ctx.bezierCurveTo(15, -80, 50, -42, 40, -15); // muzzle
    ctx.bezierCurveTo(22, -2, -10, -42, -22, -35); // chin
    ctx.bezierCurveTo(-35, -28, -42, 60, -90, 80); // chest
    ctx.stroke();

    // Large expressive eye
    strokeCircle(ctx, -15, -45, 10);
    strokeCircle(ctx, -12, -48, 4); // pupil/highlight
    ctx.beginPath();
    ctx.moveTo(-28, -50); ctx.quadraticCurveTo(-15, -58, -2, -50); // lash
    ctx.stroke();

    // Spiraled Horn
    ctx.beginPath();
    ctx.moveTo(-30, -78); ctx.lineTo(-10, -150); ctx.lineTo(-16, -78);
    ctx.closePath();
    ctx.stroke();
    // spirals
    for (let y = -90; y > -145; y -= 15) {
      ctx.beginPath();
      ctx.moveTo(-26 + (y + 90) * 0.15, y);
      ctx.lineTo(-12 + (y + 90) * 0.1, y - 8);
      ctx.stroke();
    }

    // Long curly mane (colorable locks)
    const locks = [
      { sx: -42, sy: -75, cx: -110, cy: -50, ex: -85, ey: 10 },
      { sx: -50, sy: -40, cx: -130, cy: -10, ex: -105, ey: 55 },
      { sx: -55, sy: 0, cx: -140, cy: 30, ex: -110, ey: 100 }
    ];
    locks.forEach((l) => {
      ctx.beginPath();
      ctx.moveTo(l.sx, l.sy);
      ctx.bezierCurveTo(l.cx, l.cy, l.cx - 20, l.cy + 40, l.ex, l.ey);
      ctx.bezierCurveTo(l.cx - 40, l.cy + 50, l.cx - 20, l.cy - 10, l.sx, l.sy);
      ctx.stroke();
    });

    // Floating magical stars
    drawStar(ctx, 110, -110, 15, 6, 5);
    drawStar(ctx, -140, -130, 10, 4, 5);
    drawStar(ctx, 130, 80, 12, 5, 5);

    ctx.restore();

  } else if (type === "fairy") {
    // Charming Fairy Garden
    // Mushroom House
    const my = cy + 40;
    // Cap
    ctx.beginPath();
    ctx.moveTo(cx - 130, my);
    ctx.bezierCurveTo(cx - 130, cy - 85, cx + 130, cy - 85, cx + 130, my);
    ctx.closePath();
    ctx.stroke();

    // Stem
    ctx.beginPath();
    ctx.moveTo(cx - 80, my);
    ctx.quadraticCurveTo(cx - 90, my + 100, cx - 65, my + 130);
    ctx.lineTo(cx + 65, my + 130);
    ctx.quadraticCurveTo(cx + 90, my + 100, cx + 80, my);
    ctx.stroke();

    // Spots on cap
    strokeCircle(ctx, cx - 60, cy - 10, 22);
    strokeCircle(ctx, cx + 60, cy - 10, 18);
    strokeCircle(ctx, cx, cy - 40, 26);

    // Arched door with window pane
    ctx.beginPath();
    ctx.arc(cx, my + 130, 26, Math.PI, 0, false);
    ctx.lineTo(cx + 26, my + 130);
    ctx.lineTo(cx - 26, my + 130);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, my + 95, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, my + 85); ctx.lineTo(cx, my + 105);
    ctx.moveTo(cx - 10, my + 95); ctx.lineTo(cx + 10, my + 95);
    ctx.stroke();
    strokeCircle(ctx, cx - 18, my + 112, 3); // doorknob

    // Little round window on stem side
    strokeCircle(ctx, cx + 45, my + 50, 16);
    ctx.beginPath();
    ctx.moveTo(cx + 45, my + 34); ctx.lineTo(cx + 45, my + 66);
    ctx.moveTo(cx + 29, my + 50); ctx.lineTo(cx + 61, my + 50);
    ctx.stroke();

    // Giant flowers beside the house
    const f1x = cx - 145;
    const f1y = cy + 130;
    ctx.beginPath();
    ctx.moveTo(f1x, f1y); ctx.lineTo(f1x, h);
    ctx.stroke();
    strokeCircle(ctx, f1x, f1y, 16);
    for (let i = 0; i < 6; i++) {
      drawFlowerPetal(ctx, f1x, f1y, (i * Math.PI * 2) / 6, 16, 32, 8);
    }

    const f2x = cx + 150;
    const f2y = cy + 110;
    ctx.beginPath();
    ctx.moveTo(f2x, f2y); ctx.lineTo(f2x, h);
    ctx.stroke();
    strokeCircle(ctx, f2x, f2y, 14);
    for (let i = 0; i < 5; i++) {
      drawFlowerPetal(ctx, f2x, f2y, (i * Math.PI * 2) / 5, 14, 28, 7);
    }

    // Fairy garden pebble pathway
    const pathPebbles = [
      { x: cx - 12, y: my + 138, r: 8 },
      { x: cx + 16, y: my + 144, r: 10 },
      { x: cx - 18, y: my + 154, r: 11 },
      { x: cx + 22, y: my + 165, r: 12 }
    ];
    pathPebbles.forEach((p) => strokeEllipse(ctx, p.x, p.y + 10, p.r * 1.5, p.r));

  } else if (type === "wizard") {
    // Tall crooked Wizard Tower perched on a cliff
    // Cliff edge
    ctx.beginPath();
    ctx.moveTo(0, cy + 130);
    ctx.lineTo(cx + 100, cy + 110);
    ctx.lineTo(cx - 30, h);
    ctx.stroke();

    // Tower base
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 115);
    ctx.quadraticCurveTo(cx - 35, cy, cx - 25, cy - 80);
    ctx.lineTo(cx + 45, cy - 80);
    ctx.quadraticCurveTo(cx + 55, cy, cx + 70, cy + 112);
    ctx.stroke();

    // Crooked roof hat
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy - 80);
    ctx.bezierCurveTo(cx, cy - 170, cx - 40, cy - 200, cx + 10, cy - 220); // crooked peak
    ctx.bezierCurveTo(cx + 25, cy - 160, cx + 30, cy - 110, cx + 60, cy - 80);
    ctx.closePath();
    ctx.stroke();

    // Wizard hat brim
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy - 80, 65, 12, 0.05, 0, Math.PI * 2);
    ctx.stroke();

    // Swirls of magic smoke emitting from chimney/top
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy - 140);
    ctx.bezierCurveTo(cx + 80, cy - 180, cx + 30, cy - 230, cx + 90, cy - 250);
    ctx.stroke();

    // Wooden door on base
    ctx.beginPath();
    ctx.arc(cx + 10, cy + 113, 20, Math.PI, 0, false);
    ctx.lineTo(cx + 30, cy + 113);
    ctx.lineTo(cx - 10, cy + 113);
    ctx.stroke();

    // Small glowing windows
    strokeCircle(ctx, cx + 10, cy + 20, 14);
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy + 6); ctx.lineTo(cx + 10, cy + 34);
    ctx.moveTo(cx - 4, cy + 20); ctx.lineTo(cx + 24, cy + 20);
    ctx.stroke();

    // Stone pattern details
    for (let sy = cy - 40; sy <= cy + 80; sy += 40) {
      ctx.beginPath();
      ctx.moveTo(cx - 32, sy); ctx.lineTo(cx - 20, sy);
      ctx.moveTo(cx + 42, sy + 15); ctx.lineTo(cx + 56, sy + 15);
      ctx.stroke();
    }

  } else if (type === "phoenix") {
    // Majestic Phoenix rising from detailed flame swirls
    ctx.save();
    ctx.translate(cx, cy - 20);

    // Intricate feather layers on spread wings
    for (let side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);

      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.bezierCurveTo(65, -85, 140, -95, 175, -40);
      ctx.bezierCurveTo(145, -20, 110, -25, 95, 5);
      ctx.bezierCurveTo(80, -5, 50, -5, 0, 30);
      ctx.stroke();

      // Wing feathers detail
      for (let j = 0; j < 5; j++) {
        const pct = j / 4;
        const fx = 35 + pct * 115;
        const fy = -42 + pct * 28;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(fx + 20, fy + 38, fx - 10, fy + 48);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 5, 22, 42, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Long elegant head & neck
    ctx.beginPath();
    ctx.moveTo(-10, -32);
    ctx.quadraticCurveTo(-15, -75, 0, -85);
    ctx.quadraticCurveTo(15, -75, 10, -32);
    ctx.stroke();

    // Head
    strokeCircle(ctx, 0, -94, 12);
    // Beak
    ctx.beginPath();
    ctx.moveTo(6, -98); ctx.lineTo(24, -94); ctx.lineTo(5, -90);
    ctx.stroke();

    // Head crest feathers
    for (let k = -3; k <= 3; k += 3) {
      ctx.beginPath();
      ctx.moveTo(0, -106);
      ctx.quadraticCurveTo(k * 8, -135, k * 12, -140);
      ctx.stroke();
      strokeCircle(ctx, k * 12, -142, 3);
    }

    // Flame swirls at bottom
    for (let side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(15 * side, 40);
      ctx.bezierCurveTo(75 * side, 115, 15 * side, 160, 45 * side, 180);
      ctx.bezierCurveTo(5 * side, 140, 45 * side, 95, 0, 45);
      ctx.stroke();
    }

    ctx.restore();

  } else if (type === "mermaid") {
    // Beautiful Mermaid sitting on a rocky shore
    ctx.save();
    ctx.translate(cx, cy - 25);

    // Shore Rock
    ctx.beginPath();
    ctx.moveTo(-160, 160);
    ctx.bezierCurveTo(-100, 95, 60, 95, 130, 160);
    ctx.stroke();

    // Waves crashing
    ctx.beginPath();
    for (let x = -200; x <= 200; x += 50) {
      ctx.moveTo(x, 160);
      ctx.bezierCurveTo(x + 12, 130, x + 38, 130, x + 50, 160);
    }
    ctx.stroke();

    // Mermaid Body
    // Torso
    ctx.beginPath();
    ctx.moveTo(-15, -15);
    ctx.bezierCurveTo(-22, 15, -12, 45, -5, 60);
    ctx.lineTo(15, 60);
    ctx.bezierCurveTo(18, 45, 12, 15, 5, -15);
    ctx.closePath();
    ctx.stroke();

    // Shell top
    strokeCircle(ctx, -6, -4, 6);
    strokeCircle(ctx, 6, -4, 6);

    // Head
    strokeCircle(ctx, 0, -50, 18);
    // Face details
    strokeCircle(ctx, -7, -50, 2);
    strokeCircle(ctx, 7, -50, 2);
    ctx.beginPath();
    ctx.arc(0, -45, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Elegant long hair flowing on sides
    const hairLocks = [
      { sx: -16, sy: -55, cx: -65, cy: -30, ex: -48, ey: 25 },
      { sx: 16, sy: -55, cx: 65, cy: -30, ex: 48, ey: 25 },
      { sx: -18, sy: -42, cx: -52, cy: 10, ex: -30, ey: 60 }
    ];
    hairLocks.forEach((l) => {
      ctx.beginPath();
      ctx.moveTo(l.sx, l.sy);
      ctx.bezierCurveTo(l.cx, l.cy, l.cx, l.cy + 30, l.ex, l.ey);
      ctx.stroke();
    });

    // Mermaid Tail with scales
    ctx.beginPath();
    ctx.moveTo(-5, 60);
    ctx.bezierCurveTo(-45, 95, -20, 135, -55, 145); // tail curve
    ctx.bezierCurveTo(-45, 155, -12, 120, 11, 105);
    ctx.lineTo(5, 60);
    ctx.stroke();

    // Tail Fin
    ctx.beginPath();
    ctx.moveTo(-55, 145);
    ctx.bezierCurveTo(-95, 145, -100, 185, -82, 180);
    ctx.bezierCurveTo(-65, 175, -60, 155, -55, 145);
    ctx.bezierCurveTo(-45, 160, -35, 172, -28, 180);
    ctx.bezierCurveTo(-12, 185, -25, 145, -55, 145);
    ctx.closePath();
    ctx.stroke();

    // Scale patterns (colorable scallops)
    for (let ty = 70; ty <= 120; ty += 15) {
      const tx = -18 + (ty - 70) * -0.3;
      ctx.beginPath();
      ctx.arc(tx, ty, 8, -1.2, 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tx + 12, ty, 8, -1.2, 1.2);
      ctx.stroke();
    }

    ctx.restore();

  } else {
    // Floating Islands
    // Main floating island
    const iy = cy + 30;
    ctx.beginPath();
    ctx.moveTo(cx - 150, iy);
    ctx.lineTo(cx + 150, iy);
    // Craggy V-shaped bottom
    ctx.lineTo(cx + 90, iy + 45);
    ctx.lineTo(cx + 40, iy + 30);
    ctx.lineTo(cx, iy + 105);
    ctx.lineTo(cx - 60, iy + 40);
    ctx.lineTo(cx - 110, iy + 55);
    ctx.closePath();
    ctx.stroke();

    // Hanging roots/vines
    const drawVine = (vx, vh) => {
      ctx.beginPath();
      ctx.moveTo(vx, iy + 5);
      ctx.quadraticCurveTo(vx - 10, iy + vh / 2, vx, iy + vh);
      ctx.stroke();
    };
    drawVine(cx - 120, 42);
    drawVine(cx - 80, 68);
    drawVine(cx + 70, 52);
    drawVine(cx + 110, 38);

    // Little waterfall cascading off the edge
    ctx.beginPath();
    ctx.moveTo(cx + 20, iy);
    ctx.lineTo(cx + 20, iy + 140);
    ctx.moveTo(cx + 38, iy);
    ctx.lineTo(cx + 38, iy + 130);
    ctx.stroke();
    // splash curves at bottom
    ctx.beginPath();
    ctx.arc(cx + 29, iy + 140, 12, Math.PI, 0);
    ctx.stroke();

    // Stylized fantasy tree on top
    const tx = cx - 50;
    const ty = iy;
    ctx.beginPath();
    ctx.moveTo(tx - 12, ty); ctx.quadraticCurveTo(tx - 12, ty - 60, tx, ty - 70);
    ctx.lineTo(tx + 8, ty - 70); ctx.quadraticCurveTo(tx + 20, ty - 60, tx + 20, ty);
    ctx.stroke();

    // Huge fluffy foliage circles
    strokeCircle(ctx, tx + 4, ty - 85, 32);
    strokeCircle(ctx, tx - 24, ty - 72, 22);
    strokeCircle(ctx, tx + 30, ty - 70, 22);

    // Smaller background island
    ctx.beginPath();
    ctx.moveTo(cx + 110, cy - 80);
    ctx.lineTo(cx + 200, cy - 80);
    ctx.lineTo(cx + 155, cy - 40);
    ctx.closePath();
    ctx.stroke();
    drawPineTree(ctx, cx + 155, cy - 80, 25, 32);

    // High altitude clouds
    drawFluffyCloud(ctx, cx - 180, cy - 130, 26);
    drawFluffyCloud(ctx, cx + 120, cy - 160, 26);
  }
}

function drawSciFi(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "astronaut") {
    // Astronaut floating in detailed star field
    ctx.save();
    ctx.translate(cx, cy);

    // Helmet (large circle)
    strokeCircle(ctx, 0, -50, 48);
    // Helmet visor (colorable ellipse)
    strokeEllipse(ctx, 0, -48, 38, 26);
    // Reflection lines on visor
    ctx.beginPath();
    ctx.moveTo(-25, -55); ctx.lineTo(-12, -62);
    ctx.moveTo(-28, -45); ctx.lineTo(-16, -52);
    ctx.stroke();

    // Suit Chest/Body
    ctx.beginPath();
    ctx.rect(-45, -2, 90, 85);
    ctx.stroke();
    // Chest panel detail (enclosed buttons and stripes)
    ctx.strokeRect(-25, 12, 50, 32);
    ctx.strokeRect(-18, 18, 14, 18);
    strokeCircle(ctx, 15, 22, 4);
    strokeCircle(ctx, 15, 34, 4);

    // Shoulders & Arms
    ctx.beginPath();
    ctx.ellipse(-60, 20, 16, 32, -0.4, 0, Math.PI * 2);
    ctx.ellipse(60, 20, 16, 32, 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Life support tubes (long colorable curves)
    ctx.beginPath();
    ctx.moveTo(-35, 75);
    ctx.bezierCurveTo(-65, 120, -110, 60, -110, -10);
    ctx.bezierCurveTo(-110, -50, -85, -50, -48, -45);
    ctx.stroke();

    // Backpack / thruster pack outline
    ctx.strokeRect(-65, -12, 18, 90);
    ctx.strokeRect(47, -12, 18, 90);

    // Little details: Stars in background
    ctx.restore();
    drawStar(ctx, cx - 140, cy - 140, 15, 5, 5);
    drawStar(ctx, cx + 150, cy - 130, 12, 4, 5);
    drawStar(ctx, cx - 160, cy + 120, 10, 5, 5);
    drawStar(ctx, cx + 140, cy + 140, 14, 5, 5);

  } else if (type === "spaceship") {
    // Sleek space fighter cruiser
    ctx.save();
    ctx.translate(cx, cy);

    // Fuselage (diamond / rocket capsule shape)
    ctx.beginPath();
    ctx.moveTo(0, -130); // nose cone
    ctx.lineTo(38, -30);
    ctx.lineTo(32, 60);
    ctx.lineTo(-32, 60);
    ctx.lineTo(-38, -30);
    ctx.closePath();
    ctx.stroke();

    // Glass Canopy (cockpit window)
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.lineTo(18, -35);
    ctx.lineTo(12, 10);
    ctx.lineTo(-12, 10);
    ctx.lineTo(-18, -35);
    ctx.closePath();
    ctx.stroke();
    // panel divide lines
    ctx.beginPath();
    ctx.moveTo(0, -80); ctx.lineTo(0, 10);
    ctx.stroke();

    // Giant futuristic wings
    ctx.beginPath();
    ctx.moveTo(-38, -10);
    ctx.lineTo(-150, 45);
    ctx.lineTo(-110, 85);
    ctx.lineTo(-32, 45);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(38, -10);
    ctx.lineTo(150, 45);
    ctx.lineTo(110, 85);
    ctx.lineTo(32, 45);
    ctx.stroke();

    // Engine thrusters on back with thrust flames
    ctx.strokeRect(-22, 60, 14, 15);
    ctx.strokeRect(8, 60, 14, 15);
    // Thrust laser trails (enclosed coloring region)
    ctx.beginPath();
    ctx.moveTo(-22, 75); ctx.lineTo(-35, 140); ctx.lineTo(-8, 140); ctx.lineTo(-8, 75);
    ctx.moveTo(8, 75); ctx.lineTo(8, 140); ctx.lineTo(35, 140); ctx.lineTo(22, 75);
    ctx.stroke();

    // Wing panel highlights
    ctx.beginPath();
    ctx.moveTo(-110, 48); ctx.lineTo(-55, 30); ctx.lineTo(-50, 42);
    ctx.moveTo(110, 48); ctx.lineTo(55, 30); ctx.lineTo(50, 42);
    ctx.stroke();

    ctx.restore();

  } else if (type === "planet") {
    // Alien Planet with majestic rings & moon
    // Space background orbits
    ctx.beginPath();
    ctx.arc(cx - 150, cy - 130, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Moon
    strokeCircle(ctx, cx - 150, cy - 100, 24);
    strokeCircle(ctx, cx - 158, cy - 108, 5); // crater

    // Main Planet
    strokeCircle(ctx, cx, cy, 105);

    // Planet texture bands (enclosed waves)
    ctx.beginPath();
    ctx.arc(cx - 25, cy - 45, 98, 0.4, 2.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 5, cy + 30, 102, 3.4, 5.8);
    ctx.stroke();

    // Huge rings (ellipse rotated)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.26); // slant

    // Outer ring ellipse
    strokeEllipse(ctx, 0, 0, 215, 38);
    // Inner ring ellipse
    strokeEllipse(ctx, 0, 0, 155, 24);

    ctx.restore();

  } else if (type === "cyber") {
    // Cyber City grid skyline with transport tunnels
    // Base grid lines going to a vanishing point
    const vpX = cx;
    const vpY = cy + 40;

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(0, vpY); ctx.lineTo(w, vpY);
    ctx.stroke();

    // Grid perspective lanes
    for (let x = -200; x <= w + 200; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(vpX + (x - vpX) * 0.05, vpY);
      ctx.stroke();
    }
    // Grid horizontal steps
    for (let y = vpY + 10; y < h; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Tall futuristic skyscrapers with blocky windows
    const towers = [
      { x: cx - 180, w: 55, h: 220 },
      { x: cx - 110, w: 65, h: 280 },
      { x: cx - 35, w: 75, h: 320 },
      { x: cx + 55, w: 60, h: 250 },
      { x: cx + 125, w: 55, h: 210 }
    ];

    towers.forEach((t) => {
      ctx.strokeRect(t.x, vpY - t.h, t.w, t.h);
      // Large geometric glass segments on facade
      for (let wy = vpY - t.h + 20; wy < vpY - 20; wy += 45) {
        ctx.strokeRect(t.x + 8, wy, t.w - 16, 32);
      }
    });

    // Elevated high-speed transport tube
    ctx.beginPath();
    ctx.moveTo(0, vpY - 120);
    ctx.bezierCurveTo(w * 0.3, vpY - 80, w * 0.7, vpY - 160, w, vpY - 110);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, vpY - 105);
    ctx.bezierCurveTo(w * 0.3, vpY - 65, w * 0.7, vpY - 145, w, vpY - 95);
    ctx.stroke();

  } else if (type === "mecha") {
    // Armored Mecha Robot
    ctx.save();
    ctx.translate(cx, cy - 25);

    // Head
    ctx.strokeRect(-22, -100, 44, 38);
    // Crest antennae
    ctx.beginPath();
    ctx.moveTo(0, -100); ctx.lineTo(-12, -125); ctx.lineTo(0, -112); ctx.lineTo(12, -125); ctx.closePath();
    ctx.stroke();
    // Visor eye
    ctx.strokeRect(-14, -86, 28, 10);

    // Neck
    ctx.strokeRect(-10, -62, 20, 10);

    // Giant chest plate (torso)
    ctx.beginPath();
    ctx.moveTo(-50, -52);
    ctx.lineTo(50, -52);
    ctx.lineTo(38, 30);
    ctx.lineTo(-38, 30);
    ctx.closePath();
    ctx.stroke();
    // chest core power orb
    strokeCircle(ctx, 0, -12, 16);
    strokeCircle(ctx, 0, -12, 8);

    // Large mechanical shoulders
    ctx.strokeRect(-76, -52, 26, 30);
    ctx.strokeRect(50, -52, 26, 30);

    // Arms
    ctx.strokeRect(-72, -22, 18, 55);
    ctx.strokeRect(54, -22, 18, 55);

    // Waist / hips
    ctx.strokeRect(-32, 30, 64, 18);

    // Thigh joints
    ctx.strokeRect(-25, 48, 16, 20);
    ctx.strokeRect(9, 48, 16, 20);

    ctx.restore();

  } else if (type === "station") {
    // Space station spinning in orbit
    ctx.save();
    ctx.translate(cx, cy);

    // Rotating outer ring
    strokeCircle(ctx, 0, 0, 130);
    strokeCircle(ctx, 0, 0, 105);

    // Dividers in the wheel ring (compartments)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 105, Math.sin(a) * 105);
      ctx.lineTo(Math.cos(a) * 130, Math.sin(a) * 130);
      ctx.stroke();
    }

    // Core hub
    strokeCircle(ctx, 0, 0, 32);
    strokeCircle(ctx, 0, 0, 16);

    // 4 Connecting Spokes
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(cos * 32, sin * 32);
      ctx.lineTo(cos * 105, sin * 105);
      ctx.stroke();
    }

    // Giant solar panels flanking left and right
    ctx.strokeRect(-185, -28, 55, 56);
    ctx.strokeRect(130, -28, 55, 56);
    // solar panel segments
    for (let x = -175; x <= -140; x += 15) {
      ctx.beginPath(); ctx.moveTo(x, -28); ctx.lineTo(x, 28); ctx.stroke();
    }
    for (let x = 145; x <= 180; x += 15) {
      ctx.beginPath(); ctx.moveTo(x, -28); ctx.lineTo(x, 28); ctx.stroke();
    }

    ctx.restore();

  } else {
    // Futuristic Skyline / Domes of Tomorrow
    // Giant protective bio-dome
    ctx.beginPath();
    ctx.arc(cx, cy + 120, 150, Math.PI, 0, false);
    ctx.stroke();

    // Domes and spires inside
    ctx.beginPath();
    ctx.arc(cx - 50, cy + 120, 50, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 60, cy + 120, 42, Math.PI, 0, false);
    ctx.stroke();

    // Central mega-spire tower
    ctx.strokeRect(cx - 15, cy - 40, 30, 160);
    // pointed spire tip
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 40); ctx.lineTo(cx, cy - 120); ctx.lineTo(cx + 15, cy - 40);
    ctx.stroke();

    // Skyway transport tubes crossing outside the dome
    ctx.beginPath();
    ctx.moveTo(0, cy - 60);
    ctx.quadraticCurveTo(cx, cy - 110, w, cy - 50);
    ctx.moveTo(0, cy - 45);
    ctx.quadraticCurveTo(cx, cy - 95, w, cy - 35);
    ctx.stroke();

    // Ground platform line
    ctx.beginPath();
    ctx.moveTo(0, cy + 120); ctx.lineTo(w, cy + 120);
    ctx.stroke();
  }
}

function drawCute(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  // Helper for cute kawaii face
  const drawFace = (fx, fy, eyeSpacing = 22, eyeSize = 6, smileSize = 8, isWinking = false) => {
    // Left eye
    ctx.beginPath();
    ctx.arc(fx - eyeSpacing, fy, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = "#1E293B";
    ctx.fill();

    // Right eye or wink
    ctx.beginPath();
    if (isWinking) {
      ctx.arc(fx + eyeSpacing, fy, eyeSize, 0, Math.PI, true); // curved wink
      ctx.stroke();
    } else {
      ctx.arc(fx + eyeSpacing, fy, eyeSize, 0, Math.PI * 2);
      ctx.fillStyle = "#1E293B";
      ctx.fill();
    }

    // Rosy cheeks (little horizontal loops)
    strokeEllipse(ctx, fx - eyeSpacing - 5, fy + 8, 8, 4);
    strokeEllipse(ctx, fx + eyeSpacing + 5, fy + 8, 8, 4);

    // Cute curved smile
    ctx.beginPath();
    ctx.arc(fx, fy + 2, smileSize, 0, Math.PI, false);
    ctx.stroke();
  };

  if (type === "boba") {
    // Bubble Tea Cup
    ctx.save();
    ctx.translate(cx, cy);

    // Curved cup body
    ctx.beginPath();
    ctx.moveTo(-60, -90);
    ctx.lineTo(-45, 95);
    ctx.quadraticCurveTo(0, 110, 45, 95);
    ctx.lineTo(60, -90);
    ctx.closePath();
    ctx.stroke();

    // Cup Lid
    ctx.strokeRect(-68, -100, 136, 12);

    // Thick angled Straw
    ctx.beginPath();
    ctx.moveTo(-15, -125);
    ctx.lineTo(-5, -125);
    ctx.lineTo(-5, 80);
    ctx.lineTo(-15, 80);
    ctx.closePath();
    ctx.stroke();

    // Draw Kawaii Face
    drawFace(0, -10, 24, 7, 9);

    // Large boba pearls at the bottom (clear, non-overlapping circles to color)
    const bobas = [
      { x: -30, y: 75 }, { x: -10, y: 80 }, { x: 15, y: 82 }, { x: 32, y: 70 },
      { x: -35, y: 50 }, { x: -12, y: 55 }, { x: 10, y: 58 }, { x: 30, y: 45 },
      { x: -22, y: 28 }, { x: 2, y: 32 }, { x: 22, y: 25 }
    ];
    bobas.forEach(b => {
      strokeCircle(ctx, b.x, b.y, 11);
    });

    ctx.restore();

  } else if (type === "bear") {
    // Cute Bear with winter scarf
    ctx.save();
    ctx.translate(cx, cy);

    // Bear Ears
    strokeCircle(ctx, -60, -70, 22);
    strokeCircle(ctx, -60, -70, 12); // inner ear
    strokeCircle(ctx, 60, -70, 22);
    strokeCircle(ctx, 60, -70, 12); // inner ear

    // Bear Head (chubby round cheeks)
    ctx.beginPath();
    ctx.arc(0, -15, 76, 0, Math.PI * 2);
    ctx.stroke();

    // Snout
    strokeEllipse(ctx, 0, 5, 18, 12);
    // nose
    ctx.beginPath();
    ctx.ellipse(0, -1, 7, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1E293B";
    ctx.fill();

    // Eyes
    ctx.beginPath();
    ctx.arc(-26, -15, 6, 0, Math.PI * 2);
    ctx.arc(26, -15, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#1E293B";
    ctx.fill();

    // Small smile on snout
    ctx.beginPath();
    ctx.arc(0, 5, 5, 0, Math.PI);
    ctx.stroke();

    // Cozy striped scarf wrapped around neck
    ctx.beginPath();
    ctx.moveTo(-50, 48);
    ctx.quadraticCurveTo(0, 68, 50, 48);
    ctx.lineTo(44, 76);
    ctx.quadraticCurveTo(0, 96, -44, 76);
    ctx.closePath();
    ctx.stroke();

    // Scarf stripes (vertical segments)
    for (let x = -35; x <= 35; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 58);
      ctx.lineTo(x * 0.9, 84);
      ctx.stroke();
    }

    // Scarf tail hanging down
    ctx.beginPath();
    ctx.rect(20, 72, 22, 55);
    ctx.stroke();
    // fringes
    for (let f = 24; f <= 38; f += 4) {
      ctx.beginPath(); ctx.moveTo(f, 127); ctx.lineTo(f, 133); ctx.stroke();
    }

    ctx.restore();

  } else if (type === "avocado") {
    // Happy Avocado split in half
    ctx.save();
    ctx.translate(cx, cy);

    // Pear-shaped avocado body
    ctx.beginPath();
    ctx.moveTo(0, -95);
    ctx.bezierCurveTo(-55, -95, -75, -20, -75, 40);
    ctx.bezierCurveTo(-75, 95, -55, 105, 0, 105);
    ctx.bezierCurveTo(55, 105, 75, 95, 75, 40);
    ctx.bezierCurveTo(75, -20, 55, -95, 0, -95);
    ctx.closePath();
    ctx.stroke();

    // Inner rim line (creates the skin/flesh boundary)
    ctx.beginPath();
    ctx.moveTo(0, -82);
    ctx.bezierCurveTo(-46, -82, -63, -15, -63, 35);
    ctx.bezierCurveTo(-63, 83, -46, 92, 0, 92);
    ctx.bezierCurveTo(46, 92, 63, 83, 63, 35);
    ctx.bezierCurveTo(63, -15, 46, -82, 0, -82);
    ctx.closePath();
    ctx.stroke();

    // Big central seed pit (circle)
    strokeCircle(ctx, 0, 25, 34);

    // Happy Kawaii Face on the seed!
    drawFace(0, 18, 14, 5, 6);

    // Tiny leaves at the top
    ctx.beginPath();
    ctx.bezierCurveTo(-5, -95, -15, -112, 0, -115);
    ctx.bezierCurveTo(15, -112, 5, -95, 0, -95);
    ctx.stroke();

    ctx.restore();

  } else if (type === "icecream") {
    // Cute Ice Cream Cone
    ctx.save();
    ctx.translate(cx, cy);

    // Cross-hatched waffle cone at the bottom
    ctx.beginPath();
    ctx.moveTo(-45, 12);
    ctx.lineTo(0, 125);
    ctx.lineTo(45, 12);
    ctx.closePath();
    ctx.stroke();

    // Waffle cross-hatching
    ctx.save();
    // Clip to the cone so lines don't bleed out
    ctx.beginPath();
    ctx.moveTo(-45, 12); ctx.lineTo(0, 125); ctx.lineTo(45, 12); ctx.closePath();
    ctx.clip();
    for (let x = -80; x < 80; x += 18) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 100, 130); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 100, 130); ctx.stroke();
    }
    ctx.restore();

    // Fluffy Bottom Scoop
    ctx.beginPath();
    ctx.arc(-22, -10, 32, Math.PI * 0.7, Math.PI * 1.8);
    ctx.arc(22, -10, 32, Math.PI * 1.2, Math.PI * 0.3);
    ctx.quadraticCurveTo(32, 12, 0, 12);
    ctx.quadraticCurveTo(-32, 12, -22, -10);
    ctx.stroke();
    drawFace(0, -12, 16, 5, 6);

    // Middle Scoop overlapping
    ctx.beginPath();
    ctx.arc(-16, -52, 28, Math.PI * 0.7, Math.PI * 1.8);
    ctx.arc(16, -52, 28, Math.PI * 1.2, Math.PI * 0.3);
    ctx.quadraticCurveTo(24, -34, -24, -34);
    ctx.stroke();
    drawFace(0, -50, 14, 4, 5, true); // winking!

    // Top Scoop
    ctx.beginPath();
    ctx.arc(0, -90, 24, 0, Math.PI * 2);
    ctx.stroke();

    // Cherry on top
    strokeCircle(ctx, 0, -125, 12);
    // cherry stem
    ctx.beginPath();
    ctx.moveTo(3, -135);
    ctx.quadraticCurveTo(15, -155, 10, -165);
    ctx.stroke();

    ctx.restore();

  } else if (type === "sloth") {
    // Sleeping Sloth hanging from a branch
    ctx.save();
    ctx.translate(cx, cy);

    // Wooden Branch
    ctx.beginPath();
    ctx.moveTo(-160, -45);
    ctx.lineTo(160, -45);
    ctx.lineTo(160, -20);
    ctx.lineTo(-160, -20);
    ctx.closePath();
    ctx.stroke();

    // Branch leaves
    drawLeaf(ctx, -120, -45, -0.6, 22);
    drawLeaf(ctx, -90, -45, -0.4, 18);
    drawLeaf(ctx, 100, -20, 0.8, 20);

    // Sloth Body (hanging down)
    ctx.beginPath();
    ctx.ellipse(0, 25, 68, 52, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Face mask patch (distinctive shape)
    ctx.beginPath();
    ctx.ellipse(0, 18, 42, 26, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Closed sleeping curved eyes
    ctx.beginPath();
    ctx.arc(-16, 16, 6, 0, Math.PI, true);
    ctx.arc(16, 16, 6, 0, Math.PI, true);
    ctx.stroke();

    // Happy tiny nose
    strokeCircle(ctx, 0, 22, 4);

    // Cute smile
    ctx.beginPath();
    ctx.arc(0, 26, 6, 0, Math.PI);
    ctx.stroke();

    // Arms wrapped around branch (left and right)
    ctx.beginPath();
    ctx.ellipse(-44, -12, 14, 28, 0.4, 0, Math.PI * 2);
    ctx.ellipse(44, -12, 14, 28, -0.4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

  } else if (type === "penguin") {
    // Round Penguin in cozy winter hat
    ctx.save();
    ctx.translate(cx, cy);

    // Oval Penguin Body
    ctx.beginPath();
    ctx.ellipse(0, 25, 68, 76, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner white belly region
    ctx.beginPath();
    ctx.ellipse(0, 36, 48, 56, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Cute wings (flippers)
    ctx.beginPath();
    ctx.ellipse(-72, 35, 14, 30, 0.35, 0, Math.PI * 2);
    ctx.ellipse(72, 35, 14, 30, -0.35, 0, Math.PI * 2);
    ctx.stroke();

    // Penguin Feet (colorable webbed flippers)
    ctx.strokeRect(-42, 92, 22, 15);
    ctx.strokeRect(20, 92, 22, 15);

    // Beak
    ctx.beginPath();
    ctx.moveTo(0, 5); ctx.lineTo(-10, -3); ctx.lineTo(10, -3); ctx.closePath();
    ctx.stroke();

    // Cute Kawaii Face
    drawFace(0, -10, 20, 6, 5);

    // Striped Winter Beanie Hat
    ctx.beginPath();
    ctx.arc(0, -38, 50, Math.PI, 0, false);
    ctx.closePath();
    ctx.stroke();
    // Hat brim
    ctx.strokeRect(-55, -44, 110, 14);
    // Beanie stripes
    for (let hx = -30; hx <= 30; hx += 15) {
      ctx.beginPath();
      ctx.moveTo(hx, -44);
      ctx.quadraticCurveTo(hx * 0.5, -65, hx * 0.1, -85);
      ctx.stroke();
    }
    // Fluffy Pompom on top
    strokeCircle(ctx, 0, -96, 12);

    ctx.restore();

  } else if (type === "dino") {
    // Cute party-hat dinosaur (T-Rex/Brontosaurus hybrid)
    ctx.save();
    ctx.translate(cx, cy);

    // Round Chubby Body
    ctx.beginPath();
    ctx.arc(-20, 30, 56, 0, Math.PI * 2);
    ctx.stroke();

    // S-curve Neck & Head
    ctx.beginPath();
    ctx.moveTo(-15, -15);
    ctx.bezierCurveTo(0, -85, 55, -85, 50, -45);
    ctx.bezierCurveTo(45, -25, 20, -10, 20, 15);
    ctx.stroke();
    // Front throat curve
    ctx.beginPath();
    ctx.moveTo(-50, -3);
    ctx.bezierCurveTo(-15, -45, 15, -45, 12, -22);
    ctx.stroke();

    // Friendly face on head (facing right)
    ctx.beginPath();
    ctx.arc(32, -45, 5, 0, Math.PI * 2); // eye
    ctx.fillStyle = "#1E293B";
    ctx.fill();
    // rosy cheek
    strokeCircle(ctx, 22, -38, 5);
    // tiny snout smile
    ctx.beginPath();
    ctx.arc(44, -38, 4, 0, Math.PI);
    ctx.stroke();

    // Spikes on back/neck (triangles)
    const spikes = [
      { x: -55, y: -8 }, { x: -68, y: 12 }, { x: -66, y: 35 }, { x: -50, y: 58 }
    ];
    spikes.forEach(s => {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - 12, s.y + 6);
      ctx.lineTo(s.x - 4, s.y + 14);
      ctx.closePath();
      ctx.stroke();
    });

    // Striped party hat on head
    ctx.beginPath();
    ctx.moveTo(25, -58);
    ctx.lineTo(38, -95);
    ctx.lineTo(48, -58);
    ctx.closePath();
    ctx.stroke();
    // Hat stripes
    ctx.beginPath();
    ctx.moveTo(29, -70); ctx.lineTo(44, -70);
    ctx.moveTo(33, -82); ctx.lineTo(41, -82);
    ctx.stroke();
    // Pom on hat
    strokeCircle(ctx, 38, -98, 4);

    // Stumpy cute legs
    ctx.strokeRect(-55, 78, 22, 28);
    ctx.strokeRect(-12, 82, 22, 24);

    // Long curly tail
    ctx.beginPath();
    ctx.moveTo(-68, 50);
    ctx.bezierCurveTo(-110, 60, -130, 20, -120, -5);
    ctx.bezierCurveTo(-110, -25, -95, -15, -85, 10);
    ctx.bezierCurveTo(-95, 30, -74, 42, -56, 40);
    ctx.stroke();

    ctx.restore();

  } else {
    // Mochi Friends (Stack of 3 squishy mochis on a cute plate)
    ctx.save();
    ctx.translate(cx, cy);

    // Ceramic Plate
    ctx.beginPath();
    ctx.ellipse(0, 100, 115, 15, 0, 0, Math.PI * 2);
    ctx.stroke();

    // BOTTOM MOCHI (Very wide and squished)
    ctx.beginPath();
    ctx.ellipse(0, 68, 82, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawFace(0, 64, 25, 6, 8);

    // MIDDLE MOCHI (Overlaps bottom)
    ctx.beginPath();
    ctx.ellipse(0, 22, 68, 30, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawFace(0, 18, 20, 5, 7, true); // winking!

    // TOP MOCHI (Smallest with a tiny leaf on head)
    ctx.beginPath();
    ctx.ellipse(0, -20, 54, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawFace(0, -24, 16, 5, 6);

    // Leaf on top head
    drawLeaf(ctx, 0, -44, -0.3, 14);

    ctx.restore();
  }
}

function drawHolidays(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "christmas") {
    // Elegant decorated Christmas tree with presents
    ctx.save();
    ctx.translate(cx, cy);

    // 3 Tier Pine Layers
    // Top tier
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.quadraticCurveTo(-25, -50, -45, -50);
    ctx.quadraticCurveTo(0, -40, 45, -50);
    ctx.quadraticCurveTo(25, -50, 0, -90);
    ctx.closePath();
    ctx.stroke();

    // Middle tier
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.quadraticCurveTo(-35, -5, -68, -5);
    ctx.quadraticCurveTo(0, 10, 68, -5);
    ctx.quadraticCurveTo(35, -5, 0, -50);
    ctx.closePath();
    ctx.stroke();

    // Bottom tier
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.quadraticCurveTo(-45, 45, -92, 45);
    ctx.quadraticCurveTo(0, 60, 92, 45);
    ctx.quadraticCurveTo(45, 45, 0, -5);
    ctx.closePath();
    ctx.stroke();

    // Tree Trunk
    ctx.strokeRect(-16, 48, 32, 28);

    // Star on Top
    drawStar(ctx, 0, -108, 22, 5, 8);

    // Ornaments (Baubles on the branches)
    const baubles = [
      { x: -20, y: -65, r: 8 }, { x: 25, y: -60, r: 7 },
      { x: -42, y: -22, r: 9 }, { x: 0, y: -20, r: 8 }, { x: 45, y: -24, r: 9 },
      { x: -65, y: 22, r: 10 }, { x: -25, y: 25, r: 9 }, { x: 28, y: 22, r: 10 }, { x: 68, y: 18, r: 9 }
    ];
    baubles.forEach(b => strokeCircle(ctx, b.x, b.y, b.r));

    // Garland ribbons sweeping across
    ctx.beginPath();
    ctx.arc(0, -80, 36, 0.4, Math.PI - 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -32, 60, 0.4, Math.PI - 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 15, 85, 0.4, Math.PI - 0.4);
    ctx.stroke();

    // Wrapped Gift Boxes at the base
    ctx.strokeRect(-65, 54, 42, 36); // Left gift
    ctx.beginPath(); // ribbon
    ctx.moveTo(-44, 54); ctx.lineTo(-44, 90);
    ctx.moveTo(-65, 72); ctx.lineTo(-23, 72);
    ctx.stroke();

    ctx.strokeRect(22, 46, 46, 44); // Right gift
    ctx.beginPath(); // ribbon
    ctx.moveTo(45, 46); ctx.lineTo(45, 90);
    ctx.moveTo(22, 68); ctx.lineTo(68, 68);
    ctx.stroke();

    ctx.restore();

  } else if (type === "pumpkin") {
    // Spooky Jack-o'-lantern carved pumpkin
    ctx.save();
    ctx.translate(cx, cy);

    // Pumpkin Stem (gnarled and twisted)
    ctx.beginPath();
    ctx.moveTo(-15, -70);
    ctx.bezierCurveTo(-25, -115, 10, -115, 5, -74);
    ctx.closePath();
    ctx.stroke();

    // Ribbed pumpkin body (layered ellipses from outer to inner)
    // Outer lobes
    strokeEllipse(ctx, 0, 0, 108, 80);
    // Mid lobes
    strokeEllipse(ctx, 0, 0, 84, 80);
    // Center lobe
    strokeEllipse(ctx, 0, 0, 52, 80);

    // Carved Spooky Triangle Eyes (cut-out look)
    ctx.beginPath();
    ctx.moveTo(-45, -20); ctx.lineTo(-15, -20); ctx.lineTo(-30, -42); ctx.closePath();
    ctx.moveTo(15, -20); ctx.lineTo(45, -20); ctx.lineTo(30, -42); ctx.closePath();
    ctx.stroke();

    // Triangle Nose
    ctx.beginPath();
    ctx.moveTo(-8, -2); ctx.lineTo(8, -2); ctx.lineTo(0, -14); ctx.closePath();
    ctx.stroke();

    // Jagged toothy grin mouth
    ctx.beginPath();
    ctx.moveTo(-65, 12);
    ctx.lineTo(-45, 32);
    ctx.lineTo(-32, 22); // tooth up
    ctx.lineTo(-18, 38);
    ctx.lineTo(0, 24); // tooth up
    ctx.lineTo(18, 38);
    ctx.lineTo(32, 22); // tooth up
    ctx.lineTo(45, 32);
    ctx.lineTo(65, 12);
    // bottom edge of mouth
    ctx.quadraticCurveTo(0, 68, -65, 12);
    ctx.closePath();
    ctx.stroke();

    // Little details: Two bats flying in background
    ctx.restore();
    // Left bat
    ctx.beginPath();
    ctx.moveTo(cx - 160, cy - 110);
    ctx.quadraticCurveTo(cx - 145, cy - 120, cx - 130, cy - 110);
    ctx.quadraticCurveTo(cx - 145, cy - 90, cx - 160, cy - 110);
    ctx.stroke();

  } else if (type === "cake") {
    // Festive three-tiered birthday cake
    ctx.save();
    ctx.translate(cx, cy);

    // Bottom tier (large block)
    ctx.strokeRect(-95, 30, 190, 65);
    // icing loops bottom
    ctx.beginPath();
    for (let x = -95; x < 95; x += 19) {
      ctx.arc(x + 9.5, 30, 9.5, Math.PI, 0, false);
    }
    ctx.stroke();

    // Middle tier
    ctx.strokeRect(-70, -35, 140, 65);
    // icing loops middle
    ctx.beginPath();
    for (let x = -70; x < 70; x += 20) {
      ctx.arc(x + 10, -35, 10, Math.PI, 0, false);
    }
    ctx.stroke();

    // Top tier
    ctx.strokeRect(-45, -100, 90, 65);
    // icing loops top
    ctx.beginPath();
    for (let x = -45; x < 45; x += 15) {
      ctx.arc(x + 7.5, -100, 7.5, Math.PI, 0, false);
    }
    ctx.stroke();

    // Burning Candles on top tier (3 candles)
    const candlesX = [-25, 0, 25];
    candlesX.forEach(cxVal => {
      // candle body
      ctx.strokeRect(cxVal - 4, -132, 8, 32);
      // wick
      ctx.beginPath();
      ctx.moveTo(cxVal, -132); ctx.lineTo(cxVal, -138);
      ctx.stroke();
      // teardrop flame (enclosed region)
      ctx.beginPath();
      ctx.moveTo(cxVal, -138);
      ctx.bezierCurveTo(cxVal - 6, -144, cxVal - 6, -156, cxVal, -158);
      ctx.bezierCurveTo(cxVal + 6, -156, cxVal + 6, -144, cxVal, -138);
      ctx.closePath();
      ctx.stroke();
    });

    // Decorative stars floating
    ctx.restore();
    drawStar(ctx, cx - 140, cy - 80, 16, 5, 6);
    drawStar(ctx, cx + 130, cy - 110, 18, 5, 7);
    drawStar(ctx, cx - 130, cy + 50, 14, 5, 5);

  } else if (type === "fireworks") {
    // Spectacular concentric fireworks bursts over skyline
    // City skyline at the bottom
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(25, h); ctx.lineTo(25, h - 35); ctx.lineTo(60, h - 35); ctx.lineTo(60, h);
    ctx.lineTo(85, h); ctx.lineTo(85, h - 60); ctx.lineTo(135, h - 60); ctx.lineTo(135, h - 25);
    ctx.lineTo(170, h - 25); ctx.lineTo(170, h - 75); ctx.lineTo(220, h - 75); ctx.lineTo(220, h);
    ctx.lineTo(w - 220, h);
    ctx.lineTo(w - 200, h - 85); ctx.lineTo(w - 150, h - 85); ctx.lineTo(w - 150, h - 30);
    ctx.lineTo(w - 90, h - 30); ctx.lineTo(w - 90, h - 70); ctx.lineTo(w - 30, h - 70); ctx.lineTo(w - 30, h);
    ctx.lineTo(w, h);
    ctx.stroke();

    // 3 Large firework burst centers
    const bursts = [
      { x: cx - 100, y: cy - 90, r: 75, petals: 12 },
      { x: cx + 110, y: cy - 70, r: 65, petals: 10 },
      { x: cx, y: cy + 40, r: 55, petals: 8 }
    ];

    bursts.forEach(b => {
      // Draw center concentric circles
      strokeCircle(ctx, b.x, b.y, 6);
      strokeCircle(ctx, b.x, b.y, 14);

      // Radiating sparkling trails (colorable teardrop-shaped sparks)
      for (let i = 0; i < b.petals; i++) {
        const angle = (i * Math.PI * 2) / b.petals;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Inner spark segment
        ctx.beginPath();
        ctx.moveTo(b.x + cos * 22, b.y + sin * 22);
        ctx.lineTo(b.x + cos * 42, b.y + sin * 42);
        ctx.stroke();

        // Outer diamond/starburst spark (large closed shape)
        ctx.beginPath();
        const ox = b.x + cos * b.r;
        const oy = b.y + sin * b.r;
        const perpX = -sin * 8;
        const perpY = cos * 8;
        ctx.moveTo(ox, oy);
        ctx.lineTo(b.x + cos * (b.r - 18) + perpX, b.y + sin * (b.r - 18) + perpY);
        ctx.lineTo(b.x + cos * (b.r - 28), b.y + sin * (b.r - 28));
        ctx.lineTo(b.x + cos * (b.r - 18) - perpX, b.y + sin * (b.r - 18) - perpY);
        ctx.closePath();
        ctx.stroke();
      }
    });

  } else if (type === "easter") {
    // Cute Easter Bunny holding a patterned egg inside a basket
    ctx.save();
    ctx.translate(cx, cy);

    // Easter Basket (woven rim)
    ctx.beginPath();
    ctx.ellipse(0, 55, 110, 24, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Woven basket base
    ctx.beginPath();
    ctx.moveTo(-100, 58);
    ctx.lineTo(-78, 115);
    ctx.quadraticCurveTo(0, 126, 78, 115);
    ctx.lineTo(100, 58);
    ctx.stroke();

    // Basket handle arching high
    ctx.beginPath();
    ctx.arc(0, 40, 112, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 40, 122, Math.PI, 0, false);
    ctx.stroke();

    // Cute bunny ears peaking out of the basket
    // Left ear
    ctx.beginPath();
    ctx.ellipse(-24, -45, 14, 46, -0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-24, -45, 7, 34, -0.15, 0, Math.PI * 2); // inner
    ctx.stroke();

    // Right ear
    ctx.beginPath();
    ctx.ellipse(24, -45, 14, 46, 0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(24, -45, 7, 34, 0.15, 0, Math.PI * 2); // inner
    ctx.stroke();

    // Bunny head
    strokeCircle(ctx, 0, 10, 48);

    // Bunny Kawaii Face
    ctx.beginPath();
    ctx.arc(-16, 6, 5, 0, Math.PI * 2);
    ctx.arc(16, 6, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#1E293B";
    ctx.fill();
    // Pink rosy cheeks
    strokeEllipse(ctx, -22, 12, 6, 3);
    strokeEllipse(ctx, 22, 12, 6, 3);
    // nose
    strokeCircle(ctx, 0, 14, 3);
    ctx.beginPath();
    ctx.arc(-4, 18, 4, 0, Math.PI, false);
    ctx.arc(4, 18, 4, 0, Math.PI, false);
    ctx.stroke();

    // Cute little paws holding a giant decorated easter egg
    strokeCircle(ctx, -28, 48, 12);
    strokeCircle(ctx, 28, 48, 12);

    // Giant Easter Egg in center of basket
    ctx.save();
    ctx.translate(0, 52);
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Egg patterns (zigzag and stripes)
    ctx.beginPath();
    ctx.moveTo(-35, -15); ctx.lineTo(35, -15);
    ctx.moveTo(-35, 15); ctx.lineTo(35, 15);
    ctx.moveTo(-36, 0); ctx.lineTo(-24, -8); ctx.lineTo(-12, 0); ctx.lineTo(0, -8); ctx.lineTo(12, 0); ctx.lineTo(24, -8); ctx.lineTo(36, 0);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

  } else if (type === "snowman") {
    // Happy winter snowman with snowflakes
    ctx.save();
    ctx.translate(cx, cy);

    // Three snowball tiers
    // Bottom ball
    strokeCircle(ctx, 0, 75, 54);
    // Middle ball
    strokeCircle(ctx, 0, 12, 42);
    // Head ball
    strokeCircle(ctx, 0, -44, 32);

    // Carrot nose
    ctx.beginPath();
    ctx.moveTo(-3, -44);
    ctx.lineTo(-32, -38);
    ctx.lineTo(0, -36);
    ctx.closePath();
    ctx.stroke();

    // Coal Eyes and Smile
    strokeCircle(ctx, -10, -50, 4);
    strokeCircle(ctx, 10, -50, 4);
    // Coal smile
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI * 0.2 + i * 0.15;
      strokeCircle(ctx, Math.cos(angle) * 16, -42 + Math.sin(angle) * 16, 2.5);
    }

    // Cozy striped snowman scarf
    ctx.beginPath();
    ctx.moveTo(-28, -20);
    ctx.quadraticCurveTo(0, -10, 28, -20);
    ctx.lineTo(24, -6);
    ctx.quadraticCurveTo(0, 4, -24, -6);
    ctx.closePath();
    ctx.stroke();
    // Hanging scarf flap
    ctx.strokeRect(10, -6, 14, 46);

    // Wooden twig arms
    ctx.beginPath();
    // Left arm
    ctx.moveTo(-38, 12); ctx.lineTo(-85, -2);
    ctx.moveTo(-72, 3); ctx.lineTo(-80, 15);
    ctx.moveTo(-65, 5); ctx.lineTo(-76, -12);
    // Right arm
    ctx.moveTo(38, 12); ctx.lineTo(85, -2);
    ctx.moveTo(72, 3); ctx.lineTo(80, 15);
    ctx.moveTo(65, 5); ctx.lineTo(76, -12);
    ctx.stroke();

    // Cool top hat
    ctx.strokeRect(-42, -76, 84, 12); // brim
    ctx.strokeRect(-28, -116, 56, 40); // cylinder top

    ctx.restore();

    // Floating giant decorative snowflakes in background
    drawStar(ctx, cx - 140, cy - 100, 15, 6, 5);
    drawStar(ctx, cx + 130, cy - 80, 15, 6, 5);
    drawStar(ctx, cx - 130, cy + 90, 12, 6, 4);

  } else if (type === "diwali") {
    // Elegant Oil Lamp (Diya) with flicking flame on Rangoli Mandala
    ctx.save();
    ctx.translate(cx, cy);

    // Concentric Rangoli Pattern (circular lines behind)
    strokeCircle(ctx, 0, 20, 130);
    strokeCircle(ctx, 0, 20, 110);
    strokeCircle(ctx, 0, 20, 90);

    // Symmetric Rangoli Petals radiating
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      strokeCircle(ctx, cos * 100, 20 + sin * 100, 14);
    }

    // Main clay diya base (bowl shape)
    ctx.beginPath();
    ctx.moveTo(-68, 5);
    ctx.quadraticCurveTo(0, -10, 68, 5);
    ctx.bezierCurveTo(68, 65, -68, 65, -68, 5);
    ctx.closePath();
    ctx.stroke();
    // Inner rim
    ctx.beginPath();
    ctx.moveTo(-54, 8);
    ctx.quadraticCurveTo(0, -4, 54, 8);
    ctx.bezierCurveTo(54, 50, -54, 50, -54, 8);
    ctx.closePath();
    ctx.stroke();

    // Glowing oil diya flame rising
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(-18, -25, -18, -62, 0, -82);
    ctx.bezierCurveTo(18, -62, 18, -25, 0, -12);
    ctx.closePath();
    ctx.stroke();

    // Inner flame layer (wick shape)
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.bezierCurveTo(-10, -22, -10, -48, 0, -62);
    ctx.bezierCurveTo(10, -48, 10, -22, 0, -15);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();

  } else {
    // Valentine Heart Bouquet with blooming roses
    ctx.save();
    ctx.translate(cx, cy);

    // Giant central framing heart
    ctx.beginPath();
    ctx.moveTo(0, 45);
    ctx.bezierCurveTo(-85, -45, -65, -105, 0, -52);
    ctx.bezierCurveTo(65, -105, 85, -45, 0, 45);
    ctx.closePath();
    ctx.stroke();

    // Ribbon bow at the bottom of the hearts/roses bouquet
    ctx.beginPath();
    ctx.ellipse(-15, 62, 16, 12, -0.4, 0, Math.PI * 2);
    ctx.ellipse(15, 62, 16, 12, 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(-8, 56, 16, 12); // center knot

    // Ribbon tails hanging down
    ctx.beginPath();
    ctx.moveTo(-8, 68); ctx.lineTo(-32, 115); ctx.lineTo(-12, 110); ctx.closePath();
    ctx.moveTo(8, 68); ctx.lineTo(32, 115); ctx.lineTo(12, 110); ctx.closePath();
    ctx.stroke();

    // 3 Detailed Roses arranged in a bouquet in the center of the heart
    ctx.save();
    ctx.translate(-26, -20);
    drawRoseFlower(ctx, 0, 0, 24);
    ctx.restore();

    ctx.save();
    ctx.translate(26, -20);
    drawRoseFlower(ctx, 0, 0, 24);
    ctx.restore();

    ctx.save();
    ctx.translate(0, 10);
    drawRoseFlower(ctx, 0, 0, 26);
    ctx.restore();

    // Little heart sparkles around the main heart bouquet
    ctx.restore();
    const floatingHearts = [
      { x: cx - 110, y: cy - 90, scale: 12 },
      { x: cx + 110, y: cy - 90, scale: 12 },
      { x: cx - 120, y: cy + 40, scale: 10 },
      { x: cx + 120, y: cy + 40, scale: 10 }
    ];

    floatingHearts.forEach(hData => {
      ctx.save();
      ctx.translate(hData.x, hData.y);
      ctx.beginPath();
      ctx.moveTo(0, hData.scale * 0.95);
      ctx.bezierCurveTo(-hData.scale * 1.8, -hData.scale, -hData.scale * 1.2, -hData.scale * 2.2, 0, -hData.scale);
      ctx.bezierCurveTo(hData.scale * 1.2, -hData.scale * 2.2, hData.scale * 1.8, -hData.scale, 0, hData.scale * 0.95);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });
  }
}

function drawCulture(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "dream") {
    // Beautiful Dreamcatcher with feathers
    ctx.save();
    ctx.translate(cx, cy - 35);

    // Outer double ring with beads
    strokeCircle(ctx, 0, 0, 85);
    strokeCircle(ctx, 0, 0, 75);

    // Small framing loops on the ring
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      strokeCircle(ctx, Math.cos(a) * 80, Math.sin(a) * 80, 4);
    }

    // Intricate web (connecting lines in a star pattern)
    ctx.beginPath();
    const vertices = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      vertices.push({ x: Math.cos(a) * 75, y: Math.sin(a) * 75 });
    }
    // outer star web
    for (let i = 0; i < 8; i++) {
      ctx.moveTo(vertices[i].x, vertices[i].y);
      ctx.lineTo(vertices[(i + 3) % 8].x, vertices[(i + 3) % 8].y);
    }
    ctx.stroke();

    // Center circular crystal/bead
    strokeCircle(ctx, 0, 0, 15);
    strokeCircle(ctx, 0, 0, 6);

    // Hanging strings for feathers
    ctx.beginPath();
    // left string
    ctx.moveTo(-52, 66); ctx.quadraticCurveTo(-65, 100, -60, 120);
    // center string
    ctx.moveTo(0, 75); ctx.lineTo(0, 135);
    // right string
    ctx.moveTo(52, 66); ctx.quadraticCurveTo(65, 100, 60, 120);
    ctx.stroke();

    // 3 Detailed hanging feathers with vanes
    const featherOffsets = [
      { x: -60, y: 155, scale: 32, rot: -0.2 },
      { x: 0, y: 175, scale: 40, rot: 0 },
      { x: 60, y: 155, scale: 32, rot: 0.2 }
    ];

    featherOffsets.forEach(f => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);

      // Feather main spine
      ctx.beginPath();
      ctx.moveTo(0, -f.scale);
      ctx.lineTo(0, f.scale);
      ctx.stroke();

      // Feather leaf shape
      ctx.beginPath();
      ctx.moveTo(0, -f.scale);
      ctx.bezierCurveTo(-f.scale * 0.45, -f.scale * 0.4, -f.scale * 0.45, f.scale * 0.4, 0, f.scale);
      ctx.bezierCurveTo(f.scale * 0.45, f.scale * 0.4, f.scale * 0.45, -f.scale * 0.4, 0, -f.scale);
      ctx.closePath();
      ctx.stroke();

      // Inner feather vane lines
      ctx.beginPath();
      for (let d = -f.scale * 0.6; d < f.scale * 0.6; d += 8) {
        ctx.moveTo(0, d);
        ctx.lineTo(-f.scale * 0.22, d - 6);
        ctx.moveTo(0, d);
        ctx.lineTo(f.scale * 0.22, d - 6);
      }
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();

  } else if (type === "celtic") {
    // Elegant interlocking Celtic Knot
    ctx.save();
    ctx.translate(cx, cy);

    // We make a triangular triquetra with double-lined bands that interlock
    const drawKnotLoop = (angle) => {
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.bezierCurveTo(-65, -15, -55, -95, 0, -100);
      ctx.bezierCurveTo(55, -95, 65, -15, 0, 20);
      ctx.closePath();
      ctx.stroke();

      // Outer parallel line for thick band look
      ctx.beginPath();
      ctx.moveTo(0, 36);
      ctx.bezierCurveTo(-82, -10, -70, -112, 0, -118);
      ctx.bezierCurveTo(70, -112, 82, -10, 0, 36);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    // Draw the 3 interlocking loops
    drawKnotLoop(0);
    drawKnotLoop((Math.PI * 2) / 3);
    drawKnotLoop((Math.PI * 4) / 3);

    // Inner binding ring (classic celtic design aspect)
    strokeCircle(ctx, 0, -25, 64);
    strokeCircle(ctx, 0, -25, 52);

    ctx.restore();

  } else if (type === "mosaic") {
    // Gorgeous circular geometric Sun Mosaic
    ctx.save();
    ctx.translate(cx, cy);

    // Central sun face ring
    strokeCircle(ctx, 0, 0, 48);
    // Sun face details
    ctx.beginPath();
    ctx.arc(-16, -10, 4, 0, Math.PI * 2);
    ctx.arc(16, -10, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#1E293B";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 8, 12, 0, Math.PI);
    ctx.stroke();

    // Outer framing ring
    strokeCircle(ctx, 0, 0, 140);
    strokeCircle(ctx, 0, 0, 125);

    // Radiating mosaic triangular sun rays
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const cosNext = Math.cos(a + Math.PI / 16);
      const sinNext = Math.sin(a + Math.PI / 16);

      // Inner ray border
      ctx.beginPath();
      ctx.moveTo(cos * 48, sin * 48);
      ctx.lineTo(cos * 125, sin * 125);
      ctx.stroke();

      // Mid concentric rings dividing the mosaic into blocks
      ctx.beginPath();
      ctx.arc(0, 0, 74, a, a + Math.PI / 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 100, a, a + Math.PI / 8);
      ctx.stroke();
    }

    ctx.restore();

  } else {
    // Gothic Cathedral Stained Glass Window
    ctx.save();
    ctx.translate(cx, cy);

    // Arch window outline
    ctx.beginPath();
    ctx.moveTo(-110, 130);
    ctx.lineTo(-110, -15);
    ctx.arc(0, -15, 110, Math.PI, 0, false);
    ctx.lineTo(110, 130);
    ctx.closePath();
    ctx.stroke();

    // Inner frame border
    ctx.beginPath();
    ctx.moveTo(-96, 130);
    ctx.lineTo(-96, -15);
    ctx.arc(0, -15, 96, Math.PI, 0, false);
    ctx.lineTo(96, 130);
    ctx.closePath();
    ctx.stroke();

    // Central Rose mandala inside the arch
    strokeCircle(ctx, 0, -15, 42);
    strokeCircle(ctx, 0, -15, 18);
    // Rose petals radiating
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 18, -15 + Math.sin(a) * 18);
      ctx.lineTo(Math.cos(a) * 42, -15 + Math.sin(a) * 42);
      ctx.stroke();
    }

    // Vertical dividing pillared shafts (Lancet panels)
    ctx.beginPath();
    ctx.moveTo(-44, 27); ctx.lineTo(-44, 130);
    ctx.moveTo(44, 27); ctx.lineTo(44, 130);
    ctx.moveTo(0, 27); ctx.lineTo(0, 130);
    ctx.stroke();

    // Horizontal panels (individual colored pane sections)
    for (let y = 50; y < 130; y += 30) {
      ctx.beginPath();
      ctx.moveTo(-96, y); ctx.lineTo(96, y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawVehicles(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "car") {
    // Detailed streamline modern Sports Car
    ctx.save();
    ctx.translate(cx, cy);

    // Main Car body silhouette
    ctx.beginPath();
    ctx.moveTo(-130, 32); // Front bumper bottom
    ctx.lineTo(-125, 12);
    ctx.quadraticCurveTo(-115, -6, -95, -8); // hood start
    ctx.lineTo(-58, -12); // hood slope
    ctx.quadraticCurveTo(-44, -38, -32, -45); // windshield start
    ctx.lineTo(34, -45); // roofline
    ctx.quadraticCurveTo(62, -22, 74, -2); // rear window slope
    ctx.lineTo(112, 4); // spoiler deck lid
    ctx.lineTo(125, 4); // spoiler wing tip
    ctx.lineTo(125, 22);
    ctx.lineTo(115, 38); // rear bumper
    ctx.quadraticCurveTo(50, 42, -130, 32); // bottom frame
    ctx.closePath();
    ctx.stroke();

    // Wheel Arches (Fender cutouts)
    ctx.save();
    ctx.beginPath();
    ctx.arc(-72, 34, 30, Math.PI, 0, false); // Front fender arch
    ctx.arc(68, 34, 30, Math.PI, 0, false); // Rear fender arch
    ctx.fillStyle = "#FFFFFF"; // Clear behind wheels
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Detailed Wheels (Tires and Alloy spoke rims)
    // Front Wheel
    strokeCircle(ctx, -72, 34, 25); // tire outer
    strokeCircle(ctx, -72, 34, 18); // rim
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(-72 + Math.cos(a) * 6, 34 + Math.sin(a) * 6);
      ctx.lineTo(-72 + Math.cos(a) * 18, 34 + Math.sin(a) * 18);
      ctx.stroke();
    }

    // Rear Wheel
    strokeCircle(ctx, 68, 34, 25); // tire outer
    strokeCircle(ctx, 68, 34, 18); // rim
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(68 + Math.cos(a) * 6, 34 + Math.sin(a) * 6);
      ctx.lineTo(68 + Math.cos(a) * 18, 34 + Math.sin(a) * 18);
      ctx.stroke();
    }

    // Cockpit Side Windows (divided)
    ctx.beginPath();
    ctx.moveTo(-28, -38);
    ctx.lineTo(24, -38);
    ctx.lineTo(44, -8);
    ctx.lineTo(-24, -8);
    ctx.closePath();
    ctx.stroke();
    // vertical division bar
    ctx.beginPath(); ctx.moveTo(6, -38); ctx.lineTo(6, -8); ctx.stroke();

    // Side doors and aero line
    ctx.beginPath();
    ctx.moveTo(-42, -5);
    ctx.quadraticCurveTo(5, 5, 45, -5);
    ctx.stroke();

    // Headlights & Tail-lights
    ctx.strokeRect(-124, 6, 12, 10);
    ctx.strokeRect(114, 10, 10, 12);

    ctx.restore();

  } else if (type === "motorcycle") {
    // Vintage Classic Motorcycle
    ctx.save();
    ctx.translate(cx, cy);

    // Front fork and handlebars
    ctx.beginPath();
    ctx.moveTo(-75, 42);
    ctx.lineTo(-38, -52); // fork line
    ctx.lineTo(-44, -62); // handlebar riser
    ctx.stroke();
    // handlebar cross
    ctx.beginPath();
    ctx.moveTo(-54, -58); ctx.lineTo(-25, -64);
    ctx.stroke();

    // Large Front Headlight
    strokeCircle(ctx, -50, -42, 14);

    // Frame chassis tubing
    ctx.beginPath();
    ctx.moveTo(-75, 42); // front wheel axle
    ctx.lineTo(-8, 35); // engine mount bottom
    ctx.lineTo(72, 42); // rear wheel axle
    ctx.lineTo(38, -18); // seat back
    ctx.lineTo(-25, -22); // fuel tank back
    ctx.lineTo(-38, -52); // headstock
    ctx.stroke();

    // Vintage Teardrop Fuel Tank
    ctx.beginPath();
    ctx.moveTo(-38, -48);
    ctx.bezierCurveTo(-18, -48, -4, -38, -12, -22);
    ctx.bezierCurveTo(-18, -18, -34, -20, -38, -48);
    ctx.closePath();
    ctx.stroke();

    // Classic Double Cylinder Engine block
    ctx.strokeRect(-22, -10, 24, 38);
    ctx.strokeRect(4, -10, 24, 38);
    // Cylinder cooling fins
    for (let fy = -6; fy < 24; fy += 6) {
      ctx.beginPath(); ctx.moveTo(-22, fy); ctx.lineTo(2, fy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, fy); ctx.lineTo(28, fy); ctx.stroke();
    }

    // Vintage exhaust pipe
    ctx.beginPath();
    ctx.moveTo(-8, 25);
    ctx.lineTo(65, 25);
    ctx.lineTo(82, 32);
    ctx.stroke();

    // Leather double seat
    ctx.beginPath();
    ctx.moveTo(-18, -20);
    ctx.quadraticCurveTo(15, -28, 38, -18);
    ctx.lineTo(32, -10);
    ctx.lineTo(-12, -10);
    ctx.closePath();
    ctx.stroke();

    // Front Wheel (large spokes)
    strokeCircle(ctx, -75, 42, 34); // outer tire
    strokeCircle(ctx, -75, 42, 24); // rim
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(-75, 42);
      ctx.lineTo(-75 + Math.cos(a) * 24, 42 + Math.sin(a) * 24);
      ctx.stroke();
    }

    // Rear Wheel (large spokes)
    strokeCircle(ctx, 72, 42, 34); // outer tire
    strokeCircle(ctx, 72, 42, 24); // rim
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(72, 42);
      ctx.lineTo(72 + Math.cos(a) * 24, 42 + Math.sin(a) * 24);
      ctx.stroke();
    }

    ctx.restore();

  } else if (type === "train") {
    // Heavy Steam Locomotive Train chugging
    ctx.save();
    ctx.translate(cx, cy);

    // Boiler Body with rivets
    ctx.strokeRect(-95, -24, 135, 62);
    // Boiler nose round cap
    ctx.beginPath();
    ctx.arc(-95, 7, 31, Math.PI / 2, Math.PI * 1.5, false);
    ctx.stroke();

    // Cowcatcher (front iron wedge)
    ctx.beginPath();
    ctx.moveTo(-115, 38);
    ctx.lineTo(-135, 62);
    ctx.lineTo(-95, 62);
    ctx.closePath();
    ctx.stroke();

    // Smokestack with chugging smoke clouds
    ctx.strokeRect(-82, -56, 18, 32);
    drawFluffyCloud(ctx, -72, -92, 24);
    drawFluffyCloud(ctx, -38, -112, 32);
    drawFluffyCloud(ctx, 15, -125, 42);

    // Cabin Dome with driver window
    ctx.beginPath();
    ctx.moveTo(40, -24);
    ctx.lineTo(40, -62);
    ctx.lineTo(95, -62);
    ctx.lineTo(95, 38);
    ctx.lineTo(40, 38);
    ctx.stroke();
    // window
    ctx.strokeRect(52, -50, 28, 32);

    // Massive Iron Wheels with side pistons
    const wheelY = 56;
    const wheelsX = [-55, -2, 48];
    wheelsX.forEach(wx => {
      strokeCircle(ctx, wx, wheelY, 24); // outer
      strokeCircle(ctx, wx, wheelY, 18); // rim
      // wheel spokes
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(wx, wheelY);
        ctx.lineTo(wx + Math.cos(a) * 18, wheelY + Math.sin(a) * 18);
        ctx.stroke();
      }
    });

    // Piston connecting rod bar across all wheels
    ctx.strokeRect(-68, 52, 132, 6);

    ctx.restore();

  } else if (type === "ship") {
    // Majestic tall Sailing Pirate Galleon
    ctx.save();
    ctx.translate(cx, cy);

    // Detailed Wooden Hull (layered boards)
    ctx.beginPath();
    ctx.moveTo(-125, 15);
    ctx.lineTo(105, 10);
    ctx.quadraticCurveTo(125, 20, 115, 45); // high stern
    ctx.quadraticCurveTo(80, 74, -5, 74); // keel base
    ctx.quadraticCurveTo(-95, 72, -115, 42); // bow curves
    ctx.closePath();
    ctx.stroke();

    // Hull wood planks
    ctx.beginPath();
    ctx.moveTo(-118, 32); ctx.quadraticCurveTo(0, 48, 118, 32);
    ctx.moveTo(-110, 52); ctx.quadraticCurveTo(0, 64, 98, 56);
    ctx.stroke();

    // Cannon ports on side hull
    for (let cxVal = -60; cxVal <= 60; cxVal += 40) {
      ctx.strokeRect(cxVal - 8, 16, 16, 14);
      strokeCircle(ctx, cxVal, 23, 4); // cannon barrel tip
    }

    // 3 Tall Masts
    ctx.strokeRect(-72, -116, 8, 131); // fore mast
    ctx.strokeRect(0, -135, 10, 145);  // main mast
    ctx.strokeRect(65, -95, 8, 105);   // mizzen mast

    // Billing wind-blown sails
    // Fore Mast sails (2 sails)
    ctx.beginPath();
    ctx.moveTo(-105, -100); ctx.quadraticCurveTo(-72, -92, -68, -100);
    ctx.quadraticCurveTo(-85, -62, -105, -60);
    ctx.quadraticCurveTo(-72, -54, -68, -60);
    ctx.stroke();

    // Main Mast giant sails (2 layers)
    ctx.beginPath();
    ctx.moveTo(-45, -120); ctx.quadraticCurveTo(0, -110, 42, -120);
    ctx.quadraticCurveTo(0, -74, -45, -74);
    ctx.quadraticCurveTo(0, -68, 42, -74);
    ctx.stroke();

    // Flying flags
    ctx.beginPath();
    ctx.moveTo(0, -135); ctx.lineTo(24, -130); ctx.lineTo(0, -125); ctx.closePath();
    ctx.stroke();

    // Ocean waves at keel
    ctx.restore();
    ctx.beginPath();
    for (let x = cx - 145; x < cx + 145; x += 35) {
      ctx.arc(x + 17.5, cy + 72, 17.5, Math.PI, 0, false);
    }
    ctx.stroke();

  } else if (type === "airplane") {
    // Retro vintage Propeller Biplane
    ctx.save();
    ctx.translate(cx, cy);

    // Fuselage (body teardrop)
    ctx.beginPath();
    ctx.ellipse(0, 0, 95, 24, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Rear rudder stabilizer fin
    ctx.beginPath();
    ctx.moveTo(80, -12);
    ctx.lineTo(105, -45);
    ctx.lineTo(112, -45);
    ctx.lineTo(95, 12);
    ctx.stroke();

    // Propeller Nose Cone and blades (spinning arcs)
    ctx.beginPath();
    ctx.arc(-95, 0, 12, -Math.PI / 2, Math.PI / 2, true);
    ctx.stroke();
    // Spin propeller blades
    ctx.strokeRect(-102, -58, 6, 116);

    // Double Wings (Biplane look with vertical connecting struts)
    // Upper Wing (straight long oval)
    ctx.beginPath();
    ctx.ellipse(-20, -56, 105, 11, 0.02, 0, Math.PI * 2);
    ctx.stroke();

    // Lower Wing (slightly shorter)
    ctx.beginPath();
    ctx.ellipse(-15, 36, 88, 10, -0.02, 0, Math.PI * 2);
    ctx.stroke();

    // Wing struts connecting top and bottom
    ctx.strokeRect(-92, -45, 6, 72);
    ctx.strokeRect(55, -45, 6, 72);

    // Little cockpit windshield and pilot helmet shape
    ctx.strokeRect(-15, -34, 16, 10);
    strokeCircle(ctx, 4, -30, 8); // pilot head

    // Little landing wheels under plane
    ctx.strokeRect(-55, 24, 8, 30);
    strokeCircle(ctx, -51, 54, 12);

    ctx.restore();

    // Chugging through high clouds
    drawFluffyCloud(ctx, cx - 165, cy - 110, 26);
    drawFluffyCloud(ctx, cx + 130, cy + 90, 32);

  } else {
    // Heavy Space Rocket launching
    ctx.save();
    ctx.translate(cx, cy);

    // Rocket body tube (capsule)
    ctx.strokeRect(-28, -60, 56, 110);

    // Nose Cone (triangular pointed top)
    ctx.beginPath();
    ctx.moveTo(-28, -60);
    ctx.quadraticCurveTo(0, -140, 0, -145);
    ctx.quadraticCurveTo(0, -140, 28, -60);
    ctx.closePath();
    ctx.stroke();

    // Giant circular porthole window (astronaut visible)
    strokeCircle(ctx, 0, -15, 22);
    strokeCircle(ctx, 0, -15, 15);

    // Symmetrical Side Fins
    // Left Fin
    ctx.beginPath();
    ctx.moveTo(-28, 15);
    ctx.lineTo(-62, 65);
    ctx.lineTo(-28, 50);
    ctx.closePath();
    ctx.stroke();

    // Right Fin
    ctx.beginPath();
    ctx.moveTo(28, 15);
    ctx.lineTo(62, 65);
    ctx.lineTo(28, 50);
    ctx.closePath();
    ctx.stroke();

    // Engine booster flame nozzle on bottom
    ctx.strokeRect(-16, 50, 32, 12);

    // Billowing massive exhaust smoke clouds and fire thrust
    ctx.restore();
    // Fire thrust (pointed wedges)
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy + 62); ctx.lineTo(cx, cy + 135); ctx.lineTo(cx + 15, cy + 62);
    ctx.stroke();

    // Surrounding launch smoke clouds
    drawFluffyCloud(ctx, cx - 62, cy + 110, 38);
    drawFluffyCloud(ctx, cx + 62, cy + 110, 38);
    drawFluffyCloud(ctx, cx - 110, cy + 135, 46);
    drawFluffyCloud(ctx, cx + 110, cy + 135, 46);
  }
}

function drawFood(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "pizza") {
    // Delicious Pizza Slice with toppings
    ctx.save();
    ctx.translate(cx, cy);

    // Outer thick crust
    ctx.beginPath();
    ctx.moveTo(-115, 66);
    ctx.quadraticCurveTo(0, 95, 115, 66); // crust outer edge
    ctx.lineTo(102, 42);
    ctx.quadraticCurveTo(0, 72, -102, 42); // crust inner edge
    ctx.closePath();
    ctx.stroke();

    // Crust detail (colorable texture loops)
    ctx.beginPath();
    for (let x = -105; x <= 105; x += 30) {
      ctx.arc(x, 56, 12, 0, Math.PI, true);
    }
    ctx.stroke();

    // Triangular slice body
    ctx.beginPath();
    ctx.moveTo(-102, 42);
    ctx.lineTo(0, -115); // tip of slice
    ctx.lineTo(102, 42);
    ctx.stroke();

    // Pepperoni slices (large clear circles)
    const pepperonis = [
      { x: -35, y: 15 }, { x: 35, y: 15 }, { x: 0, y: -25 },
      { x: -18, y: -65 }, { x: 22, y: -45 }, { x: 0, y: 34 }
    ];
    pepperonis.forEach(p => {
      strokeCircle(ctx, p.x, p.y, 14);
      strokeCircle(ctx, p.x, p.y, 11); // inner rim
    });

    // Small mushrooms (umbrella shapes)
    const mushrooms = [{ x: -62, y: 22 }, { x: 62, y: 22 }, { x: -18, y: -15 }, { x: 22, y: -10 }];
    mushrooms.forEach(m => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, 10, Math.PI, 0, false);
      ctx.lineTo(m.x + 4, m.y);
      ctx.lineTo(m.x + 4, m.y + 10);
      ctx.lineTo(m.x - 4, m.y + 10);
      ctx.lineTo(m.x - 4, m.y);
      ctx.closePath();
      ctx.stroke();
    });

    ctx.restore();

  } else if (type === "sushi") {
    // Beautiful Sushi Roll and Nigiri on a wooden platter
    ctx.save();
    ctx.translate(cx, cy);

    // Wooden serving board (slanted block)
    ctx.beginPath();
    ctx.moveTo(-135, 45);
    ctx.lineTo(115, 35);
    ctx.lineTo(130, 85);
    ctx.lineTo(-120, 95);
    ctx.closePath();
    ctx.stroke();

    // Board feet
    ctx.strokeRect(-110, 95, 18, 12);
    ctx.strokeRect(95, 85, 18, 12);

    // Two Sushi Maki Rolls (cylindrical)
    // Roll 1
    ctx.save();
    ctx.translate(-65, 20);
    strokeEllipse(ctx, 0, 0, 24, 15); // top rice face
    strokeEllipse(ctx, 0, 0, 11, 7);   // inner fish core
    ctx.beginPath(); // roll side walls
    ctx.moveTo(-24, 0); ctx.lineTo(-24, 34);
    ctx.moveTo(24, 0); ctx.lineTo(24, 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 34, 24, 15, 0, 0, Math.PI, false); // bottom rim
    ctx.stroke();
    ctx.restore();

    // Roll 2
    ctx.save();
    ctx.translate(-15, 16);
    strokeEllipse(ctx, 0, 0, 24, 15);
    strokeEllipse(ctx, 0, 0, 11, 7);
    ctx.beginPath();
    ctx.moveTo(-24, 0); ctx.lineTo(-24, 34);
    ctx.moveTo(24, 0); ctx.lineTo(24, 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 34, 24, 15, 0, 0, Math.PI, false);
    ctx.stroke();
    ctx.restore();

    // Salmon Nigiri (sushi rice block with fish on top)
    ctx.save();
    ctx.translate(55, 15);
    // Fish slab (slanted curve)
    ctx.beginPath();
    ctx.moveTo(-35, -5);
    ctx.quadraticCurveTo(0, -22, 35, -8);
    ctx.lineTo(24, 18);
    ctx.quadraticCurveTo(-10, 14, -30, 26);
    ctx.closePath();
    ctx.stroke();
    // Rice base showing underneath
    ctx.beginPath();
    ctx.moveTo(-28, 22); ctx.lineTo(-28, 32); ctx.quadraticCurveTo(0, 25, 22, 18);
    ctx.stroke();
    // Salmon fat stripes
    ctx.beginPath();
    ctx.moveTo(-15, -12); ctx.lineTo(-22, 18);
    ctx.moveTo(0, -14); ctx.lineTo(-5, 16);
    ctx.moveTo(15, -12); ctx.lineTo(10, 17);
    ctx.stroke();
    ctx.restore();

    // Pair of wooden Chopsticks lying across the platter
    ctx.beginPath();
    ctx.moveTo(-105, -35); ctx.lineTo(95, 30);
    ctx.moveTo(-100, -28); ctx.lineTo(100, 37);
    ctx.stroke();

    ctx.restore();

  } else if (type === "donuts") {
    // Two yummy glazed donuts with sprinkles
    ctx.save();
    ctx.translate(cx, cy);

    // Front/Main Donut
    ctx.save();
    ctx.translate(-35, 15);
    strokeCircle(ctx, 0, 0, 60); // outer ring
    strokeCircle(ctx, 0, 0, 20); // inner hole

    // Dripping frosting glaze border
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();
    // frosting drips
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      strokeCircle(ctx, cos * 44, sin * 44, 8);
    }

    // Sprinkles (tiny colorable pill shapes)
    const sprinkles1 = [
      { x: -32, y: -22, rot: 0.4 }, { x: 30, y: -25, rot: -0.5 },
      { x: -35, y: 22, rot: 1.2 }, { x: 32, y: 24, rot: -1.1 },
      { x: 0, y: -42, rot: 0 }, { x: 0, y: 40, rot: 1.5 },
      { x: -44, y: 0, rot: -0.4 }, { x: 44, y: 2, rot: 0.6 }
    ];
    sprinkles1.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.strokeRect(-8, -3, 16, 6); // sprinkle pill
      ctx.restore();
    });
    ctx.restore();

    // Rear Donut (overlapping)
    ctx.save();
    ctx.translate(45, -35);
    strokeCircle(ctx, 0, 0, 52);
    strokeCircle(ctx, 0, 0, 18);
    // Frosting
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();
    // Sprinkles
    const sprinkles2 = [
      { x: -25, y: -20, rot: -0.4 }, { x: 25, y: -22, rot: 0.3 },
      { x: -28, y: 20, rot: 0.8 }, { x: 26, y: 20, rot: -0.9 }
    ];
    sprinkles2.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.strokeRect(-6, -2.5, 12, 5);
      ctx.restore();
    });
    ctx.restore();

    ctx.restore();

  } else if (type === "cupcakes") {
    // Beautiful Frosted Cupcake with a cherry on top
    ctx.save();
    ctx.translate(cx, cy);

    // Ribbed cupcake paper wrapper (base)
    ctx.beginPath();
    ctx.moveTo(-45, 12);
    ctx.lineTo(-32, 95);
    ctx.lineTo(32, 95);
    ctx.lineTo(45, 12);
    ctx.closePath();
    ctx.stroke();

    // Vertical folds in the wrapper
    for (let x = -35; x <= 35; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x * 0.72, 95);
      ctx.stroke();
    }

    // Overlapping cloud-like frosting (layered loops)
    ctx.beginPath();
    ctx.arc(-35, -5, 18, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.arc(-20, -28, 22, Math.PI * 0.8, Math.PI * 1.8, false);
    ctx.arc(0, -42, 24, Math.PI, 0, false);
    ctx.arc(20, -28, 22, -Math.PI * 0.8, -Math.PI * 0.2, false);
    ctx.arc(35, -5, 18, -Math.PI * 0.5, Math.PI * 0.5, false);
    ctx.quadraticCurveTo(0, 12, -35, -5);
    ctx.closePath();
    ctx.stroke();

    // Swirl folds inside the frosting
    ctx.beginPath();
    ctx.arc(-15, -12, 14, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(15, -12, 14, -Math.PI * 0.5, 0);
    ctx.stroke();

    // Sprinkles on frosting
    const spr = [{ x: -22, y: -12 }, { x: 22, y: -12 }, { x: -8, y: -26 }, { x: 12, y: -22 }];
    spr.forEach(s => strokeCircle(ctx, s.x, s.y, 3));

    // Cherry on top
    strokeCircle(ctx, 0, -62, 12);
    ctx.beginPath(); // stem
    ctx.moveTo(2, -73);
    ctx.quadraticCurveTo(15, -95, 8, -105);
    ctx.stroke();

    ctx.restore();

  } else if (type === "fruit") {
    // Elegant woven Fruit Basket
    ctx.save();
    ctx.translate(cx, cy);

    // Oval basket bowl
    ctx.beginPath();
    ctx.ellipse(0, 36, 95, 26, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Woven cross hatch on basket base
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 36, 95, 0, Math.PI, false);
    ctx.lineTo(75, 95);
    ctx.lineTo(-75, 95);
    ctx.closePath();
    ctx.clip();
    // horizontal lines
    for (let y = 36; y <= 100; y += 14) {
      ctx.beginPath(); ctx.moveTo(-110, y); ctx.lineTo(110, y); ctx.stroke();
    }
    // vertical segments
    for (let x = -90; x <= 90; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 36); ctx.lineTo(x, 100); ctx.stroke();
    }
    ctx.restore();
    // Redraw basket base boundary
    ctx.beginPath();
    ctx.moveTo(-95, 36);
    ctx.quadraticCurveTo(-90, 85, -75, 95);
    ctx.quadraticCurveTo(0, 102, 75, 95);
    ctx.quadraticCurveTo(90, 85, 95, 36);
    ctx.stroke();

    // Apples, Pears, and Bananas inside the basket
    // Red apple left
    strokeCircle(ctx, -42, 15, 26);
    ctx.beginPath(); // stem
    ctx.moveTo(-42, -10); ctx.lineTo(-44, -18); ctx.stroke();

    // Orange right (with slices texture)
    strokeCircle(ctx, 42, 18, 25);
    strokeCircle(ctx, 42, 18, 3); // center dot

    // Banana (long crescent overlapping in front)
    ctx.beginPath();
    ctx.moveTo(-82, 12);
    ctx.quadraticCurveTo(0, 52, 78, 14);
    ctx.quadraticCurveTo(0, 34, -82, 12);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();

  } else if (type === "pancakes") {
    // A towering stack of 5 delicious pancakes with melting syrup
    ctx.save();
    ctx.translate(cx, cy);

    // Stack of 5 pancakes (layered ellipses from bottom to top)
    const pancakesY = [68, 46, 24, 2, -20];
    pancakesY.forEach((py, index) => {
      ctx.beginPath();
      // Pancake rim
      ctx.ellipse(0, py, 100 - index * 2, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Square of butter on top pancake
    ctx.strokeRect(-16, -34, 32, 20);

    // Thick syrup dripping down the side (wavy curves)
    ctx.beginPath();
    ctx.moveTo(-42, -22);
    ctx.bezierCurveTo(-45, 0, -52, 15, -44, 32);
    ctx.bezierCurveTo(-38, 35, -30, 25, -34, 12);
    ctx.bezierCurveTo(-30, 0, -22, -10, -18, -21);
    ctx.stroke();

    ctx.restore();

  } else if (type === "coffee") {
    // Warm Steaming Coffee Mug with Latte Art
    ctx.save();
    ctx.translate(cx, cy);

    // Saucer Plate under mug
    ctx.beginPath();
    ctx.ellipse(0, 85, 115, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 85, 85, 12, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Porcelain Mug Body
    ctx.beginPath();
    ctx.ellipse(0, -32, 72, 18, 0, 0, Math.PI * 2); // rim
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-72, -32);
    ctx.lineTo(-58, 68);
    ctx.quadraticCurveTo(0, 86, 58, 68);
    ctx.lineTo(72, -32);
    ctx.stroke();

    // Coffee liquid surface level
    ctx.beginPath();
    ctx.ellipse(0, -26, 62, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Cocoa Heart Latte Art in center of liquid
    ctx.save();
    ctx.translate(0, -26);
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-22, -10, -16, -24, 0, -12);
    ctx.bezierCurveTo(16, -24, 22, -10, 0, 10);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Big Mug Handle on the right side
    ctx.beginPath();
    ctx.moveTo(68, -20);
    ctx.bezierCurveTo(115, -20, 110, 52, 58, 52);
    ctx.stroke();

    // Rising steam lines
    ctx.beginPath();
    ctx.moveTo(-25, -58); ctx.quadraticCurveTo(-35, -92, -22, -112);
    ctx.moveTo(0, -62); ctx.quadraticCurveTo(12, -96, -2, -122);
    ctx.moveTo(25, -58); ctx.quadraticCurveTo(15, -92, 28, -112);
    ctx.stroke();

    ctx.restore();

  } else {
    // Candy Collection (Lollipops and wrapped candies)
    ctx.save();
    ctx.translate(cx, cy);

    // 1. Swirly Giant Lollipop (left)
    ctx.save();
    ctx.translate(-58, -25);
    strokeCircle(ctx, 0, 0, 42);
    // spiral swirl lines
    for (let r = 8; r <= 36; r += 10) {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 1.5); ctx.stroke();
    }
    // lollipop stick
    ctx.beginPath(); ctx.moveTo(0, 42); ctx.lineTo(0, 125); ctx.stroke();
    ctx.restore();

    // 2. Wrapped sweet candy with bows (right)
    ctx.save();
    ctx.translate(52, -15);
    strokeCircle(ctx, 0, 0, 24); // central candy ball
    // wrapping twist wings
    ctx.beginPath();
    ctx.moveTo(-24, 0); ctx.lineTo(-44, -18); ctx.lineTo(-44, 18); ctx.closePath();
    ctx.moveTo(24, 0); ctx.lineTo(44, -18); ctx.lineTo(44, 18); ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // 3. Cute Gummy Bear silhouette (center bottom)
    ctx.save();
    ctx.translate(-5, 62);
    // head and ears
    strokeCircle(ctx, 0, -22, 15);
    strokeCircle(ctx, -12, -34, 6);
    strokeCircle(ctx, 12, -34, 6);
    // body and limbs
    strokeCircle(ctx, 0, 10, 22); // body
    strokeCircle(ctx, -18, -6, 7);  // arms
    strokeCircle(ctx, 18, -6, 7);
    strokeCircle(ctx, -14, 28, 9);  // legs
    strokeCircle(ctx, 14, 28, 9);
    ctx.restore();

    ctx.restore();
  }
}

function drawPatterns(ctx, w, h, type) {
  initCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;

  if (type === "zen") {
    // Beautiful Zen Geometric Mandala
    ctx.save();
    ctx.translate(cx, cy);

    // Multiple layered concentric circles with custom sub-designs
    strokeCircle(ctx, 0, 0, 140);
    strokeCircle(ctx, 0, 0, 128);
    strokeCircle(ctx, 0, 0, 100);
    strokeCircle(ctx, 0, 0, 72);
    strokeCircle(ctx, 0, 0, 42);
    strokeCircle(ctx, 0, 0, 16);

    // Inner flower petals (central star)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-10, -20, 10, -20, 0, -42);
      ctx.bezierCurveTo(10, -20, -10, -20, 0, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Middle tier scalloped loops (concentric rings patterns)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.arc(0, -86, 14, 0, Math.PI, false);
      ctx.stroke();
      ctx.restore();
    }

    // Outer radiating spiked sunburst segments
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -100);
      ctx.lineTo(-8, -114);
      ctx.lineTo(0, -128);
      ctx.lineTo(8, -114);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Frame beads on outer edge
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
      strokeCircle(ctx, Math.cos(a) * 134, Math.sin(a) * 134, 3);
    }

    ctx.restore();

  } else if (type === "floral") {
    // Intricate Floral Blossom Mandala
    ctx.save();
    ctx.translate(cx, cy);

    strokeCircle(ctx, 0, 0, 135);
    strokeCircle(ctx, 0, 0, 120);

    // Central floral core
    strokeCircle(ctx, 0, 0, 24);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      strokeCircle(ctx, Math.cos(a) * 12, Math.sin(a) * 12, 6);
    }

    // First layer of large rose petals
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.bezierCurveTo(-35, -45, -25, -75, 0, -75);
      ctx.bezierCurveTo(25, -75, 35, -45, 0, -24);
      ctx.closePath();
      ctx.stroke();

      // Vein line inside petal
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(0, -66);
      ctx.stroke();
      ctx.restore();
    }

    // Second outer layer of overlapping pointed petals
    for (let a = Math.PI / 8; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.quadraticCurveTo(-45, -80, 0, -120);
      ctx.quadraticCurveTo(45, -80, 0, -56);
      ctx.closePath();
      ctx.stroke();

      // inner parallel trim line for coloring
      ctx.beginPath();
      ctx.moveTo(0, -68);
      ctx.quadraticCurveTo(-30, -88, 0, -112);
      ctx.quadraticCurveTo(30, -88, 0, -68);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

  } else if (type === "mehndi") {
    // Detailed Traditional Mehndi (Henna Lace) with Lotus Center
    ctx.save();
    ctx.translate(cx, cy);

    strokeCircle(ctx, 0, 0, 138);

    // 1. Central Blooming Lotus Flower
    ctx.beginPath();
    // Center petal
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(-15, -15, -15, -35, 0, -45);
    ctx.bezierCurveTo(15, -35, 15, -15, 0, 14);
    ctx.closePath();
    ctx.stroke();

    // Side petals
    for (let side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.bezierCurveTo(side * 28, 5, side * 35, -25, side * 15, -38);
      ctx.bezierCurveTo(side * 8, -25, 0, -15, 0, 14);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(side * 5, 14);
      ctx.bezierCurveTo(side * 42, 18, side * 45, -5, side * 28, -22);
      ctx.closePath();
      ctx.stroke();
    }

    // 2. Surrounding concentric Henna bands with scallops & dots
    strokeCircle(ctx, 0, 0, 68);
    strokeCircle(ctx, 0, 0, 80);

    // Inner ring scallops
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.arc(0, -74, 5, 0, Math.PI, false);
      ctx.stroke();
      ctx.restore();
    }

    strokeCircle(ctx, 0, 0, 105);
    strokeCircle(ctx, 0, 0, 118);

    // Outer ring teardrop bead drops
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      strokeCircle(ctx, cos * 111, sin * 111, 3);
      // Small petal arch
      ctx.beginPath();
      ctx.arc(cos * 126, sin * 126, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

  } else {
    // Exquisite Classic Paisley Teardrop Motif
    ctx.save();
    ctx.translate(cx, cy);

    // Overall border frame surrounding the paisley
    ctx.beginPath();
    ctx.ellipse(0, 0, 138, 138, 0, 0, Math.PI * 2);
    ctx.stroke();

    // The main signature Paisley teardrop curving at the top
    ctx.beginPath();
    ctx.moveTo(12, 105);
    ctx.bezierCurveTo(-115, 45, -110, -75, -5, -112);
    ctx.bezierCurveTo(35, -125, 75, -135, 75, -100); // curly tip
    ctx.bezierCurveTo(75, -75, 45, -70, 42, -55);
    ctx.bezierCurveTo(32, -35, 78, 55, 12, 105);
    ctx.closePath();
    ctx.stroke();

    // Inner parallel paisley wall for double outline effect
    ctx.beginPath();
    ctx.moveTo(10, 86);
    ctx.bezierCurveTo(-95, 35, -90, -60, -4, -94);
    ctx.bezierCurveTo(24, -104, 55, -108, 55, -92);
    ctx.bezierCurveTo(55, -76, 32, -72, 28, -50);
    ctx.bezierCurveTo(18, -30, 58, 45, 10, 86);
    ctx.closePath();
    ctx.stroke();

    // Mandala-like design inside the bottom of the Paisley
    ctx.save();
    ctx.translate(-22, 22);
    strokeCircle(ctx, 0, 0, 36);
    strokeCircle(ctx, 0, 0, 22);
    strokeCircle(ctx, 0, 0, 8);
    // flower spokes inside the paisley
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
      ctx.stroke();
    }
    ctx.restore();

    // Curly vines inside the top hook
    ctx.beginPath();
    ctx.moveTo(15, -24);
    ctx.quadraticCurveTo(34, -46, 22, -68);
    ctx.quadraticCurveTo(12, -85, 34, -92);
    ctx.stroke();

    ctx.restore();
  }
}

// 50+ High Quality Templates Definition
export const TEMPLATES = [
  // NATURE (8 templates)
  {
    id: "rose_bouquet",
    name: "Rose Bouquet",
    category: "Nature",
    difficulty: "Medium",
    description: "A gorgeous bouquet of blooming roses and leafy stems.",
    draw: (ctx, w, h) => drawNature(ctx, w, h, "rose")
  },
  {
    id: "sunflower_garden",
    name: "Sunflower Garden",
    category: "Nature",
    difficulty: "Easy",
    description: "A giant cheerful sunflower rising under the sky.",
    draw: (ctx, w, h) => drawNature(ctx, w, h, "sunflower")
  },
  {
    id: "cherry_blossom",
    name: "Cherry Blossom",
    category: "Nature",
    difficulty: "Medium",
    description: "Graceful branches covered with blooming cherry blossom petals.",
    draw: (ctx, w, h) => drawNature(ctx, w, h, "cherry")
  },
  {
    id: "tropical_leaves",
    name: "Tropical Leaves",
    category: "Nature",
    difficulty: "Easy",
    description: "A collection of beautiful Monstera and jungle leaves.",
    draw: (ctx, w, h) => drawNature(ctx, w, h, "leaves")
  },
  {
    id: "forest_cabin",
    name: "Forest Cabin",
    category: "Nature",
    difficulty: "Advanced",
    description: "A cozy log cabin nestled among towering pine trees.",
    draw: (ctx, w, h) => drawNature(ctx, w, h, "cabin")
  },
  {
    id: "mountain_landscape",
    name: "Mountain Landscape",
    category: "Nature",
    difficulty: "Easy",
    description: "Majestic mountain peaks with a rising sun and flowing river.",
    draw: (ctx, w, h) => drawNature(ctx, w, h, "mountain")
  },
  {
    id: "butterfly_garden",
    name: "Butterfly Garden",
    category: "Nature",
    difficulty: "Medium",
    description: "Elegant butterflies fluttering in a lovely summer breeze.",
    draw: (ctx, w, h) => drawNature(ctx, w, h, "butterfly")
  },
  {
    id: "koi_pond",
    name: "Koi Pond",
    category: "Nature",
    difficulty: "Advanced",
    description: "Two graceful koi fish swimming in a tranquil circling motion.",
    draw: (ctx, w, h) => drawNature(ctx, w, h, "koi")
  },

  // ANIMALS (10 templates)
  {
    id: "sleepy_kitten",
    name: "Sleepy Kitten",
    category: "Animals",
    difficulty: "Easy",
    description: "An adorable sleepy kitten with cute whiskers.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "kitten")
  },
  {
    id: "golden_retriever",
    name: "Golden Retriever",
    category: "Animals",
    difficulty: "Medium",
    description: "A happy, smiling golden retriever with floppy ears.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "dog")
  },
  {
    id: "panda",
    name: "Panda",
    category: "Animals",
    difficulty: "Easy",
    description: "A chubby baby panda sitting and chewing on sweet bamboo.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "panda")
  },
  {
    id: "owl",
    name: "Owl",
    category: "Animals",
    difficulty: "Medium",
    description: "A wise owl with big detailed eyes perched on a branch.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "owl")
  },
  {
    id: "fox",
    name: "Fox",
    category: "Animals",
    difficulty: "Easy",
    description: "A clever fox with a bushy tail sleeping peacefully.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "fox")
  },
  {
    id: "dolphin",
    name: "Dolphin",
    category: "Animals",
    difficulty: "Easy",
    description: "A playful dolphin leaping high out of the sea waves.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "dolphin")
  },
  {
    id: "peacock",
    name: "Peacock",
    category: "Animals",
    difficulty: "Expert",
    description: "A majestic peacock displaying its magnificent fan tail.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "peacock")
  },
  {
    id: "elephant",
    name: "Elephant",
    category: "Animals",
    difficulty: "Medium",
    description: "A friendly baby elephant waving its trunk in greeting.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "elephant")
  },
  {
    id: "horse",
    name: "Horse",
    category: "Animals",
    difficulty: "Advanced",
    description: "A graceful running stallion with a beautiful flowing mane.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "horse")
  },
  {
    id: "wolf",
    name: "Wolf",
    category: "Animals",
    difficulty: "Advanced",
    description: "A wild wolf howling silhouette in front of a giant moon.",
    draw: (ctx, w, h) => drawAnimals(ctx, w, h, "wolf")
  },

  // FANTASY (8 templates)
  {
    id: "fantasy_castle",
    name: "Fantasy Castle",
    category: "Fantasy",
    difficulty: "Advanced",
    description: "A magical kingdom castle with towering spires and flags.",
    draw: (ctx, w, h) => drawFantasy(ctx, w, h, "castle")
  },
  {
    id: "dragon",
    name: "Dragon",
    category: "Fantasy",
    difficulty: "Expert",
    description: "A majestic scaled dragon coiled around a giant gem.",
    draw: (ctx, w, h) => drawFantasy(ctx, w, h, "dragon")
  },
  {
    id: "unicorn",
    name: "Unicorn",
    category: "Fantasy",
    difficulty: "Medium",
    description: "A mystical unicorn with a spiraled horn and stars.",
    draw: (ctx, w, h) => drawFantasy(ctx, w, h, "unicorn")
  },
  {
    id: "fairy_garden",
    name: "Fairy Garden",
    category: "Fantasy",
    difficulty: "Advanced",
    description: "A cute forest fairy resting on a giant forest mushroom.",
    draw: (ctx, w, h) => drawFantasy(ctx, w, h, "fairy")
  },
  {
    id: "wizard_tower",
    name: "Wizard Tower",
    category: "Fantasy",
    difficulty: "Expert",
    description: "A mysterious tower rising to meet the constellations.",
    draw: (ctx, w, h) => drawFantasy(ctx, w, h, "wizard")
  },
  {
    id: "phoenix",
    name: "Phoenix",
    category: "Fantasy",
    difficulty: "Expert",
    description: "The legendary firebird rising with beautifully spread wings.",
    draw: (ctx, w, h) => drawFantasy(ctx, w, h, "phoenix")
  },
  {
    id: "mermaid",
    name: "Mermaid",
    category: "Fantasy",
    difficulty: "Advanced",
    description: "A beautiful mermaid sitting on a rock in the ocean.",
    draw: (ctx, w, h) => drawFantasy(ctx, w, h, "mermaid")
  },
  {
    id: "floating_islands",
    name: "Floating Islands",
    category: "Fantasy",
    difficulty: "Medium",
    description: "Magical floating land masses in the sky with small waterfalls.",
    draw: (ctx, w, h) => drawFantasy(ctx, w, h, "islands")
  },

  // SCI-FI (7 templates)
  {
    id: "astronaut",
    name: "Astronaut",
    category: "Sci-Fi",
    difficulty: "Medium",
    description: "An explorer floating in space with reflection on their visor.",
    draw: (ctx, w, h) => drawSciFi(ctx, w, h, "astronaut")
  },
  {
    id: "spaceship",
    name: "Spaceship",
    category: "Sci-Fi",
    difficulty: "Medium",
    description: "A sleek sci-fi starfighter cruising through the galaxy.",
    draw: (ctx, w, h) => drawSciFi(ctx, w, h, "spaceship")
  },
  {
    id: "alien_planet",
    name: "Alien Planet",
    category: "Sci-Fi",
    difficulty: "Easy",
    description: "A cosmic alien terrain with giant ringed planets above.",
    draw: (ctx, w, h) => drawSciFi(ctx, w, h, "planet")
  },
  {
    id: "cyber_city",
    name: "Cyber City",
    category: "Sci-Fi",
    difficulty: "Advanced",
    description: "A gleaming futuristic cyberpunk grid metropolis.",
    draw: (ctx, w, h) => drawSciFi(ctx, w, h, "cyber")
  },
  {
    id: "mecha_robot",
    name: "Mecha Robot",
    category: "Sci-Fi",
    difficulty: "Expert",
    description: "A high-tech armored mecha warrior robot.",
    draw: (ctx, w, h) => drawSciFi(ctx, w, h, "mecha")
  },
  {
    id: "space_station",
    name: "Space Station",
    category: "Sci-Fi",
    difficulty: "Advanced",
    description: "A colossal rotating space wheel station orbiting.",
    draw: (ctx, w, h) => drawSciFi(ctx, w, h, "station")
  },
  {
    id: "futuristic_skyline",
    name: "Futuristic Skyline",
    category: "Sci-Fi",
    difficulty: "Medium",
    description: "Dome buildings and sleek columns of a city of tomorrow.",
    draw: (ctx, w, h) => drawSciFi(ctx, w, h, "skyline")
  },

  // CUTE / KAWAII (8 templates)
  {
    id: "bubble_tea",
    name: "Bubble Tea",
    category: "Cute",
    difficulty: "Beginner",
    description: "A delicious boba tea cup with a happy smiling face.",
    draw: (ctx, w, h) => drawCute(ctx, w, h, "boba")
  },
  {
    id: "cute_bear",
    name: "Cute Bear",
    category: "Cute",
    difficulty: "Beginner",
    description: "A little fluffy bear wearing a cute winter scarf.",
    draw: (ctx, w, h) => drawCute(ctx, w, h, "bear")
  },
  {
    id: "happy_avocado",
    name: "Happy Avocado",
    category: "Cute",
    difficulty: "Beginner",
    description: "A happy split avocado showing its cute inner seed.",
    draw: (ctx, w, h) => drawCute(ctx, w, h, "avocado")
  },
  {
    id: "ice_cream",
    name: "Ice Cream",
    category: "Cute",
    difficulty: "Beginner",
    description: "A huge triple scoop ice cream waffle cone.",
    draw: (ctx, w, h) => drawCute(ctx, w, h, "icecream")
  },
  {
    id: "sleeping_sloth",
    name: "Sleeping Sloth",
    category: "Cute",
    difficulty: "Easy",
    description: "A cute sleepy sloth hanging lazily from a forest branch.",
    draw: (ctx, w, h) => drawCute(ctx, w, h, "sloth")
  },
  {
    id: "little_penguin",
    name: "Little Penguin",
    category: "Cute",
    difficulty: "Beginner",
    description: "A round baby penguin wearing a cozy winter hat.",
    draw: (ctx, w, h) => drawCute(ctx, w, h, "penguin")
  },
  {
    id: "cute_dinosaur",
    name: "Cute Dinosaur",
    category: "Cute",
    difficulty: "Easy",
    description: "A cheerful little dino wearing a cute party hat.",
    draw: (ctx, w, h) => drawCute(ctx, w, h, "dino")
  },
  {
    id: "mochi_friends",
    name: "Mochi Friends",
    category: "Cute",
    difficulty: "Beginner",
    description: "Three soft, squishy stacked mochis smiling.",
    draw: (ctx, w, h) => drawCute(ctx, w, h, "mochis")
  },

  // HOLIDAYS (8 templates)
  {
    id: "christmas_tree",
    name: "Christmas Tree",
    category: "Holidays",
    difficulty: "Easy",
    description: "A festive decorated pine tree with a bright star.",
    draw: (ctx, w, h) => drawHolidays(ctx, w, h, "christmas")
  },
  {
    id: "halloween_pumpkin",
    name: "Halloween Pumpkin",
    category: "Holidays",
    difficulty: "Easy",
    description: "A spooky Jack-o'-lantern carved pumpkin.",
    draw: (ctx, w, h) => drawHolidays(ctx, w, h, "pumpkin")
  },
  {
    id: "birthday_cake",
    name: "Birthday Cake",
    category: "Holidays",
    difficulty: "Medium",
    description: "A tasty three-tier birthday cake with lit candles.",
    draw: (ctx, w, h) => drawHolidays(ctx, w, h, "cake")
  },
  {
    id: "fireworks",
    name: "Fireworks",
    category: "Holidays",
    difficulty: "Medium",
    description: "Spectacular star bursts lighting up the evening sky.",
    draw: (ctx, w, h) => drawHolidays(ctx, w, h, "fireworks")
  },
  {
    id: "easter_bunny",
    name: "Easter Bunny",
    category: "Holidays",
    difficulty: "Easy",
    description: "A cute rabbit sitting inside an Easter basket of eggs.",
    draw: (ctx, w, h) => drawHolidays(ctx, w, h, "easter")
  },
  {
    id: "snowman",
    name: "Snowman",
    category: "Holidays",
    difficulty: "Easy",
    description: "A happy winter snowman with a carrot nose and top hat.",
    draw: (ctx, w, h) => drawHolidays(ctx, w, h, "snowman")
  },
  {
    id: "diwali_rangoli",
    name: "Diwali Rangoli",
    category: "Holidays",
    difficulty: "Advanced",
    description: "A decorative geometric mandala and oil lamp (diya) outline.",
    draw: (ctx, w, h) => drawHolidays(ctx, w, h, "diwali")
  },
  {
    id: "valentines_bouquet",
    name: "Valentine's Bouquet",
    category: "Holidays",
    difficulty: "Medium",
    description: "A gorgeous collection of heart shapes and roses.",
    draw: (ctx, w, h) => drawHolidays(ctx, w, h, "valentine")
  },

  // CULTURE (4 templates)
  {
    id: "dreamcatcher",
    name: "Dreamcatcher",
    category: "Culture",
    difficulty: "Advanced",
    description: "A beautiful webbed ring with hanging ornamental feathers.",
    draw: (ctx, w, h) => drawCulture(ctx, w, h, "dream")
  },
  {
    id: "celtic_knot",
    name: "Celtic Knot",
    category: "Culture",
    difficulty: "Advanced",
    description: "A classic symmetric overlapping endless braided loop.",
    draw: (ctx, w, h) => drawCulture(ctx, w, h, "celtic")
  },
  {
    id: "mosaic",
    name: "Mosaic",
    category: "Culture",
    difficulty: "Medium",
    description: "An elegant fractured glass tile geometric outline.",
    draw: (ctx, w, h) => drawCulture(ctx, w, h, "mosaic")
  },
  {
    id: "stained_glass",
    name: "Stained Glass",
    category: "Culture",
    difficulty: "Advanced",
    description: "A cathedral style circular gothic window frame.",
    draw: (ctx, w, h) => drawCulture(ctx, w, h, "glass")
  },

  // PATTERNS (4 templates)
  {
    id: "zen_mandala",
    name: "Zen Mandala",
    category: "Patterns",
    difficulty: "Advanced",
    description: "A calming symmetrical circle mandala with geometric petals.",
    draw: (ctx, w, h) => drawPatterns(ctx, w, h, "zen")
  },
  {
    id: "floral_mandala",
    name: "Floral Mandala",
    category: "Patterns",
    difficulty: "Advanced",
    description: "Interlapping flower circle petals in concentric harmony.",
    draw: (ctx, w, h) => drawPatterns(ctx, w, h, "floral")
  },
  {
    id: "mehndi_pattern",
    name: "Mehndi Pattern",
    category: "Patterns",
    difficulty: "Expert",
    description: "An extremely intricate traditional dotted henna outline.",
    draw: (ctx, w, h) => drawPatterns(ctx, w, h, "mehndi")
  },
  {
    id: "paisley",
    name: "Paisley",
    category: "Patterns",
    difficulty: "Medium",
    description: "A flowing teardrop curved droplet Persian pattern.",
    draw: (ctx, w, h) => drawPatterns(ctx, w, h, "paisley")
  },

  // VEHICLES (6 templates)
  {
    id: "sports_car",
    name: "Sports Car",
    category: "Vehicles",
    difficulty: "Medium",
    description: "A sleek modern aerodynamic racing coupe sports car.",
    draw: (ctx, w, h) => drawVehicles(ctx, w, h, "car")
  },
  {
    id: "vintage_motorcycle",
    name: "Vintage Motorcycle",
    category: "Vehicles",
    difficulty: "Advanced",
    description: "A retro motorcycle with detailed engine and wheel spokes.",
    draw: (ctx, w, h) => drawVehicles(ctx, w, h, "motorcycle")
  },
  {
    id: "steam_train",
    name: "Steam Train",
    category: "Vehicles",
    difficulty: "Advanced",
    description: "An old-school locomotive engine chugging with steam.",
    draw: (ctx, w, h) => drawVehicles(ctx, w, h, "train")
  },
  {
    id: "sailing_ship",
    name: "Sailing Ship",
    category: "Vehicles",
    difficulty: "Advanced",
    description: "A majestic tall wooden pirate ship under full wind sails.",
    draw: (ctx, w, h) => drawVehicles(ctx, w, h, "ship")
  },
  {
    id: "airplane",
    name: "Airplane",
    category: "Vehicles",
    difficulty: "Easy",
    description: "A cute prop aircraft soaring above fluffy clouds.",
    draw: (ctx, w, h) => drawVehicles(ctx, w, h, "airplane")
  },
  {
    id: "space_rocket",
    name: "Space Rocket",
    category: "Vehicles",
    difficulty: "Easy",
    description: "A rocket launching high into space with billowing smoke.",
    draw: (ctx, w, h) => drawVehicles(ctx, w, h, "rocket")
  },

  // FOOD (8 templates)
  {
    id: "pizza",
    name: "Pizza",
    category: "Food",
    difficulty: "Easy",
    description: "A delicious slice of pizza with pepperoni and dripping cheese.",
    draw: (ctx, w, h) => drawFood(ctx, w, h, "pizza")
  },
  {
    id: "sushi",
    name: "Sushi",
    category: "Food",
    difficulty: "Easy",
    description: "An assortment of delicious sushi maki and nigiri rolls.",
    draw: (ctx, w, h) => drawFood(ctx, w, h, "sushi")
  },
  {
    id: "donuts",
    name: "Donuts",
    category: "Food",
    difficulty: "Easy",
    description: "Sweet glazed donuts stacked with lots of delicious sprinkles.",
    draw: (ctx, w, h) => drawFood(ctx, w, h, "donuts")
  },
  {
    id: "cupcakes",
    name: "Cupcakes",
    category: "Food",
    difficulty: "Medium",
    description: "Frosted bakery cupcakes topped with a sweet cherry.",
    draw: (ctx, w, h) => drawFood(ctx, w, h, "cupcakes")
  },
  {
    id: "fruit_basket",
    name: "Fruit Basket",
    category: "Food",
    difficulty: "Easy",
    description: "A rich woven basket full of sweet apples and oranges.",
    draw: (ctx, w, h) => drawFood(ctx, w, h, "fruit")
  },
  {
    id: "pancakes",
    name: "Pancakes",
    category: "Food",
    difficulty: "Easy",
    description: "A towering stack of pancakes with syrup and melting butter.",
    draw: (ctx, w, h) => drawFood(ctx, w, h, "pancakes")
  },
  {
    id: "coffee_shop",
    name: "Coffee Shop",
    category: "Food",
    difficulty: "Medium",
    description: "A warm cup of steaming latte coffee with cocoa art.",
    draw: (ctx, w, h) => drawFood(ctx, w, h, "coffee")
  },
  {
    id: "candy_collection",
    name: "Candy Collection",
    category: "Food",
    difficulty: "Easy",
    description: "Delicious candy swirls and sweet giant lollipops.",
    draw: (ctx, w, h) => drawFood(ctx, w, h, "candy")
  }
];

// Helper to convert template to high-res dataURL (re-uses cache if possible)
export function generateTemplateDataUrl(templateId, width = 800, height = 800) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  template.draw(ctx, width, height);
  return canvas.toDataURL("image/png");
}
