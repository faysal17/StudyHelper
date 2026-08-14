'use client';

import { useState, useEffect, useRef } from 'react';
import { Task, Note, Overlay } from '@/lib/types';
import { updateOverlayFailingStatus, updateTask, logRevisionScore, fetchUserSettings } from '@/lib/supabase';
import { evaluateSpacedRepetition } from '@/lib/spacedRepetition';
import { calculateMomentum } from '@/lib/momentum';
import { calculateGlobalHunterRank } from '@/lib/gamification';
import { Check, X, Eye, EyeOff, Trophy, ArrowLeft, Award, Lock, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import XPChangeModal from './XPChangeModal';
import HunterEventModal, { EventType } from './HunterEventModal';
import Tooltip from './Tooltip';

interface ImageOcclusionViewerProps {
  task: Task;
  note: Note;
  overlays: Overlay[];
}

function shuffledIds(items: Overlay[]): string[] {
  const ids = items.map((o) => o.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export default function ImageOcclusionViewer({ task, note, overlays: initialOverlays }: ImageOcclusionViewerProps) {
  const [overlays, setOverlays] = useState<Overlay[]>(initialOverlays);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Randomized review order: one overlay is "current" at a time — still
  // covered like the rest, just outlined — and the view auto-scrolls to it.
  const [reviewOrder] = useState<string[]>(() => shuffledIds(initialOverlays));
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentOverlayId = reviewOrder[currentIndex];
  const overlayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!currentOverlayId) return;
    overlayRefs.current[currentOverlayId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  }, [currentOverlayId]);

  const [isFinishing, setIsFinishing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any | null>(null);

  // XP Modal State
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [xpReason, setXpReason] = useState('');
  const [xpMultiplier, setXpMultiplier] = useState(1.0);
  const [newTotalXP, setNewTotalXP] = useState(0);

  // Level Up / Rank Up Event Modal State
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [activeEventType, setActiveEventType] = useState<EventType>('rank-up');
  const [pendingEventModal, setPendingEventModal] = useState<EventType | null>(null);
  const [eventOldPos, setEventOldPos] = useState(500);
  const [eventNewPos, setEventNewPos] = useState(480);
  const [eventOldRank, setEventOldRank] = useState('E-Rank');
  const [eventNewRank, setEventNewRank] = useState('D-Rank');
  const [eventOldLevel, setEventOldLevel] = useState(5);
  const [eventNewLevel, setEventNewLevel] = useState(6);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleGradeOverlay = async (e: React.MouseEvent, overlayId: string, isCorrect: boolean) => {
    e.stopPropagation();
    const isCurrentlyFailing = !isCorrect;
    try {
      await updateOverlayFailingStatus(overlayId, isCurrentlyFailing);
      setOverlays((prev) =>
        prev.map((o) => (o.id === overlayId ? { ...o, is_currently_failing: isCurrentlyFailing } : o))
      );

      // Grading the block currently up for review advances to the next
      // one in the randomized order and re-covers this one.
      if (overlayId === currentOverlayId) {
        setRevealedIds((prev) => ({ ...prev, [overlayId]: false }));
        setCurrentIndex((idx) => Math.min(idx + 1, reviewOrder.length - 1));
      }
    } catch (err) {
      console.error('Error updating overlay status:', err);
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
      const oldSettings = await fetchUserSettings();
      const oldLevel = oldSettings?.level || 1;
      const oldRank = oldSettings?.current_rank || 'E-Rank';
      const oldGlobalPos = oldSettings?.official_weekly_rank || 500;

      const score = Math.round((100 - srResult.weightedErrorPercent) * 10) / 10;
      const isRepeatToday = srResult.isLockedToday;

      const xpGained = await logRevisionScore(task.id, score, totalOverlays, isRepeatToday);
      const updatedSettings = await fetchUserSettings();
      const showRankFeatures = updatedSettings?.show_rank_features !== false;

      const newLevel = updatedSettings?.level || 1;
      const newRank = updatedSettings?.current_rank || 'E-Rank';
      const newMomentum = calculateMomentum(updatedSettings);
      const newGlobalPos = updatedSettings?.official_weekly_rank || 500;

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

      if (showRankFeatures) {
        // Prepare Level Up or Rank Up event if occurred
        let eventType: EventType | null = null;
        if (newRank !== oldRank && newLevel > oldLevel) {
          eventType = 'rank-up';
        } else if (newLevel > oldLevel) {
          eventType = 'level-up';
        }

        if (eventType) {
          setActiveEventType(eventType);
          setPendingEventModal(eventType);
          setEventOldRank(oldRank);
          setEventNewRank(newRank);
          setEventOldLevel(oldLevel);
          setEventNewLevel(newLevel);
          setEventOldPos(oldGlobalPos);
          setEventNewPos(newGlobalPos);
        }

        // Trigger XP Gain Modal FIRST
        setEarnedXP(xpGained);
        const reasonText = isRepeatToday
          ? `Task already reviewed today (0 XP awarded for repeated attempts)`
          : xpGained === 0
          ? `Active Recall Score: ${score}% (${totalOverlays} Overlays - score below 50%)`
          : `Active Recall Test Score: ${score}% (${totalOverlays} Overlays)`;
        setXpReason(reasonText);
        setXpMultiplier(newMomentum.xpMultiplier);
        setNewTotalXP(updatedSettings.xp || 0);
        setXpModalOpen(true);
      }

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

  const handleCloseXPModal = () => {
    setXpModalOpen(false);
    if (pendingEventModal) {
      setEventModalOpen(true);
      setPendingEventModal(null);
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
            <span className="text-zinc-400">Incorrect: <strong className="text-red-400">{failedCount}</strong></span>
            {reviewOrder.length > 0 && (
              <span className="text-zinc-400">
                Reviewing: <strong className="text-cyan-400">{Math.min(currentIndex + 1, reviewOrder.length)}/{reviewOrder.length}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Tooltip content="Reveal All Occlusion Boxes">
              <button
                onClick={revealAllOverlays}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Hide All Occlusion Boxes">
              <button
                onClick={hideAllOverlays}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </Tooltip>

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
            const isCurrent = overlay.id === currentOverlayId;

            return (
              <div
                key={overlay.id}
                ref={(el) => {
                  overlayRefs.current[overlay.id] = el;
                }}
                onClick={() => toggleReveal(overlay.id)}
                style={{
                  left: `${overlay.x_coord}%`,
                  top: `${overlay.y_coord}%`,
                  width: `${overlay.width}%`,
                  height: `${overlay.height}%`,
                }}
                className={`absolute transition-all rounded z-10 flex flex-col justify-between p-1.5 select-none cursor-pointer ${
                  isRevealed
                    ? 'bg-transparent border-2 border-dashed border-zinc-400 shadow-lg'
                    : isFailing
                    ? 'bg-red-950/90 border-2 border-red-500 text-red-200 hover:bg-red-900/90'
                    : 'bg-zinc-900 border border-zinc-700 text-zinc-200 shadow-md hover:bg-zinc-800'
                } ${
                  isCurrent
                    ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-950 z-20'
                    : ''
                }`}
              >
                {/* Header label & eye toggle */}
                <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                  <span className="font-bold truncate bg-zinc-950/80 px-1 py-0.5 rounded text-zinc-300">
                    {hasLabel ? overlay.label : `#${idx + 1}`}
                  </span>
                  <div className="p-0.5 rounded hover:bg-zinc-800 transition-colors">
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                </div>

                {/* Bigger & Prominent Grading Action Buttons when revealed */}
                {isRevealed && (
                  <div className="flex items-center justify-center space-x-1.5 pt-1">
                    <Tooltip content="Mark Answer Correct">
                      <button
                        onClick={(e) => handleGradeOverlay(e, overlay.id, true)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-extrabold flex items-center space-x-1 transition-all shadow-md ${
                          !isFailing
                            ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/20'
                            : 'bg-zinc-900/90 text-zinc-400 border border-zinc-700 hover:text-emerald-400 hover:border-emerald-500/40'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Correct</span>
                      </button>
                    </Tooltip>

                    <Tooltip content="Mark Answer Incorrect">
                      <button
                        onClick={(e) => handleGradeOverlay(e, overlay.id, false)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-extrabold flex items-center space-x-1 transition-all shadow-md ${
                          isFailing
                            ? 'bg-red-500 text-white shadow-red-500/20'
                            : 'bg-zinc-900/90 text-zinc-400 border border-zinc-700 hover:text-red-400 hover:border-red-500/40'
                        }`}
                      >
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Incorrect</span>
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Summary Card */}
      {summaryResult && (
        <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Session Evaluation</h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              Score: {summaryResult.score}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Total Overlays</span>
              <span className="text-sm font-bold text-zinc-200">{summaryResult.totalOverlays}</span>
            </div>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Incorrect Items</span>
              <span className="text-sm font-bold text-red-400">{summaryResult.failedOverlays}</span>
            </div>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Next Revision</span>
              <span className="text-sm font-bold text-cyan-400">{summaryResult.newNextRevisionDate}</span>
            </div>
          </div>
        </div>
      )}

      {/* XP Change Modal Popup */}
      <XPChangeModal
        isOpen={xpModalOpen}
        onClose={handleCloseXPModal}
        amount={earnedXP}
        reason={xpReason}
        multiplier={xpMultiplier}
        newTotalXP={newTotalXP}
      />

      {/* Level Up / Rank Up Celebration Modal */}
      <HunterEventModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        eventType={activeEventType}
        oldRankStr={eventOldRank}
        newRankStr={eventNewRank}
        oldLevel={eventOldLevel}
        newLevel={eventNewLevel}
        oldGlobalPosition={eventOldPos}
        newGlobalPosition={eventNewPos}
      />
    </div>
  );
}
