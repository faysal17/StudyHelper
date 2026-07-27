'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Clock, Maximize2 } from 'lucide-react';
import { recordRatedFocusSession, recordSessionStop, fetchUserSettings } from '@/lib/supabase';
import { Task, UserSettings } from '@/lib/types';
import { calculateGlobalHunterRank } from '@/lib/gamification';
import { calculateMomentum } from '@/lib/momentum';
import FullscreenFocusModal from './FullscreenFocusModal';
import FocusRatingModal from './FocusRatingModal';
import QuitTauntModal from './QuitTauntModal';
import HunterEventModal, { EventType } from './HunterEventModal';
import XPChangeModal from './XPChangeModal';
import Tooltip from './Tooltip';

interface FocusTimerBlockProps {
  onSessionComplete?: () => void;
  tasks?: Task[];
}

const TIMER_STORAGE_KEY = 'bcs_active_focus_session';

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

  // XP Change Notification Modal State
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [xpChangeAmount, setXpChangeAmount] = useState(0);
  const [xpReason, setXpReason] = useState('');
  const [xpMultiplier, setXpMultiplier] = useState(1.0);
  const [xpNewTotal, setXpNewTotal] = useState(0);

  // Level / Rank Up Event Modal State
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [activeEventType, setActiveEventType] = useState<EventType>('rank-up');
  const [pendingEventModal, setPendingEventModal] = useState<EventType | null>(null);
  const [eventOldPos, setEventOldPos] = useState(500);
  const [eventNewPos, setEventNewPos] = useState(480);
  const [eventOldRank, setEventOldRank] = useState('E-Rank');
  const [eventNewRank, setEventNewRank] = useState('D-Rank');
  const [eventOldLevel, setEventOldLevel] = useState(5);
  const [eventNewLevel, setEventNewLevel] = useState(6);

  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const pauseStartRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const persistSessionState = (
    active: boolean,
    targetMins: number,
    endTimeVal: number | null,
    secondsVal: number,
    fullscreenVal: boolean,
    pauseStartVal: number | null
  ) => {
    if (typeof window === 'undefined') return;
    if (!active && secondsVal === targetMins * 60) {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        targetMins,
        endTime: endTimeVal,
        pausedSeconds: !active ? secondsVal : null,
        active,
        fullscreen: fullscreenVal,
        pauseStart: pauseStartVal,
      })
    );
  };

  useEffect(() => {
    fetchUserSettings().then((s) => {
      setUserSettings(s);
    });

    // Restore active session state across browser reloads
    if (typeof window !== 'undefined') {
      const savedRaw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw);
          if (saved && typeof saved === 'object') {
            const { targetMins, endTime, pausedSeconds, active, fullscreen, pauseStart } = saved;
            const mins = targetMins || 25;
            setTargetMinutes(mins);
            setIsFullscreen(Boolean(fullscreen));

            if (active && endTime) {
              const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
              if (remaining > 0) {
                setSecondsLeft(remaining);
                endTimeRef.current = endTime;
                setIsActive(true);
              } else {
                localStorage.removeItem(TIMER_STORAGE_KEY);
                setSecondsLeft(0);
                setShowRatingModal(true);
              }
            } else if (!active && pausedSeconds > 0) {
              setSecondsLeft(pausedSeconds);
              setIsActive(false);
              pauseStartRef.current = pauseStart || null;
            }
          }
        } catch (err) {
          console.error('Error restoring active focus timer state:', err);
        }
      }
    }
  }, []);

  // Main Timer Loop & 10-Minute Pause Timeout Checker
  useEffect(() => {
    let interval: any = null;

    if (isActive) {
      pauseStartRef.current = null;

      const tick = () => {
        if (!endTimeRef.current) return;
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setSecondsLeft(remaining);

        if (remaining <= 0) {
          endTimeRef.current = null;
          setIsActive(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(TIMER_STORAGE_KEY);
          }
          setShowRatingModal(true);
        }
      };

      tick();
      interval = setInterval(tick, 250);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          tick();
        }
      };

      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);

      return () => {
        if (interval) clearInterval(interval);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
      };
    } else if (!isActive && secondsLeft < targetMinutes * 60 && secondsLeft > 0) {
      if (!pauseStartRef.current) {
        pauseStartRef.current = Date.now();
      }
      interval = setInterval(() => {
        const elapsedPausedSec = Math.floor((Date.now() - (pauseStartRef.current || Date.now())) / 1000);
        if (elapsedPausedSec >= 600) {
          if (interval) clearInterval(interval);
          handleStop();
        }
      }, 3000);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isActive]);

  const handleFinishRating = async (stars: number) => {
    setShowRatingModal(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }

    const oldLevel = userSettings?.level || 1;
    const oldRank = userSettings?.current_rank || 'E-Rank';
    const oldXP = userSettings?.xp || 0;
    const oldMomentum = calculateMomentum(userSettings);
    const oldGlobalPos = userSettings?.official_weekly_rank || 500;

    const updated = await recordRatedFocusSession(targetMinutes, stars);
    setUserSettings(updated);
    resetTimer(targetMinutes);

    const newLevel = updated.level || 1;
    const newRank = updated.current_rank || 'E-Rank';
    const newXP = updated.xp || 0;
    const gainedXP = newXP - oldXP;
    const newMomentum = calculateMomentum(updated);
    const newGlobalPos = updated.official_weekly_rank || 500;

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
    if (gainedXP > 0) {
      setXpChangeAmount(gainedXP);
      setXpReason(`${targetMinutes}m Focus Session Completed (${stars} Stars)`);
      setXpMultiplier(newMomentum.xpMultiplier);
      setXpNewTotal(newXP);
      setXpModalOpen(true);
    } else if (eventType) {
      setEventModalOpen(true);
    }

    if (onSessionComplete) onSessionComplete();
  };

  const handleStop = async () => {
    setIsActive(false);
    endTimeRef.current = null;
    pauseStartRef.current = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }

    const oldLevel = userSettings?.level || 1;
    const oldRank = userSettings?.current_rank || 'E-Rank';
    const oldXP = userSettings?.xp || 0;
    const oldMomentum = calculateMomentum(userSettings);
    const oldGlobalPos = userSettings?.official_weekly_rank || 500;

    const { updatedSettings, isPenaltyApplied, penaltyAmount } = await recordSessionStop();
    setUserSettings(updatedSettings);

    const newLevel = updatedSettings.level || 1;
    const newRank = updatedSettings.current_rank || 'E-Rank';
    const newXP = updatedSettings.xp || 0;
    const newMomentum = calculateMomentum(updatedSettings);
    const newGlobalPos = updatedSettings.official_weekly_rank || 500;

    setQuitPenaltyInfo({ isPenalty: isPenaltyApplied, amount: penaltyAmount });
    setShowQuitModal(true);

    let eventType: EventType | null = null;
    if (newRank !== oldRank && newLevel < oldLevel) {
      eventType = 'rank-down';
    } else if (newLevel < oldLevel) {
      eventType = 'level-down';
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

    if (isPenaltyApplied && penaltyAmount > 0) {
      setXpChangeAmount(-penaltyAmount);
      setXpReason('Excess Session Stop Penalty');
      setXpMultiplier(1.0);
      setXpNewTotal(newXP);
      setXpModalOpen(true);
    }

    resetTimer(targetMinutes);
    if (onSessionComplete) onSessionComplete();
  };

  const handleCloseXPModal = () => {
    setXpModalOpen(false);
    if (pendingEventModal) {
      setEventModalOpen(true);
      setPendingEventModal(null);
    }
  };

  const toggleTimer = () => {
    if (!isActive) {
      const remainingSec = secondsLeft <= 0 ? targetMinutes * 60 : secondsLeft;
      if (secondsLeft <= 0) {
        setSecondsLeft(targetMinutes * 60);
      }
      const newEndTime = Date.now() + remainingSec * 1000;
      endTimeRef.current = newEndTime;
      pauseStartRef.current = null;
      setIsActive(true);
      persistSessionState(true, targetMinutes, newEndTime, remainingSec, isFullscreen, null);
    } else {
      endTimeRef.current = null;
      setIsActive(false);
      persistSessionState(false, targetMinutes, null, secondsLeft, isFullscreen, pauseStartRef.current);
    }
  };

  const resetTimer = (mins: number = targetMinutes) => {
    setIsActive(false);
    endTimeRef.current = null;
    pauseStartRef.current = null;
    setTargetMinutes(mins);
    setSecondsLeft(mins * 60);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
    if (isActive || secondsLeft < targetMinutes * 60) {
      persistSessionState(isActive, targetMinutes, endTimeRef.current, secondsLeft, true, pauseStartRef.current);
    }
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    if (isActive || secondsLeft < targetMinutes * 60) {
      persistSessionState(isActive, targetMinutes, endTimeRef.current, secondsLeft, false, pauseStartRef.current);
    }
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
