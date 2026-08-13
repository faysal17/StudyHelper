'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Task } from '@/lib/types';
import { getTodayDateString } from '@/lib/spacedRepetition';
import { getEgoAttackMessage } from '@/lib/gamification';
import { fetchTasks } from '@/lib/supabase';
import { Play, Pause, Square, RotateCcw, Minimize2, Quote, Sparkles, Target, CheckCircle2, Flame } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import FocusRatingModal from '@/components/FocusRatingModal';
import QuitTauntModal from '@/components/QuitTauntModal';
import HunterEventModal from '@/components/HunterEventModal';
import XPChangeModal from '@/components/XPChangeModal';
import FlipDigit from '@/components/FlipDigit';
import { useFocusTimer, TIMER_STORAGE_KEY } from '@/hooks/useFocusTimer';

export default function FocusPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [egoMessage, setEgoMessage] = useState<string>('');

  const {
    targetMinutes,
    secondsLeft,
    isActive,
    userSettings,
    toggleTimer,
    resetTimer,
    handleStop,
    showRatingModal,
    handleFinishRating,
    showQuitModal,
    setShowQuitModal,
    quitPenaltyInfo,
    xpModalOpen,
    xpChangeAmount,
    xpReason,
    xpMultiplier,
    xpNewTotal,
    handleCloseXPModal,
    eventModalOpen,
    setEventModalOpen,
    activeEventType,
    eventOldRank,
    eventNewRank,
    eventOldLevel,
    eventNewLevel,
    eventOldPos,
    eventNewPos,
  } = useFocusTimer({
    isFullscreen: true,
    onUserSettingsLoaded: (s) => {
      if (s?.show_rank_features === false) {
        router.push('/');
        return;
      }
      if (s?.quotes && s.quotes.length > 0) {
        setCurrentQuoteIndex(Math.floor(Math.random() * s.quotes.length));
      }
    },
  });

  useEffect(() => {
    fetchTasks().then(setTasks);
  }, []);

  useEffect(() => {
    if (isActive) {
      setEgoMessage(getEgoAttackMessage(userSettings?.current_rank || 'E-Rank', userSettings?.level || 1));
    }
  }, [isActive, userSettings]);

  const exitFocusPage = () => {
    if (!isActive && secondsLeft === targetMinutes * 60) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    }
    router.push('/');
  };

  const today = getTodayDateString(userSettings?.day_end_time || '00:00');

  const todayNewTasks = tasks.filter((t) => !t.last_reviewed_date && t.next_revision_date <= today);
  const todayRevisionTasks = tasks.filter(
    (t) => Boolean(t.last_reviewed_date) && t.next_revision_date <= today
  );
  const otherTasks = tasks.filter((t) => t.next_revision_date > today);

  const taskOptions = [
    { value: '', label: 'Select active target task...' },
    ...todayNewTasks.map((t) => ({
      value: t.id,
      label: `[New Today] ${t.subject?.name || 'Subject'} • ${t.topic?.name || 'Topic'} | ${t.title}`,
    })),
    ...todayRevisionTasks.map((t) => ({
      value: t.id,
      label: `[Revision Today] ${t.subject?.name || 'Subject'} • ${t.topic?.name || 'Topic'} | ${t.title}`,
    })),
    ...otherTasks.map((t) => ({
      value: t.id,
      label: `[Scheduled] ${t.subject?.name || 'Subject'} • ${t.topic?.name || 'Topic'} | ${t.title}`,
    })),
  ];

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const minStr = String(minutes).padStart(2, '0');
  const secStr = String(seconds).padStart(2, '0');

  const quotes = userSettings?.quotes || [];

  const handleNextQuote = () => {
    if (quotes.length > 0) {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }
  };

  const currentQuote =
    quotes.length > 0
      ? quotes[currentQuoteIndex]
      : 'Focus on being productive instead of busy.';

  return (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] bg-zinc-950/98 backdrop-blur-3xl flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-zinc-100 overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200">
      {/* TOP HEADER BAR: Quote + Exit Button + Reserved Height Ego Badge */}
      <div className="w-full flex flex-col items-center gap-3 shrink-0 z-20">
        <div className="w-full flex items-center justify-between gap-4 max-w-5xl mx-auto">
          {/* Motivational Quote Banner */}
          <div className="flex items-center space-x-3 bg-zinc-900/80 border border-zinc-800 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl shadow-lg max-w-2xl">
            <Quote className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <p className="text-xs sm:text-sm font-semibold italic text-zinc-200 truncate leading-snug">
              &ldquo;{currentQuote}&rdquo;
            </p>
            <button
              onClick={handleNextQuote}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors shrink-0"
              title="Next quote"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exit Fullscreen Button */}
          <button
            onClick={exitFocusPage}
            className="p-2.5 sm:p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-md shrink-0 flex items-center space-x-2 text-xs font-semibold"
            title="Exit Fullscreen Mode"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Fullscreen</span>
          </button>
        </div>

        {/* Reserved Height Container for Ego Message (Zero Layout Shift) */}
        <div className="flex items-center justify-center min-h-[38px] w-full px-4">
          {isActive && egoMessage && (
            <div className="bg-red-950/60 border border-red-500/40 text-red-300 px-5 py-2 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xl animate-pulse max-w-2xl text-center leading-normal">
              <Flame className="w-4 h-4 text-red-400 shrink-0" />
              <span>{egoMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* CENTER HERO STAGE: Giant 3D Flip Clock & Action Buttons */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-6xl mx-auto space-y-8 sm:space-y-12">
        {/* 3D Flip-Card Digit Display */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 md:space-x-6 lg:space-x-8">
          <FlipDigit value={minStr[0]} />
          <FlipDigit value={minStr[1]} />

          {/* Colon Divider */}
          <div className="flex flex-col justify-center space-y-4 sm:space-y-6 px-1 sm:px-2">
            <span className="w-3 h-3 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-zinc-400/80 shadow-[0_0_15px_rgba(250,250,250,0.5)] animate-pulse" />
            <span className="w-3 h-3 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-zinc-400/80 shadow-[0_0_15px_rgba(250,250,250,0.5)] animate-pulse" />
          </div>

          <FlipDigit value={secStr[0]} />
          <FlipDigit value={secStr[1]} />
        </div>

        {/* Primary Timer Controls */}
        <div className="flex items-center justify-center space-x-4 sm:space-x-6">
          <button
            onClick={() => resetTimer()}
            className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-xl active:scale-95"
            title="Reset Timer"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          <button
            onClick={toggleTimer}
            className={`px-10 py-4 sm:px-14 sm:py-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center space-x-3 transition-all shadow-2xl active:scale-95 ${
              isActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                : 'bg-zinc-100 text-zinc-950 hover:bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)]'
            }`}
          >
            {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            <span>{isActive ? 'Pause Timer' : 'Start Focus'}</span>
          </button>

          {(isActive || secondsLeft < targetMinutes * 60) && (
            <button
              onClick={handleStop}
              className="px-6 py-4 sm:px-8 sm:py-5 rounded-2xl text-sm sm:text-base font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all flex items-center space-x-2 shadow-xl active:scale-95"
              title="Abandon & Stop Session"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM FOOTER BAR: Preset Selection & Target Study Task */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto pt-4 border-t border-zinc-900 shrink-0 z-20">
        {/* Preset Minutes Selection */}
        <div className="flex items-center space-x-2 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-2xl shadow-lg">
          {[25, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => resetTimer(m)}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono transition-all ${
                targetMinutes === m && !isActive
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {m}m Focus
            </button>
          ))}
        </div>

        {/* Active Task Target Dropdown */}
        <div className="w-full sm:w-auto min-w-[320px] max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2.5 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1.5 px-1">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              <span>Target Study Task</span>
            </span>
            {selectedTask && (
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          <CustomSelect
            options={taskOptions}
            value={selectedTaskId}
            onChange={(val) => setSelectedTaskId(val)}
            placeholder="Select a task to focus on..."
            openUpward={true}
          />
        </div>
      </div>

      <FocusRatingModal
        isOpen={showRatingModal}
        targetMinutes={targetMinutes}
        onRate={handleFinishRating}
      />

      <QuitTauntModal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        currentRank={userSettings?.current_rank || 'E-Rank'}
        isPenaltyApplied={quitPenaltyInfo.isPenalty}
        penaltyAmount={quitPenaltyInfo.amount}
      />

      <XPChangeModal
        isOpen={xpModalOpen}
        onClose={handleCloseXPModal}
        amount={xpChangeAmount}
        reason={xpReason}
        multiplier={xpMultiplier}
        newTotalXP={xpNewTotal}
      />

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
