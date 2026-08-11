export type Axis = 'গঠন' | 'অর্থ' | 'উৎপত্তি';

export type ClassificationEntry = {
  word: string;
  axis: Axis;
  subGroup: string;
  originLanguage: string | null;
};

export type ExamQuestion = {
  part: number;
  questionNo: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  source: string | null;
};

export type RevisionItem = { word: string; axis: Axis; label: string };

export type Question = {
  kind: 'forward' | 'reverse' | 'exam';
  axis?: Axis;
  srsWord?: string;
  qLabel: string;
  shown: string;
  correct: string;
  options?: string[];
  datalist?: string[];
};

export const AXIS_SUBGROUPS: Record<Axis, string[]> = {
  'গঠন': ['মৌলিক', 'সাধিত'],
  'অর্থ': ['যৌগিক', 'রূঢ়ি', 'যোগরূঢ়'],
  'উৎপত্তি': ['তৎসম', 'অর্ধ-তৎসম', 'তদ্ভব', 'দেশি', 'বিদেশি', 'মিশ্র'],
};

export type Chapter = {
  key: string;
  label: string;
  axis: Axis;
  entries: ClassificationEntry[];
};

const CHAPTER_CHUNK_SIZE = 16;

// Groups entries by axis + sub-group (and by origin language within বিদেশি,
// since that's the natural "topic" a student studies at once), then splits
// each group into fixed-size chapters so a chapter stays small enough to
// read in one sitting. Grouping first (rather than slicing the flat list)
// keeps a chapter thematically coherent even though বিদেশি entries of
// different languages are interleaved in the source dataset.
export function buildChapters(entries: ClassificationEntry[]): Chapter[] {
  const groups: Record<string, ClassificationEntry[]> = {};
  const groupOrder: string[] = [];

  entries.forEach((e) => {
    const groupKey =
      e.axis === 'উৎপত্তি' && e.subGroup === 'বিদেশি' && e.originLanguage
        ? `${e.axis}:${e.subGroup}:${e.originLanguage}`
        : `${e.axis}:${e.subGroup}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
      groupOrder.push(groupKey);
    }
    groups[groupKey].push(e);
  });

  const chapters: Chapter[] = [];
  groupOrder.forEach((groupKey) => {
    const [axis, subGroup, lang] = groupKey.split(':');
    const baseLabel = lang ? `${subGroup} (${lang})` : subGroup;
    const groupEntries = groups[groupKey];
    const numChunks = Math.ceil(groupEntries.length / CHAPTER_CHUNK_SIZE);

    // Spread entries evenly across chunks instead of slicing at a fixed
    // size, so a group like 18 entries becomes two 9-entry chapters rather
    // than a 16 + a leftover 2. The first `remainder` chunks get one extra
    // entry so all chunk sizes differ by at most one.
    const baseSize = Math.floor(groupEntries.length / numChunks);
    const remainder = groupEntries.length % numChunks;

    let offset = 0;
    for (let i = 0; i < numChunks; i++) {
      const size = baseSize + (i < remainder ? 1 : 0);
      chapters.push({
        key: `${groupKey}:${i}`,
        label: numChunks > 1 ? `${baseLabel} ${i + 1}` : baseLabel,
        axis: axis as Axis,
        entries: groupEntries.slice(offset, offset + size),
      });
      offset += size;
    }
  });

  return chapters;
}
