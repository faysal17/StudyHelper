'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { getTodayDateString, getLogicalTodayDate } from '@/lib/spacedRepetition';
import { fetchUserSettings } from '@/lib/supabase';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import Link from 'next/link';

interface CalendarBlockProps {
  tasks: Task[];
}

function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function CalendarBlock({ tasks }: CalendarBlockProps) {
  const [dayEndTime, setDayEndTime] = useState('00:00');

  useEffect(() => {
    fetchUserSettings().then((s) => {
      if (s?.day_end_time) setDayEndTime(s.day_end_time);
    });
  }, []);

  const todayStr = getTodayDateString(dayEndTime);
  const todayObj = getLogicalTodayDate(dayEndTime);

  // Find start of current week (Monday)
  const currentDayOfWeek = todayObj.getDay();
  const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const startOfMondayObj = new Date(todayObj);
  startOfMondayObj.setDate(todayObj.getDate() - distanceToMonday);

  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Generate 14 days (This week & Next week starting from Monday)
  const twoWeeksDays: {
    dateStr: string;
    dayName: string;
    dayNum: number;
    monthName: string;
    isToday: boolean;
    weekNumber: number;
    rawDate: Date;
  }[] = [];

  for (let i = 0; i < 14; i++) {
    const d = new Date(startOfMondayObj);
    d.setDate(startOfMondayObj.getDate() + i + weekOffset * 7);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const weekNumber = getISOWeekNumber(d);

    twoWeeksDays.push({
      dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: dateStr === todayStr,
      weekNumber,
      rawDate: d,
    });
  }

  const week1Number = twoWeeksDays[0]?.weekNumber || 1;
  const week2Number = twoWeeksDays[7]?.weekNumber || 2;

  return (
    <div className="glass-panel p-5 rounded-xl border border-zinc-800 space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Focus Calendar</h2>
            <p className="text-[11px] text-zinc-400">
              Monday &ndash; Sunday grid &bull; 2-Week Schedule Overview
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Previous 2 weeks"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono hover:bg-zinc-800 transition-colors"
          >
            Current Focus
          </button>
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Next 2 weeks"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2-Week Monday-Sunday Focus Grid */}
      <div className="space-y-4">
        {/* Week 1 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <strong className="text-zinc-200">Week {week1Number}</strong> &bull; {twoWeeksDays[0]?.monthName} {twoWeeksDays[0]?.dayNum} &ndash; {twoWeeksDays[6]?.monthName} {twoWeeksDays[6]?.dayNum}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {twoWeeksDays.slice(0, 7).map((day) => {
              const dayTasks = tasks.filter((t) => t.next_revision_date === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[240px] transition-all relative ${
                    day.isToday
                      ? 'bg-zinc-900/90 border-zinc-500 ring-1 ring-zinc-500/20 shadow-md'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5 mb-1.5">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">
                        {day.dayName}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          day.isToday ? 'text-zinc-100 font-extrabold' : 'text-zinc-300'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                    </div>

                    {day.isToday && (
                      <span className="text-[9px] font-mono uppercase bg-zinc-100 text-zinc-950 px-1.5 py-0.5 rounded font-extrabold shadow-sm">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Task Items List Inside Day Block */}
                  <div className="flex-1 overflow-y-auto max-h-[185px] space-y-1.5 pr-0.5 custom-scrollbar">
                    {dayTasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] text-zinc-600 italic">No tasks</span>
                      </div>
                    ) : (
                      dayTasks.map((t) => {
                        const firstNote = t.notes && t.notes.length > 0 ? t.notes[0] : null;
                        const overlayCount = firstNote?.overlays?.length || 0;

                        return (
                          <div
                            key={t.id}
                            className="bg-zinc-900 border border-zinc-800/90 rounded-lg p-1.5 text-left transition-all hover:border-zinc-700 space-y-1 group"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded border ${
                                  t.status_color === 'red'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : t.status_color === 'yellow'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : t.status_color === 'green'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}
                              >
                                P{t.priority}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[60px]">
                                {t.topic?.name || 'Topic'}
                              </span>
                            </div>

                            <p className="text-[10px] font-semibold text-zinc-200 line-clamp-2 leading-tight">
                              {t.title}
                            </p>

                            <div className="pt-1 flex items-center justify-between border-t border-zinc-800/60">
                              <span className="text-[8px] font-mono text-zinc-500">
                                Int: {t.current_interval}d
                              </span>
                              {overlayCount > 0 ? (
                                <Link
                                  href={`/study/${t.id}`}
                                  className="text-[9px] font-bold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                >
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>Study</span>
                                </Link>
                              ) : (
                                <span className="text-[8px] text-zinc-600 italic">No note</span>
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

        {/* Week 2 */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <strong className="text-zinc-200">Week {week2Number}</strong> &bull; {twoWeeksDays[7]?.monthName} {twoWeeksDays[7]?.dayNum} &ndash; {twoWeeksDays[13]?.monthName} {twoWeeksDays[13]?.dayNum}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {twoWeeksDays.slice(7, 14).map((day) => {
              const dayTasks = tasks.filter((t) => t.next_revision_date === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[240px] transition-all relative ${
                    day.isToday
                      ? 'bg-zinc-900/90 border-zinc-500 ring-1 ring-zinc-500/20 shadow-md'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5 mb-1.5">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">
                        {day.dayName}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          day.isToday ? 'text-zinc-100 font-extrabold' : 'text-zinc-300'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                    </div>

                    {day.isToday && (
                      <span className="text-[9px] font-mono uppercase bg-zinc-100 text-zinc-950 px-1.5 py-0.5 rounded font-extrabold shadow-sm">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Task Items List Inside Day Block */}
                  <div className="flex-1 overflow-y-auto max-h-[185px] space-y-1.5 pr-0.5 custom-scrollbar">
                    {dayTasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] text-zinc-600 italic">No tasks</span>
                      </div>
                    ) : (
                      dayTasks.map((t) => {
                        const firstNote = t.notes && t.notes.length > 0 ? t.notes[0] : null;
                        const overlayCount = firstNote?.overlays?.length || 0;

                        return (
                          <div
                            key={t.id}
                            className="bg-zinc-900 border border-zinc-800/90 rounded-lg p-1.5 text-left transition-all hover:border-zinc-700 space-y-1 group"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded border ${
                                  t.status_color === 'red'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : t.status_color === 'yellow'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : t.status_color === 'green'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}
                              >
                                P{t.priority}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[60px]">
                                {t.topic?.name || 'Topic'}
                              </span>
                            </div>

                            <p className="text-[10px] font-semibold text-zinc-200 line-clamp-2 leading-tight">
                              {t.title}
                            </p>

                            <div className="pt-1 flex items-center justify-between border-t border-zinc-800/60">
                              <span className="text-[8px] font-mono text-zinc-500">
                                Int: {t.current_interval}d
                              </span>
                              {overlayCount > 0 ? (
                                <Link
                                  href={`/study/${t.id}`}
                                  className="text-[9px] font-bold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                >
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>Study</span>
                                </Link>
                              ) : (
                                <span className="text-[8px] text-zinc-600 italic">No note</span>
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
    </div>
  );
}
