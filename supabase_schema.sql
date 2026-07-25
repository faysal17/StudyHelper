-- =========================================================
-- BCS StudyHelper Supabase Database Schema & Storage Setup
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

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
    last_reviewed_date DATE,
    current_interval INTEGER DEFAULT 1,
    ease_factor FLOAT DEFAULT 2.5,
    status_color TEXT DEFAULT 'blue' CHECK (status_color IN ('blue', 'red', 'yellow', 'green')),
    next_revision_date DATE DEFAULT CURRENT_DATE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Overlays Table
CREATE TABLE IF NOT EXISTS public.overlays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    x_coord FLOAT NOT NULL,
    y_coord FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    is_currently_failing BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Revision Logs Table
CREATE TABLE IF NOT EXISTS public.revision_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Enable Row Level Security (RLS) on All Tables

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Owner Access

-- Subjects Policies
CREATE POLICY "Users can access their own subjects" ON public.subjects
    FOR ALL USING (auth.uid() = user_id);

-- Topics Policies
CREATE POLICY "Users can access their own topics" ON public.topics
    FOR ALL USING (auth.uid() = user_id);

-- Tasks Policies
CREATE POLICY "Users can access their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

-- Notes Policies
CREATE POLICY "Users can access their own notes" ON public.notes
    FOR ALL USING (auth.uid() = user_id);

-- Overlays Policies
CREATE POLICY "Users can access their own overlays" ON public.overlays
    FOR ALL USING (auth.uid() = user_id);

-- Revision Logs Policies
CREATE POLICY "Users can access their own revision logs" ON public.revision_logs
    FOR ALL USING (auth.uid() = user_id);

-- 5. Supabase Storage Bucket Policies for 'scanned-notes'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('scanned-notes', 'scanned-notes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public select on scanned-notes" ON storage.objects
    FOR SELECT USING (bucket_id = 'scanned-notes');

CREATE POLICY "Allow authenticated insert on scanned-notes" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'scanned-notes' AND auth.uid() = owner);

CREATE POLICY "Allow authenticated delete on scanned-notes" ON storage.objects
    FOR DELETE USING (bucket_id = 'scanned-notes' AND auth.uid() = owner);
