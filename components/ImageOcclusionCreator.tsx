'use client';

import { useState, useRef, useEffect } from 'react';
import { Overlay } from '@/lib/types';
import { saveOverlays } from '@/lib/supabase';
import { Save, Trash2, Layers, ArrowLeft, RefreshCw, CheckCircle, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DottedBox {
  id: string;
  x: number; // Percentage (0 - 100)
  y: number; // Percentage (0 - 100)
  width: number; // Percentage (0 - 100)
  height: number; // Percentage (0 - 100)
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
      }, 800);
    } catch (err) {
      console.error('Error saving overlays:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href={`/tasks`}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>ইমেজ অক্লুশন ক্রিয়েটর (Creator Mode)</span>
            </h2>
            <p className="text-xs text-slate-400">
              ছবির উপর ক্লিক করে টেনে বক্স (Occlusion Overlay) আঁকুন | মোট বক্স: <strong className="text-indigo-400 font-mono">{boxes.length}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleClearAll}
            disabled={boxes.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 text-xs font-semibold disabled:opacity-40 transition-colors flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>সব ক্লিয়ার</span>
          </button>

          <button
            onClick={handleSaveOverlays}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-slate-950 font-bold text-xs hover:from-indigo-400 hover:to-purple-400 shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-slate-950" />
                <span>সংরক্ষণ হয়েছে!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>অক্লুশন ওভারলে সংরক্ষণ করুন ({boxes.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Drawing Container */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 relative">
        <div className="text-xs text-slate-400 mb-2 flex items-center space-x-1">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>নির্দেশনা: মাউস চেপে ধরে ড্র্যাগ (Click & Drag) করে আঁকুন।</span>
        </div>

        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="relative inline-block w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 select-none cursor-crosshair"
        >
          {/* Note Scanned Image */}
          <img
            src={imageUrl}
            alt="Scanned note"
            className="w-full h-auto object-contain pointer-events-none block"
          />

          {/* Existing Saved/Drawn Overlays */}
          {boxes.map((box, index) => (
            <div
              key={box.id}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
              className="absolute bg-slate-900/90 border-2 border-indigo-400 rounded shadow-lg flex items-center justify-between px-1 overflow-hidden group hover:border-red-400 transition-colors"
            >
              <span className="text-[10px] font-mono text-indigo-300 font-bold opacity-80 pointer-events-none">
                #{index + 1}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBox(box.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-red-400 hover:text-red-300 bg-slate-950/80 rounded"
                title="মুছে ফেলুন"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Active Drawing Box Feedback */}
          {isDrawing && currentDrawBox && (
            <div
              style={{
                left: `${currentDrawBox.x}%`,
                top: `${currentDrawBox.y}%`,
                width: `${currentDrawBox.width}%`,
                height: `${currentDrawBox.height}%`,
              }}
              className="absolute bg-indigo-500/30 border-2 border-dashed border-indigo-300 rounded pointer-events-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
