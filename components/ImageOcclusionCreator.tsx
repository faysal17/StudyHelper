'use client';

import { useState, useRef, useEffect } from 'react';
import { Overlay } from '@/lib/types';
import { saveOverlays } from '@/lib/supabase';
import { Save, Trash2, Layers, ArrowLeft, CheckCircle, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DottedBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
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
  const currentDrawBoxRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);

  type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
  const [resizeState, setResizeState] = useState<{
    boxId: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    origBox: { x: number; y: number; width: number; height: number };
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
          label: o.label || '',
        }))
      );
    }
  }, [existingOverlays]);

  const getContainerCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { xPercent: 0, yPercent: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const xPixel = clientX - rect.left;
    const yPixel = clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (xPixel / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (yPixel / rect.height) * 100));

    return { xPercent, yPercent };
  };

  // Minimum drag distance to register a box, in actual pixels rather than
  // percent of container height — multi-page PDFs are stitched into one
  // tall image (see lib/pdfToImage.ts), so a percent-based threshold made
  // ordinary drags on later pages silently fail to register.
  const MIN_BOX_PX = 8;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    const { xPercent, yPercent } = getContainerCoords(e.clientX, e.clientY);
    const box = { x: xPercent, y: yPercent, width: 0, height: 0 };
    setIsDrawing(true);
    setStartPos({ x: xPercent, y: yPercent });
    currentDrawBoxRef.current = box;
    setCurrentDrawBox(box);
    setActiveLabelId(null);
  };

  const handleResizeStart = (e: React.MouseEvent, box: DottedBox, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    const { xPercent, yPercent } = getContainerCoords(e.clientX, e.clientY);
    setResizeState({
      boxId: box.id,
      handle,
      startX: xPercent,
      startY: yPercent,
      origBox: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
  };

  useEffect(() => {
    if (!isDrawing && !resizeState) return;

    const onMove = (e: MouseEvent) => {
      const { xPercent, yPercent } = getContainerCoords(e.clientX, e.clientY);

      if (resizeState) {
        // Minimum size floor in percent, derived from MIN_BOX_PX rather than
        // a flat percent — a flat percent floor (e.g. 1%) is huge on a tall
        // stitched multi-page image and would clamp small boxes open.
        const containerRect = containerRef.current?.getBoundingClientRect();
        const minWidthPercent = containerRect ? (MIN_BOX_PX / containerRect.width) * 100 : 1;
        const minHeightPercent = containerRect ? (MIN_BOX_PX / containerRect.height) * 100 : 1;

        const dx = xPercent - resizeState.startX;
        const dy = yPercent - resizeState.startY;
        const { x, y, width, height } = resizeState.origBox;
        let newX = x;
        let newY = y;
        let newWidth = width;
        let newHeight = height;

        if (resizeState.handle.includes('e')) {
          newWidth = Math.max(minWidthPercent, width + dx);
        }
        if (resizeState.handle.includes('w')) {
          newX = Math.min(x + dx, x + width - minWidthPercent);
          newWidth = width - (newX - x);
        }
        if (resizeState.handle.includes('s')) {
          newHeight = Math.max(minHeightPercent, height + dy);
        }
        if (resizeState.handle.includes('n')) {
          newY = Math.min(y + dy, y + height - minHeightPercent);
          newHeight = height - (newY - y);
        }

        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        newWidth = Math.min(newWidth, 100 - newX);
        newHeight = Math.min(newHeight, 100 - newY);

        setBoxes((prev) =>
          prev.map((b) =>
            b.id === resizeState.boxId
              ? {
                  ...b,
                  x: Math.round(newX * 100) / 100,
                  y: Math.round(newY * 100) / 100,
                  width: Math.round(newWidth * 100) / 100,
                  height: Math.round(newHeight * 100) / 100,
                }
              : b
          )
        );
        return;
      }

      if (!startPos) return;
      const x = Math.min(startPos.x, xPercent);
      const y = Math.min(startPos.y, yPercent);
      const width = Math.abs(xPercent - startPos.x);
      const height = Math.abs(yPercent - startPos.y);
      const box = { x, y, width, height };
      currentDrawBoxRef.current = box;
      setCurrentDrawBox(box);
    };

    const onUp = () => {
      if (resizeState) {
        setResizeState(null);
        return;
      }

      const box = currentDrawBoxRef.current;
      if (box && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const widthPx = (box.width / 100) * rect.width;
        const heightPx = (box.height / 100) * rect.height;
        if (widthPx > MIN_BOX_PX && heightPx > MIN_BOX_PX) {
          const newId = `box-${Date.now()}-${Math.random()}`;
          setBoxes((prev) => [
            ...prev,
            {
              id: newId,
              x: Math.round(box.x * 100) / 100,
              y: Math.round(box.y * 100) / 100,
              width: Math.round(box.width * 100) / 100,
              height: Math.round(box.height * 100) / 100,
              label: '',
            },
          ]);
          setActiveLabelId(newId);
        }
      }
      currentDrawBoxRef.current = null;
      setCurrentDrawBox(null);
      setIsDrawing(false);
      setStartPos(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDrawing, resizeState, startPos]);

  const handleLabelChange = (id: string, text: string) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, label: text } : b)));
  };

  const handleDeleteBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    if (activeLabelId === id) setActiveLabelId(null);
  };

  const handleClearAll = () => {
    setBoxes([]);
    setActiveLabelId(null);
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
          label: b.label?.trim() || null,
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
              Drag over text to draw boxes &bull; Type optional question prompts directly on boxes &bull; Overlays: <strong className="text-zinc-200 font-mono">{boxes.length}</strong>
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
          className="relative inline-block w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 select-none cursor-crosshair"
        >
          <img
            src={imageUrl}
            alt="Scanned note"
            className="w-full h-auto object-contain pointer-events-none block"
          />

          {boxes.map((box, index) => {
            const isEditingThisLabel = activeLabelId === box.id;

            return (
              <div
                key={box.id}
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveLabelId(box.id);
                }}
                className="absolute bg-zinc-950 border-2 border-zinc-500 rounded shadow-md flex flex-col justify-between p-1 overflow-hidden group hover:border-zinc-300 transition-colors z-10 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full shrink-0">
                  <span className="text-[9px] font-mono text-zinc-400 font-bold">
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

                {/* Question Prompt Text Input / Label Display */}
                <div className="w-full my-auto flex items-center justify-center">
                  {isEditingThisLabel ? (
                    <input
                      type="text"
                      autoFocus
                      value={box.label || ''}
                      onChange={(e) => handleLabelChange(box.id, e.target.value)}
                      onBlur={() => setActiveLabelId(null)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Type question prompt..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-center font-medium"
                    />
                  ) : box.label ? (
                    <span className="text-[10px] font-medium text-zinc-200 truncate px-1 text-center block w-full leading-tight">
                      {box.label}
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-600 italic group-hover:text-zinc-400 transition-colors flex items-center gap-0.5">
                      <HelpCircle className="w-2.5 h-2.5" />
                      <span>Click to add question</span>
                    </span>
                  )}
                </div>

                {/* Resize Handles */}
                {([
                  ['nw', 'top-0 left-0 cursor-nwse-resize'],
                  ['ne', 'top-0 right-0 cursor-nesw-resize'],
                  ['sw', 'bottom-0 left-0 cursor-nesw-resize'],
                  ['se', 'bottom-0 right-0 cursor-nwse-resize'],
                ] as [ResizeHandle, string][]).map(([handle, posClasses]) => (
                  <div
                    key={handle}
                    onMouseDown={(e) => handleResizeStart(e, box, handle)}
                    className={`absolute w-2.5 h-2.5 rounded-sm bg-zinc-100 border border-zinc-950 opacity-0 group-hover:opacity-100 transition-opacity z-20 ${posClasses}`}
                  />
                ))}
              </div>
            );
          })}

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
