-- =========================================================
-- Synonym Practice Tool - Supabase Schema
-- (Idempotent script - safe to run multiple times)
-- Run this in the StudyHelper Supabase project's SQL Editor.
-- =========================================================

-- 1. Synonyms dataset (read-only for all authenticated users)
create table if not exists public.synonyms (
  id serial primary key,
  word text not null unique,
  alternatives text[] not null,
  cluster text not null
);

alter table public.synonyms enable row level security;
drop policy if exists "Allow public read access to synonyms" on public.synonyms;
create policy "Allow public read access to synonyms" on public.synonyms
  for select to authenticated, anon using (true);

insert into public.synonyms (word, alternatives, cluster) values
('অন্ধকার', ARRAY['আঁধার','তমসা','তিমির','তমিস্র','তমঃ','আঁধিয়ার'], 'sky_celestial'),
('অন্ন', ARRAY['ভাত','ওদন','কাঞ্জিকা','আমানি','কুঞ্জল','তণ্ডুল'], 'abstract_misc'),
('অশ্রু', ARRAY['বিন্দু','ধারাপাত','মোচন','বর্ষণ','রোধ','নেত্রবারি'], 'body'),
('চুল', ARRAY['অলক','কুন্তল','কেশ','চিকুর','কেশদাম','কবরী'], 'body'),
('জল', ARRAY['অম্বু','জীবন','নীর','পানি','সলিল','বারি','পয়ঃ','উদক','অপ্','তোয়','প্রানদ','ইরা','অম্ভ'], 'water_bodies'),
('জ্যোৎস্না', ARRAY['কৌমুদী','চন্দ্রিমা','চন্দ্রকিরণ','জোছনা','চন্দ্রিকা','চাদিনী'], 'sky_celestial'),
('তীর', ARRAY['কূল','তট','সৈকত','কিনারা','পুলিন','বেলাভূমি','বালুকাবেলা','পাড়'], 'water_bodies'),
('দিন', ARRAY['দিবস','দিবা','দিনমান','অহ্ন','অহঃ','অহন','বাসর','অষ্টপ্রহর'], 'time_fate'),
('দেহ', ARRAY['গাত্র','গা','তনু','শরীর','কায়','কায়া','কলেবর'], 'body'),
('নদী', ARRAY['তটিনী','স্রোতস্বতী','স্রোতস্বিনী','তরঙ্গিনী','প্রবাহিনী','শৈবালিনী','গাঙ','সরিৎ','নির্ঝরিণী','মন্দাকিনী'], 'water_bodies'),
('নর', ARRAY['পুরুষ','মানব','মানুষ','জন','মরদ','মদ','মদ্দা'], 'people_society'),
('নারী', ARRAY['অবলা','কামিনী','মহিলা','স্ত্রীলোক','রমণী','অঙ্গনা','বণিতা','ললনা','কান্তা','জেনানা','বালা'], 'people_society'),
('অশ্ব', ARRAY['তুরগ','তুরঙ্গম','তুরঙ্গ','হয়','বাজী','ঘোড়া','ঘোটক'], 'animals_birds'),
('আকাশ', ARRAY['অম্বর','গগন','নভঃ','ব্যোম','নভোমণ্ডল','অন্তরীক্ষ','শূন্য','ছায়ালোক','দ্যু','আসমান','বিমান','অভ্র'], 'sky_celestial'),
('আগুন', ARRAY['অগ্নি','অনল','পাবক','বহ্নি','হুতাশন','হুতাশ','বিভাবসু','দহন','হোমাগ্নি','বৈশ্বানর','কৃশানু','সর্বভূক','শিখা','হুতভুক','শুচি','পিঙ্গল'], 'elements_nature'),
('আলো', ARRAY['কর','অংশু','দীপ্তি','প্রভা','জ্যোতি','উদ্ভাস','আভা','বিভা','দ্যুতি','ভাতি','উজ্জ্বল্য','জেল্লা','জৌলুস','প্রদীপ্ত','চাকচিক্য','রওশন','নুর','আলোক','রশ্মি','কিরণ'], 'sky_celestial'),
('ইচ্ছা', ARRAY['আগ্রহ','আকাঙ্ক্ষা','অভিপ্রায়','বাসনা','অভিলাষ','সাধ','অভিরুচি','স্পৃহা','কামনা','প্রবৃত্তি','লালসা'], 'abstract_misc'),
('ইলা', ARRAY['পৃথিবী','সরস্বতী','জল','ধেনু','রাণী','বরবধূ'], 'abstract_misc'),
('ঈশ্বর', ARRAY['আল্লাহ্','খোদা','জগদীশ্বর','ধাতা','বিধাতা','ভগবান','সৃষ্টিকর্তা','স্রষ্টা','জগৎপতি','জগদ্বন্ধু','জগন্নাথ','পরমেশ্বর','বিশ্বপতি','পরমাত্মা','ঈশ','প্রজাপতি','বিভু','বিধি'], 'people_society'),
('ঊর্মি', ARRAY['কল্লোল','হিল্লোল','ঢেউ','তরঙ্গ','বীচি','লহরী'], 'water_bodies'),
('ঊষর', ARRAY['অনুর্বর','ক্ষার','নোনতা'], 'elements_nature'),
('ঋজু', ARRAY['সোজা','অকপট','সরল','অবক্র','সহজ'], 'abstract_misc'),
('বৃক্ষ', ARRAY['অটবী','বিটপী','গাছ','পল্লবী','তরু','দ্রুম','শাখী','পাদপ','মহীরুহ','উদ্ভিদ','পর্ণী'], 'elements_nature'),
('মেঘ', ARRAY['ঘন','বারিদ','জলদ','জলধর','জীমূত','অম্বুদ','তোয়দ','পয়োধর','নীরদ','পয়োদ','বলাহক','তোয়ধর','অভ্র','কাদম্বিনী'], 'water_bodies'),
('মৃত্যু', ARRAY['ইন্তেকাল','ইহলীলা সংবরণ','ভাবলীলা সাঙ্গ','ইহলোক ত্যাগ','চিরবিদায়','জান্নাতবাসী হওয়া','দেহত্যাগ','পঞ্চত্বপ্রাপ্তি','পরলোকগমন','লোকান্তর গমন','স্বর্গলাভ','বিনাশ','নিধন','মহাপ্রস্থান'], 'time_fate'),
('ময়ূর', ARRAY['কেকা','শিখণ্ডী','শিখী','কলাপী','বহী','বর্হিন'], 'animals_birds'),
('যুদ্ধ', ARRAY['সমর','আহব','রণ','সংগ্রাম','লড়াই','বিগ্রহ','জঙ্গ','দ্বন্দ্ব'], 'people_society'),
('রাত', ARRAY['অমানিশা','নিশি','রাত্র','রজনী','যামিনী','শর্বরী','বিভাবরী','নিশীথিনী','ক্ষণদা','ত্রিযামা','নিশা'], 'time_fate'),
('রাজা', ARRAY['নৃপতি','নরপতি','ভূপতি','নরেশ','ভূপাল','মহীপাল','দণ্ডধর','নরেন্দ্র','ক্ষিতীশ','অধিপতি','প্রজানাথ','মহীশ','রাজেন্দ্র','রাজশেখর'], 'people_society'),
('শত্রু', ARRAY['অরি','বৈরী','রিপু','অরাতি','প্রতিপক্ষ','বিপক্ষ','দুশমন','বিদ্বেষী'], 'people_society'),
('পাখি', ARRAY['বিহঙ্গ','বিহগ','খেচর','পক্ষী','খগ','শকুন্ত','বিহঙ্গম','দ্বিজ','চিড়িয়া'], 'animals_birds'),
('পর্বত', ARRAY['অচল','অদ্রি','গিরি','পাহাড়','ভূধর','শৈল','শৃঙ্গী','শিখরী','মহীধর','শৃঙ্গধর','মহেন্দ্র'], 'elements_nature'),
('পৃথিবী', ARRAY['অবনী','ধরা','ধরণী','ধরিত্রী','বসুন্ধরা','ভূ','মেদিনী','বসুমতী','অখিল','ভূলোক','ঊর্ধ্ব','ক্ষিতি','ভূমণ্ডল','মর্ত্য','ভুবন'], 'elements_nature'),
('পদ্ম', ARRAY['পঙ্কজ','সরোজ','সরসিজ','কমল','নলিন','উৎপল','শতদল','কুবলয়','তামরস','অরবিন্দ','সরোরুহ','ইন্দীবর','কোবনদ','কুমুদ','পুষ্কর','রাজীব','কৈরব','নীরজ'], 'elements_nature'),
('পুত্র', ARRAY['ছেলে','তনয়','নন্দন','সুত','দুলাল','আত্মজ','অঙ্গজ','সূনু','দারক'], 'people_society'),
('বাতাস', ARRAY['বায়ু','হাওয়া','পবন','সমীর','সমীরণ','অনিল','মরুৎ','প্রভঞ্জন','বাত'], 'elements_nature'),
('বিদ্যুৎ', ARRAY['তড়িৎ','চপলা','অশনি','ক্ষণপ্রভা','অনুপ্রভা','সৌদামিনী','দামিনী','বিজলি','শম্পা','চঞ্চলা'], 'sky_celestial'),
('কাক', ARRAY['অলিভুক','কানুক','বায়স','পরভৃৎ'], 'animals_birds'),
('কোকিল', ARRAY['পরভূত','পিক','অন্যপুষ্ট','পরপুষ্ট','কলকণ্ঠ','বসন্তদূত','মধুসখা','মধুস্বর'], 'animals_birds'),
('কন্যা', ARRAY['মেয়ে','নন্দিনী','তনয়া','দুহিতা','আত্মজা','দুলালী','পুত্রী','কুমারী','কনে','ঝি','স্বজা','তনুকা','ঝিয়ারি'], 'people_society'),
('চোখ', ARRAY['অক্ষি','চক্ষু','নয়ন','নেত্র','লোচন','আঁখি','দৃক','ঈক্ষণ','দৃষ্টি'], 'body'),
('চাঁদ', ARRAY['চন্দ্র','নিশাকর','বিধু','শশধর','শশাঙ্ক','সুধাংশু','হিমাংশু','সুধাকর','সোম','শীতাংশু','সুধানিধি','ইন্দু','নিশাপতি','দ্বিজরাজ','কলাধর','কলাভৃৎ','মৃগাঙ্ক','রজনীকান্ত','রাকেশ','কলানিধি'], 'sky_celestial'),
('সমুদ্র', ARRAY['অর্ণব','জলধি','জলনিধি','পারাবার','বারিধি','রত্নাকর','সাগর','সিন্ধু','নীলাম্বু','অম্বুধি','পায়োধি','বারীশ','পয়োনিধি','বারীন্দ্র','অম্বুনিধি','উদধি'], 'water_bodies'),
('সূর্য', ARRAY['আদিত্য','তপন','দিবাকর','ভাস্কর','ভানু','মার্তণ্ড','রবি','সবিতা','অর্ক','মিহির','পুষা','বিবস্বান','সূর','দিনপতি','বালার্ক','প্রভাকর','অরুণ','দিনমণি','কিরণমালী'], 'sky_celestial')
on conflict (word) do nothing;

-- 2. Quiz attempts (per-session score log)
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  mode text not null,
  score integer not null,
  total_questions integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quiz_attempts enable row level security;
drop policy if exists "Users can view their own attempts" on public.quiz_attempts;
create policy "Users can view their own attempts" on public.quiz_attempts
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own attempts" on public.quiz_attempts;
create policy "Users can insert their own attempts" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

-- 3. Incorrect answers (revision list source)
create table if not exists public.incorrect_answers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  attempt_id uuid references public.quiz_attempts on delete cascade not null,
  shown_synonym text not null,
  correct_word text not null,
  user_provided_word text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.incorrect_answers enable row level security;
drop policy if exists "Users can view their own incorrect answers" on public.incorrect_answers;
create policy "Users can view their own incorrect answers" on public.incorrect_answers
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own incorrect answers" on public.incorrect_answers;
create policy "Users can insert their own incorrect answers" on public.incorrect_answers
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own incorrect answers" on public.incorrect_answers;
create policy "Users can delete their own incorrect answers" on public.incorrect_answers
  for delete using (auth.uid() = user_id);

-- 4. Completed chapters (chunk-mode mastery tracking)
create table if not exists public.user_completed_chunks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  chunk_index integer not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, chunk_index)
);

alter table public.user_completed_chunks enable row level security;
drop policy if exists "Users can view their own completed chapters" on public.user_completed_chunks;
create policy "Users can view their own completed chapters" on public.user_completed_chunks
  for select using (auth.uid() = user_id);
drop policy if exists "Users can record their own completed chapters" on public.user_completed_chunks;
create policy "Users can record their own completed chapters" on public.user_completed_chunks
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own completed chapters" on public.user_completed_chunks;
create policy "Users can delete their own completed chapters" on public.user_completed_chunks
  for delete using (auth.uid() = user_id);
drop policy if exists "Users can update their own completed chapters" on public.user_completed_chunks;
create policy "Users can update their own completed chapters" on public.user_completed_chunks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Per-synonym spaced repetition scheduling
create table if not exists public.user_synonym_srs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  word text not null,
  synonym text not null,
  box integer default 0 not null,
  interval_days integer default 0 not null,
  next_review_at timestamp with time zone default now() not null,
  last_reviewed_at timestamp with time zone,
  unique (user_id, word, synonym)
);

alter table public.user_synonym_srs enable row level security;
drop policy if exists "Users can view their own synonym srs records" on public.user_synonym_srs;
create policy "Users can view their own synonym srs records" on public.user_synonym_srs
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own synonym srs records" on public.user_synonym_srs;
create policy "Users can insert their own synonym srs records" on public.user_synonym_srs
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own synonym srs records" on public.user_synonym_srs;
create policy "Users can update their own synonym srs records" on public.user_synonym_srs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
