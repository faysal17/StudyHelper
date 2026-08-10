'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  rectIntersection,
  type Modifier,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { supabase, isSupabaseConfigured, fetchTasks, fetchUserSettings } from '@/lib/supabase';
import {
  fetchRoutineBlocks,
  fetchPlacementsForDate,
  upsertTaskPlacement,
  removeTaskPlacement,
  updatePlacementDuration,
} from '@/lib/routines';
import { getTodayDateString, isTaskDueToday } from '@/lib/spacedRepetition';
import { isRoutineActiveOnDate, slotsForRoutineBlock } from '@/lib/timeGrid';
import { Task, RoutineBlock, DailyTaskPlacement } from '@/lib/types';
import { Settings as SettingsIcon, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';
import DueTodayDrawer from '@/components/today/DueTodayDrawer';
import DayTimeline from '@/components/today/DayTimeline';

const MAGNET_THRESHOLD_PX = 28;

export default function TodayPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [dayEndTime, setDayEndTime] = useState('00:00');
  const [routineBlocks, setRoutineBlocks] = useState<RoutineBlock[]>([]);
  const [placements, setPlacements] = useState<DailyTaskPlacement[]>([]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [magnetTargetBlockId, setMagnetTargetBlockId] = useState<string | null>(null);
  const magnetTargetBlockIdRef = useRef<string | null>(null);
  const blockRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const today = useMemo(() => getTodayDateString(dayEndTime), [dayEndTime]);

  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          router.push('/login');
          return;
        }
      } else if (typeof window !== 'undefined') {
        const storedSession = localStorage.getItem('studyhub_user_session');
        if (!storedSession) {
          router.push('/login');
          return;
        }
      }
      setCheckingAuth(false);
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checkingAuth) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tData, settings, rData] = await Promise.all([fetchTasks(), fetchUserSettings(), fetchRoutineBlocks()]);
      setTasks(tData);
      setRoutineBlocks(rData);
      const det = settings?.day_end_time || '00:00';
      setDayEndTime(det);
      const todayStr = getTodayDateString(det);
      const pData = await fetchPlacementsForDate(todayStr);
      setPlacements(pData);
    } catch (err) {
      console.error('Error loading Today page data:', err);
    } finally {
      setLoading(false);
    }
  };

  const placedTaskIds = useMemo(() => new Set(placements.map((p) => p.task_id)), [placements]);
  const dueTodayTasks = useMemo(
    () => tasks.filter((t) => isTaskDueToday(t, dayEndTime) && !placedTaskIds.has(t.id)),
    [tasks, dayEndTime, placedTaskIds]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const magnetModifier: Modifier = ({ transform, draggingNodeRect }) => {
    if (!draggingNodeRect) return transform;
    const currentTop = draggingNodeRect.top + transform.y;
    const currentCenterY = currentTop + draggingNodeRect.height / 2;

    let bestDelta = 0;
    let bestDist = MAGNET_THRESHOLD_PX;

    blockRefsMap.current.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return;
      let dist = 0;
      let targetCenterY = currentCenterY;
      if (currentCenterY < rect.top) {
        dist = rect.top - currentCenterY;
        targetCenterY = rect.top + Math.min(rect.height, draggingNodeRect.height) / 2;
      } else if (currentCenterY > rect.bottom) {
        dist = currentCenterY - rect.bottom;
        targetCenterY = rect.bottom - Math.min(rect.height, draggingNodeRect.height) / 2;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestDelta = targetCenterY - currentCenterY;
      }
    });

    return { ...transform, y: transform.y + bestDelta };
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { task: Task } | undefined;
    setActiveDragTask(data?.task || null);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const activeRect = event.active.rect.current.translated;
    if (!activeRect) {
      magnetTargetBlockIdRef.current = null;
      setMagnetTargetBlockId(null);
      return;
    }
    const centerY = activeRect.top + activeRect.height / 2;
    let closestId: string | null = null;
    let closestDist = MAGNET_THRESHOLD_PX;

    blockRefsMap.current.forEach((el, blockId) => {
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return;
      const dist = centerY < rect.top ? rect.top - centerY : centerY > rect.bottom ? centerY - rect.bottom : 0;
      if (dist < closestDist) {
        closestDist = dist;
        closestId = blockId;
      }
    });

    magnetTargetBlockIdRef.current = closestId;
    setMagnetTargetBlockId(closestId);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragTask(null);
    setMagnetTargetBlockId(null);
    const { active, over } = event;
    const targetBlockIdAtDrop = magnetTargetBlockIdRef.current;
    magnetTargetBlockIdRef.current = null;
    if (!over) return;

    const overData = over.data.current as { type: string; slotIndex: number } | undefined;
    if (!overData || overData.type !== 'slot') return;

    const activeData = active.data.current as { task: Task } | undefined;
    const task = activeData?.task;
    if (!task) return;

    let slotIndex = overData.slotIndex;
    let routineBlockId: string | null = null;

    const targetBlock = targetBlockIdAtDrop
      ? routineBlocks.find((b) => b.id === targetBlockIdAtDrop)
      : routineBlocks.find((b) => {
          if (!isRoutineActiveOnDate(b, today)) return false;
          const { startSlot, endSlot } = slotsForRoutineBlock(b);
          return slotIndex >= startSlot && slotIndex < endSlot;
        });

    if (targetBlock) {
      const { startSlot, endSlot } = slotsForRoutineBlock(targetBlock);
      slotIndex = Math.max(startSlot, Math.min(endSlot - 1, slotIndex));
      routineBlockId = targetBlock.id;
    }

    try {
      const placement = await upsertTaskPlacement({ taskId: task.id, date: today, slotIndex, routineBlockId });
      setPlacements((prev) => {
        const withoutThis = prev.filter((p) => p.task_id !== task.id);
        return [...withoutThis, { ...placement, task }];
      });
    } catch (err) {
      console.error('Error placing task:', err);
    }
  };

  const handleRemovePlacement = async (placementId: string) => {
    try {
      await removeTaskPlacement(placementId);
      setPlacements((prev) => prev.filter((p) => p.id !== placementId));
    } catch (err) {
      console.error('Error removing placement:', err);
    }
  };

  const handleResizePlacement = async (placementId: string, durationSlots: number) => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === placementId ? { ...p, duration_slots: durationSlots } : p))
    );
    try {
      await updatePlacementDuration(placementId, durationSlots);
    } catch (err) {
      console.error('Error resizing placement:', err);
    }
  };

  if (checkingAuth || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <p className="text-xs">Loading today...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            <span>Today</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">{today}</p>
        </div>
        <Link
          href="/today/routine"
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-colors flex items-center space-x-1.5"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>Routine Settings</span>
        </Link>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        modifiers={[magnetModifier]}
        autoScroll={false}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <DueTodayDrawer tasks={dueTodayTasks} isOpen={isDrawerOpen} onToggle={() => setIsDrawerOpen((v) => !v)} />

        <DayTimeline
          routineBlocks={routineBlocks}
          placements={placements}
          today={today}
          blockRefsMap={blockRefsMap}
          magnetTargetBlockId={magnetTargetBlockId}
          onRemovePlacement={handleRemovePlacement}
          onResizePlacement={handleResizePlacement}
        />

        <DragOverlay>
          {activeDragTask ? (
            <div className="glass-card p-2.5 rounded-lg border border-amber-500/40 shadow-lg">
              <p className="text-xs font-medium text-zinc-100">{activeDragTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
