import {
  isSupabaseConfigured,
  getCurrentUserId,
  fetchBanglaVocabRows,
  deleteBanglaVocabRowsByIds,
  insertBanglaVocabRow,
  updateBanglaVocabRow,
  deleteBanglaVocabRow,
  insertBanglaVocabRows,
  deleteBanglaVocabRowsByUserId,
} from './supabase';

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

const LEGACY_IDS = new Set(['bv-1', 'bv-2', 'bv-3', 'bv-4', 'bv-5']);

// Async DB Fetch: Fetch strictly from Supabase Database
export async function fetchBanglaWordsDB(): Promise<BanglaWord[]> {
  // Purge legacy local storage cache if present
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bcs_bangla_vocab_list');
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await fetchBanglaVocabRows();

      if (!error && data) {
        const formatted: BanglaWord[] = data
          .filter((d: any) => !LEGACY_IDS.has(d.id))
          .map((d: any) => ({
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

        // Delete legacy predefined words from Supabase DB if present
        const legacyItems = data.filter((d: any) => LEGACY_IDS.has(d.id));
        if (legacyItems.length > 0) {
          await deleteBanglaVocabRowsByIds(legacyItems.map((d: any) => d.id));
        }

        return formatted;
      }
    } catch (err) {
      console.error('Error fetching bangla vocab from DB:', err);
    }
  }

  return [];
}

// DB Insert: Save Single Word to Database
export async function addBanglaWordDB(wordData: Omit<BanglaWord, 'id' | 'created_at'>): Promise<BanglaWord> {
  const today = new Date().toISOString().split('T')[0];

  if (!isSupabaseConfigured) {
    return {
      id: `bv-${Date.now()}`,
      ...wordData,
      created_at: new Date().toISOString(),
    };
  }

  const userId = await getCurrentUserId();
  const { data, error } = await insertBanglaVocabRow({
    user_id: userId,
    word: wordData.word,
    meaning: wordData.meaning,
    example: wordData.example || '',
    interval: wordData.interval || 1,
    ease_factor: wordData.ease_factor || 2.5,
    next_review: wordData.next_review || today,
  });

  if (error) throw error;

  return {
    id: data.id,
    word: data.word,
    meaning: data.meaning,
    example: data.example || '',
    interval: data.interval || 1,
    ease_factor: data.ease_factor || 2.5,
    last_reviewed: data.last_reviewed || undefined,
    next_review: data.next_review || today,
    created_at: data.created_at,
  };
}

// DB Update: Update Spaced Repetition Stats in Database
export async function updateBanglaWordDB(word: BanglaWord): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await updateBanglaVocabRow(word.id, {
        interval: word.interval,
        ease_factor: word.ease_factor,
        last_reviewed: word.last_reviewed,
        next_review: word.next_review,
      });
    } catch (err) {
      console.error('Error updating bangla word in DB:', err);
    }
  }
}

// DB Delete: Delete Word from Database
export async function deleteBanglaWordDB(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await deleteBanglaVocabRow(id);
    } catch (err) {
      console.error('Error deleting bangla word from DB:', err);
    }
  }
}

// DB Bulk Import: Batch Insert CSV Imported Words into Database
export async function importBanglaWordsDB(words: Omit<BanglaWord, 'id' | 'created_at'>[]): Promise<BanglaWord[]> {
  if (isSupabaseConfigured) {
    try {
      const userId = await getCurrentUserId();

      const recordsToInsert = words.map((w) => ({
        user_id: userId,
        word: w.word,
        meaning: w.meaning,
        example: w.example || '',
        interval: w.interval || 1,
        ease_factor: w.ease_factor || 2.5,
        next_review: w.next_review || new Date().toISOString().split('T')[0],
      }));

      const { data, error } = await insertBanglaVocabRows(recordsToInsert);
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

  return [];
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

// DB Clear: Wipe all words from database
export async function clearAllBanglaWordsDB(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const userId = await getCurrentUserId();
      await deleteBanglaVocabRowsByUserId(userId);
    } catch (err) {
      console.error('Error clearing bangla words from DB:', err);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('bcs_bangla_vocab_list');
  }
}
