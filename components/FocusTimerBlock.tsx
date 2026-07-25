'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, Maximize2 } from 'lucide-react';
import { recordFocusSession, fetchUserSettings } from '@/lib/supabase';
import { Task } from '@/lib/types';
import FullscreenFocusModal from './FullscreenFocusModal';

interface FocusTimerBlockProps {
  onSessionComplete?: () => void;
  tasks?: Task[];
}

export default function FocusTimerBlock({ onSessionComplete, tasks = [] }: FocusTimerBlockProps) {
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [userQuotes, setUserQuotes] = useState<string[]>([]);
  const [dayEndTime, setDayEndTime] = useState<string>('00:00');

  useEffect(() => {
    fetchUserSettings().then((s) => {
      if (s?.quotes && s.quotes.length > 0) setUserQuotes(s.quotes);
      if (s?.day_end_time) setDayEndTime(s.day_end_time);
    });
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const handleFinish = async () => {
    await recordFocusSession(targetMinutes);
    if (onSessionComplete) onSessionComplete();
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = (mins: number = targetMinutes) => {
    setIsActive(false);
    setTargetMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <>
      <div className="glass-panel rounded-xl p-4 border border-zinc-800 flex flex-col justify-between h-[190px] min-h-[190px] max-h-[190px] overflow-hidden w-full">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-200">Focus Timer</span>
          </div>
          <div className="flex items-center space-x-1">
            {[25, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => resetTimer(m)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  targetMinutes === m && !isActive
                    ? 'bg-zinc-100 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        <div className="text-center my-auto">
          <span className="text-3xl font-bold font-mono text-zinc-100 tracking-tight">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        {/* Toolbar Ordered: Left = Reset, Center = Start/Pause, Right = Fullscreen */}
        <div className="relative flex items-center justify-between pt-2 border-t border-zinc-800/80 shrink-0 w-full">
          {/* Left: Reset Timer Button */}
          <button
            onClick={() => resetTimer()}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Center: Start / Pause Button */}
          <button
            onClick={toggleTimer}
            className={`px-4 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm ${
              isActive
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
            }`}
          >
            {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isActive ? 'Pause' : 'Start'}</span>
          </button>

          {/* Right: Fullscreen Icon Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Fullscreen Focus Mode"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fullscreen Focus Modal Component */}
      <FullscreenFocusModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        secondsLeft={secondsLeft}
        isActive={isActive}
        targetMinutes={targetMinutes}
        onToggleTimer={toggleTimer}
        onResetTimer={resetTimer}
        tasks={tasks}
        quotes={userQuotes}
        dayEndTime={dayEndTime}
      />
    </>
  );
}
