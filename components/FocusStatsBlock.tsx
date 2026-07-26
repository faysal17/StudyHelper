'use client';

import { UserSettings } from '@/lib/types';
import { calculateLevelAndProgress } from '@/lib/gamification';
import { Shield, Zap, Flame, Award } from 'lucide-react';

interface FocusStatsBlockProps {
  settings: UserSettings | null;
}

export default function FocusStatsBlock({ settings }: FocusStatsBlockProps) {
  const totalXP = settings?.xp || 0;
  const streakDays = settings?.streak_days || 0;

  const { level, xpInCurrentLevel, xpRequiredForNextLevel, progressPercent, rankInfo } =
    calculateLevelAndProgress(totalXP);

  return (
    <div className="glass-panel rounded-xl p-4 border border-zinc-800 flex flex-col justify-between h-[190px] min-h-[190px] max-h-[190px] overflow-hidden w-full relative group">
      {/* Top Header: Rank & Streak */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5">
          <Shield className={`w-4 h-4 ${rankInfo.badgeText}`} />
          <span className="text-xs font-semibold text-zinc-200">Hunter Rank</span>
        </div>

        <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-amber-400 font-mono text-[10px] font-bold">
          <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span>{streakDays}d Streak</span>
        </div>
      </div>

      {/* Center Rank & Humiliating Title Section */}
      <div className="my-auto space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs font-mono uppercase px-2 py-0.5 rounded-md border font-extrabold tracking-wide ${rankInfo.badgeBg} ${rankInfo.badgeText} ${rankInfo.badgeBorder}`}
          >
            {rankInfo.rank}
          </span>
          <span className="text-[11px] font-mono text-zinc-400 font-bold">
            Lvl {level}
          </span>
        </div>

        {/* Humiliating / Prestige Rank Title */}
        <h3 className="text-sm font-extrabold text-zinc-100 line-clamp-1 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">{rankInfo.title}</span>
        </h3>
      </div>

      {/* Bottom XP Progress Bar */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-zinc-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>XP Progress</span>
          </span>
          <span className="text-zinc-300 font-semibold">
            {xpInCurrentLevel} / {xpRequiredForNextLevel} XP ({progressPercent}%)
          </span>
        </div>

        <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
