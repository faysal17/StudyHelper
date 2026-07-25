'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { recordFocusSession } from '@/lib/supabase';

interface FocusTimerBlockProps {
  onSessionComplete?: () => void;
}

export default function FocusTimerBlock({ onSessionComplete }: FocusTimerBlockProps) {
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);

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
    <div className="glass-panel rounded-xl p-4 border border-zinc-800 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
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

      <div className="text-center my-2">
        <span className="text-3xl font-bold font-mono text-zinc-100 tracking-tight">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center justify-center space-x-2 pt-2 border-t border-zinc-800/80">
        <button
          onClick={toggleTimer}
          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
            isActive
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
          }`}
        >
          {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isActive ? 'Pause' : 'Start'}</span>
        </button>

        <button
          onClick={() => resetTimer()}
          className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Reset Timer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
