'use client';

import { useDroppable } from '@dnd-kit/core';

export default function TimelineSlotCell({
  slotIndex,
  hourLabel,
  heightPx,
}: {
  slotIndex: number;
  hourLabel?: string;
  heightPx: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { type: 'slot', slotIndex },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ height: heightPx }}
      className={`relative z-[1] border-t flex items-stretch transition-colors ${
        isOver ? 'bg-amber-500/10 border-t-amber-500/40' : 'border-t-zinc-800/60'
      }`}
    >
      <div className="w-12 shrink-0 pt-0.5 pl-1.5 text-[11px] font-mono text-zinc-500 select-none">
        {hourLabel}
      </div>
    </div>
  );
}
