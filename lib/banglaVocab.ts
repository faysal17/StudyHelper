import { isSupabaseConfigured, supabase } from './supabase';

const DEFAULT_USER_ID = 'user-owner';

export interface BanglaWord {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  interval: number; // in days
  ease_factor: number;
  last_reviewed?: string;
  next_review: string;
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'bcs_bangla_vocab_list';

// Default Starter Words (Empty by default)
const DEFAULT_WORDS: BanglaWord[] = [];

// Async DB Fetch: Fetch from Supabase Database
export async function fetchBanglaWordsDB(): Promise<BanglaWord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bangla_vocab')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const formatted: BanglaWord[] = data.map((d: any) => ({
          id: d.id,
          word: d.word,
          meaning: d.meaning,
          example: d.example || '',
          interval: d.interval || 1,
          ease_factor: d.ease_factor || 2.5,
          last_reviewed: d.last_reviewed || undefined,
          next_review: d.next_review || new Date().toISOString().split('T')[0],
          created_at: d.created_at,
        }));
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formatted));
        }
        return formatted;
      }
    } catch (err) {
      console.error('Error fetching bangla vocab from DB:', err);
    }
  }

  // Local Storage Fallback
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {}
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_WORDS));
  }
  return DEFAULT_WORDS;
}

// DB Insert: Save Single Word to Database
export async function addBanglaWordDB(wordData: Omit<BanglaWord, 'id' | 'created_at'>): Promise<BanglaWord> {
  const today = new Date().toISOString().split('T')[0];
  const newWordObj: BanglaWord = {
    id: `bv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...wordData,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || DEFAULT_USER_ID;

      const { data, error } = await supabase
        .from('bangla_vocab')
        .insert([
          {
            user_id: userId,
            word: wordData.word,
            meaning: wordData.meaning,
            example: wordData.example || '',
            interval: wordData.interval || 1,
            ease_factor: wordData.ease_factor || 2.5,
            next_review: wordData.next_review || today,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        newWordObj.id = data.id;
      }
    } catch (err) {
      console.error('Error adding bangla word to DB:', err);
    }
  }

  return newWordObj;
}

// DB Update: Update Spaced Repetition Stats in Database
export async function updateBanglaWordDB(word: BanglaWord): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('bangla_vocab')
        .update({
          interval: word.interval,
          ease_factor: word.ease_factor,
          last_reviewed: word.last_reviewed,
          next_review: word.next_review,
        })
        .eq('id', word.id);
    } catch (err) {
      console.error('Error updating bangla word in DB:', err);
    }
  }
}

// DB Delete: Delete Word from Database
export async function deleteBanglaWordDB(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('bangla_vocab').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting bangla word from DB:', err);
    }
  }
}

// DB Bulk Import: Batch Insert CSV Imported Words into Database
export async function importBanglaWordsDB(words: Omit<BanglaWord, 'id' | 'created_at'>[]): Promise<BanglaWord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || DEFAULT_USER_ID;

      const recordsToInsert = words.map((w) => ({
        user_id: userId,
        word: w.word,
        meaning: w.meaning,
        example: w.example || '',
        interval: w.interval || 1,
        ease_factor: w.ease_factor || 2.5,
        next_review: w.next_review || new Date().toISOString().split('T')[0],
      }));

      const { data, error } = await supabase.from('bangla_vocab').insert(recordsToInsert).select();
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          word: d.word,
          meaning: d.meaning,
          example: d.example || '',
          interval: d.interval,
          ease_factor: d.ease_factor,
          last_reviewed: d.last_reviewed,
          next_review: d.next_review,
          created_at: d.created_at,
        }));
      }
    } catch (err) {
      console.error('Error bulk importing bangla words to DB:', err);
    }
  }

  return words.map((w) => ({
    id: `bv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...w,
    created_at: new Date().toISOString(),
  }));
}

export function parseBanglaCSV(csvText: string): Omit<BanglaWord, 'id' | 'created_at'>[] {
  const lines = csvText.split(/\r?\n/);
  const newWords: Omit<BanglaWord, 'id' | 'created_at'>[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (i === 0 && (line.toLowerCase().includes('word') || line.toLowerCase().includes('meaning'))) {
      continue;
    }

    const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length >= 2 && parts[0] && parts[1]) {
      newWords.push({
        word: parts[0],
        meaning: parts[1],
        example: parts[2] || '',
        interval: 1,
        ease_factor: 2.5,
        next_review: today,
      });
    }
  }

  return newWords;
}

// Clean CSV Export containing only Word, Meaning, Example (no internal application intervals or dates)
export function exportBanglaCSV(words: BanglaWord[]): string {
  const headers = 'Word,Meaning,Example\n';
  const rows = words
    .map(
      (w) =>
        `"${w.word.replace(/"/g, '""')}","${w.meaning.replace(/"/g, '""')}","${(w.example || '').replace(/"/g, '""')}"`
    )
    .join('\n');
  return headers + rows;
}

export function getSampleBanglaCSV(): string {
  return `Word,Meaning,Example
"অনুধাবন","উপলব্ধি / বোধগম্যতা (Comprehension)","বিষয়টি গভীর অনুধাবন প্রয়োজন।"
"প্রাজ্ঞ","বিজ্ঞ / পণ্ডিত (Wise / Scholar)","তিনি একজন প্রাজ্ঞ ব্যক্তিত্ব।"
"জিজিবিষা","বেঁচে থাকার ইচ্ছা (Will to live)","মানুষের জিজিবিষা চিরন্তন।"`;
}
