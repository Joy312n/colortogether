// Canvas drawing helper utilities

/**
 * Perform a highly optimized BFS flood fill on a canvas.
 * Checks boundary pixels against the original outline image data to prevent color bleeding.
 * @param {HTMLCanvasElement} canvas - The canvas to color on
 * @param {number} startX - Mouse click X
 * @param {number} startY - Mouse click Y
 * @param {number[]} fillRGB - Color to fill as [r, g, b]
 * @param {ImageData} outlineImageData - The original black-and-white outline pixel data
 */
export function floodFill(canvas, startX, startY, fillRGB, outlineImageData) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const outlineData = outlineImageData.data;
  const [fillR, fillG, fillB] = fillRGB;

  const getPixelIndex = (x, y) => (y * width + x) * 4;
  const startIdx = getPixelIndex(startX, startY);

  // If clicked directly on a dark outline, do not trigger fill
  const outR = outlineData[startIdx];
  const outG = outlineData[startIdx + 1];
  const outB = outlineData[startIdx + 2];
  const outA = outlineData[startIdx + 3];
  
  // If original line art has a dark line at this location, stop
  if (outA > 100 && outR < 130 && outG < 130 && outB < 130) {
    return null;
  }

  // If already filled with target color on the coloring canvas, do nothing
  if (
    data[startIdx] === fillR &&
    data[startIdx + 1] === fillG &&
    data[startIdx + 2] === fillB &&
    data[startIdx + 3] === 255
  ) {
    return null;
  }

  // Visited array to avoid double processing (much faster than a Map or Set)
  const visited = new Uint8Array(width * height);

  // Fast flat queue to avoid recursive call stack limits and JS array shifting slowness
  const queue = new Int32Array(width * height * 2);
  let queueHead = 0;
  let queueTail = 0;

  // Push start point
  queue[queueTail++] = startX;
  queue[queueTail++] = startY;
  visited[startY * width + startX] = 1;

  while (queueHead < queueTail) {
    const cx = queue[queueHead++];
    const cy = queue[queueHead++];

    const idx = (cy * width + cx) * 4;
    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = 255; // Fully opaque color fill

    // 4-directional neighbors (much faster/less bleeding than 8-direction)
    const dirs = [1, 0, -1, 0, 0, 1, 0, -1];
    for (let d = 0; d < 8; d += 2) {
      const nx = cx + dirs[d];
      const ny = cy + dirs[d + 1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const visIdx = ny * width + nx;
        if (!visited[visIdx]) {
          const outIdx = visIdx * 4;
          const r = outlineData[outIdx];
          const g = outlineData[outIdx + 1];
          const b = outlineData[outIdx + 2];
          const a = outlineData[outIdx + 3];

          // Is it an outline boundary pixel?
          const isOutline = a > 100 && r < 130 && g < 130 && b < 130;

          if (!isOutline) {
            visited[visIdx] = 1;
            queue[queueTail++] = nx;
            queue[queueTail++] = ny;
          }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

/**
 * Draws a smooth line of points onto a canvas context.
 * Used for drawing brushes and erasers.
 */
export function drawBrushPoints(ctx, points, color, size, isEraser = false, brushType = "hard", opacity = 100, softness = 0) {
  if (points.length < 2) return;

  ctx.save();
  ctx.beginPath();

  if (isEraser) {
    // Standard eraser blends out the colored pixels
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
  }

  // Brush styling
  const parsedOpacity = opacity !== undefined ? opacity / 100 : 1;
  ctx.globalAlpha = parsedOpacity;

  // Let's set some default settings based on brush type if not explicitly set
  let activeSoftness = softness !== undefined ? softness : 0;
  let activeSize = size;
  
  if (brushType === "soft") {
    // Soft brush has a default softness if not set or 0
    if (softness === undefined || softness === 0) {
      activeSoftness = 70;
    }
  } else if (brushType === "marker") {
    activeSoftness = 0;
    // Markers are usually semi-transparent by default
    if (opacity === undefined || opacity === 100) {
      ctx.globalAlpha = 0.5;
    }
  } else if (brushType === "pencil") {
    activeSoftness = 15;
    if (opacity === undefined || opacity === 100) {
      ctx.globalAlpha = 0.35; // pencils are lighter
    }
    // Set a pencil texture line dash
    ctx.setLineDash([1, 2]);
    activeSize = Math.max(1, size * 0.5); // pencil lines are thin
  } else if (brushType === "airbrush") {
    activeSoftness = 100;
    if (opacity === undefined || opacity === 100) {
      ctx.globalAlpha = 0.15; // airbrush is very subtle
    }
  }

  ctx.lineWidth = activeSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // If softness is greater than 0, use the shadow blur trick
  if (activeSoftness > 0) {
    const offset = 10000;
    ctx.shadowColor = isEraser ? "rgba(0,0,0,1)" : color;
    ctx.shadowBlur = (activeSoftness / 100) * activeSize * 1.2;
    ctx.shadowOffsetX = offset;
    ctx.shadowOffsetY = offset;
    
    // Helper to draw offset path
    ctx.moveTo(points[0] - offset, points[1] - offset);
    if (points.length === 2) {
      ctx.lineTo(points[0] - offset, points[1] - offset);
    } else {
      let i;
      for (i = 2; i < points.length - 2; i += 2) {
        const xc = (points[i] + points[i + 2]) / 2;
        const yc = (points[i + 1] + points[i + 3]) / 2;
        ctx.quadraticCurveTo(points[i] - offset, points[i + 1] - offset, xc - offset, yc - offset);
      }
      if (i < points.length) {
        ctx.quadraticCurveTo(points[i] - offset, points[i + 1] - offset, points[points.length - 2] - offset, points[points.length - 1] - offset);
      }
    }
    ctx.stroke();
  } else {
    // Normal drawing
    ctx.moveTo(points[0], points[1]);
    if (points.length === 2) {
      ctx.lineTo(points[0], points[1]);
    } else {
      let i;
      for (i = 2; i < points.length - 2; i += 2) {
        const xc = (points[i] + points[i + 2]) / 2;
        const yc = (points[i + 1] + points[i + 3]) / 2;
        ctx.quadraticCurveTo(points[i], points[i + 1], xc, yc);
      }
      if (i < points.length) {
        ctx.quadraticCurveTo(points[i], points[i + 1], points[points.length - 2], points[points.length - 1]);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Helper to convert hex string (#RRGGBB) to RGB array
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function getSqSegDist(px, py, p1x, p1y, p2x, p2y) {
  let x = p1x;
  let y = p1y;
  let dx = p2x - x;
  let dy = p2y - y;

  if (dx !== 0 || dy !== 0) {
    let t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2x;
      y = p2y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = px - x;
  dy = py - y;

  return dx * dx + dy * dy;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
  let maxSqDist = sqTolerance;
  let index = -1;

  const p1x = points[first * 2];
  const p1y = points[first * 2 + 1];
  const p2x = points[last * 2];
  const p2y = points[last * 2 + 1];

  for (let i = first + 1; i < last; i++) {
    const px = points[i * 2];
    const py = points[i * 2 + 1];
    const sqDist = getSqSegDist(px, py, p1x, p1y, p2x, p2y);

    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified[index] = true;
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

/**
 * Simplifies a 2D line using the Ramer-Douglas-Peucker algorithm.
 * Expects a flat array of coordinates [x1, y1, x2, y2, ...]
 */
export function simplifyPath(points, epsilon = 1.0) {
  const len = points.length / 2;
  if (len <= 2) return points;

  const sqTolerance = epsilon * epsilon;
  const simplified = new Array(len).fill(false);
  simplified[0] = true;
  simplified[len - 1] = true;

  simplifyDPStep(points, 0, len - 1, sqTolerance, simplified);

  const result = [];
  for (let i = 0; i < len; i++) {
    if (simplified[i]) {
      result.push(points[i * 2], points[i * 2 + 1]);
    }
  }
  return result;
}
