'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { getTodayDateString } from '@/lib/spacedRepetition';
import { fetchUserSettings } from '@/lib/supabase';
import { BookOpen, RotateCcw } from 'lucide-react';

interface TaskCountersBlockProps {
  tasks: Task[];
}

export default function TaskCountersBlock({ tasks }: TaskCountersBlockProps) {
  const [dayEndTime, setDayEndTime] = useState('00:00');

  useEffect(() => {
    fetchUserSettings().then((s) => {
      if (s?.day_end_time) setDayEndTime(s.day_end_time);
    });
  }, []);

  const today = getTodayDateString(dayEndTime);

  const newStudyCount = tasks.filter((t) => !t.last_reviewed_date).length;
  const revisionCount = tasks.filter(
    (t) => t.last_reviewed_date && t.next_revision_date <= today
  ).length;

  return (
    <div className="glass-panel rounded-xl p-4 border border-zinc-800 flex flex-col justify-between h-[190px] min-h-[190px] max-h-[190px] overflow-hidden w-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-zinc-200">Daily Task Counters</span>
        <span className="text-[10px] text-zinc-500 font-mono">Today</span>
      </div>

      <div className="grid grid-cols-2 gap-3 my-auto">
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-2 flex flex-col items-center justify-center">
          <div className="flex items-center space-x-1 text-blue-400 mb-0.5">
            <BookOpen className="w-3 h-3" />
            <span className="text-[10px] font-medium">New Study</span>
          </div>
          <span className="text-xl font-bold font-mono text-zinc-100">{newStudyCount}</span>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-2 flex flex-col items-center justify-center">
          <div className="flex items-center space-x-1 text-emerald-400 mb-0.5">
            <RotateCcw className="w-3 h-3" />
            <span className="text-[10px] font-medium">Revision</span>
          </div>
          <span className="text-xl font-bold font-mono text-zinc-100">{revisionCount}</span>
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 text-center pt-1 shrink-0">
        Scheduled task overview
      </div>
    </div>
  );
}
