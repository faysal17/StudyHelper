'use client';

import { useState } from 'react';
import { Task, Note, Overlay } from '@/lib/types';
import { updateOverlayFailingStatus, updateTask, logRevisionScore } from '@/lib/supabase';
import { evaluateSpacedRepetition } from '@/lib/spacedRepetition';
import { Check, X, Eye, EyeOff, Trophy, ArrowLeft, Award, Lock, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

interface ImageOcclusionViewerProps {
  task: Task;
  note: Note;
  overlays: Overlay[];
}

export default function ImageOcclusionViewer({ task, note, overlays: initialOverlays }: ImageOcclusionViewerProps) {
  const [overlays, setOverlays] = useState<Overlay[]>(initialOverlays);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const [isFinishing, setIsFinishing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any | null>(null);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleGradeOverlay = async (overlayId: string, isCorrect: boolean) => {
    const isCurrentlyFailing = !isCorrect;
    try {
      await updateOverlayFailingStatus(overlayId, isCurrentlyFailing);
      setOverlays((prev) =>
        prev.map((o) => (o.id === overlayId ? { ...o, is_currently_failing: isCurrentlyFailing } : o))
      );
    } catch (err) {
      console.error('Error updating overlay failing status:', err);
    }
  };

  const revealAllOverlays = () => {
    const allRevealed: Record<string, boolean> = {};
    overlays.forEach((o) => (allRevealed[o.id] = true));
    setRevealedIds(allRevealed);
  };

  const hideAllOverlays = () => {
    setRevealedIds({});
  };

  const handleFinishSession = async () => {
    setIsFinishing(true);

    const totalOverlays = overlays.length;
    const failedOverlays = overlays.filter((o) => o.is_currently_failing).length;

    const srResult = evaluateSpacedRepetition(task, totalOverlays, failedOverlays);

    try {
      const score = Math.round((100 - srResult.weightedErrorPercent) * 10) / 10;
      await logRevisionScore(task.id, score);

      if (!srResult.isLockedToday) {
        await updateTask(task.id, {
          last_reviewed_date: srResult.updatedLastReviewedDate,
          current_interval: srResult.newInterval,
          ease_factor: srResult.newEaseFactor,
          status_color: srResult.newStatusColor,
          next_revision_date: srResult.newNextRevisionDate,
        });
      }

      setSummaryResult({
        ...srResult,
        totalOverlays,
        failedOverlays,
        score,
      });

      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err) {
      console.error('Session completion error:', err);
    } finally {
      setIsFinishing(false);
    }
  };

  const failedCount = overlays.filter((o) => o.is_currently_failing).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="glass-panel p-4 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border bg-zinc-800 text-zinc-300 border-zinc-700">
                Active Recall Study
              </span>
              <span className="text-xs text-zinc-500 font-mono">P{task.priority} Priority</span>
            </div>
            <h2 className="text-base font-semibold text-zinc-100 mt-0.5">{task.title}</h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-lg text-xs font-mono flex items-center space-x-3">
            <span className="text-zinc-400">Total: <strong className="text-zinc-200">{overlays.length}</strong></span>
            <span className="text-zinc-400">Failed: <strong className="text-red-400">{failedCount}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={revealAllOverlays}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Reveal all"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={hideAllOverlays}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Hide all"
            >
              <EyeOff className="w-4 h-4" />
            </button>

            <button
              onClick={handleFinishSession}
              disabled={isFinishing}
              className="px-4 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-all shadow-sm flex items-center space-x-1.5"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Complete Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Note Image & Overlays */}
      <div className="glass-panel p-4 rounded-xl border border-zinc-800 relative">
        <div className="relative inline-block w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 select-none">
          <img
            src={note.image_url}
            alt="Scanned note"
            className="w-full h-auto object-contain block pointer-events-none"
          />

          {overlays.map((overlay, idx) => {
            const isRevealed = Boolean(revealedIds[overlay.id]);
            const isFailing = overlay.is_currently_failing;
            const hasLabel = Boolean(overlay.label && overlay.label.trim());

            return (
              <div
                key={overlay.id}
                style={{
                  left: `${overlay.x_coord}%`,
                  top: `${overlay.y_coord}%`,
                  width: `${overlay.width}%`,
                  height: `${overlay.height}%`,
                }}
                className={`absolute transition-all rounded z-10 flex flex-col justify-between p-1 select-none ${
                  isRevealed
                    ? 'bg-transparent border-2 border-dashed border-zinc-400 shadow-lg'
                    : isFailing
                    ? 'bg-red-950 border-2 border-red-500 shadow-md cursor-pointer hover:bg-red-900'
                    : 'bg-zinc-950 border-2 border-zinc-700 shadow-md cursor-pointer hover:border-zinc-400'
                }`}
                onClick={() => toggleReveal(overlay.id)}
              >
                {!isRevealed && (
                  <>
                    <div className="flex items-center justify-between w-full shrink-0">
                      <span className="text-[9px] font-mono text-zinc-400 font-bold opacity-80">
                        #{idx + 1}
                      </span>
                      {hasLabel && <HelpCircle className="w-2.5 h-2.5 text-zinc-400 shrink-0" />}
                    </div>

                    <div className="w-full my-auto text-center px-1">
                      {hasLabel ? (
                        <span className="text-[10px] font-medium text-zinc-100 line-clamp-2 leading-tight block">
                          {overlay.label}
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-500 font-mono">Tap to reveal</span>
                      )}
                    </div>
                  </>
                )}

                {isRevealed && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30 bg-zinc-950 border border-zinc-700 rounded-lg p-1 flex items-center space-x-1 shadow-xl"
                  >
                    <span className="text-[10px] text-zinc-400 px-1 font-medium">Recalled?</span>
                    <button
                      onClick={() => handleGradeOverlay(overlay.id, true)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-colors ${
                        !isFailing
                          ? 'bg-zinc-100 text-zinc-950 font-extrabold'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>Yes</span>
                    </button>
                    <button
                      onClick={() => handleGradeOverlay(overlay.id, false)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-colors ${
                        isFailing
                          ? 'bg-red-500 text-white font-extrabold'
                          : 'bg-zinc-800 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      <X className="w-3 h-3" />
                      <span>No</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Summary Modal */}
      {summaryResult && (
        <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 mx-auto">
              <Award className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-zinc-100">Session Complete</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Spaced repetition schedule updated</p>
            </div>

            <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Total Overlays:</span>
                <strong className="text-zinc-100 font-mono">{summaryResult.totalOverlays}</strong>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Failed Overlays:</span>
                <strong className="text-red-400 font-mono">{summaryResult.failedOverlays}</strong>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Weighted Error:</span>
                <strong className="text-amber-400 font-mono">{summaryResult.weightedErrorPercent}%</strong>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Status Color:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-800 text-zinc-200 border border-zinc-700">
                  {summaryResult.newStatusColor}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800 pt-2">
                <span>Next Revision Date:</span>
                <strong className="text-zinc-100 font-mono">{summaryResult.newNextRevisionDate}</strong>
              </div>

              {summaryResult.isLockedToday && (
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-300 flex items-center justify-center space-x-1">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Once-Daily Lock Active (Reviewed today)</span>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Link
                href="/"
                className="px-5 py-2 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg shadow-sm hover:bg-zinc-200 transition-all"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
