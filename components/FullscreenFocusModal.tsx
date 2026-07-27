'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task } from '@/lib/types';
import { getTodayDateString } from '@/lib/spacedRepetition';
import { getEgoAttackMessage } from '@/lib/gamification';
import { Play, Pause, Square, RotateCcw, Minimize2, Quote, Sparkles, Target, CheckCircle2, Flame } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface FullscreenFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  secondsLeft: number;
  isActive: boolean;
  targetMinutes: number;
  onToggleTimer: () => void;
  onResetTimer: (mins?: number) => void;
  onStopTimer?: () => void;
  tasks: Task[];
  quotes: string[];
  dayEndTime: string;
  currentRank?: string;
  currentLevel?: number;
}

function FlipDigit({ value }: { value: string }) {
  const [currentValue, setCurrentValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== currentValue) {
      setPreviousValue(currentValue);
      setCurrentValue(value);
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [value, currentValue]);

  return (
    <div className="relative w-20 h-32 sm:w-32 sm:h-48 md:w-40 md:h-60 lg:w-48 lg:h-72 bg-zinc-950 border border-zinc-800/90 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-[0_25px_60px_rgba(0,0,0,0.9)] perspective-1000 select-none overflow-hidden group">
      {/* Background Top Half (New Value) */}
      <div className="absolute top-0 inset-x-0 bottom-1/2 bg-zinc-900 border-b border-zinc-950/80 flex items-end justify-center overflow-hidden">
        <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter translate-y-1/2 select-none drop-shadow-lg">
          {currentValue}
        </span>
      </div>

      {/* Background Bottom Half (Old Value) */}
      <div className="absolute bottom-0 inset-x-0 top-1/2 bg-zinc-900 flex items-start justify-center overflow-hidden">
        <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter -translate-y-1/2 select-none drop-shadow-lg">
          {previousValue}
        </span>
      </div>

      {/* Animated Flipping Card (Top -> Down) */}
      {isFlipping && (
        <>
          {/* Top Half flipping down */}
          <div
            className="absolute top-0 inset-x-0 bottom-1/2 bg-zinc-900 border-b border-zinc-950 flex items-end justify-center overflow-hidden origin-bottom animate-flip-top z-10"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }}
          >
            <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter translate-y-1/2 select-none drop-shadow-lg">
              {previousValue}
            </span>
          </div>

          {/* Bottom Half flipping down */}
          <div
            className="absolute bottom-0 inset-x-0 top-1/2 bg-zinc-900 flex items-start justify-center overflow-hidden origin-top animate-flip-bottom z-10"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }}
          >
            <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter -translate-y-1/2 select-none drop-shadow-lg">
              {currentValue}
            </span>
          </div>
        </>
      )}

      {/* Center Line Split & Shading */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-950 z-20 shadow-md pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/40 pointer-events-none z-10" />
    </div>
  );
}

export default function FullscreenFocusModal({
  isOpen,
  onClose,
  secondsLeft,
  isActive,
  targetMinutes,
  onToggleTimer,
  onResetTimer,
  onStopTimer,
  tasks = [],
  quotes,
  dayEndTime,
  currentRank = 'E-Rank',
  currentLevel = 1,
}: FullscreenFocusModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [egoMessage, setEgoMessage] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll to prevent page scrollbars when fullscreen mode is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (quotes && quotes.length > 0) {
      setCurrentQuoteIndex(Math.floor(Math.random() * quotes.length));
    }
  }, [quotes, isOpen]);

  // Generate new rank-based personal ego attack message whenever session is started or activated
  useEffect(() => {
    if (isActive) {
      setEgoMessage(getEgoAttackMessage(currentRank, currentLevel));
    }
  }, [isActive, currentRank, currentLevel]);

  if (!isOpen || !mounted) return null;

  const today = getTodayDateString(dayEndTime);

  // Group tasks into today's tasks and other scheduled tasks
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

  const handleNextQuote = () => {
    if (quotes && quotes.length > 0) {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }
  };

  const currentQuote =
    quotes && quotes.length > 0
      ? quotes[currentQuoteIndex]
      : 'Focus on being productive instead of busy.';

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] bg-zinc-950/98 backdrop-blur-3xl flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-zinc-100 overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200">
      {/* TOP HEADER BAR: Motivational Quote + Exit Fullscreen */}
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
            onClick={onClose}
            className="p-2.5 sm:p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-md shrink-0 flex items-center space-x-2 text-xs font-semibold"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Fullscreen</span>
          </button>
        </div>

        {/* Rank Ego Attack Warning Badge (Top Subtle Banner) */}
        {isActive && egoMessage && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-300 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg animate-pulse max-w-lg text-center">
            <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">{egoMessage}</span>
          </div>
        )}
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
            onClick={() => onResetTimer()}
            className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-xl active:scale-95"
            title="Reset Timer"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          <button
            onClick={onToggleTimer}
            className={`px-10 py-4 sm:px-14 sm:py-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center space-x-3 transition-all shadow-2xl active:scale-95 ${
              isActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                : 'bg-zinc-100 text-zinc-950 hover:bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)]'
            }`}
          >
            {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            <span>{isActive ? 'Pause Timer' : 'Start Focus'}</span>
          </button>

          {(isActive || secondsLeft < targetMinutes * 60) && onStopTimer && (
            <button
              onClick={() => {
                onStopTimer();
                onClose();
              }}
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
              onClick={() => onResetTimer(m)}
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
    </div>,
    document.body
  );
}
