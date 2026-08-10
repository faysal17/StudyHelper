-- =========================================================
-- Today Page: Routine Blocks + Daily Task Placements
-- (Idempotent script - safe to run multiple times)
-- Run this in the StudyHelper Supabase project's SQL Editor.
-- =========================================================

-- 1. Routine Blocks (recurring weekly schedule definitions)
CREATE TABLE IF NOT EXISTS public.routine_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#f59e0b',
    weekdays TEXT[] NOT NULL DEFAULT '{}',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.routine_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own routine blocks" ON public.routine_blocks;
CREATE POLICY "Users can access their own routine blocks" ON public.routine_blocks
    FOR ALL USING (auth.uid() = user_id);

-- 2. Daily Task Placements (a task dragged onto a specific day + time slot,
--    optionally "filling" a routine block instance for that day)
CREATE TABLE IF NOT EXISTS public.daily_task_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    routine_block_id UUID REFERENCES public.routine_blocks(id) ON DELETE SET NULL,
    placement_date DATE NOT NULL,
    slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 0 AND 47),
    duration_slots INTEGER NOT NULL DEFAULT 1 CHECK (duration_slots BETWEEN 1 AND 48),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, task_id, placement_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_task_placements_date ON public.daily_task_placements(user_id, placement_date);

ALTER TABLE public.daily_task_placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own daily task placements" ON public.daily_task_placements;
CREATE POLICY "Users can access their own daily task placements" ON public.daily_task_placements
    FOR ALL USING (auth.uid() = user_id);
