import { UserSettings } from './types';
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

// Global Hunter Rank Position (#500 to #1)
export function calculateGlobalHunterRank(level: number, momentumScore: number = 50): number {
  const safeLevel = Math.max(1, Math.min(100, level));
  const safeMomentum = Math.max(0, Math.min(100, momentumScore));

  const levelFactor = (safeLevel / 75) * 450;
  const momentumFactor = (safeMomentum / 100) * 30;

  const rawPosition = 500 - levelFactor - momentumFactor;
  return Math.max(1, Math.min(500, Math.round(rawPosition)));
}

export function getEgoAttackMessage(rank: string, level: number): string {
  const eMessages = [
    "You're literally an E-Rank Procrastinating Worm. Don't even pretend you'll survive this timer without opening social media.",
    "A 25-minute timer won't fix years of slacking, Worm. Prove you're not completely hopeless.",
    "Is your attention span really this pathetic, Worm? Don't quit after 2 minutes.",
  ];

  const dMessages = [
    "Still a D-Rank Delusional Pretender. Staring at the screen doesn't count as actual studying.",
    "You love pretending you're grinding, don't you? Let's see if you can focus for real this time.",
    "All that fake confidence and you're still stuck in D-Rank. Don't fold halfway.",
  ];

  const cMessages = [
    "Congratulations on being a Barely Functioning Amateur. You're still one distraction away from failing.",
    "C-Rank isn't something to be proud of. Stop daydreaming and lock in.",
    "Hovering in mediocrity for too long. Focus or stay average forever.",
  ];

  const bMessages = [
    "You're a Steady Grinder now. The real test starts here—don't ruin your streak by getting lazy.",
    "B-Rank means nothing if you fold under pressure today. Stay sharp.",
  ];

  const aMessages = [
    "The Discipline Demon has entered the chamber. Maintain absolute dominance—zero excuses.",
    "A-Rank precision required. Distractions are beneath you now.",
  ];

  const sMessages = [
    "A Sovereign of the Syllabus does not break. Execute this session with absolute perfection.",
    "Total domain control active. Complete the session and claim your glory.",
  ];

  let list = eMessages;
  if (rank === 'D-Rank') list = dMessages;
  else if (rank === 'C-Rank') list = cMessages;
  else if (rank === 'B-Rank') list = bMessages;
  else if (rank === 'A-Rank') list = aMessages;
  else if (rank === 'S-Rank') list = sMessages;

  return list[Math.floor(Math.random() * list.length)];
}

export function getQuitTauntMessage(rank: string): string {
  switch (rank) {
    case 'E-Rank':
      return "Predictable. An E-Rank Procrastinating Worm quits at the first sign of effort. Go back to doomscrolling.";
    case 'D-Rank':
      return "Classic D-Rank move. Delusional Pretenders love giving up as soon as it actually gets tough.";
    case 'C-Rank':
      return "Barely Functioning Amateur status confirmed. You couldn't even finish one simple focus session.";
    case 'B-Rank':
      return "A Steady Grinder wouldn't fold like this. Pathetic lapse in discipline.";
    case 'A-Rank':
      return "Disappointment. A Discipline Demon doesn't surrender to weakness.";
    case 'S-Rank':
    default:
      return "Unbelievable. A Sovereign of the Syllabus falling to distraction? Reclaim your honor immediately.";
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
  const safeXP = Math.max(0, totalXP);
  let level = 1;
  let cumulativeXP = 0;
  let nextLevelCost = getXPRequiredForLevel(level);

  while (safeXP >= cumulativeXP + nextLevelCost) {
    cumulativeXP += nextLevelCost;
    level++;
    nextLevelCost = getXPRequiredForLevel(level);
  }

  const xpInCurrentLevel = safeXP - cumulativeXP;
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
