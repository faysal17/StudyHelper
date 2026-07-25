'use client';

import Link from 'next/link';
import { Task } from '@/lib/types';
import { BookPlus, Eye, FileImage, Sparkles, Layers, ArrowRight } from 'lucide-react';

interface NewStudyBlockProps {
  tasks: Task[];
  onUploadNote: (task: Task) => void;
}

export default function NewStudyBlock({ tasks, onUploadNote }: NewStudyBlockProps) {
  // New Study tasks are those with last_reviewed_date === null
  const newTasks = tasks.filter((t) => !t.last_reviewed_date);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-blue-500/30 shadow-lg shadow-blue-950/20 relative overflow-hidden">
      {/* Top indicator bar */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 absolute top-0 left-0 right-0" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <BookPlus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>নতুন স্টাডি ব্লক (New Study Block)</span>
              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono">
                {newTasks.length} items
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              আজকের নির্ধারিত টাস্ক যা এখনো একবারও রিভিশন দেয়া হয়নি (Color-coded: <span className="text-blue-400 font-semibold">Blue</span>)
            </p>
          </div>
        </div>
      </div>

      {newTasks.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-900/40 rounded-xl border border-slate-800/80">
          <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-300">আজকের কোন নতুন স্টাডি টাস্ক বাকি নেই!</p>
          <p className="text-xs text-slate-500 mt-1">সব নতুন বিষয়গুলো পড়া শেষ হয়েছে।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newTasks.map((task) => {
            const hasNote = task.notes && task.notes.length > 0;
            const firstNote = hasNote ? task.notes![0] : null;
            const overlayCount = firstNote?.overlays?.length || 0;

            return (
              <div
                key={task.id}
                className="glass-card rounded-xl p-4 border border-blue-500/20 hover:border-blue-500/50 flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Topic & Subject */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                      {task.subject?.name || 'বিষয়'} &bull; {task.topic?.name || 'টপিক'}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded border bg-slate-900 border-slate-700 text-slate-300">
                      P{task.priority} {task.priority === 1 ? 'High' : task.priority === 2 ? 'Normal' : 'Low'}
                    </span>
                  </div>

                  {/* Task Title */}
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-300 transition-colors line-clamp-2 mb-3">
                    {task.title}
                  </h3>
                </div>

                {/* Footer buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <FileImage className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      {hasNote ? `${overlayCount} overlays` : 'No notes'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!hasNote ? (
                      <button
                        onClick={() => onUploadNote(task)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center space-x-1"
                      >
                        <FileImage className="w-3.5 h-3.5" />
                        <span>নোট যোগ করুন</span>
                      </button>
                    ) : overlayCount === 0 ? (
                      <Link
                        href={`/notes/${firstNote!.id}/occlude`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors flex items-center space-x-1"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>অক্লুশন আঁকুন</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/study/${task.id}`}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 transition-all flex items-center space-x-1 shadow-sm shadow-blue-500/30"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>স্টাডি শুরু করুন</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </Link>
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
