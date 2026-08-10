'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DailyTaskPlacement, Task } from '@/lib/types';
import { X } from 'lucide-react';

export default function PlacedTaskCard({
  placement,
  task,
  routineColor,
  onRemove,
  onResizeStart,
}: {
  placement: DailyTaskPlacement;
  task: Task;
  routineColor?: string;
  onRemove: (placementId: string) => void;
  onResizeStart?: (e: React.PointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task', task, placementId: placement.id },
  });

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
      } rounded-md flex items-center justify-center text-center px-5 cursor-grab active:cursor-grabbing touch-none overflow-hidden`}
    >
      <span className="text-xs font-medium text-zinc-100 truncate">{task.title}</span>

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
