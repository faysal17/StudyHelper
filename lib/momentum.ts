import { UserSettings, FocusSession } from './types';
import { getTodayDateString } from './spacedRepetition';

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
  weekdayTargetMins: number;
  weekendTargetMins: number;
  weeklyTargetLog: { dateStr: string; dayName: string; focusMinutes: number; targetMinutes: number; isWeekend: boolean; ratio: number }[];
}

export function calculateMomentum(settings: UserSettings | null, sessions?: FocusSession[]): MomentumDetails {
  const dayEndTime = settings?.day_end_time || '00:00';
  const todayStr = getTodayDateString(dayEndTime);
  const weekendDays = settings?.weekend_days || ['Saturday', 'Sunday'];
  const weekdayTargetMins = settings?.weekday_target_minutes || 120;
  const weekendTargetMins = settings?.weekend_target_minutes || 210;

  const focusLog = settings?.weekly_focus_log || {};
  const streakDays = settings?.streak_days || 0;
  const stopsToday = settings?.stops_today || 0;
  const stopsWeek = settings?.stops_this_week || 0;

  // Build daily focus map from individual focus sessions if provided
  const sessionMap: Record<string, number> = {};
  if (sessions && sessions.length > 0) {
    for (const s of sessions) {
      if (s.status === 'completed' || (s.duration_seconds || 0) > 0) {
        const d = new Date(s.created_at);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        sessionMap[dateStr] = (sessionMap[dateStr] || 0) + (s.duration_seconds || 0);
      }
    }
  }

  // Build rolling 7-day target array (from 6 days ago to Today)
  const [y, m, d] = todayStr.split('-').map(Number);
  const todayObj = new Date(y, m - 1, d);

  const dayWeights = [0.10, 0.10, 0.10, 0.15, 0.15, 0.20, 0.20]; // Recent days have higher weight
  let weightedConsistencySum = 0;

  const weeklyTargetLog: MomentumDetails['weeklyTargetLog'] = [];

  const lastActiveDate = settings?.last_active_date || null;
  const focusSecondsToday = (lastActiveDate === todayStr) ? (settings?.focus_seconds_today || 0) : 0;

  for (let i = 6; i >= 0; i--) {
    const curDate = new Date(todayObj);
    curDate.setDate(todayObj.getDate() - i);

    const cYear = curDate.getFullYear();
    const cMonth = String(curDate.getMonth() + 1).padStart(2, '0');
    const cDay = String(curDate.getDate()).padStart(2, '0');
    const dateStr = `${cYear}-${cMonth}-${cDay}`;
    const dayName = curDate.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDayName = curDate.toLocaleDateString('en-US', { weekday: 'long' });

    const isWeekend = weekendDays.includes(fullDayName);
    const targetMinutes = isWeekend ? weekendTargetMins : weekdayTargetMins;

    // Actual focus seconds: prioritize sessionMap -> focusLog -> focusSecondsToday (today only)
    const actualSeconds = sessionMap[dateStr] !== undefined
      ? sessionMap[dateStr]
      : (focusLog[dateStr] !== undefined
        ? focusLog[dateStr]
        : (dateStr === todayStr ? focusSecondsToday : 0));
    const focusMinutes = Math.floor(actualSeconds / 60);

    const ratio = Math.min(1.0, focusMinutes / targetMinutes);
    const weightIndex = 6 - i;
    weightedConsistencySum += ratio * dayWeights[weightIndex];

    weeklyTargetLog.push({
      dateStr,
      dayName,
      focusMinutes,
      targetMinutes,
      isWeekend,
      ratio,
    });
  }

  // Raw Rolling Multi-Day Score (0 - 100)
  const rollingScore = Math.round(weightedConsistencySum * 100);

  // Bonus for active streak (up to +15 pts) & Penalty for stop friction (-15 pts per stop)
  const streakBonus = Math.min(15, streakDays * 3);
  const stopPenalty = stopsToday * 15;

  const finalScore = Math.min(100, Math.max(0, rollingScore + streakBonus - stopPenalty));

  let velocityTier: MomentumDetails['velocityTier'] = 'Stalled';
  let icon = '🛑';
  let color = 'text-red-400';
  let badgeBg = 'bg-red-500/10';
  let badgeBorder = 'border-red-500/20';
  let xpMultiplier = 0.5;

  if (finalScore >= 85) {
    velocityTier = 'Hyper-Drive';
    icon = '🚀';
    color = 'text-cyan-400';
    badgeBg = 'bg-cyan-500/10';
    badgeBorder = 'border-cyan-500/30';
    xpMultiplier = 1.5;
  } else if (finalScore >= 60) {
    velocityTier = 'Accelerating';
    icon = '⚡';
    color = 'text-emerald-400';
    badgeBg = 'bg-emerald-500/10';
    badgeBorder = 'border-emerald-500/30';
    xpMultiplier = 1.2;
  } else if (finalScore >= 30) {
    velocityTier = 'Steady Pace';
    icon = '🚶';
    color = 'text-blue-400';
    badgeBg = 'bg-blue-500/10';
    badgeBorder = 'border-blue-500/30';
    xpMultiplier = 1.0;
  } else if (finalScore >= 10) {
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
    score: finalScore,
    velocityTier,
    icon,
    color,
    badgeBg,
    badgeBorder,
    xpMultiplier,
    remainingStopsToday,
    remainingStopsWeek,
    weekdayTargetMins,
    weekendTargetMins,
    weeklyTargetLog,
  };
}
