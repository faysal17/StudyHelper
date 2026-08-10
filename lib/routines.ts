import { isSupabaseConfigured, supabase } from './supabase';
import { RoutineBlock, DailyTaskPlacement } from './types';

const DEFAULT_USER_ID = 'user-owner';

async function getCurrentUserId(): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      return userData.user.id;
    }
  }
  return DEFAULT_USER_ID;
}

// ROUTINE BLOCKS

export async function fetchRoutineBlocks(): Promise<RoutineBlock[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('routine_blocks')
      .select('*')
      .order('start_time', { ascending: true });

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
  if (isSupabaseConfigured && supabase) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('routine_blocks')
      .insert([
        {
          label: blockData.label,
          color: blockData.color,
          weekdays: blockData.weekdays,
          start_time: blockData.start_time,
          end_time: blockData.end_time,
          start_date: blockData.start_date || null,
          end_date: blockData.end_date || null,
          user_id: userId,
        },
      ])
      .select('*')
      .single();

    if (error) throw error;
    return data as RoutineBlock;
  }
  throw new Error('Supabase database is not configured.');
}

export async function updateRoutineBlock(id: string, updates: Partial<RoutineBlock>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('routine_blocks').update(updates).eq('id', id);
    if (error) throw error;
  }
}

export async function deleteRoutineBlock(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('routine_blocks').delete().eq('id', id);
    if (error) throw error;
  }
}

// DAILY TASK PLACEMENTS

export async function fetchPlacementsForDate(dateStr: string): Promise<DailyTaskPlacement[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('daily_task_placements')
      .select(`
        *,
        task:tasks(*, topic:topics(*, subject:subjects(*)), subtopic:subtopics(*))
      `)
      .eq('placement_date', dateStr);

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
  if (isSupabaseConfigured && supabase) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('daily_task_placements')
      .upsert(
        [
          {
            user_id: userId,
            task_id: params.taskId,
            placement_date: params.date,
            slot_index: params.slotIndex,
            routine_block_id: params.routineBlockId ?? null,
          },
        ],
        { onConflict: 'user_id,task_id,placement_date' }
      )
      .select('*')
      .single();

    if (error) throw error;
    return data as DailyTaskPlacement;
  }
  throw new Error('Supabase database is not configured.');
}

export async function updatePlacementDuration(id: string, durationSlots: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('daily_task_placements')
      .update({ duration_slots: durationSlots })
      .eq('id', id);
    if (error) throw error;
  }
}

export async function removeTaskPlacement(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('daily_task_placements').delete().eq('id', id);
    if (error) throw error;
  }
}
