// Beautiful procedural line-art templates rendered to a high-res canvas, then exported as dataURLs

export const TEMPLATES = [
  {
    id: "mandala",
    name: "Zen Mandala",
    difficulty: "Medium",
    description: "Intricate symmetric geometric petals and stars.",
    draw: (ctx, w, h) => {
      // Background white
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.45;

      // Draw center flower
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.stroke();

      // Outer rings
      for (let r = maxR * 0.2; r <= maxR; r += maxR * 0.2) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Mandala Petals
      const drawPetals = (count, r1, r2) => {
        for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2) / count;
          const nextAngle = ((i + 1) * Math.PI * 2) / count;
          const midAngle = (angle + nextAngle) / 2;

          const x1 = cx + Math.cos(angle) * r1;
          const y1 = cy + Math.sin(angle) * r1;
          const x2 = cx + Math.cos(midAngle) * r2;
          const y2 = cy + Math.sin(midAngle) * r2;
          const x3 = cx + Math.cos(nextAngle) * r1;
          const y3 = cy + Math.sin(nextAngle) * r1;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(x2, y2, x3, y3);
          ctx.stroke();
        }
      };

      // Create beautiful overlapping layers
      drawPetals(8, maxR * 0.2, maxR * 0.4);
      drawPetals(12, maxR * 0.4, maxR * 0.6);
      drawPetals(16, maxR * 0.6, maxR * 0.8);
      drawPetals(24, maxR * 0.8, maxR);

      // Star-like spikes
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI * 2) / 16;
        ctx.moveTo(cx + Math.cos(angle) * (maxR * 0.1), cy + Math.sin(angle) * (maxR * 0.1));
        ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      }
      ctx.stroke();
    },
  },
  {
    id: "kitten_moon",
    name: "Kitten & Starry Moon",
    difficulty: "Easy",
    description: "A sleepy kitten curled up on a glowing crescent moon.",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const cx = w / 2;
      const cy = h / 2;

      // Draw Crescent Moon
      ctx.beginPath();
      // Outer arc
      ctx.arc(cx - 50, cy, 180, -Math.PI * 0.4, Math.PI * 0.6, false);
      // Inner arc
      ctx.arc(cx + 30, cy - 30, 150, Math.PI * 0.65, -Math.PI * 0.35, true);
      ctx.closePath();
      ctx.stroke();

      // Sleepy Kitten (sitting inside the moon)
      // Kitten body/back
      ctx.beginPath();
      ctx.arc(cx - 30, cy + 50, 45, 0, Math.PI * 2);
      ctx.stroke();

      // Kitten Head
      ctx.beginPath();
      ctx.arc(cx - 20, cy + 10, 25, 0, Math.PI * 2);
      ctx.stroke();

      // Left Ear
      ctx.beginPath();
      ctx.moveTo(cx - 35, cy - 5);
      ctx.lineTo(cx - 45, cy - 25);
      ctx.lineTo(cx - 22, cy - 12);
      ctx.stroke();

      // Right Ear
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy - 13);
      ctx.lineTo(cx - 5, cy - 30);
      ctx.lineTo(cx + 2, cy - 7);
      ctx.stroke();

      // Sleepy Eyes
      ctx.beginPath();
      ctx.arc(cx - 28, cy + 12, 4, 0, Math.PI, false); // left eye
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 15, cy + 12, 4, 0, Math.PI, false); // right eye
      ctx.stroke();

      // Kitten nose & mouth
      ctx.beginPath();
      ctx.moveTo(cx - 21, cy + 17);
      ctx.lineTo(cx - 21, cy + 20);
      ctx.quadraticCurveTo(cx - 24, cy + 23, cx - 26, cy + 21);
      ctx.moveTo(cx - 21, cy + 20);
      ctx.quadraticCurveTo(cx - 18, cy + 23, cx - 16, cy + 21);
      ctx.stroke();

      // Cute Whiskers
      ctx.beginPath();
      ctx.moveTo(cx - 35, cy + 16); ctx.lineTo(cx - 50, cy + 13);
      ctx.moveTo(cx - 35, cy + 19); ctx.lineTo(cx - 52, cy + 19);
      ctx.moveTo(cx - 35, cy + 22); ctx.lineTo(cx - 49, cy + 25);

      ctx.moveTo(cx - 5, cy + 16); ctx.lineTo(cx + 10, cy + 13);
      ctx.moveTo(cx - 5, cy + 19); ctx.lineTo(cx + 12, cy + 19);
      ctx.moveTo(cx - 5, cy + 22); ctx.lineTo(cx + 9, cy + 25);
      ctx.stroke();

      // Tail curled around body
      ctx.beginPath();
      ctx.arc(cx - 50, cy + 90, 20, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      // Little stars around
      const drawStar = (sx, sy, r, points = 5) => {
        let rot = (Math.PI / 2) * 3;
        let x = sx;
        let y = sy;
        let step = Math.PI / points;

        ctx.beginPath();
        ctx.moveTo(sx, sy - r);
        for (let i = 0; i < points; i++) {
          x = sx + Math.cos(rot) * r;
          y = sy + Math.sin(rot) * r;
          ctx.lineTo(x, y);
          rot += step;

          x = sx + Math.cos(rot) * (r / 2);
          y = sy + Math.sin(rot) * (r / 2);
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(sx, sy - r);
        ctx.closePath();
        ctx.stroke();
      };

      drawStar(cx + 110, cy - 120, 15);
      drawStar(cx - 140, cy - 80, 10);
      drawStar(cx + 80, cy + 120, 12);
      drawStar(cx - 100, cy + 140, 8);
    },
  },
  {
    id: "castle",
    name: "Fantasy Castle",
    difficulty: "Hard",
    description: "Majestic towers and flags resting atop an abstract hill.",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const cx = w / 2;
      const cy = h / 2;

      // Draw Hills at the bottom
      ctx.beginPath();
      ctx.moveTo(0, h - 100);
      ctx.quadraticCurveTo(w * 0.25, h - 180, w * 0.5, h - 130);
      ctx.quadraticCurveTo(w * 0.75, h - 90, w, h - 160);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.stroke();

      // Main central keep / wall
      ctx.strokeRect(cx - 100, cy, 200, 120);

      // Gate / Door
      ctx.beginPath();
      ctx.arc(cx, cy + 120, 35, Math.PI, 0, false);
      ctx.lineTo(cx + 35, cy + 120);
      ctx.lineTo(cx - 35, cy + 120);
      ctx.stroke();

      // Portcullis lines
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy + 85); ctx.lineTo(cx - 20, cy + 120);
      ctx.moveTo(cx, cy + 85); ctx.lineTo(cx, cy + 120);
      ctx.moveTo(cx + 20, cy + 85); ctx.lineTo(cx + 20, cy + 120);
      ctx.moveTo(cx - 35, cy + 100); ctx.lineTo(cx + 35, cy + 100);
      ctx.stroke();

      // Left Tower
      ctx.strokeRect(cx - 150, cy - 40, 50, 160);
      // Left cone roof
      ctx.beginPath();
      ctx.moveTo(cx - 155, cy - 40);
      ctx.lineTo(cx - 125, cy - 100);
      ctx.lineTo(cx - 95, cy - 40);
      ctx.closePath();
      ctx.stroke();

      // Right Tower
      ctx.strokeRect(cx + 100, cy - 40, 50, 160);
      // Right cone roof
      ctx.beginPath();
      ctx.moveTo(cx + 95, cy - 40);
      ctx.lineTo(cx + 125, cy - 100);
      ctx.lineTo(cx + 155, cy - 40);
      ctx.closePath();
      ctx.stroke();

      // Center high spire
      ctx.strokeRect(cx - 30, cy - 80, 60, 80);
      // Spire cone roof
      ctx.beginPath();
      ctx.moveTo(cx - 35, cy - 80);
      ctx.lineTo(cx, cy - 160);
      ctx.lineTo(cx + 35, cy - 80);
      ctx.closePath();
      ctx.stroke();

      // High Spire Flag
      ctx.beginPath();
      ctx.moveTo(cx, cy - 160);
      ctx.lineTo(cx, cy - 185);
      ctx.lineTo(cx + 25, cy - 173);
      ctx.lineTo(cx, cy - 161);
      ctx.stroke();

      // Left Spire Flag
      ctx.beginPath();
      ctx.moveTo(cx - 125, cy - 100);
      ctx.lineTo(cx - 125, cy - 120);
      ctx.lineTo(cx - 105, cy - 110);
      ctx.lineTo(cx - 125, cy - 100);
      ctx.stroke();

      // Tower Windows
      ctx.strokeRect(cx - 135, cy, 20, 30);
      ctx.strokeRect(cx + 115, cy, 20, 30);
      ctx.strokeRect(cx - 15, cy - 50, 30, 35);

      // Clouds
      const drawCloud = (x, y, scale = 1) => {
        ctx.beginPath();
        ctx.arc(x, y, 20 * scale, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(x + 20 * scale, y - 10 * scale, 25 * scale, Math.PI, Math.PI * 2);
        ctx.arc(x + 45 * scale, y, 20 * scale, Math.PI * 1.5, Math.PI * 0.5);
        ctx.closePath();
        ctx.stroke();
      };

      drawCloud(cx - 200, cy - 120, 0.9);
      drawCloud(cx + 210, cy - 100, 1.1);
    },
  },
  {
    id: "abstract_geometry",
    name: "Retro Geometric Abstract",
    difficulty: "Medium",
    description: "Sleek intersecting retro-futuristic geometric shapes.",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw overlapping geometric lines
      ctx.strokeRect(50, 50, w - 100, h - 100);

      // Large diagonal lines
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(w - 50, h - 50);
      ctx.moveTo(w - 50, 50);
      ctx.lineTo(50, h - 50);
      ctx.stroke();

      // Intersecting Circles
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.25, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, 0, Math.PI * 2);
      ctx.stroke();

      // Diamond outline
      ctx.beginPath();
      ctx.moveTo(w / 2, 70);
      ctx.lineTo(w - 70, h / 2);
      ctx.lineTo(w / 2, h - 70);
      ctx.lineTo(70, h / 2);
      ctx.closePath();
      ctx.stroke();

      // Inner sun burst rays
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        ctx.moveTo(w / 2 + Math.cos(angle) * (Math.min(w, h) * 0.25), h / 2 + Math.sin(angle) * (Math.min(w, h) * 0.25));
        ctx.lineTo(w / 2 + Math.cos(angle) * (Math.min(w, h) * 0.4), h / 2 + Math.sin(angle) * (Math.min(w, h) * 0.4));
      }
      ctx.stroke();
    },
  },
];

// Helper to convert template to high-res dataURL
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
