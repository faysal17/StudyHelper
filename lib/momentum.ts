import { UserSettings } from './types';

export interface MomentumDetails {
  score: number; // 0 - 100%
  velocityTier: 'Hyper-Drive' | 'Accelerating' | 'Steady Pace' | 'Sluggish' | 'Stalled';
  icon: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  xpMultiplier: number;
  remainingStopsToday: number;
  remainingStopsWeek: number;
}

export function calculateMomentum(settings: UserSettings | null): MomentumDetails {
  const focusSeconds = settings?.focus_seconds_today || 0;
  const streakDays = settings?.streak_days || 0;
  const stopsToday = settings?.stops_today || 0;
  const stopsWeek = settings?.stops_this_week || 0;

  const focusMinutes = Math.floor(focusSeconds / 60);

  // 1. Focus Acceleration: 40 pts max for 120 mins focus
  const focusScore = Math.min(40, Math.round((focusMinutes / 120) * 40));

  // 2. Streak Multiplier: 30 pts max for 6-day streak
  const streakScore = Math.min(30, streakDays * 5);

  // 3. Activity Base Score: 30 pts base for any activity today
  const activityScore = focusMinutes > 0 ? 30 : 0;

  // 4. Stop Friction Penalty: -15 pts per stop today
  const stopFriction = stopsToday * 15;

  const rawScore = focusScore + streakScore + activityScore - stopFriction;
  const score = Math.min(100, Math.max(0, rawScore));

  let velocityTier: MomentumDetails['velocityTier'] = 'Stalled';
  let icon = '🛑';
  let color = 'text-red-400';
  let badgeBg = 'bg-red-500/10';
  let badgeBorder = 'border-red-500/20';
  let xpMultiplier = 0.5;

  if (score >= 85) {
    velocityTier = 'Hyper-Drive';
    icon = '🚀';
    color = 'text-cyan-400';
    badgeBg = 'bg-cyan-500/10';
    badgeBorder = 'border-cyan-500/30';
    xpMultiplier = 1.5;
  } else if (score >= 60) {
    velocityTier = 'Accelerating';
    icon = '⚡';
    color = 'text-emerald-400';
    badgeBg = 'bg-emerald-500/10';
    badgeBorder = 'border-emerald-500/30';
    xpMultiplier = 1.2;
  } else if (score >= 30) {
    velocityTier = 'Steady Pace';
    icon = '🚶';
    color = 'text-blue-400';
    badgeBg = 'bg-blue-500/10';
    badgeBorder = 'border-blue-500/30';
    xpMultiplier = 1.0;
  } else if (score >= 10) {
    velocityTier = 'Sluggish';
    icon = '🐢';
    color = 'text-amber-400';
    badgeBg = 'bg-amber-500/10';
    badgeBorder = 'border-amber-500/30';
    xpMultiplier = 0.8;
  }

  const remainingStopsToday = Math.max(0, 2 - stopsToday);
  const remainingStopsWeek = Math.max(0, 7 - stopsWeek);

  return {
    score,
    velocityTier,
    icon,
    color,
    badgeBg,
    badgeBorder,
    xpMultiplier,
    remainingStopsToday,
    remainingStopsWeek,
  };
}
