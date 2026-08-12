-- =========================================================
-- Newspaper Study Tool: PDFs + Per-Page Read Tracking
-- (Idempotent script - safe to run multiple times)
-- Run this in the StudyHelper Supabase project's SQL Editor.
-- =========================================================

-- 1. Newspaper PDFs (one uploaded/merged PDF, tagged to a date slot)
CREATE TABLE IF NOT EXISTS public.newspaper_pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    page_count INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    week INTEGER CHECK (week BETWEEN 1 AND 4),
    day INTEGER CHECK (day BETWEEN 1 AND 31),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT newspaper_week_xor_day CHECK (
        (week IS NOT NULL AND day IS NULL) OR (week IS NULL AND day IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_newspaper_pdfs_hierarchy ON public.newspaper_pdfs(user_id, year, month);

ALTER TABLE public.newspaper_pdfs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own newspaper pdfs" ON public.newspaper_pdfs;
CREATE POLICY "Users can access their own newspaper pdfs" ON public.newspaper_pdfs
    FOR ALL USING (auth.uid() = user_id);

-- 2. Newspaper Pages (per-page read status + comment)
CREATE TABLE IF NOT EXISTS public.newspaper_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdf_id UUID NOT NULL REFERENCES public.newspaper_pdfs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    comment TEXT,
    UNIQUE (pdf_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_newspaper_pages_pdf ON public.newspaper_pages(pdf_id);

ALTER TABLE public.newspaper_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own newspaper pages" ON public.newspaper_pages;
CREATE POLICY "Users can access their own newspaper pages" ON public.newspaper_pages
    FOR ALL USING (auth.uid() = user_id);
