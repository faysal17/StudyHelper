'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import Dashboard from '@/components/classification/Dashboard';
import QuizSetup from '@/components/classification/QuizSetup';
import QuizActive from '@/components/classification/QuizActive';
import QuizSummary from '@/components/classification/QuizSummary';
import { AXIS_SUBGROUPS, type Axis, type ClassificationEntry, type ExamQuestion, type RevisionItem, type Question } from '@/lib/wordClassification';
import '../synonym-practice/synonym.css';

type ClassificationUpdate = { word: string; axis: Axis; isCorrect: boolean };
type ResultEntry = {
  kind: 'forward' | 'reverse' | 'exam';
  qLabel: string;
  shown: string;
  correct: string;
  chosen: string;
  wasCorrect: boolean;
  update: ClassificationUpdate | null;
};

const LANG_FAMILY: Record<string, string> = {
  'আরবি': 'middle_east', 'ফারসি': 'middle_east', 'তুর্কি': 'middle_east', 'পশতু': 'middle_east',
  'হিন্দি': 'south_asian', 'গুজরাটি': 'south_asian', 'পাঞ্জাবি': 'south_asian', 'তামিল': 'south_asian', 'সিংহলি': 'south_asian',
  'পর্তুগিজ': 'european', 'ফরাসি': 'european', 'ইংরেজি': 'european', 'ওলন্দাজ': 'european', 'জার্মান': 'european', 'ইতালিয়ান': 'european', 'রুশ': 'european', 'গ্রিক': 'european',
  'চিনা': 'east_asian', 'জাপানি': 'east_asian', 'বর্মী': 'east_asian',
};

export default function WordClassificationPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [entries, setEntries] = useState<ClassificationEntry[]>([]);
  const [examBank, setExamBank] = useState<ExamQuestion[]>([]);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(false);
  const [view, setView] = useState<'dashboard' | 'setup' | 'quiz' | 'summary'>('dashboard');
  const [userInfo, setUserInfo] = useState<{ email?: string | null; user_metadata?: { full_name?: string } } | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [questionWasCorrect, setQuestionWasCorrect] = useState(false);
  const [userAnswerValue, setUserAnswerValue] = useState('');
  const [sessionResults, setSessionResults] = useState<ResultEntry[]>([]);
  const [sessionMode, setSessionMode] = useState('normal');
  const [sessionSelectedChunks, setSessionSelectedChunks] = useState<string[]>([]);
  const [sessionAnswerMode, setSessionAnswerMode] = useState<'write' | 'mcq'>('write');

  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          router.push('/login');
          return;
        }
        setUserInfo({ email: data.session.user.email, user_metadata: data.session.user.user_metadata });
      } else if (typeof window !== 'undefined') {
        const storedSession = localStorage.getItem('studyhub_user_session');
        if (!storedSession) {
          router.push('/login');
          return;
        }
        setUserInfo(JSON.parse(storedSession));
      }
      setCheckingAuth(false);
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checkingAuth && userInfo) {
      fetchEntries();
      fetchExamBank();
      fetchCompletedChapters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth, userInfo]);

  const fetchEntries = async () => {
    try {
      setLoadingData(true);
      if (!isSupabaseConfigured || !supabase) return;

      const { data, error } = await supabase
        .from('word_classifications')
        .select('word, axis, sub_group, origin_language')
        .order('id', { ascending: true });

      if (error) throw error;

      const formatted: ClassificationEntry[] = (data || []).map((item: any) => ({
        word: item.word,
        axis: item.axis,
        subGroup: item.sub_group,
        originLanguage: item.origin_language,
      }));
      setEntries(formatted);
    } catch (err) {
      console.error('Error fetching word classification dataset:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchExamBank = async () => {
    try {
      if (!isSupabaseConfigured || !supabase) return;
      const { data, error } = await supabase
        .from('classification_exam_questions')
        .select('part, question_no, prompt, option_a, option_b, option_c, option_d, correct_index, source');

      if (error) throw error;

      const formatted: ExamQuestion[] = (data || []).map((item: any) => ({
        part: item.part,
        questionNo: item.question_no,
        prompt: item.prompt,
        options: [item.option_a, item.option_b, item.option_c, item.option_d],
        correctIndex: item.correct_index,
        source: item.source,
      }));
      setExamBank(formatted);
    } catch (err) {
      console.error('Error fetching exam question bank:', err);
    }
  };

  const fetchCompletedChapters = async () => {
    try {
      if (!isSupabaseConfigured || !supabase) return;
      const { data, error } = await supabase.from('user_completed_classification_chunks').select('chunk_key');

      if (error) throw error;

      const keys = new Set<string>((data || []).map((item: any) => item.chunk_key));
      setCompletedChapters(keys);
    } catch (err) {
      console.error('Error fetching completed classification chapters:', err);
    }
  };

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const buildForwardQuestion = (fact: ClassificationEntry, mcq: boolean): Question => {
    const pool = AXIS_SUBGROUPS[fact.axis];
    const correct = fact.subGroup;
    let options: string[] | undefined;
    if (mcq) {
      const distractors = shuffle(pool.filter((s) => s !== correct)).slice(0, 3);
      options = shuffle([correct, ...distractors]);
    }
    return {
      kind: 'forward',
      axis: fact.axis,
      srsWord: fact.word,
      qLabel: `'${fact.word}' কোন শ্রেণির শব্দ?`,
      shown: fact.word,
      correct,
      options,
      datalist: pool,
    };
  };

  const buildForwardLanguageQuestion = (fact: ClassificationEntry, allLanguages: string[], mcq: boolean): Question => {
    const correct = fact.originLanguage!;
    let options: string[] | undefined;
    if (mcq) {
      const rest = allLanguages.filter((l) => l !== correct);
      const sameFamily = shuffle(rest.filter((l) => LANG_FAMILY[l] === LANG_FAMILY[correct]));
      const other = shuffle(rest.filter((l) => LANG_FAMILY[l] !== LANG_FAMILY[correct]));
      const distractors = [...sameFamily, ...other].slice(0, 3);
      options = shuffle([correct, ...distractors]);
    }
    return {
      kind: 'forward',
      axis: 'উৎপত্তি',
      srsWord: fact.word,
      qLabel: `'${fact.word}' শব্দটি কোন ভাষা থেকে এসেছে?`,
      shown: fact.word,
      correct,
      options,
      datalist: allLanguages,
    };
  };

  const buildReverseQuestion = (
    fact: ClassificationEntry,
    targetLabel: string,
    allEntries: ClassificationEntry[],
    wantNegate: boolean,
    isLanguage: boolean
  ): Question => {
    // Distractors must stay within the same axis — e.g. a যৌগিক/রূঢ়ি/যোগরূঢ়
    // (অর্থ axis) question should never pull তদ্ভব/দেশি (উৎপত্তি axis) words
    // as wrong options, even though their subGroup/language legitimately
    // differs from targetLabel. For a language question, further narrow to
    // বিদেশি words only — a তৎসম/তদ্ভব/দেশি word isn't a genuine "which
    // language" distractor, it's just obviously non-foreign.
    const axisPool = allEntries.filter((e) => e.axis === fact.axis && (!isLanguage || e.subGroup === 'বিদেশি'));
    const isMatch = (e: ClassificationEntry) =>
      isLanguage ? e.originLanguage === targetLabel : e.subGroup === targetLabel;

    const matchingOthers = axisPool.filter((e) => e.word !== fact.word && isMatch(e));
    const nonMatching = axisPool.filter((e) => e.word !== fact.word && !isMatch(e));
    const negate = wantNegate && matchingOthers.length >= 2 && nonMatching.length > 0;

    if (negate) {
      const correctEntry = pickRandom(nonMatching);
      const fillers = shuffle(matchingOthers).slice(0, 2).map((e) => e.word);
      const options = shuffle([correctEntry.word, fact.word, ...fillers]);
      return {
        kind: 'reverse',
        axis: fact.axis,
        srsWord: fact.word,
        qLabel: `কোনটি ${targetLabel} শব্দ নয়?`,
        shown: targetLabel,
        correct: correctEntry.word,
        options,
      };
    }

    const distractors = shuffle(nonMatching).slice(0, 3).map((e) => e.word);
    const options = shuffle([fact.word, ...distractors]);
    return {
      kind: 'reverse',
      axis: fact.axis,
      srsWord: fact.word,
      qLabel: `কোনটি ${targetLabel} শব্দ?`,
      shown: targetLabel,
      correct: fact.word,
      options,
    };
  };

  const buildFactQuestion = (
    fact: ClassificationEntry,
    allEntries: ClassificationEntry[],
    allLanguages: string[],
    isMCQ: boolean,
    subGroupVariety: Record<Axis, number>
  ): Question | null => {
    // গঠন axis only has 4 words each in মৌলিক/সাধিত, so generated questions
    // (e.g. "কোনটি সাধিত শব্দ?" with just the 3 other pool words as options)
    // are low quality. Real BCS exam questions cover this axis instead.
    if (fact.axis === 'গঠন') return null;

    if (fact.axis === 'অর্থ') {
      if (isMCQ) {
        return buildReverseQuestion(fact, fact.subGroup, allEntries, Math.random() < 0.25, false);
      }
      return buildForwardQuestion(fact, false);
    }

    // উৎপত্তি axis: if every fact in this session is বিদেশি (e.g. a
    // chapter-wise session built entirely from বিদেশি chapters), "which
    // class is this word?" is already known from the selection itself — so
    // always ask the origin-language question instead, which is the actual
    // non-trivial thing to test for these words.
    const subGroupObvious = subGroupVariety[fact.axis] <= 1;
    const askLanguage = fact.subGroup === 'বিদেশি' && (subGroupObvious || Math.random() < 0.5);

    if (askLanguage) {
      if (isMCQ) {
        return Math.random() < 0.5
          ? buildForwardLanguageQuestion(fact, allLanguages, true)
          : buildReverseQuestion(fact, fact.originLanguage!, allEntries, Math.random() < 0.25, true);
      }
      return buildForwardLanguageQuestion(fact, allLanguages, false);
    }

    if (isMCQ) {
      return Math.random() < 0.5
        ? buildForwardQuestion(fact, true)
        : buildReverseQuestion(fact, fact.subGroup, allEntries, Math.random() < 0.25, false);
    }
    return buildForwardQuestion(fact, false);
  };

  const buildSessionQuestions = (
    pool: ClassificationEntry[],
    count: number,
    allEntries: ClassificationEntry[],
    bank: ExamQuestion[],
    answerMode: string,
    sessionMode: string
  ): Question[] => {
    const isMCQ = answerMode === 'mcq';
    const allLanguages = Array.from(new Set(allEntries.filter((e) => e.originLanguage).map((e) => e.originLanguage as string)));

    // গঠন-axis facts never produce a generated question (see buildFactQuestion).
    // In normal (non-chapter) sessions that just means falling back to real
    // exam questions when the pool is entirely গঠন facts. Chapter-wise
    // sessions never mix in exam-bank questions at all — a chapter should
    // only ever quiz its own words — and গঠন chapters are disabled from
    // selection in the UI for exactly this reason.
    const generatablePool = pool.filter((f) => f.axis !== 'গঠন');
    const onlyGothonPool = pool.length > 0 && generatablePool.length === 0;

    const examCount =
      sessionMode === 'chapter'
        ? 0
        : onlyGothonPool
          ? Math.min(bank.length, count)
          : isMCQ
            ? Math.min(bank.length, Math.round(count * 0.2))
            : 0;
    const generatedCount = count - examCount;

    let picked: ClassificationEntry[] = [];
    if (generatedCount <= generatablePool.length) {
      picked = shuffle(generatablePool).slice(0, generatedCount);
    } else if (generatablePool.length > 0) {
      while (picked.length < generatedCount) {
        let batch = shuffle(generatablePool);
        if (picked.length > 0 && batch[0].word === picked[picked.length - 1].word && batch.length > 1) {
          [batch[0], batch[1]] = [batch[1], batch[0]];
        }
        picked = picked.concat(batch);
      }
      picked = picked.slice(0, generatedCount);
    }

    const subGroupVariety: Record<Axis, number> = { 'গঠন': 0, 'অর্থ': 0, 'উৎপত্তি': 0 };
    (['গঠন', 'অর্থ', 'উৎপত্তি'] as Axis[]).forEach((axis) => {
      subGroupVariety[axis] = new Set(pool.filter((e) => e.axis === axis).map((e) => e.subGroup)).size;
    });

    const generatedQuestions = picked
      .map((fact) => buildFactQuestion(fact, allEntries, allLanguages, isMCQ, subGroupVariety))
      .filter((q): q is Question => q !== null);

    const examQuestions: Question[] = shuffle(bank)
      .slice(0, examCount)
      .map((eq) => ({
        kind: 'exam' as const,
        qLabel: 'BCS প্রশ্নব্যাংক প্রশ্ন',
        shown: eq.prompt,
        correct: eq.options[eq.correctIndex],
        options: shuffle(eq.options),
        datalist: eq.options,
      }));

    return shuffle([...generatedQuestions, ...examQuestions]);
  };

  const handleStartSession = async (
    mode: string,
    pool: ClassificationEntry[],
    size: number,
    selectedChunkKeys: string[],
    answerMode: string
  ) => {
    try {
      setLoadingData(true);
      if (!isSupabaseConfigured || !supabase) return;

      // Fetch all of this user's SRS records (RLS already scopes it to auth.uid()) —
      // a poolWords .in() filter here can exceed URL length limits once the dataset
      // grows past a few hundred words.
      const { data: srsRecords, error } = await supabase
        .from('user_classification_srs')
        .select('word, axis, box, next_review_at');

      if (error) throw error;

      const srsByKey: Record<string, { box: number; nextReviewAt: Date }> = {};
      (srsRecords || []).forEach((r: any) => {
        srsByKey[`${r.word} ${r.axis}`] = { box: r.box, nextReviewAt: new Date(r.next_review_at) };
      });

      const now = new Date();
      const cat1: ClassificationEntry[] = [];
      const cat2: ClassificationEntry[] = [];
      const cat3: ClassificationEntry[] = [];

      pool.forEach((fact) => {
        const record = srsByKey[`${fact.word} ${fact.axis}`];
        if (!record || record.box === 0 || record.nextReviewAt <= now) {
          cat1.push(fact);
        } else if (record.box === 5) {
          cat3.push(fact);
        } else {
          cat2.push(fact);
        }
      });

      const prioritizedPool = [...shuffle(cat1), ...shuffle(cat2), ...shuffle(cat3)];
      const questions = buildSessionQuestions(prioritizedPool, size, entries, examBank, answerMode, mode);

      setQuizQuestions(questions);
      setCurrentQuestion(0);
      setQuizScore(0);
      setQuestionAnswered(false);
      setQuestionWasCorrect(false);
      setUserAnswerValue('');
      setSessionResults([]);
      setSessionMode(mode);
      setSessionSelectedChunks(selectedChunkKeys);
      setSessionAnswerMode(answerMode as 'write' | 'mcq');

      setView('quiz');
    } catch (err) {
      console.error('Error starting classification session:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleStartReview = (answerMode: 'write' | 'mcq', reviewList: RevisionItem[]) => {
    const pool: ClassificationEntry[] = reviewList
      .map((item) => entries.find((e) => e.word === item.word && e.axis === item.axis))
      .filter((e): e is ClassificationEntry => Boolean(e));
    handleStartSession('normal', pool, pool.length, [], answerMode);
  };

  const handleAnswerQuestion = (skip: boolean, answer: string) => {
    if (questionAnswered) return;

    const q = quizQuestions[currentQuestion];
    const cleanAnswer = answer.trim();
    const isCorrect = !skip && cleanAnswer === q.correct;

    setQuestionAnswered(true);
    setQuestionWasCorrect(isCorrect);
    setUserAnswerValue(skip ? 'জানি না' : cleanAnswer || '(ফাঁকা রাখা হয়েছিল)');

    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }

    const update: ClassificationUpdate | null =
      q.kind !== 'exam' && q.axis && q.srsWord ? { word: q.srsWord, axis: q.axis, isCorrect } : null;

    const resultObj: ResultEntry = {
      kind: q.kind,
      qLabel: q.qLabel,
      shown: q.shown,
      correct: q.correct,
      chosen: skip ? 'জানি না' : cleanAnswer || '(ফাঁকা রাখা হয়েছিল)',
      wasCorrect: isCorrect,
      update,
    };

    setSessionResults((prev) => [...prev, resultObj]);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setQuestionAnswered(false);
      setQuestionWasCorrect(false);
      setUserAnswerValue('');
    } else {
      setView('summary');
      if (sessionMode === 'chapter') {
        fetchCompletedChapters();
      }
    }
  };

  const handleSessionRestart = () => setView('setup');
  const handleGoToDashboard = () => setView('dashboard');

  if (checkingAuth || !userInfo) {
    return (
      <div className="synonym-app">
        <div className="loading-container">
          <div className="spinner"></div>
          <p style={{ marginTop: '12px' }}>অ্যাপ লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="synonym-app">
      {loadingData && view === 'dashboard' ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>শব্দতালিকা লোড হচ্ছে...</p>
        </div>
      ) : (
        <>
          {view === 'dashboard' && (
            <Dashboard user={userInfo} entries={entries} onStartQuiz={() => setView('setup')} onStartReview={handleStartReview} />
          )}

          {view === 'setup' && (
            <QuizSetup
              entries={entries}
              completedChapters={completedChapters}
              onStart={handleStartSession}
              onBackToDashboard={handleGoToDashboard}
            />
          )}

          {view === 'quiz' && (
            <QuizActive
              questions={quizQuestions}
              current={currentQuestion}
              score={quizScore}
              results={sessionResults}
              answered={questionAnswered}
              wasCorrect={questionWasCorrect}
              userAnswer={userAnswerValue}
              onAnswer={handleAnswerQuestion}
              onNext={handleNextQuestion}
              answerMode={sessionAnswerMode}
            />
          )}

          {view === 'summary' && (
            <QuizSummary
              score={quizScore}
              total={quizQuestions.length}
              results={sessionResults}
              mode={sessionMode}
              selectedChunks={sessionSelectedChunks}
              onRestart={handleSessionRestart}
              onGoToDashboard={handleGoToDashboard}
            />
          )}
        </>
      )}
    </div>
  );
}
