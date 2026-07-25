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
    { value: '', label: 'Select task for this focus session...' },
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
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] bg-zinc-950/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Bar: Motivational Quote & Exit Fullscreen */}
      <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto w-full border-b border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Quote className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-xs sm:text-sm italic font-medium text-zinc-300 truncate">
            &ldquo;{currentQuote}&rdquo;
          </p>
          <button
            onClick={handleNextQuote}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors shrink-0"
            title="Next quote"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all flex items-center space-x-1.5 shrink-0"
          title="Exit Fullscreen Mode"
        >
          <Minimize2 className="w-4 h-4" />
          <span className="text-xs font-semibold hidden sm:inline">Exit Fullscreen</span>
        </button>
      </div>

      {/* Center Stage: Giant Countdown Clock & Controls */}
      <div className="flex flex-col items-center justify-center my-auto space-y-8 max-w-2xl mx-auto w-full">
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
              {m}m Focus
            </button>
          ))}
        </div>

        {/* Giant Timer Typography */}
        <div className="text-7xl sm:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter select-none drop-shadow-2xl">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        {/* Reordered Action Bar: Left = Reset, Center = Start/Pause, Right = Exit */}
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

      {/* Bottom Section: Task Selection Dropdown */}
      <div className="max-w-2xl mx-auto w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300">
          <Target className="w-4 h-4 text-blue-400" />
          <span>Active Task Target</span>
        </div>

        <CustomSelect
          options={taskOptions}
          value={selectedTaskId}
          onChange={(val) => setSelectedTaskId(val)}
          placeholder="Select a task to focus on during this session..."
        />

        {selectedTask && (
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                {selectedTask.subject?.name || 'Subject'} &bull; {selectedTask.topic?.name || 'Topic'}
              </span>
              <h4 className="text-xs font-bold text-zinc-100 mt-1">{selectedTask.title}</h4>
            </div>
            <div className="flex items-center space-x-1 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Target Locked</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
