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
export function drawBrushPoints(ctx, points, color, size, isEraser = false) {
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

  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // If we only have 2 points (one segment)
  if (points.length === 2) {
    ctx.moveTo(points[0], points[1]);
    ctx.lineTo(points[0], points[1]);
    ctx.stroke();
  } else {
    ctx.moveTo(points[0], points[1]);
    
    // Draw smooth quadratic curves between points
    let i;
    for (i = 2; i < points.length - 2; i += 2) {
      const xc = (points[i] + points[i + 2]) / 2;
      const yc = (points[i + 1] + points[i + 3]) / 2;
      ctx.quadraticCurveTo(points[i], points[i + 1], xc, yc);
    }
    // Curve to the last point
    if (i < points.length) {
      ctx.quadraticCurveTo(points[i], points[i + 1], points[points.length - 2], points[points.length - 1]);
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
