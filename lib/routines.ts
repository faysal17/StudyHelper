import {
  isSupabaseConfigured,
  getCurrentUserIdOrDefault,
  selectRoutineBlocks,
  insertRoutineBlockRow,
  updateRoutineBlockRow,
  deleteRoutineBlockRow,
  selectPlacementsForDate,
  upsertTaskPlacementRow,
  updatePlacementDurationRow,
  deletePlacementRow,
} from './supabase';
import { RoutineBlock, DailyTaskPlacement } from './types';

// ROUTINE BLOCKS

export async function fetchRoutineBlocks(): Promise<RoutineBlock[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await selectRoutineBlocks();

    if (!error && data) {
      return data as RoutineBlock[];
    }
  }
  return [];
}

export async function createRoutineBlock(blockData: {
  label: string;
  color: string;
  weekdays: string[];
  start_time: string;
  end_time: string;
  start_date?: string | null;
  end_date?: string | null;
}): Promise<RoutineBlock> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentUserIdOrDefault();
    const { data, error } = await insertRoutineBlockRow({
      label: blockData.label,
      color: blockData.color,
      weekdays: blockData.weekdays,
      start_time: blockData.start_time,
      end_time: blockData.end_time,
      start_date: blockData.start_date || null,
      end_date: blockData.end_date || null,
      user_id: userId,
    });

    if (error) throw error;
    return data as RoutineBlock;
  }
  throw new Error('Supabase database is not configured.');
}

export async function updateRoutineBlock(id: string, updates: Partial<RoutineBlock>): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await updateRoutineBlockRow(id, updates);
    if (error) throw error;
  }
}

export async function deleteRoutineBlock(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await deleteRoutineBlockRow(id);
    if (error) throw error;
  }
}

// DAILY TASK PLACEMENTS

export async function fetchPlacementsForDate(dateStr: string): Promise<DailyTaskPlacement[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await selectPlacementsForDate(dateStr);

    if (!error && data) {
      return data as DailyTaskPlacement[];
    }
  }
  return [];
}

export async function upsertTaskPlacement(params: {
  taskId: string;
  date: string;
  slotIndex: number;
  routineBlockId?: string | null;
}): Promise<DailyTaskPlacement> {
  if (isSupabaseConfigured) {
    const userId = await getCurrentUserIdOrDefault();
    const { data, error } = await upsertTaskPlacementRow({
      user_id: userId,
      task_id: params.taskId,
      placement_date: params.date,
      slot_index: params.slotIndex,
      routine_block_id: params.routineBlockId ?? null,
    });

    if (error) throw error;
    return data as DailyTaskPlacement;
  }
  throw new Error('Supabase database is not configured.');
}

export async function updatePlacementDuration(id: string, durationSlots: number): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await updatePlacementDurationRow(id, durationSlots);
    if (error) throw error;
  }
}

export async function removeTaskPlacement(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await deletePlacementRow(id);
    if (error) throw error;
  }
}
