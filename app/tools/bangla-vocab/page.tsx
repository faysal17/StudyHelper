'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BanglaWord, fetchBanglaWordsDB, addBanglaWordDB, updateBanglaWordDB, deleteBanglaWordDB, importBanglaWordsDB, parseBanglaCSV, exportBanglaCSV } from '@/lib/banglaVocab';
import { awardXPAndSync, fetchUserSettings } from '@/lib/supabase';
import { calculateMomentum } from '@/lib/momentum';
import { ArrowLeft, BookOpen, Download, Upload, Plus, Trash2, Search, CheckCircle2, Brain, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import XPChangeModal from '@/components/XPChangeModal';
import Tooltip from '@/components/Tooltip';

export default function BanglaVocabPage() {
  const [words, setWords] = useState<BanglaWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'study' | 'import'>('list');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Add Word Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');

  // Study Flashcard Mode State
  const [dueWords, setDueWords] = useState<BanglaWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);

  // XP Change Modal State
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [xpReason, setXpReason] = useState('');
  const [xpMultiplier, setXpMultiplier] = useState(1.0);
  const [newTotalXP, setNewTotalXP] = useState(0);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatusMsg, setImportStatusMsg] = useState('');

  useEffect(() => {
    loadDatabaseWords();
  }, []);

  const loadDatabaseWords = async () => {
    setLoading(true);
    const loaded = await fetchBanglaWordsDB();
    setWords(loaded);
    setLoading(false);
  };

  const handleAddWord = async () => {
    if (!newWord.trim() || !newMeaning.trim()) return;
    const today = new Date().toISOString().split('T')[0];

    const added = await addBanglaWordDB({
      word: newWord.trim(),
      meaning: newMeaning.trim(),
      example: newExample.trim(),
      interval: 1,
      ease_factor: 2.5,
      next_review: today,
    });

    setWords([added, ...words]);
    setNewWord('');
    setNewMeaning('');
    setNewExample('');
    setShowAddModal(false);
  };

  const handleDeleteWord = async (id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
    await deleteBanglaWordDB(id);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseBanglaCSV(text);
        if (parsed.length > 0) {
          const imported = await importBanglaWordsDB(parsed);
          setWords((prev) => [...imported, ...prev]);
          setImportStatusMsg(`Successfully synced ${imported.length} Bangla words to Database!`);
          setTimeout(() => setImportStatusMsg(''), 4000);
        } else {
          setImportStatusMsg('Failed to parse CSV. Ensure columns are: word, meaning, example');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadCSV = () => {
    const csvContent = exportBanglaCSV(words);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bangla_vocabulary_database_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Start Flashcard Study Session
  const startStudySession = () => {
    const today = new Date().toISOString().split('T')[0];
    const due = words.filter((w) => w.next_review <= today);
    const pool = due.length > 0 ? due : words;
    setDueWords(pool);
    setCurrentIndex(0);
    setIsRevealed(false);
    setSessionCompleted(false);
    setSessionReviewedCount(0);
    setActiveTab('study');
  };

  // Grade Spaced Repetition Recall (Again, Hard, Good, Easy)
  const handleGradeWord = async (quality: 'again' | 'hard' | 'good' | 'easy') => {
    const currentWord = dueWords[currentIndex];
    if (!currentWord) return;

    let newInterval = currentWord.interval;
    let newEase = currentWord.ease_factor;

    if (quality === 'again') {
      newInterval = 1;
      newEase = Math.max(1.3, newEase - 0.2);
    } else if (quality === 'hard') {
      newInterval = Math.max(1, Math.round(newInterval * 1.2));
      newEase = Math.max(1.3, newEase - 0.15);
    } else if (quality === 'good') {
      newInterval = Math.round(newInterval * newEase);
    } else if (quality === 'easy') {
      newInterval = Math.round(newInterval * newEase * 1.3);
      newEase = newEase + 0.15;
    }

    const todayObj = new Date();
    todayObj.setDate(todayObj.getDate() + newInterval);
    const nextReviewStr = todayObj.toISOString().split('T')[0];

    const updatedWord: BanglaWord = {
      ...currentWord,
      interval: newInterval,
      ease_factor: Math.round(newEase * 100) / 100,
      last_reviewed: new Date().toISOString().split('T')[0],
      next_review: nextReviewStr,
    };

    setWords((prev) => prev.map((w) => (w.id === currentWord.id ? updatedWord : w)));
    await updateBanglaWordDB(updatedWord);

    const nextCount = sessionReviewedCount + 1;
    setSessionReviewedCount(nextCount);

    if (currentIndex + 1 < dueWords.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
    } else {
      setSessionCompleted(true);
      const earned = 20;
      await awardXPAndSync(earned);
      const updatedSettings = await fetchUserSettings();
      const momentum = calculateMomentum(updatedSettings);

      setEarnedXP(earned);
      setXpReason(`Bangla Vocab Session Completed (${nextCount} Words Reviewed)`);
      setXpMultiplier(momentum.xpMultiplier);
      setNewTotalXP(updatedSettings.xp || 0);
      setXpModalOpen(true);

      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch {}
    }
  };

  const filteredWords = words.filter(
    (w) =>
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.meaning.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const dueCount = words.filter((w) => w.next_review <= todayStr).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="glass-panel p-4 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/tools"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold">
                Database Synced Tool
              </span>
            </div>
            <h1 className="text-lg font-bold text-zinc-100 mt-0.5">Bangla Vocab Builder</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Tooltip content="Download Vocabulary CSV File">
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export CSV</span>
            </button>
          </Tooltip>

          <button
            onClick={startStudySession}
            className="px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Brain className="w-4 h-4 text-amber-400" />
            <span>Start Active Recall ({dueCount} Due)</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'list'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Word List Visualizer ({words.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('study')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'study'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Brain className="w-4 h-4 text-amber-400" />
          <span>Active Recall Flashcards</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'import'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          <span>Import CSV</span>
        </button>
      </div>

      {/* TAB 1: WORD LIST VISUALIZER */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Bangla words or meanings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-zinc-600"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all flex items-center justify-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Word</span>
            </button>
          </div>

          {/* Word List Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loading ? (
              <div className="col-span-full glass-panel p-8 text-center rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono">
                Syncing Bangla vocabulary from database...
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="col-span-full glass-panel p-8 text-center rounded-xl border border-zinc-800 text-zinc-500 text-xs italic">
                No Bangla vocabulary words found. Import a CSV file or add words manually!
              </div>
            ) : (
              filteredWords.map((word) => (
                <div
                  key={word.id}
                  className="glass-panel p-4 rounded-xl border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-zinc-100 font-mono tracking-tight">
                        {word.word}
                      </h3>
                      <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed font-medium">
                        {word.meaning}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteWord(word.id)}
                      className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                      title="Delete Word"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {word.example && (
                    <p className="text-[11px] text-zinc-500 italic bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/60">
                      &ldquo;{word.example}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
                    <span>Interval: {word.interval}d (Ease: {word.ease_factor}x)</span>
                    <span>Next: {word.next_review}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE RECALL FLASHCARDS STUDY MODE */}
      {activeTab === 'study' && (
        <div className="space-y-6">
          {sessionCompleted ? (
            <div className="glass-panel p-8 rounded-xl border border-zinc-800 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-zinc-100">Session Completed!</h2>
                <p className="text-xs text-zinc-400">
                  Reviewed {sessionReviewedCount} Bangla vocabulary words with Spaced Repetition database updates.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('list')}
                className="px-6 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all inline-block"
              >
                Back to Word List
              </button>
            </div>
          ) : dueWords.length === 0 ? (
            <div className="glass-panel p-8 rounded-xl border border-zinc-800 text-center space-y-3">
              <p className="text-xs text-zinc-400">No words found to study. Add or import vocabulary words first!</p>
              <button
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all"
              >
                Go to Word List
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">
                <span>Card {currentIndex + 1} of {dueWords.length}</span>
                <span>Database Synced Flashcard</span>
              </div>

              <div
                onClick={() => setIsRevealed(!isRevealed)}
                className={`glass-panel p-8 rounded-2xl border min-h-[220px] flex flex-col justify-center items-center text-center cursor-pointer select-none transition-all shadow-xl ${
                  isRevealed
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/80'
                }`}
              >
                <span className="text-3xl font-extrabold text-zinc-100 font-mono tracking-wide mb-3">
                  {dueWords[currentIndex]?.word}
                </span>

                {isRevealed ? (
                  <div className="space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-base font-bold text-amber-300">
                      {dueWords[currentIndex]?.meaning}
                    </p>
                    {dueWords[currentIndex]?.example && (
                      <p className="text-xs text-zinc-400 italic">
                        &ldquo;{dueWords[currentIndex]?.example}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Click anywhere on card to reveal meaning</span>
                  </span>
                )}
              </div>

              {isRevealed && (
                <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in duration-200">
                  <button
                    onClick={() => handleGradeWord('again')}
                    className="py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold font-mono transition-all"
                  >
                    Again (1d)
                  </button>
                  <button
                    onClick={() => handleGradeWord('hard')}
                    className="py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-bold font-mono transition-all"
                  >
                    Hard ({Math.max(1, Math.round(dueWords[currentIndex].interval * 1.2))}d)
                  </button>
                  <button
                    onClick={() => handleGradeWord('good')}
                    className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold font-mono transition-all"
                  >
                    Good ({Math.round(dueWords[currentIndex].interval * dueWords[currentIndex].ease_factor)}d)
                  </button>
                  <button
                    onClick={() => handleGradeWord('easy')}
                    className="py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold font-mono transition-all"
                  >
                    Easy ({Math.round(dueWords[currentIndex].interval * dueWords[currentIndex].ease_factor * 1.3)}d)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CSV IMPORT PANEL */}
      {activeTab === 'import' && (
        <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Import Bangla Words to Database via CSV</h2>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Upload a CSV file containing your Bangla word list. Format:
            <code className="text-amber-400 font-mono ml-1">Word, Meaning, Example (Optional)</code>
          </p>

          <div className="p-8 border-2 border-dashed border-zinc-800 rounded-2xl text-center bg-zinc-950/60 hover:border-zinc-700 transition-all">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className="cursor-pointer space-y-2 flex flex-col items-center justify-center"
            >
              <Upload className="w-8 h-8 text-zinc-500 mb-1" />
              <span className="text-xs font-bold text-zinc-200">Click to browse & upload `.csv` file</span>
              <span className="text-[10px] text-zinc-500 font-mono">Imports & syncs directly to Database</span>
            </label>
          </div>

          {importStatusMsg && (
            <p className="text-xs font-mono text-center text-cyan-400 bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
              {importStatusMsg}
            </p>
          )}
        </div>
      )}

      {/* Add Manual Word Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-zinc-100">Add New Bangla Word to Database</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Bangla Word</label>
                <input
                  type="text"
                  placeholder="e.g. অনুধাবন"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-xl focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Meaning / Definition</label>
                <input
                  type="text"
                  placeholder="e.g. উপলব্ধি (Comprehension)"
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-xl focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Example Sentence (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. বিষয়টি গভীর অনুধাবন প্রয়োজন।"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-xl focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWord}
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all"
              >
                Sync to Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XP Change Modal Popup */}
      <XPChangeModal
        isOpen={xpModalOpen}
        onClose={() => setXpModalOpen(false)}
        amount={earnedXP}
        reason={xpReason}
        multiplier={xpMultiplier}
        newTotalXP={newTotalXP}
      />
    </div>
  );
}
