'use client';

import { Task } from '@/lib/types';
import { ChevronDown, ChevronUp, ListTodo } from 'lucide-react';
import TaskDueChip from './TaskDueChip';

export default function DueTodayDrawer({
  tasks,
  isOpen,
  onToggle,
}: {
  tasks: Task[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  // TODO: swap metric per user spec — currently just total due-today count
  const dueTodayCount = tasks.length;

  return (
    <div className="glass-panel rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <ListTodo className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-100">Due Today</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono">{dueTodayCount} items due</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-zinc-800/80 p-3 max-h-80 overflow-y-auto space-y-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6">
              Nothing due today. Enjoy the clear schedule!
            </p>
          ) : (
            tasks.map((task) => <TaskDueChip key={task.id} task={task} />)
          )}
        </div>
      )}
    </div>
  );
}
