'use client';

import { useState, useEffect, useRef } from 'react';
import { UserSettings } from '@/lib/types';
import { fetchUserSettings, recordRatedFocusSession, recordSessionStop } from '@/lib/supabase';
import { calculateMomentum } from '@/lib/momentum';
import { EventType } from '@/components/HunterEventModal';

export const TIMER_STORAGE_KEY = 'bcs_active_focus_session';

interface UseFocusTimerOptions {
  // Whether the caller is currently showing the fullscreen timer UI. Written into the
  // persisted session so a reload can restore which UI (compact card vs fullscreen) to show.
  isFullscreen: boolean;
  onSessionComplete?: () => void;
  // Called once on mount with the fullscreen flag restored from a persisted session, if any.
  onRestoreFullscreen?: (fullscreen: boolean) => void;
  // Called once the initial fetchUserSettings() call (owned by this hook) resolves.
  onUserSettingsLoaded?: (settings: UserSettings | null) => void;
}

export function useFocusTimer({
  isFullscreen,
  onSessionComplete,
  onRestoreFullscreen,
  onUserSettingsLoaded,
}: UseFocusTimerOptions) {
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

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
    if (!active && secondsVal === targetMins * 60 && !fullscreenVal) {
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
      if (onUserSettingsLoaded) onUserSettingsLoaded(s);
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
            if (onRestoreFullscreen) onRestoreFullscreen(Boolean(fullscreen));

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
          console.error('Error restoring focus session:', err);
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

  const handleFinishRating = async (stars: number) => {
    setShowRatingModal(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }

    const oldLevel = userSettings?.level || 1;
    const oldRank = userSettings?.current_rank || 'E-Rank';
    const oldXP = userSettings?.xp || 0;
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
    const oldGlobalPos = userSettings?.official_weekly_rank || 500;

    const { updatedSettings, isPenaltyApplied, penaltyAmount } = await recordSessionStop();
    setUserSettings(updatedSettings);

    const newLevel = updatedSettings.level || 1;
    const newRank = updatedSettings.current_rank || 'E-Rank';
    const newXP = updatedSettings.xp || 0;
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

  return {
    targetMinutes,
    secondsLeft,
    isActive,
    userSettings,
    toggleTimer,
    resetTimer,
    handleStop,
    // Exposed for callers that need to persist a fullscreen-flag transition directly
    // (e.g. opening/closing the FullscreenFocusModal) rather than via toggleTimer/resetTimer.
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
  };
}
