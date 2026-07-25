'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { getTodayDateString, addDaysToDateString } from '@/lib/spacedRepetition';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye, FileImage } from 'lucide-react';
import Link from 'next/link';

interface CalendarBlockProps {
  tasks: Task[];
}

export default function CalendarBlock({ tasks }: CalendarBlockProps) {
  const todayStr = getTodayDateString();

  // Find start of current week (Sunday)
  const todayObj = new Date();
  const currentDayOfWeek = todayObj.getDay(); // 0 = Sun, 1 = Mon...
  const startOfWeekObj = new Date(todayObj);
  startOfWeekObj.setDate(todayObj.getDate() - currentDayOfWeek);

  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Generate 14 days (This week and Next week) adjusted by weekOffset
  const twoWeeksDays: {
    dateStr: string;
    dayName: string;
    dayNum: number;
    monthName: string;
    isToday: boolean;
  }[] = [];

  for (let i = 0; i < 14; i++) {
    const d = new Date(startOfWeekObj);
    d.setDate(startOfWeekObj.getDate() + i + weekOffset * 7);
    
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;

    twoWeeksDays.push({
      dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: dateStr === todayStr,
    });
  }

  const [selectedDayStr, setSelectedDayStr] = useState<string>(todayStr);

  return (
    <div className="glass-panel rounded-xl p-6 border border-zinc-800/80 shadow-sm space-y-5">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <CalendarIcon className="w-4.5 h-4.5 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <span>2-Week Focus Calendar View</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Showing this week & next week ({twoWeeksDays[0].monthName} {twoWeeksDays[0].dayNum} &ndash; {twoWeeksDays[13].monthName} {twoWeeksDays[13].dayNum})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2.5 py-1 text-xs font-medium bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors"
          >
            Current 2-Weeks
          </button>
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
            title="Previous 2 Weeks"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
            title="Next 2 Weeks"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2-Week Enlarged Grid (14 cells across 7 columns) */}
      <div className="w-full">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* 14 Enlarged Day Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
          {twoWeeksDays.map((day) => {
            const dayTasks = tasks.filter((t) => t.next_revision_date === day.dateStr);
            const isSelected = selectedDayStr === day.dateStr;

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDayStr(day.dateStr)}
                className={`min-h-[140px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  day.isToday
                    ? 'bg-zinc-900 border-zinc-500 shadow-md ring-1 ring-zinc-500/40'
                    : isSelected
                    ? 'bg-zinc-900/90 border-zinc-600'
                    : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Date Header inside Cell */}
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5 mb-2">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xs font-bold text-zinc-300">{day.dayName}</span>
                    <span
                      className={`text-sm font-bold font-mono px-1.5 py-0.2 rounded ${
                        day.isToday ? 'bg-zinc-100 text-zinc-950 font-extrabold' : 'text-zinc-200'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                  </div>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 rounded">
                      {dayTasks.length} task(s)
                    </span>
                  )}
                </div>

                {/* Enlarged Task & Revision Info Cards */}
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[110px] pr-0.5 scrollbar-thin">
                  {dayTasks.length === 0 ? (
                    <p className="text-[10px] text-zinc-600 italic py-2">No tasks</p>
                  ) : (
                    dayTasks.map((t) => {
                      const isNew = !t.last_reviewed_date;
                      const hasNote = t.notes && t.notes.length > 0;
                      const firstNote = hasNote ? t.notes![0] : null;

                      return (
                        <div
                          key={t.id}
                          className={`p-1.5 rounded-lg border text-[11px] space-y-1 transition-all ${
                            isNew
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                              : t.status_color === 'red'
                              ? 'bg-red-500/10 border-red-500/20 text-red-300'
                              : t.status_color === 'yellow'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          <div className="font-semibold line-clamp-2 leading-tight">{t.title}</div>

                          <div className="flex items-center justify-between text-[10px] opacity-80 pt-0.5">
                            <span className="truncate max-w-[90px]">{t.subject?.name || 'Subject'}</span>
                            {firstNote && firstNote.overlays && firstNote.overlays.length > 0 ? (
                              <Link
                                href={`/study/${t.id}`}
                                className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded font-medium flex items-center space-x-0.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Eye className="w-2.5 h-2.5 text-zinc-300" />
                                <span>Study</span>
                              </Link>
                            ) : (
                              <span className="text-[9px] text-zinc-500">No overlays</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
