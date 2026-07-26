'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Clock, Maximize2 } from 'lucide-react';
import { recordRatedFocusSession, recordSessionStop, fetchUserSettings } from '@/lib/supabase';
import { Task, UserSettings } from '@/lib/types';
import FullscreenFocusModal from './FullscreenFocusModal';
import FocusRatingModal from './FocusRatingModal';
import QuitTauntModal from './QuitTauntModal';

interface FocusTimerBlockProps {
  onSessionComplete?: () => void;
  tasks?: Task[];
}

export default function FocusTimerBlock({ onSessionComplete, tasks = [] }: FocusTimerBlockProps) {
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modal States
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [showQuitModal, setShowQuitModal] = useState<boolean>(false);
  const [quitPenaltyInfo, setQuitPenaltyInfo] = useState<{ isPenalty: boolean; amount: number }>({
    isPenalty: false,
    amount: 0,
  });

  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    fetchUserSettings().then((s) => {
      setUserSettings(s);
    });
  }, []);

  // Main Timer Loop & 10-Minute Pause Timeout Checker
  useEffect(() => {
    let interval: any = null;

    if (isActive && secondsLeft > 0) {
      pauseStartRef.current = null;
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      setShowRatingModal(true);
    } else if (!isActive && secondsLeft < targetMinutes * 60 && secondsLeft > 0) {
      // Timer is PAUSED mid-session: check 10-minute auto-stop timeout (600s)
      if (!pauseStartRef.current) {
        pauseStartRef.current = Date.now();
      } else {
        interval = setInterval(() => {
          const elapsedPausedSec = Math.floor((Date.now() - (pauseStartRef.current || Date.now())) / 1000);
          if (elapsedPausedSec >= 600) { // 10 minutes exceeded
            clearInterval(interval);
            handleStop();
          }
        }, 3000);
      }
    }

    return () => clearInterval(interval);
  }, [isActive, secondsLeft, targetMinutes]);

  const handleFinishRating = async (stars: number) => {
    setShowRatingModal(false);
    const updated = await recordRatedFocusSession(targetMinutes, stars);
    setUserSettings(updated);
    resetTimer(targetMinutes);
    if (onSessionComplete) onSessionComplete();
  };

  const handleStop = async () => {
    setIsActive(false);
    pauseStartRef.current = null;
    const { updatedSettings, isPenaltyApplied, penaltyAmount } = await recordSessionStop();
    setUserSettings(updatedSettings);
    setQuitPenaltyInfo({ isPenalty: isPenaltyApplied, amount: penaltyAmount });
    setShowQuitModal(true);
    resetTimer(targetMinutes);
    if (onSessionComplete) onSessionComplete();
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = (mins: number = targetMinutes) => {
    setIsActive(false);
    pauseStartRef.current = null;
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

        {/* Toolbar: Left = Reset, Center = Start/Pause + Stop, Right = Fullscreen */}
        <div className="relative flex items-center justify-between pt-2 border-t border-zinc-800/80 shrink-0 w-full">
          {/* Left: Reset Timer Button */}
          <button
            onClick={() => resetTimer()}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Center: Start/Pause & Stop Button */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={toggleTimer}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
              }`}
            >
              {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isActive ? 'Pause' : 'Start'}</span>
            </button>

            {(isActive || secondsLeft < targetMinutes * 60) && (
              <button
                onClick={handleStop}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center space-x-1"
                title="Abandon & Stop Session"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>

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
        onStopTimer={handleStop}
        tasks={tasks}
        quotes={userSettings?.quotes || []}
        dayEndTime={userSettings?.day_end_time || '00:00'}
        currentRank={userSettings?.current_rank || 'E-Rank'}
        currentLevel={userSettings?.level || 1}
      />

      {/* Post-Session 5-Star Rating Modal */}
      <FocusRatingModal
        isOpen={showRatingModal}
        targetMinutes={targetMinutes}
        onRate={handleFinishRating}
      />

      {/* Quitter Roast Modal */}
      <QuitTauntModal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        currentRank={userSettings?.current_rank || 'E-Rank'}
        isPenaltyApplied={quitPenaltyInfo.isPenalty}
        penaltyAmount={quitPenaltyInfo.amount}
      />
    </>
  );
}
