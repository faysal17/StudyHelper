'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { getTodayDateString, addDaysToDateString } from '@/lib/spacedRepetition';
import { Calendar as CalendarIcon, ChevronRight, Eye, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface CalendarBlockProps {
  tasks: Task[];
}

export default function CalendarBlock({ tasks }: CalendarBlockProps) {
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Generate 21 days (3 weeks forward) starting from today
  const daysList: { dateStr: string; dayName: string; dayNum: number; monthName: string; isToday: boolean }[] = [];
  for (let i = 0; i < 21; i++) {
    const dateStr = addDaysToDateString(today, i);
    const dateObj = new Date(dateStr + 'T00:00:00');
    daysList.push({
      dateStr,
      dayName: dateObj.toLocaleDateString('bn-BD', { weekday: 'narrow' }),
      dayNum: dateObj.getDate(),
      monthName: dateObj.toLocaleDateString('bn-BD', { month: 'short' }),
      isToday: dateStr === today,
    });
  }

  // Group tasks by date
  const getTasksForDate = (dateStr: string) => {
    return tasks.filter((t) => {
      // If task has no last_reviewed_date and next_revision_date matches dateStr -> New Study task
      // If next_revision_date matches dateStr -> Revision task
      return t.next_revision_date === dateStr;
    });
  };

  const selectedDateTasks = getTasksForDate(selectedDate);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <CalendarIcon className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>৩-সপ্তাহের অগ্রিম রিভিশন ক্যালেন্ডার (3-Week Forward Calendar)</span>
            </h2>
            <p className="text-xs text-slate-400">
              আগামী ২১ দিনের রিভিশন ও নিউ স্টাডি শিডিউল ভিউ (Blue: New Study, Colors: Revisions)
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable 21-Day Calendar Grid */}
      <div className="overflow-x-auto pb-3 mb-6 scrollbar-thin">
        <div className="flex space-x-2.5 min-w-max">
          {daysList.map((day) => {
            const dateTasks = getTasksForDate(day.dateStr);
            const newCount = dateTasks.filter((t) => !t.last_reviewed_date).length;
            const revCount = dateTasks.length - newCount;
            const isSelected = selectedDate === day.dateStr;

            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex flex-col items-center justify-between p-3 rounded-xl min-w-[72px] border transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10 scale-105'
                    : day.isToday
                    ? 'bg-slate-900 border-emerald-500/40 text-slate-100'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-[11px] font-medium opacity-80">{day.dayName}</span>
                <span className="text-xl font-bold my-1">{day.dayNum}</span>
                <span className="text-[10px] opacity-75">{day.monthName}</span>

                {/* Status Badges / Dots */}
                <div className="flex items-center space-x-1 mt-2">
                  {newCount > 0 && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-slate-950"
                      title={`${newCount} New Study tasks`}
                    />
                  )}
                  {revCount > 0 && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950"
                      title={`${revCount} Revision tasks`}
                    />
                  )}
                  {newCount === 0 && revCount === 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              শিডিউলকৃত টাস্কসমূহ ({new Date(selectedDate + 'T00:00:00').toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
            </span>
          </span>
          <span className="text-xs font-mono text-slate-400">
            {selectedDateTasks.length} Task(s)
          </span>
        </div>

        {selectedDateTasks.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            এই তারিখে কোন রিভিশন বা নতুন স্টাডি শিডিউল করা নেই।
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDateTasks.map((t) => {
              const isNew = !t.last_reviewed_date;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isNew
                          ? 'bg-blue-500'
                          : t.status_color === 'red'
                          ? 'bg-red-500'
                          : t.status_color === 'yellow'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="font-semibold text-slate-200 truncate">{t.title}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                      {t.subject?.name || 'Subject'}
                    </span>
                  </div>

                  {t.notes && t.notes.length > 0 && t.notes[0].overlays && t.notes[0].overlays.length > 0 ? (
                    <Link
                      href={`/study/${t.id}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium flex items-center space-x-1 shrink-0"
                    >
                      <Eye className="w-3 h-3 text-emerald-400" />
                      <span>Start</span>
                    </Link>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">No notes</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
