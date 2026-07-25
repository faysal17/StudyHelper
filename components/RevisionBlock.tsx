'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Task, StatusColor } from '@/lib/types';
import { RotateCcw, Eye, FileImage, ArrowRight, AlertCircle } from 'lucide-react';
import { getTodayDateString } from '@/lib/spacedRepetition';
import { fetchUserSettings } from '@/lib/supabase';

interface RevisionBlockProps {
  tasks: Task[];
  onUploadNote: (task: Task) => void;
}

export default function RevisionBlock({ tasks, onUploadNote }: RevisionBlockProps) {
  const [dayEndTime, setDayEndTime] = useState('00:00');

  useEffect(() => {
    fetchUserSettings().then((s) => {
      if (s?.day_end_time) setDayEndTime(s.day_end_time);
    });
  }, []);

  const today = getTodayDateString(dayEndTime);

  // Filter reviewed tasks due today or earlier, with OVERDUE tasks sorted at the VERY TOP
  const revisionTasks = tasks
    .filter((t) => Boolean(t.last_reviewed_date) && t.next_revision_date <= today)
    .sort((a, b) => {
      const aOverdue = a.next_revision_date < today;
      const bOverdue = b.next_revision_date < today;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return a.next_revision_date.localeCompare(b.next_revision_date);
    });

  const overdueCount = revisionTasks.filter((t) => t.next_revision_date < today).length;

  const getStatusBadgeStyle = (color: StatusColor) => {
    switch (color) {
      case 'red':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'yellow':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'green':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'blue':
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-zinc-800/80 shadow-sm flex flex-col h-[440px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <RotateCcw className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span>Revision Block</span>
              <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] px-2 py-0.2 rounded-full font-mono">
                {revisionTasks.length}
              </span>
              {overdueCount > 0 && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-2 py-0.2 rounded-full font-mono font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {overdueCount} Overdue
                </span>
              )}
            </h2>
            <p className="text-[11px] text-zinc-400">Tasks due for spaced repetition review today & overdue</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
        {revisionTasks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6 bg-zinc-950/40 rounded-lg border border-zinc-800/60">
            <p className="text-xs text-zinc-500">All revisions completed for today!</p>
          </div>
        ) : (
          revisionTasks.map((task) => {
            const hasNote = task.notes && task.notes.length > 0;
            const firstNote = hasNote ? task.notes![0] : null;
            const overlayCount = firstNote?.overlays?.length || 0;
            const statusStyle = getStatusBadgeStyle(task.status_color);
            const isOverdue = task.next_revision_date < today;

            return (
              <div
                key={task.id}
                className={`glass-card rounded-lg p-3.5 border flex flex-col justify-between transition-all ${
                  isOverdue
                    ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/60 shadow-sm'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-1.5 truncate max-w-[200px]">
                      {isOverdue && (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5 shrink-0">
                          <AlertCircle className="w-2.5 h-2.5" />
                          OVERDUE
                        </span>
                      )}
                      <span className="text-[10px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded truncate">
                        {task.subject?.name || 'Subject'} &bull; {task.topic?.name || 'Topic'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${statusStyle} shrink-0`}>
                      P{task.priority} &bull; {task.status_color}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-zinc-100 line-clamp-2 mb-2">
                    {task.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-zinc-500">
                    Interval: <strong className="text-zinc-300 font-mono">{task.current_interval}d</strong>
                  </div>

                  <div>
                    {hasNote && overlayCount > 0 ? (
                      <Link
                        href={`/study/${task.id}`}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center space-x-1 shadow-sm ${
                          isOverdue
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Start Revision</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => onUploadNote(task)}
                        className="px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors flex items-center space-x-1"
                      >
                        <FileImage className="w-3 h-3" />
                        <span>Upload Note</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
