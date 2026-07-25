'use client';

import Link from 'next/link';
import { Task, StatusColor } from '@/lib/types';
import { RotateCcw, Eye, FileImage, ArrowRight } from 'lucide-react';
import { getTodayDateString } from '@/lib/spacedRepetition';

interface RevisionBlockProps {
  tasks: Task[];
  onUploadNote: (task: Task) => void;
}

export default function RevisionBlock({ tasks, onUploadNote }: RevisionBlockProps) {
  const today = getTodayDateString();

  const revisionTasks = tasks.filter((t) => {
    if (!t.last_reviewed_date) return false;
    return t.next_revision_date <= today;
  });

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
            </h2>
            <p className="text-[11px] text-zinc-400">Tasks due for spaced repetition review today</p>
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

            return (
              <div
                key={task.id}
                className="glass-card rounded-lg p-3.5 border border-zinc-800 hover:border-zinc-700 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded truncate max-w-[180px]">
                      {task.subject?.name || 'Subject'} &bull; {task.topic?.name || 'Topic'}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${statusStyle}`}>
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
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all flex items-center space-x-1 shadow-sm"
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
