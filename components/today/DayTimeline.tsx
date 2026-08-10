'use client';

import { useMemo, useRef, useEffect, MutableRefObject } from 'react';
import { RoutineBlock, DailyTaskPlacement } from '@/lib/types';
import { SLOT_COUNT, SLOT_MINUTES, slotIndexToLabel, isRoutineActiveOnDate } from '@/lib/timeGrid';
import TimelineSlotCell from './TimelineSlotCell';
import RoutineBlockLayer from './RoutineBlockLayer';
import PlacementLayer from './PlacementLayer';

export const SLOT_HEIGHT_PX = 44;

export default function DayTimeline({
  routineBlocks,
  placements,
  today,
  blockRefsMap,
  magnetTargetBlockId,
  onRemovePlacement,
  onResizePlacement,
}: {
  routineBlocks: RoutineBlock[];
  placements: DailyTaskPlacement[];
  today: string;
  blockRefsMap: MutableRefObject<Map<string, HTMLDivElement>>;
  magnetTargetBlockId: string | null;
  onRemovePlacement: (placementId: string) => void;
  onResizePlacement: (placementId: string, durationSlots: number) => void;
}) {
  const activeRoutines = useMemo(
    () => routineBlocks.filter((b) => isRoutineActiveOnDate(b, today)),
    [routineBlocks, today]
  );

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => i);

  const isTodayRealDate =
    today ===
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const nowTop = (nowMinutes / SLOT_MINUTES) * SLOT_HEIGHT_PX;

  const nowLineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isTodayRealDate) {
      nowLineRef.current?.scrollIntoView({ block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="glass-panel rounded-xl border border-zinc-800 p-3">
      <div className="relative" style={{ height: SLOT_COUNT * SLOT_HEIGHT_PX }}>
        <RoutineBlockLayer
          activeRoutines={activeRoutines}
          slotHeightPx={SLOT_HEIGHT_PX}
          blockRefsMap={blockRefsMap}
          magnetTargetBlockId={magnetTargetBlockId}
        />
        {slots.map((slotIndex) => (
          <TimelineSlotCell
            key={slotIndex}
            slotIndex={slotIndex}
            heightPx={SLOT_HEIGHT_PX}
            hourLabel={slotIndex % 2 === 0 ? slotIndexToLabel(slotIndex) : undefined}
          />
        ))}
        <PlacementLayer
          placements={placements}
          routineBlocks={routineBlocks}
          slotHeightPx={SLOT_HEIGHT_PX}
          onRemove={onRemovePlacement}
          onResize={onResizePlacement}
        />
        {isTodayRealDate && (
          <div
            ref={nowLineRef}
            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
            style={{ top: nowTop }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 -ml-0.5" />
            <div className="flex-1 h-px bg-amber-400/70" />
          </div>
        )}
      </div>
    </div>
  );
}
