'use client';

import { useState } from 'react';
import { Play, Pause, Square, RotateCcw, Clock, Maximize2 } from 'lucide-react';
import { Task } from '@/lib/types';
import { useRouter } from 'next/navigation';
import FullscreenFocusModal from './FullscreenFocusModal';
import FocusRatingModal from './FocusRatingModal';
import QuitTauntModal from './QuitTauntModal';
import HunterEventModal from './HunterEventModal';
import XPChangeModal from './XPChangeModal';
import Tooltip from './Tooltip';
import { useFocusTimer } from '@/hooks/useFocusTimer';

interface FocusTimerBlockProps {
  onSessionComplete?: () => void;
  tasks?: Task[];
}

export default function FocusTimerBlock({ onSessionComplete, tasks = [] }: FocusTimerBlockProps) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const {
    targetMinutes,
    secondsLeft,
    isActive,
    userSettings,
    toggleTimer,
    resetTimer,
    handleStop,
    persistSessionState,
    endTimeRef,
    pauseStartRef,
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
    isFullscreen,
    onSessionComplete,
    onRestoreFullscreen: (fullscreen) => setIsFullscreen(fullscreen),
  });

  const openFullscreen = () => {
    persistSessionState(isActive, targetMinutes, endTimeRef.current, secondsLeft, true, pauseStartRef.current);
    router.push('/focus');
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    persistSessionState(isActive, targetMinutes, endTimeRef.current, secondsLeft, false, pauseStartRef.current);
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

        {/* Toolbar */}
        <div className="relative flex items-center justify-between pt-1 shrink-0 w-full">
          <Tooltip content="Reset Focus Timer">
            <button
              onClick={() => resetTimer()}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

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
              <Tooltip content="Abandon Focus Session">
                <button
                  onClick={handleStop}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center space-x-1"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              </Tooltip>
            )}
          </div>

          <Tooltip content="Fullscreen Focus Mode">
            <button
              onClick={openFullscreen}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <FullscreenFocusModal
        isOpen={isFullscreen}
        onClose={closeFullscreen}
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
    </>
  );
}
