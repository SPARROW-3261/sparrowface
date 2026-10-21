/**
 * Face Paint & Canvas Application
 * Draw and sketch using face & head motion!
 */

import React, { useRef, useState, useEffect } from 'react';
import { Paintbrush, Eraser, Trash2, Download, Circle } from 'lucide-react';

interface FacePaintAppProps {
  cursorX: number;
  cursorY: number;
  isDragging: boolean;
}

const COLORS = [
  '#38bdf8', // Cyan
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#ffffff', // White
  '#94a3b8', // Gray
  '#0f172a', // Dark
];

export const FacePaintApp: React.FC<FacePaintAppProps> = ({ cursorX, cursorY, isDragging }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#38bdf8');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Save current contents
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx && canvas.width > 0) {
          tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (tempCanvas.width > 0) {
            ctx.drawImage(tempCanvas, 0, 0);
          }
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Sync drawing with virtual cursor position
  useEffect(() => {
    const active = isDrawingActive || isDragging;
    if (!active) {
      lastPointRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Check if cursor is inside the canvas
    if (
      cursorX >= rect.left &&
      cursorX <= rect.right &&
      cursorY >= rect.top &&
      cursorY <= rect.bottom
    ) {
      const x = cursorX - rect.left;
      const y = cursorY - rect.top;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = isEraser ? '#090d16' : selectedColor;

        if (lastPointRef.current) {
          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = isEraser ? '#090d16' : selectedColor;
          ctx.fill();
        }
      }
      lastPointRef.current = { x, y };
    } else {
      lastPointRef.current = null;
    }
  }, [cursorX, cursorY, isDrawingActive, isDragging, selectedColor, brushSize, isEraser]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    lastPointRef.current = null;
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `aeroface-art-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 select-none">
      {/* Tool Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          {/* Draw Toggle */}
          <button
            onClick={() => setIsDrawingActive(!isDrawingActive)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              isDrawingActive || isDragging
                ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-400/40'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>{isDrawingActive || isDragging ? 'Brush: DRAWING' : 'Brush: OFF'}</span>
          </button>

          {/* Color swatches */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setSelectedColor(color);
                  setIsEraser(false);
                }}
                style={{ backgroundColor: color }}
                className={`w-4 h-4 rounded-full transition-transform ${
                  selectedColor === color && !isEraser
                    ? 'ring-2 ring-white scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={color}
              />
            ))}
          </div>

          {/* Eraser */}
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`p-1.5 rounded transition-colors ${
              isEraser
                ? 'bg-neutral-700 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white bg-neutral-800/60'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Size picker */}
          <div className="flex items-center gap-1 text-[11px] text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            <span>Size:</span>
            {[3, 6, 12, 20].map((sz) => (
              <button
                key={sz}
                onClick={() => setBrushSize(sz)}
                className={`w-5 h-5 rounded flex items-center justify-center ${
                  brushSize === sz ? 'bg-neutral-800 text-cyan-400 font-bold' : 'hover:text-white'
                }`}
              >
                <Circle className="w-2 h-2" style={{ transform: `scale(${sz / 6})` }} />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
          <button
            onClick={downloadImage}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-cyan-400 rounded text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      {/* Paint Canvas */}
      <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

        {/* Help tip overlay when not active */}
        {!isDrawingActive && !isDragging && (
          <div className="absolute bottom-4 left-4 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-400 max-w-sm pointer-events-none">
            <span className="text-cyan-400 font-medium block mb-0.5">Tip for Face Drawing:</span>
            Click "Brush: OFF" to activate drawing mode, or hold your mouth open (if gesture enabled) to sketch continuously with your head motion!
          </div>
        )}
      </div>
    </div>
  );
};
