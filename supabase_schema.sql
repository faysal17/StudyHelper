-- =========================================================
-- BCS / Learning Hub Supabase Database Schema & Storage Setup
-- (Idempotent script - Safe to run multiple times)
-- =========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables with UTF-8 Text Support and Foreign Key Constraints

-- Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subtopics Table (Syllabus Hierarchy Level 3)
CREATE TABLE IF NOT EXISTS public.subtopics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'unstudied' CHECK (status IN ('unstudied', 'in_progress', 'completed')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
    last_reviewed_date DATE,
    current_interval INTEGER DEFAULT 1,
    ease_factor FLOAT DEFAULT 2.5,
    status_color TEXT DEFAULT 'blue' CHECK (status_color IN ('blue', 'red', 'yellow', 'green')),
    next_revision_date DATE DEFAULT CURRENT_DATE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure subtopic_id exists on existing tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE SET NULL;

-- Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Overlays Table (Includes custom Question Label)
CREATE TABLE IF NOT EXISTS public.overlays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    x_coord FLOAT NOT NULL,
    y_coord FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    label TEXT DEFAULT NULL,
    is_currently_failing BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure label column exists for existing deployments
ALTER TABLE public.overlays ADD COLUMN IF NOT EXISTS label TEXT DEFAULT NULL;

-- Revision Logs Table
CREATE TABLE IF NOT EXISTS public.revision_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Focus Sessions Table (Granular Focus Analytics)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    duration_seconds INTEGER NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    xp_earned INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'abandoned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Settings Table (Stores D-Day Target, Focus Stats, Day Cutoff, Quotes, Gamification, Weekend Config, Weekly Ranks & 7-Day Log)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    target_date DATE DEFAULT NULL,
    target_title TEXT DEFAULT NULL,
    day_end_time TEXT DEFAULT '00:00',
    quotes JSONB DEFAULT '["Focus on being productive instead of busy.", "Discipline is choosing between what you want now and what you want most.", "Small daily improvements over time lead to stunning results.", "Success is the sum of small efforts, repeated day in and day out."]'::jsonb,
    weekend_days JSONB DEFAULT '["Saturday", "Sunday"]'::jsonb,
    week_start_day TEXT DEFAULT 'Monday',
    weekday_target_minutes INTEGER DEFAULT 120,
    weekend_target_minutes INTEGER DEFAULT 210,
    weekly_focus_log JSONB DEFAULT '{}'::jsonb,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_study_date DATE DEFAULT NULL,
    stops_today INTEGER DEFAULT 0,
    stops_this_week INTEGER DEFAULT 0,
    last_stop_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    pause_start_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    last_active_date DATE DEFAULT CURRENT_DATE,
    momentum_score INTEGER DEFAULT 0,
    official_weekly_rank INTEGER DEFAULT 500,
    last_week_rank INTEGER DEFAULT 500,
    last_week_start_date DATE DEFAULT NULL,
    focus_seconds_today INTEGER DEFAULT 0,
    focus_seconds_week INTEGER DEFAULT 0,
    current_rank TEXT DEFAULT 'E-Rank',
    current_title TEXT DEFAULT 'Procrastinating Worm',
    show_rank_features BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist for existing deployments
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS day_end_time TEXT DEFAULT '00:00';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS quotes JSONB DEFAULT '["Focus on being productive instead of busy.", "Discipline is choosing between what you want now and what you want most.", "Small daily improvements over time lead to stunning results.", "Success is the sum of small efforts, repeated day in and day out."]'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS weekend_days JSONB DEFAULT '["Saturday", "Sunday"]'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS week_start_day TEXT DEFAULT 'Monday';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS weekday_target_minutes INTEGER DEFAULT 120;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS weekend_target_minutes INTEGER DEFAULT 210;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS weekly_focus_log JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS last_study_date DATE DEFAULT NULL;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS stops_today INTEGER DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS stops_this_week INTEGER DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS last_stop_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS pause_start_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS last_active_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS momentum_score INTEGER DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS official_weekly_rank INTEGER DEFAULT 500;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS last_week_rank INTEGER DEFAULT 500;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS last_week_start_date DATE DEFAULT NULL;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS last_vocab_xp_date DATE DEFAULT NULL;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS show_rank_features BOOLEAN DEFAULT TRUE;

-- Referenced by application code (lib/supabase.ts, lib/types.ts, app/page.tsx)
-- since the weekly-rank feature was added, but never migrated here — every
-- user_settings upsert has been failing with PGRST204 "column not found in
-- schema cache" as a result (AUDIT.md section 6 / milestone M5).
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS show_weekly_rank_modal BOOLEAN DEFAULT FALSE;

-- 3. Enable Row Level Security (RLS) on All Tables

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Owner Access (with DROP IF EXISTS to avoid duplication errors)

DROP POLICY IF EXISTS "Users can access their own subjects" ON public.subjects;
CREATE POLICY "Users can access their own subjects" ON public.subjects
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access their own topics" ON public.topics;
CREATE POLICY "Users can access their own topics" ON public.topics
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access their own subtopics" ON public.subtopics;
CREATE POLICY "Users can access their own subtopics" ON public.subtopics
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access their own tasks" ON public.tasks;
CREATE POLICY "Users can access their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access their own notes" ON public.notes;
CREATE POLICY "Users can access their own notes" ON public.notes
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access their own overlays" ON public.overlays;
CREATE POLICY "Users can access their own overlays" ON public.overlays
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access their own revision logs" ON public.revision_logs;
CREATE POLICY "Users can access their own revision logs" ON public.revision_logs
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage their own focus sessions" ON public.focus_sessions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- 5. Supabase Storage Bucket Policies for 'scanned-notes'
-- Superseded: scanned note images now live in Cloudflare R2 (see lib/r2.ts,
-- app/api/upload, app/api/storage/delete). Left here only in case of rollback.
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('scanned-notes', 'scanned-notes', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- DROP POLICY IF EXISTS "Allow public select on scanned-notes" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated read own scanned-notes" ON storage.objects;
-- CREATE POLICY "Allow authenticated read own scanned-notes" ON storage.objects
--     FOR SELECT USING (bucket_id = 'scanned-notes' AND auth.uid() = owner);
--
-- DROP POLICY IF EXISTS "Allow authenticated insert on scanned-notes" ON storage.objects;
-- CREATE POLICY "Allow authenticated insert on scanned-notes" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'scanned-notes' AND auth.uid() = owner);
--
-- DROP POLICY IF EXISTS "Allow authenticated delete on scanned-notes" ON storage.objects;
-- CREATE POLICY "Allow authenticated delete on scanned-notes" ON storage.objects
--     FOR DELETE USING (bucket_id = 'scanned-notes' AND auth.uid() = owner);

-- 6. Bangla Vocabulary Table (Database Synced Dictionary)
CREATE TABLE IF NOT EXISTS public.bangla_vocab (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT DEFAULT '',
    interval INTEGER DEFAULT 1,
    ease_factor FLOAT DEFAULT 2.5,
    last_reviewed DATE,
    next_review DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bangla_vocab ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own bangla vocab" ON public.bangla_vocab;
CREATE POLICY "Users can manage their own bangla vocab" ON public.bangla_vocab
    FOR ALL USING (auth.uid() = user_id);

