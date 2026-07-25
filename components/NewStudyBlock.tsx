'use client';

import Link from 'next/link';
import { Task } from '@/lib/types';
import { BookOpen, Eye, FileImage, Layers, ArrowRight } from 'lucide-react';

interface NewStudyBlockProps {
  tasks: Task[];
  onUploadNote: (task: Task) => void;
}

export default function NewStudyBlock({ tasks, onUploadNote }: NewStudyBlockProps) {
  const newTasks = tasks.filter((t) => !t.last_reviewed_date);

  return (
    <div className="glass-panel rounded-xl p-5 border border-blue-500/20 shadow-sm flex flex-col h-[440px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BookOpen className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span>New Study Block</span>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] px-2 py-0.2 rounded-full font-mono">
                {newTasks.length}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">Unreviewed tasks scheduled today</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
        {newTasks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6 bg-zinc-950/40 rounded-lg border border-zinc-800/60">
            <p className="text-xs text-zinc-500">No new study tasks scheduled for today.</p>
          </div>
        ) : (
          newTasks.map((task) => {
            const hasNote = task.notes && task.notes.length > 0;
            const firstNote = hasNote ? task.notes![0] : null;
            const overlayCount = firstNote?.overlays?.length || 0;

            return (
              <div
                key={task.id}
                className="glass-card rounded-lg p-3.5 border border-blue-500/20 hover:border-blue-500/40 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded truncate max-w-[180px]">
                      {task.subject?.name || 'Subject'} &bull; {task.topic?.name || 'Topic'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      P{task.priority}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-zinc-100 line-clamp-2 mb-2">
                    {task.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-zinc-500 flex items-center space-x-1">
                    <FileImage className="w-3 h-3" />
                    <span>{hasNote ? `${overlayCount} overlays` : 'No note'}</span>
                  </div>

                  <div>
                    {!hasNote ? (
                      <button
                        onClick={() => onUploadNote(task)}
                        className="px-2.5 py-1 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center space-x-1"
                      >
                        <FileImage className="w-3 h-3" />
                        <span>Upload Note</span>
                      </button>
                    ) : overlayCount === 0 ? (
                      <Link
                        href={`/notes/${firstNote!.id}/occlude`}
                        className="px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-colors flex items-center space-x-1"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Add Overlays</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/study/${task.id}`}
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-500 text-zinc-950 hover:bg-blue-400 transition-all flex items-center space-x-1 shadow-sm"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Start Study</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
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
