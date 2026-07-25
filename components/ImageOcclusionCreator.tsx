'use client';

import { useState, useRef, useEffect } from 'react';
import { Overlay } from '@/lib/types';
import { saveOverlays } from '@/lib/supabase';
import { Save, Trash2, Layers, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DottedBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageOcclusionCreatorProps {
  noteId: string;
  taskId: string;
  imageUrl: string;
  existingOverlays?: Overlay[];
}

export default function ImageOcclusionCreator({
  noteId,
  taskId,
  imageUrl,
  existingOverlays = [],
}: ImageOcclusionCreatorProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [boxes, setBoxes] = useState<DottedBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawBox, setCurrentDrawBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (existingOverlays.length > 0) {
      setBoxes(
        existingOverlays.map((o) => ({
          id: o.id,
          x: o.x_coord,
          y: o.y_coord,
          width: o.width,
          height: o.height,
        }))
      );
    }
  }, [existingOverlays]);

  const getContainerCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { xPercent: 0, yPercent: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const xPixel = e.clientX - rect.left;
    const yPixel = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (xPixel / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (yPixel / rect.height) * 100));

    return { xPercent, yPercent };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const { xPercent, yPercent } = getContainerCoords(e);
    setIsDrawing(true);
    setStartPos({ x: xPercent, y: yPercent });
    setCurrentDrawBox({ x: xPercent, y: yPercent, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos) return;
    const { xPercent, yPercent } = getContainerCoords(e);

    const x = Math.min(startPos.x, xPercent);
    const y = Math.min(startPos.y, yPercent);
    const width = Math.abs(xPercent - startPos.x);
    const height = Math.abs(yPercent - startPos.y);

    setCurrentDrawBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDrawBox && currentDrawBox.width > 1 && currentDrawBox.height > 1) {
      setBoxes((prev) => [
        ...prev,
        {
          id: `box-${Date.now()}-${Math.random()}`,
          x: Math.round(currentDrawBox.x * 100) / 100,
          y: Math.round(currentDrawBox.y * 100) / 100,
          width: Math.round(currentDrawBox.width * 100) / 100,
          height: Math.round(currentDrawBox.height * 100) / 100,
        },
      ]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentDrawBox(null);
  };

  const handleDeleteBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
  };

  const handleClearAll = () => {
    setBoxes([]);
  };

  const handleSaveOverlays = async () => {
    try {
      setIsSaving(true);
      await saveOverlays(
        noteId,
        boxes.map((b) => ({
          x_coord: b.x,
          y_coord: b.y,
          width: b.width,
          height: b.height,
        }))
      );
      setIsSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        router.push(`/study/${taskId}`);
      }, 600);
    } catch (err) {
      console.error('Error saving overlays:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href={`/tasks`}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-zinc-400" />
              <span>Image Occlusion Editor</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Click & drag over text to create 100% opaque occlusion boxes &bull; Overlays: <strong className="text-zinc-200 font-mono">{boxes.length}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleClearAll}
            disabled={boxes.length === 0}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 text-xs font-medium disabled:opacity-40 transition-colors flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>

          <button
            onClick={handleSaveOverlays}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-zinc-200 shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-zinc-950" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Overlays ({boxes.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Drawing Box Container */}
      <div className="glass-panel p-4 rounded-xl border border-zinc-800 relative">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="relative inline-block w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 select-none cursor-crosshair"
        >
          <img
            src={imageUrl}
            alt="Scanned note"
            className="w-full h-auto object-contain pointer-events-none block"
          />

          {boxes.map((box, index) => (
            <div
              key={box.id}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
              className="absolute bg-zinc-950 border-2 border-zinc-500 rounded shadow-md flex items-center justify-between px-1 overflow-hidden group hover:border-red-400 transition-colors z-10"
            >
              <span className="text-[9px] font-mono text-zinc-300 font-bold opacity-90 pointer-events-none">
                #{index + 1}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBox(box.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-red-400 hover:text-red-300 bg-zinc-900 rounded"
                title="Delete box"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {isDrawing && currentDrawBox && (
            <div
              style={{
                left: `${currentDrawBox.x}%`,
                top: `${currentDrawBox.y}%`,
                width: `${currentDrawBox.width}%`,
                height: `${currentDrawBox.height}%`,
              }}
              className="absolute bg-zinc-950/80 border-2 border-dashed border-zinc-100 rounded pointer-events-none z-20"
            />
          )}
        </div>
      </div>
    </div>
  );
}
