'use client';

import { useState } from 'react';
import { DailyTaskPlacement, RoutineBlock } from '@/lib/types';
import { SLOT_COUNT, slotsForRoutineBlock } from '@/lib/timeGrid';
import PlacedTaskCard from './PlacedTaskCard';

export default function PlacementLayer({
  placements,
  routineBlocks,
  slotHeightPx,
  onRemove,
  onResize,
}: {
  placements: DailyTaskPlacement[];
  routineBlocks: RoutineBlock[];
  slotHeightPx: number;
  onRemove: (placementId: string) => void;
  onResize: (placementId: string, durationSlots: number) => void;
}) {
  const [resizeVisual, setResizeVisual] = useState<{ id: string; duration: number } | null>(null);

  const startResize = (placement: DailyTaskPlacement) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startDuration = placement.duration_slots;
    const maxDuration = SLOT_COUNT - placement.slot_index;
    let liveDuration = startDuration;
    setResizeVisual({ id: placement.id, duration: startDuration });

    const handleMove = (ev: PointerEvent) => {
      const deltaSlots = Math.round((ev.clientY - startY) / slotHeightPx);
      liveDuration = Math.max(1, Math.min(maxDuration, startDuration + deltaSlots));
      setResizeVisual({ id: placement.id, duration: liveDuration });
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setResizeVisual(null);
      if (liveDuration !== startDuration) {
        onResize(placement.id, liveDuration);
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {placements.map((placement) => {
        if (!placement.task) return null;
        const routine = placement.routine_block_id
          ? routineBlocks.find((b) => b.id === placement.routine_block_id)
          : undefined;

        let startSlot: number;
        let endSlot: number;
        if (routine) {
          const span = slotsForRoutineBlock(routine);
          startSlot = span.startSlot;
          endSlot = span.endSlot;
        } else {
          startSlot = placement.slot_index;
          const liveDuration = resizeVisual?.id === placement.id ? resizeVisual.duration : placement.duration_slots;
          endSlot = startSlot + liveDuration;
        }

        const top = startSlot * slotHeightPx;
        const height = Math.max(1, endSlot - startSlot) * slotHeightPx;

        return (
          <div
            key={placement.id}
            className="absolute left-12 right-1 pointer-events-auto px-0.5"
            style={{ top, height }}
          >
            <PlacedTaskCard
              placement={placement}
              task={placement.task}
              routineColor={routine?.color}
              onRemove={onRemove}
              onResizeStart={routine ? undefined : startResize(placement)}
            />
          </div>
        );
      })}
    </div>
  );
}
