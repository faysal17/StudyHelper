import { getTodayDateString } from './spacedRepetition';

export interface RankInfo {
  rank: 'E-Rank' | 'D-Rank' | 'C-Rank' | 'B-Rank' | 'A-Rank' | 'S-Rank';
  title: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export function getRankAndTitle(level: number): RankInfo {
  if (level <= 5) {
    return {
      rank: 'E-Rank',
      title: 'Procrastinating Worm',
      badgeBg: 'bg-red-500/10',
      badgeText: 'text-red-400',
      badgeBorder: 'border-red-500/20',
    };
  } else if (level <= 15) {
    return {
      rank: 'D-Rank',
      title: 'Delusional Pretender',
      badgeBg: 'bg-orange-500/10',
      badgeText: 'text-orange-400',
      badgeBorder: 'border-orange-500/20',
    };
  } else if (level <= 30) {
    return {
      rank: 'C-Rank',
      title: 'Barely Functioning Amateur',
      badgeBg: 'bg-yellow-500/10',
      badgeText: 'text-yellow-400',
      badgeBorder: 'border-yellow-500/20',
    };
  } else if (level <= 50) {
    return {
      rank: 'B-Rank',
      title: 'The Steady Grinder',
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
      badgeBorder: 'border-blue-500/20',
    };
  } else if (level <= 75) {
    return {
      rank: 'A-Rank',
      title: 'The Discipline Demon',
      badgeBg: 'bg-purple-500/10',
      badgeText: 'text-purple-400',
      badgeBorder: 'border-purple-500/20',
    };
  } else {
    return {
      rank: 'S-Rank',
      title: 'Sovereign of the Syllabus',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300 font-bold',
      badgeBorder: 'border-amber-500/40 shadow-sm',
    };
  }
}

// Grindy XP Level Curve: XP Required for level L = floor(100 * L^1.5)
export function getXPRequiredForLevel(targetLevel: number): number {
  return Math.floor(100 * Math.pow(targetLevel, 1.5));
}

export function calculateLevelAndProgress(totalXP: number): {
  level: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  progressPercent: number;
  rankInfo: RankInfo;
} {
  let level = 1;
  let cumulativeXP = 0;
  let nextLevelCost = getXPRequiredForLevel(level);

  while (totalXP >= cumulativeXP + nextLevelCost) {
    cumulativeXP += nextLevelCost;
    level++;
    nextLevelCost = getXPRequiredForLevel(level);
  }

  const xpInCurrentLevel = totalXP - cumulativeXP;
  const xpRequiredForNextLevel = nextLevelCost;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100))
  );

  const rankInfo = getRankAndTitle(level);

  return {
    level,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    progressPercent,
    rankInfo,
  };
}

export function updateStreakOnActivity(
  currentStreak: number = 0,
  lastStudyDate: string | null = null,
  dayEndTime: string = '00:00'
): { updatedStreak: number; updatedLastDate: string } {
  const todayStr = getTodayDateString(dayEndTime);

  if (lastStudyDate === todayStr) {
    return { updatedStreak: Math.max(1, currentStreak), updatedLastDate: todayStr };
  }

  const [y, m, d] = todayStr.split('-').map(Number);
  const yesterdayObj = new Date(y, m - 1, d);
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);

  const yYear = yesterdayObj.getFullYear();
  const yMonth = String(yesterdayObj.getMonth() + 1).padStart(2, '0');
  const yDay = String(yesterdayObj.getDate()).padStart(2, '0');
  const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;

  if (lastStudyDate === yesterdayStr) {
    return { updatedStreak: currentStreak + 1, updatedLastDate: todayStr };
  }

  return { updatedStreak: 1, updatedLastDate: todayStr };
}
