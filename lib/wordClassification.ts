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
