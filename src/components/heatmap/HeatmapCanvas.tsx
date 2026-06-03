import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  value?: number;
}

interface HeatmapCanvasProps {
  points: Point[];
  width: number;
  height: number;
  radius?: number;
  maxOpacity?: number;
  className?: string;
}

/**
 * Lightweight canvas heatmap renderer (no external deps).
 * Renders radial gradients per point and applies a color gradient ramp.
 */
export function HeatmapCanvas({
  points,
  width,
  height,
  radius = 30,
  maxOpacity = 0.7,
  className,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    if (points.length === 0) return;

    // 1. Draw alpha shadows
    const maxVal = Math.max(1, ...points.map((p) => p.value ?? 1));
    points.forEach((p) => {
      const intensity = (p.value ?? 1) / maxVal;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      grad.addColorStop(0, `rgba(0,0,0,${intensity})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    });

    // 2. Colorize using gradient ramp
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;
    const ramp = buildRamp();
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha === 0) continue;
      const idx = alpha * 4;
      data[i] = ramp[idx];
      data[i + 1] = ramp[idx + 1];
      data[i + 2] = ramp[idx + 2];
      data[i + 3] = Math.min(alpha, Math.floor(255 * maxOpacity));
    }
    ctx.putImageData(img, 0, 0);
  }, [points, width, height, radius, maxOpacity]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ pointerEvents: "none", position: "absolute", inset: 0 }}
    />
  );
}

let _ramp: Uint8ClampedArray | null = null;
function buildRamp(): Uint8ClampedArray {
  if (_ramp) return _ramp;
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, "rgba(0,0,255,0)");
  grad.addColorStop(0.2, "rgba(0,0,255,1)");
  grad.addColorStop(0.4, "rgba(0,255,255,1)");
  grad.addColorStop(0.6, "rgba(0,255,0,1)");
  grad.addColorStop(0.8, "rgba(255,255,0,1)");
  grad.addColorStop(1.0, "rgba(255,0,0,1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1, 256);
  _ramp = ctx.getImageData(0, 0, 1, 256).data;
  return _ramp;
}
