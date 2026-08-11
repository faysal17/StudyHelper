'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DailyTaskPlacement, Task } from '@/lib/types';
import { X } from 'lucide-react';
import { slotIndexToLabel } from '@/lib/timeGrid';

export default function PlacedTaskCard({
  placement,
  task,
  routineColor,
  startSlot,
  endSlot,
  onRemove,
  onResizeStart,
}: {
  placement: DailyTaskPlacement;
  task: Task;
  routineColor?: string;
  startSlot: number;
  endSlot: number;
  onRemove: (placementId: string) => void;
  onResizeStart?: (e: React.PointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task, placementId: placement.id },
  });

  const isRevision = Boolean(task.last_reviewed_date);
  const subjectName = task.subject?.name || task.topic?.subject?.name || null;
  const topicName = task.topic?.name || null;
  const isShort = endSlot - startSlot <= 1;

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
        borderLeftColor: routineColor || undefined,
      }}
      className={`group relative h-full w-full bg-zinc-900 border border-zinc-700 ${
        routineColor ? 'border-l-4' : ''
      } rounded-md flex flex-col items-stretch justify-center gap-0.5 text-left px-2 py-1 cursor-grab active:cursor-grabbing touch-none overflow-hidden`}
    >
      <div className="flex items-center justify-between gap-1.5 min-w-0 pr-3">
        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
          {slotIndexToLabel(startSlot)}&ndash;{slotIndexToLabel(endSlot)}
        </span>
        <span
          className={`shrink-0 text-[9px] font-mono uppercase px-1 py-px rounded border ${statusClasses}`}
        >
          {isRevision ? 'Rev' : 'New'}
        </span>
      </div>

      <span className="text-xs font-medium text-zinc-100 truncate">{task.title}</span>

      {!isShort && (subjectName || topicName) && (
        <span className="text-[10px] text-zinc-400 truncate">
          {subjectName || 'Subject'}
          {topicName ? ` • ${topicName}` : ''}
        </span>
      )}

      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(placement.id);
        }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>

      {onResizeStart && (
        <div
          onPointerDown={onResizeStart}
          className="absolute bottom-0 left-0 right-0 h-2.5 flex items-center justify-center cursor-ns-resize opacity-0 group-hover:opacity-100"
        >
          <div className="w-8 h-0.5 rounded-full bg-zinc-500" />
        </div>
      )}
    </div>
  );
}
