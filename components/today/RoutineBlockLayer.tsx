'use client';

import { RoutineBlock } from '@/lib/types';
import { slotsForRoutineBlock } from '@/lib/timeGrid';
import { MutableRefObject } from 'react';

export default function RoutineBlockLayer({
  activeRoutines,
  slotHeightPx,
  blockRefsMap,
  magnetTargetBlockId,
}: {
  activeRoutines: RoutineBlock[];
  slotHeightPx: number;
  blockRefsMap: MutableRefObject<Map<string, HTMLDivElement>>;
  magnetTargetBlockId: string | null;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {activeRoutines.map((block) => {
        const { startSlot, endSlot } = slotsForRoutineBlock(block);
        const top = startSlot * slotHeightPx;
        const height = Math.max(1, endSlot - startSlot) * slotHeightPx;
        const isMagnetTarget = magnetTargetBlockId === block.id;

        return (
          <div
            key={block.id}
            ref={(el) => {
              if (el) blockRefsMap.current.set(block.id, el);
              else blockRefsMap.current.delete(block.id);
            }}
            className={`absolute left-0 right-0 rounded-md border-l-4 transition-all duration-150 ${
              isMagnetTarget ? 'scale-[1.01] shadow-lg' : ''
            }`}
            style={{
              top,
              height,
              backgroundColor: `${block.color}22`,
              borderLeftColor: block.color,
              boxShadow: isMagnetTarget ? `0 0 0 2px ${block.color}88` : undefined,
            }}
          >
            <span
              className="absolute top-1 left-14 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-950/50 leading-none"
              style={{ color: block.color }}
            >
              {block.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
