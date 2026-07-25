'use client';

import { UserSettings } from '@/lib/types';
import { Flame, Award } from 'lucide-react';

interface FocusStatsBlockProps {
  settings?: UserSettings | null;
}

export default function FocusStatsBlock({ settings }: FocusStatsBlockProps) {
  const todaySecs = settings?.focus_seconds_today || 0;
  const weekSecs = settings?.focus_seconds_week || 0;

  const todayHours = (todaySecs / 3600).toFixed(1);
  const weekHours = (weekSecs / 3600).toFixed(1);

  const rankText = settings?.current_rank || 'Unranked';
  const titleText = settings?.current_title || 'Learner';

  return (
    <div className="glass-panel rounded-xl p-4 border border-zinc-800 flex flex-col justify-between h-[190px] min-h-[190px] max-h-[190px] overflow-hidden w-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5 text-zinc-300">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-200">Focus & Rank</span>
        </div>
        <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
          {titleText}
        </span>
      </div>

      <div className="space-y-1.5 my-auto text-xs">
        <div className="flex justify-between items-center bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-zinc-800/80">
          <span className="text-zinc-400 text-[11px]">Today Focus:</span>
          <strong className="text-zinc-100 font-mono">{todayHours} hrs</strong>
        </div>
        <div className="flex justify-between items-center bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-zinc-800/80">
          <span className="text-zinc-400 text-[11px]">Week Focus:</span>
          <strong className="text-zinc-100 font-mono">{weekHours} hrs</strong>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] shrink-0">
        <span className="text-zinc-500">Current Rank:</span>
        <span className="font-semibold text-amber-400 flex items-center gap-1">
          <Award className="w-3 h-3" />
          <span>{rankText}</span>
        </span>
      </div>
    </div>
  );
}
