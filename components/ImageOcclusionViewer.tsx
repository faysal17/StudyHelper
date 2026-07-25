'use client';

import { useState } from 'react';
import { Task, Note, Overlay } from '@/lib/types';
import { updateOverlayFailingStatus, updateTask, logRevisionScore } from '@/lib/supabase';
import { evaluateSpacedRepetition } from '@/lib/spacedRepetition';
import { Check, X, Eye, EyeOff, RotateCw, Trophy, ArrowLeft, Award, Lock } from 'lucide-react';
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

    // Run Spaced Repetition Logic Engine
    const srResult = evaluateSpacedRepetition(task, totalOverlays, failedOverlays);

    try {
      // 1. Log score in Revision_Logs table
      const score = Math.round((100 - srResult.weightedErrorPercent) * 10) / 10;
      await logRevisionScore(task.id, score);

      // 2. Update Task if not once-daily locked
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

      // Fire festive celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
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
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/30">
                Active Recall Mode
              </span>
              <span className="text-xs text-slate-400">P{task.priority} Priority</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-0.5">{task.title}</h2>
          </div>
        </div>

        {/* Live Session Counter */}
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs flex items-center space-x-3">
            <span className="text-slate-400"> Overlays: <strong className="text-slate-100">{overlays.length}</strong></span>
            <span className="text-slate-400"> Failed: <strong className="text-red-400">{failedCount}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={revealAllOverlays}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="সব রিভিল করুন"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={hideAllOverlays}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="সব হাইড করুন"
            >
              <EyeOff className="w-4 h-4" />
            </button>

            <button
              onClick={handleFinishSession}
              disabled={isFinishing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-2"
            >
              <Trophy className="w-4 h-4 stroke-[2.5]" />
              <span>রিভিশন সম্পন্ন করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Note Image Canvas Container with Interactive Overlays */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 relative">
        <div className="relative inline-block w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 select-none">
          {/* Handwritten Note Image */}
          <img
            src={note.image_url}
            alt="Scanned note"
            className="w-full h-auto object-contain block pointer-events-none"
          />

          {/* Render Overlays */}
          {overlays.map((overlay, idx) => {
            const isRevealed = Boolean(revealedIds[overlay.id]);
            const isFailing = overlay.is_currently_failing;

            return (
              <div
                key={overlay.id}
                style={{
                  left: `${overlay.x_coord}%`,
                  top: `${overlay.y_coord}%`,
                  width: `${overlay.width}%`,
                  height: `${overlay.height}%`,
                }}
                className={`absolute transition-all rounded duration-150 ${
                  isRevealed
                    ? 'bg-transparent border-2 border-dashed border-emerald-400/80 shadow-lg'
                    : isFailing
                    ? 'bg-red-600/40 border-2 border-red-500 shadow-md cursor-pointer hover:bg-red-600/50'
                    : 'bg-slate-900/95 border border-slate-700 shadow-md cursor-pointer hover:border-emerald-400 hover:scale-[1.01]'
                }`}
                onClick={() => toggleReveal(overlay.id)}
              >
                {/* Number tag */}
                {!isRevealed && (
                  <div className="absolute top-0.5 left-1 text-[9px] font-mono font-bold text-slate-400 opacity-60">
                    #{idx + 1}
                  </div>
                )}

                {/* Yes / No Rating Control Bar when Revealed */}
                {isRevealed && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-20 bg-slate-950 border border-slate-700 rounded-lg p-1 flex items-center space-x-1 shadow-2xl animate-in fade-in zoom-in-90 duration-150"
                  >
                    <span className="text-[10px] text-slate-400 px-1 font-medium">Recalled?</span>
                    <button
                      onClick={() => handleGradeOverlay(overlay.id, true)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-colors ${
                        !isFailing
                          ? 'bg-emerald-500 text-slate-950 font-extrabold'
                          : 'bg-slate-800 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                      title="Correct (Yes)"
                    >
                      <Check className="w-3 h-3" />
                      <span>Yes</span>
                    </button>
                    <button
                      onClick={() => handleGradeOverlay(overlay.id, false)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition-colors ${
                        isFailing
                          ? 'bg-red-500 text-white font-extrabold'
                          : 'bg-slate-800 text-red-400 hover:bg-red-500/20'
                      }`}
                      title="Failed (No)"
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

      {/* Revision Results Summary Modal */}
      {summaryResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 mx-auto shadow-lg shadow-emerald-500/30">
              <Award className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-100">রিভিশন সেশন ফলাফল (Session Complete)</h3>
              <p className="text-xs text-slate-400 mt-1">স্পেসড রিপিটিশন অ্যালগরিদম দ্বারা শিডিউল আপডেট করা হয়েছে</p>
            </div>

            {/* Score & Lock Info */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>মোট ওভারলে (Total):</span>
                <strong className="text-slate-100 font-mono">{summaryResult.totalOverlays}</strong>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>ফেইলড ওভারলে (Failed):</span>
                <strong className="text-red-400 font-mono">{summaryResult.failedOverlays}</strong>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>ওয়েটেড এরর রেট (Weighted Error):</span>
                <strong className="text-amber-400 font-mono">{summaryResult.weightedErrorPercent}%</strong>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>নতুন স্ট্যাটাস কালার (Status Color):</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    summaryResult.newStatusColor === 'red'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : summaryResult.newStatusColor === 'yellow'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {summaryResult.newStatusColor}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-300 border-t border-slate-800 pt-2">
                <span>পরবর্তী রিভিশন (Next Revision):</span>
                <strong className="text-emerald-400 font-mono">{summaryResult.newNextRevisionDate}</strong>
              </div>

              {summaryResult.isLockedToday && (
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300 flex items-center justify-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Once-Daily Lock Active: আজকে ইতোমধ্যেই একবার রিভিশন দেওয়া হয়েছে।</span>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Link
                href="/"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
              >
                ড্যাশবোর্ডে ফিরে যান
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
