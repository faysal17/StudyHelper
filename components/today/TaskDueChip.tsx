'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/lib/types';
import { GripVertical } from 'lucide-react';

export default function TaskDueChip({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  });

  const isRevision = Boolean(task.last_reviewed_date);
  const subjectName = task.subject?.name || task.topic?.subject?.name || 'Subject';
  const topicName = task.topic?.name || 'Topic';

  const statusClasses =
    task.status_color === 'red'
      ? 'bg-red-500/10 text-red-400 border-red-500/20'
      : task.status_color === 'yellow'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : task.status_color === 'green'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      className="glass-card p-2.5 rounded-lg border border-zinc-800 flex items-center gap-2 cursor-grab active:cursor-grabbing touch-none"
    >
      <GripVertical className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-100 truncate">{task.title}</p>
        <p className="text-xs text-zinc-400 truncate">
          {subjectName} &bull; {topicName}
        </p>
      </div>
      <span
        className={`shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${statusClasses}`}
      >
        {isRevision ? 'Rev' : 'New'}
      </span>
    </div>
  );
}
