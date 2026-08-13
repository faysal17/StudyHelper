'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured, fetchSynonymWords, fetchCompletedSynonymChunks, fetchSynonymSrsForWords } from '@/lib/supabase';
import Dashboard from '@/components/synonym/Dashboard';
import QuizSetup from '@/components/synonym/QuizSetup';
import QuizActive from '@/components/synonym/QuizActive';
import QuizSummary from '@/components/synonym/QuizSummary';
import './synonym.css';

type WordEntry = [string, string[], string];
type RevisionItem = { word: string; alternatives: string[]; cluster: string };
type Question = {
  type: 'synonym' | 'odd';
  word: string;
  shown: string;
  correct: string;
  realThree?: string[];
  options?: string[];
};
type SynonymUpdate = { word: string; synonym: string; isCorrect: boolean };
type ResultEntry = {
  type: 'synonym' | 'odd';
  shown: string;
  correct: string;
  chosen: string;
  wasCorrect: boolean;
  synonymUpdates: SynonymUpdate[];
};

export default function SynonymPracticePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [words, setWords] = useState<WordEntry[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'dashboard' | 'setup' | 'quiz' | 'summary'>('dashboard');
  const [userInfo, setUserInfo] = useState<{ email?: string | null; user_metadata?: { full_name?: string } } | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [questionWasCorrect, setQuestionWasCorrect] = useState(false);
  const [userAnswerValue, setUserAnswerValue] = useState('');
  const [sessionResults, setSessionResults] = useState<ResultEntry[]>([]);
  const [sessionMode, setSessionMode] = useState('random');
  const [sessionSelectedChunks, setSessionSelectedChunks] = useState<number[]>([]);
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
      fetchSynonyms();
      fetchCompletedChapters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth, userInfo]);

  const fetchSynonyms = async () => {
    try {
      setLoadingWords(true);
      if (!isSupabaseConfigured) return;

      const { data, error } = await fetchSynonymWords();

      if (error) throw error;

      const formatted: WordEntry[] = (data || []).map((item: any) => [item.word, item.alternatives, item.cluster]);
      setWords(formatted);
    } catch (err) {
      console.error('Error fetching synonyms dataset:', err);
    } finally {
      setLoadingWords(false);
    }
  };

  const fetchCompletedChapters = async () => {
    try {
      if (!isSupabaseConfigured) return;
      const { data, error } = await fetchCompletedSynonymChunks();

      if (error) throw error;

      const indices = new Set<number>((data || []).map((item: any) => item.chunk_index));
      setCompletedChapters(indices);
    } catch (err) {
      console.error('Error fetching completed chapters:', err);
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

  const pickRandomElement = (arr: string[]): string => {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const getMCQOptions = (correctWord: string, correctCluster: string, allWordsList: WordEntry[]) => {
    const rest = allWordsList.filter(([w]) => w !== correctWord);
    const same = shuffle(rest.filter(([, , c]) => c === correctCluster));
    const other = shuffle(rest.filter(([, , c]) => c !== correctCluster));
    const pool = [...same, ...other];
    const distractors = pool.slice(0, 3).map(([w]) => w);
    return shuffle([correctWord, ...distractors]);
  };

  const getDistractorPool = (word: string, cluster: string, allWordsList: WordEntry[]) => {
    const rest = allWordsList.filter(([w]) => w !== word);
    const same = shuffle(rest.filter(([, , c]) => c === cluster));
    const other = shuffle(rest.filter(([, , c]) => c !== cluster));
    return [...same, ...other];
  };

  const buildSessionQuestions = (pool: WordEntry[], count: number, allWordsList: WordEntry[], answerMode: string): Question[] => {
    let result: WordEntry[] = [];

    if (count <= pool.length) {
      result = shuffle(pool).slice(0, count);
    } else {
      while (result.length < count) {
        let batch = shuffle(pool);
        if (result.length > 0 && batch[0][0] === result[result.length - 1][0] && batch.length > 1) {
          [batch[0], batch[1]] = [batch[1], batch[0]];
        }
        result = result.concat(batch);
      }
      result = result.slice(0, count);
    }

    const isMCQ = answerMode === 'mcq';
    let questionTypes: string[] = [];
    if (isMCQ) {
      const oddCount = Math.max(1, Math.round(count * 0.35));
      const synCount = count - oddCount;
      questionTypes = shuffle([...Array(synCount).fill('synonym'), ...Array(oddCount).fill('odd')]);
    }

    return result.map(([word, alternatives, cluster], idx) => {
      const isOddType = isMCQ && questionTypes[idx] === 'odd';

      if (isOddType) {
        const realThree = shuffle(alternatives).slice(0, 3);
        const distPool = getDistractorPool(word, cluster, allWordsList);
        const distWord = distPool[0];
        const fake = pickRandomElement(distWord[1]);

        return {
          type: 'odd' as const,
          word,
          shown: word,
          correct: fake,
          realThree,
          options: shuffle([...realThree, fake]),
        };
      } else {
        const shown = pickRandomElement(alternatives);
        const options = isMCQ ? getMCQOptions(word, cluster, allWordsList) : [];
        return {
          type: 'synonym' as const,
          word,
          shown,
          correct: word,
          options,
        };
      }
    });
  };

  const handleStartSession = async (
    mode: string,
    pool: WordEntry[],
    size: number,
    selectedChunkIndices: number[],
    answerMode: string
  ) => {
    try {
      setLoadingWords(true);
      if (!isSupabaseConfigured) return;

      const poolWords = pool.map((w) => w[0]);
      const { data: srsRecords, error } = await fetchSynonymSrsForWords(poolWords);

      if (error) throw error;

      const srsByWord: Record<string, { synonym: string; box: number; nextReviewAt: Date }[]> = {};
      srsRecords?.forEach((r: any) => {
        if (!srsByWord[r.word]) srsByWord[r.word] = [];
        srsByWord[r.word].push({ synonym: r.synonym, box: r.box, nextReviewAt: new Date(r.next_review_at) });
      });

      const now = new Date();
      const cat1: WordEntry[] = [];
      const cat2: WordEntry[] = [];
      const cat3: WordEntry[] = [];

      pool.forEach((item) => {
        const [word, alternatives] = item;
        const records = srsByWord[word] || [];
        const hasUntested = records.length < alternatives.length;
        const hasDue = records.some((r) => r.box === 0 || r.nextReviewAt <= now);

        if (hasUntested || hasDue) {
          cat1.push(item);
        } else if (records.every((r) => r.box === 5)) {
          cat3.push(item);
        } else {
          cat2.push(item);
        }
      });

      const prioritizedPool = [...shuffle(cat1), ...shuffle(cat2), ...shuffle(cat3)];

      const questions = buildSessionQuestions(prioritizedPool, size, words, answerMode);

      setQuizQuestions(questions);
      setCurrentQuestion(0);
      setQuizScore(0);
      setQuestionAnswered(false);
      setQuestionWasCorrect(false);
      setUserAnswerValue('');
      setSessionResults([]);
      setSessionMode(mode);
      setSessionSelectedChunks(selectedChunkIndices);
      setSessionAnswerMode(answerMode as 'write' | 'mcq');

      setView('quiz');
    } catch (err) {
      console.error('Error starting session:', err);
    } finally {
      setLoadingWords(false);
    }
  };

  const handleStartReview = (answerMode: 'write' | 'mcq', reviewList: RevisionItem[]) => {
    const pool: WordEntry[] = reviewList.map((item) => [item.word, item.alternatives, item.cluster]);
    handleStartSession('random', pool, pool.length, [], answerMode);
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

    let synonymUpdates: SynonymUpdate[] = [];
    if (q.type === 'odd') {
      if (isCorrect) {
        synonymUpdates = (q.realThree || []).map((syn) => ({ word: q.word, synonym: syn, isCorrect: true }));
      } else if (!skip && q.realThree?.includes(cleanAnswer)) {
        synonymUpdates = [{ word: q.word, synonym: cleanAnswer, isCorrect: false }];
      }
    } else {
      synonymUpdates = [{ word: q.word, synonym: q.shown, isCorrect }];
    }

    const resultObj: ResultEntry = {
      type: q.type || 'synonym',
      shown: q.shown,
      correct: q.correct,
      chosen: skip ? 'জানি না' : cleanAnswer || '(ফাঁকা রাখা হয়েছিল)',
      wasCorrect: isCorrect,
      synonymUpdates,
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
      if (sessionMode === 'chunk') {
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

  const allWords = words.map(([w]) => w).sort((a, b) => a.localeCompare(b, 'bn'));

  return (
    <div className="synonym-app">
      {loadingWords && view === 'dashboard' ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>শব্দতালিকা লোড হচ্ছে...</p>
        </div>
      ) : (
        <>
          {view === 'dashboard' && (
            <Dashboard user={userInfo} words={words} onStartQuiz={() => setView('setup')} onStartReview={handleStartReview} />
          )}

          {view === 'setup' && (
            <QuizSetup
              words={words}
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
              allWords={allWords}
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
