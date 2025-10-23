import { useEffect } from 'react';

interface GridOverlayProps {
  canvasRef: HTMLCanvasElement | null;
  gridPoints: number;
  visible: boolean;
  width: number;
  height: number;
  scale: number;
}

export const GridOverlay = ({
  canvasRef,
  gridPoints,
  visible,
  width,
  height,
  scale,
}: GridOverlayProps) => {
  useEffect(() => {
    if (!canvasRef || !visible || width === 0 || height === 0) return;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    // Clear previous grid
    ctx.clearRect(0, 0, width, height);

    // Convert grid spacing from PDF points to screen pixels
    const gridSpacing = gridPoints * scale;

    // Set grid line style
    ctx.strokeStyle = 'rgba(100, 149, 237, 0.25)'; // Cornflower blue, semi-transparent
    ctx.lineWidth = 0.5;

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [canvasRef, gridPoints, visible, width, height, scale]);

  return null;
};
