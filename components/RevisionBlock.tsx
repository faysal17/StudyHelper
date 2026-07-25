'use client';

import Link from 'next/link';
import { Task, StatusColor } from '@/lib/types';
import { RotateCw, Eye, FileImage, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { getTodayDateString } from '@/lib/spacedRepetition';

interface RevisionBlockProps {
  tasks: Task[];
  onUploadNote: (task: Task) => void;
}

export default function RevisionBlock({ tasks, onUploadNote }: RevisionBlockProps) {
  const today = getTodayDateString();

  // Tasks due for revision today: next_revision_date <= today AND reviewed previously (or explicitly due)
  const revisionTasks = tasks.filter((t) => {
    // If it has never been reviewed, it belongs to New Study Block
    if (!t.last_reviewed_date) return false;
    return t.next_revision_date <= today;
  });

  const getStatusBadgeStyle = (color: StatusColor) => {
    switch (color) {
      case 'red':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'yellow':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'green':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'blue':
      default:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusLabel = (color: StatusColor) => {
    switch (color) {
      case 'red':
        return 'Red • High Error (১ দিন পর রিভিশন)';
      case 'yellow':
        return 'Yellow • Moderate Error';
      case 'green':
        return 'Green • Low Error (লং ইন্টারভাল)';
      case 'blue':
      default:
        return 'Blue • Scheduled';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 relative overflow-hidden">
      {/* Top indicator bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 absolute top-0 left-0 right-0" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <RotateCw className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>আজকের রিভিশন ব্লক (Revision Block)</span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono">
                {revisionTasks.length} due
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              স্পেসড রিপিটিশন অনুযায়ী আজ রিভিশন দেওয়ার উপযুক্ত টাস্কসমূহ
            </p>
          </div>
        </div>
      </div>

      {revisionTasks.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-900/40 rounded-xl border border-slate-800/80">
          <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-300">আজকের জন্য সব রিভিশন সম্পন্ন করা হয়েছে!</p>
          <p className="text-xs text-slate-500 mt-1">দুর্দান্ত কাজ! ক্যালেন্ডারে পরবর্তী রিভিশন চেক করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {revisionTasks.map((task) => {
            const hasNote = task.notes && task.notes.length > 0;
            const firstNote = hasNote ? task.notes![0] : null;
            const overlayCount = firstNote?.overlays?.length || 0;
            const statusStyle = getStatusBadgeStyle(task.status_color);

            return (
              <div
                key={task.id}
                className="glass-card rounded-xl p-4 border border-slate-700/60 hover:border-slate-500 flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Subject, Topic & Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                      {task.subject?.name || 'বিষয়'} &bull; {task.topic?.name || 'টপিক'}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${statusStyle}`}>
                      {getStatusLabel(task.status_color)}
                    </span>
                  </div>

                  {/* Task Title */}
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-2 mb-3">
                    {task.title}
                  </h3>
                </div>

                {/* Info and action button */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex flex-col text-[11px] text-slate-400">
                    <span>
                      ইন্টারভাল: <strong className="text-slate-200">{task.current_interval}d</strong> &bull; Priority P{task.priority}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      সর্বশেষ দেখা: {task.last_reviewed_date || 'N/A'}
                    </span>
                  </div>

                  <div>
                    {hasNote && overlayCount > 0 ? (
                      <Link
                        href={`/study/${task.id}`}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center space-x-1 shadow-sm shadow-emerald-500/30"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>রিভিশন শুরু</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => onUploadNote(task)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center space-x-1"
                      >
                        <FileImage className="w-3.5 h-3.5" />
                        <span>নোট আপলোড</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
