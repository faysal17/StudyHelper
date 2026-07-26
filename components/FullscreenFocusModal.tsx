'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task } from '@/lib/types';
import { getTodayDateString } from '@/lib/spacedRepetition';
import { Play, Pause, RotateCcw, Minimize2, Quote, Sparkles, Target, CheckCircle2 } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface FullscreenFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  secondsLeft: number;
  isActive: boolean;
  targetMinutes: number;
  onToggleTimer: () => void;
  onResetTimer: (mins?: number) => void;
  tasks: Task[];
  quotes: string[];
  dayEndTime: string;
}

function FlipDigit({ value }: { value: string }) {
  return (
    <div className="relative w-16 h-24 sm:w-24 sm:h-32 md:w-32 md:h-44 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden group">
      {/* Top Half Shading */}
      <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-zinc-800/40 border-b border-zinc-950/80 pointer-events-none" />
      {/* Center Flip Divider Line */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-zinc-950/90 z-10 shadow-sm pointer-events-none" />
      {/* Digit Typography */}
      <span className="text-5xl sm:text-7xl md:text-8xl font-extrabold font-mono text-zinc-100 tracking-tighter relative z-0 drop-shadow-md select-none">
        {value}
      </span>
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
  tasks,
  quotes,
  dayEndTime,
}: FullscreenFocusModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (quotes && quotes.length > 0) {
      setCurrentQuoteIndex(Math.floor(Math.random() * quotes.length));
    }
  }, [quotes, isOpen]);

  if (!isOpen || !mounted) return null;

  const today = getTodayDateString(dayEndTime);

  // Today's study & revision tasks for selection dropdown
  const todayNewTasks = tasks.filter((t) => !t.last_reviewed_date && t.next_revision_date <= today);
  const todayRevisionTasks = tasks.filter(
    (t) => Boolean(t.last_reviewed_date) && t.next_revision_date <= today
  );

  const taskOptions = [
    { value: '', label: 'Select active target task...' },
    ...todayNewTasks.map((t) => ({
      value: t.id,
      label: `[New] ${t.subject?.name || 'Subject'} • ${t.topic?.name || 'Topic'} | ${t.title}`,
    })),
    ...todayRevisionTasks.map((t) => ({
      value: t.id,
      label: `[Revision] ${t.subject?.name || 'Subject'} • ${t.topic?.name || 'Topic'} | ${t.title}`,
    })),
  ];

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const minStr = String(minutes).padStart(2, '0');
  const secStr = String(seconds).padStart(2, '0');

  const handleNextQuote = () => {
    if (quotes.length > 0) {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }
  };

  const currentQuote =
    quotes && quotes.length > 0
      ? quotes[currentQuoteIndex]
      : 'Focus on being productive instead of busy.';

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] bg-zinc-950/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner: Motivational Quote Only (Top Exit Button Removed) */}
      <div className="flex items-center justify-center max-w-3xl mx-auto w-full pt-2">
        <div className="flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800/80 px-4 py-2 rounded-full shadow-sm">
          <Quote className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs sm:text-sm italic font-medium text-zinc-300 text-center max-w-xl truncate">
            &ldquo;{currentQuote}&rdquo;
          </p>
          <button
            onClick={handleNextQuote}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors shrink-0"
            title="Next quote"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Stage: Giant 3D Flip-Style Timer & Controls */}
      <div className="flex flex-col items-center justify-center my-auto space-y-6 sm:space-y-8 max-w-3xl mx-auto w-full">
        {/* Preset Minutes Selection */}
        <div className="flex items-center space-x-2 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-xl">
          {[25, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => onResetTimer(m)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                targetMinutes === m && !isActive
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>

        {/* 3D Flip-Card Digit Display */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-3">
          <FlipDigit value={minStr[0]} />
          <FlipDigit value={minStr[1]} />
          <span className="text-4xl sm:text-6xl font-bold font-mono text-zinc-500 animate-pulse pb-2">:</span>
          <FlipDigit value={secStr[0]} />
          <FlipDigit value={secStr[1]} />
        </div>

        {/* Reordered Action Bar: Left = Reset, Center = Start/Pause, Right = Exit Fullscreen */}
        <div className="relative flex items-center justify-center w-full max-w-md border-t border-zinc-800/80 pt-6">
          {/* Left: Reset Button */}
          <button
            onClick={() => onResetTimer()}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Center: Start / Pause Button */}
          <button
            onClick={onToggleTimer}
            className={`px-8 py-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-lg mx-auto ${
              isActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
            }`}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isActive ? 'Pause Timer' : 'Start Focus'}</span>
          </button>

          {/* Right: Exit Fullscreen Button */}
          <button
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Section: Minimal Active Task Target with Upward Dropdown */}
      <div className="max-w-xl mx-auto w-full bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
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

        {/* Upward Opening Custom Select to prevent bottom screen overflow */}
        <CustomSelect
          options={taskOptions}
          value={selectedTaskId}
          onChange={(val) => setSelectedTaskId(val)}
          placeholder="Select a task to focus on..."
          openUpward={true}
        />
      </div>
    </div>,
    document.body
  );
}
