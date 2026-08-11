'use client';

import { useState, useEffect, useRef } from 'react';
import type { Question } from '@/lib/wordClassification';

type ResultEntry = { wasCorrect: boolean };

export default function QuizActive({
  questions,
  current,
  score,
  results,
  answered,
  wasCorrect,
  userAnswer,
  onAnswer,
  onNext,
  answerMode,
}: {
  questions: Question[];
  current: number;
  score: number;
  results: ResultEntry[];
  answered: boolean;
  wasCorrect: boolean;
  userAnswer: string;
  onAnswer: (skip: boolean, answer: string) => void;
  onNext: () => void;
  answerMode: 'write' | 'mcq';
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const q = questions[current];

  useEffect(() => {
    setInputValue('');
    if (inputRef.current && answerMode === 'write') {
      inputRef.current.focus();
    }
  }, [current, answerMode]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (answered) return;
    onAnswer(false, inputValue);
  };

  const handleDontKnow = () => {
    if (answered) return;
    onAnswer(true, '');
  };

  if (!q) return null;

  const isLastQuestion = current === questions.length - 1;
  const typeLabel = q.kind === 'exam' ? 'BCS প্রশ্নব্যাংক' : q.kind === 'reverse' ? 'শব্দ বাছাই করুন' : 'শ্রেণি নির্ণয় করুন';

  // For generated forward/reverse questions, qLabel is the full question
  // sentence and shown is just the short word/category it's about — so the
  // sentence belongs front-and-center with shown as a small context tag.
  // Exam-bank questions are the opposite: qLabel is a generic type label and
  // shown holds the actual (often long) question text, so that stays big
  // and untagged.
  const isExam = q.kind === 'exam';
  const mainPromptText = isExam ? q.shown : q.qLabel;
  const isLongPrompt = mainPromptText.length > 40;

  return (
    <div id="quiz">
      <div className="progress-row">
        <div className="dots">
          {questions.map((_, i) => {
            let className = 'dot';
            if (i === current) className += ' current';
            else if (i < results.length) {
              className += results[i].wasCorrect ? ' done-correct' : ' done-wrong';
            }
            return <div key={i} className={className} id={`dot${i}`}></div>;
          })}
        </div>
        <div className="score">
          স্কোর <b>{score}</b>/{questions.length}
        </div>
      </div>

      <div className="qtype">{typeLabel}</div>

      <div className="headword-card">
        {!isExam && <span className="headword-tag">{q.shown}</span>}
        <div className="prompt-main" style={isLongPrompt ? { fontSize: '22px', lineHeight: 1.4 } : undefined}>
          {mainPromptText}
        </div>
      </div>

      {answerMode === 'write' ? (
        <form onSubmit={handleSubmit} className="answer-block">
          <input
            type="text"
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={answered}
            className="answer-input"
            list="classificationOptions"
            autoComplete="off"
            spellCheck={false}
            placeholder="উত্তর লিখুন..."
          />

          <datalist id="classificationOptions">
            {(q.datalist || []).map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>

          <div className="answer-actions">
            <button type="button" className="dontknow-btn" onClick={handleDontKnow} disabled={answered}>
              জানি না
            </button>
            <button type="submit" className="submit-btn" disabled={answered}>
              জমা দিন
            </button>
          </div>
        </form>
      ) : (
        <div className="answer-block">
          <div className="options">
            {q.options &&
              q.options.map((optionText, idx) => {
                let btnClass = 'option';
                if (answered) {
                  btnClass += ' disabled';
                  if (optionText === q.correct) {
                    btnClass += ' correct';
                  } else if (optionText === userAnswer) {
                    btnClass += ' wrong';
                  } else {
                    btnClass += ' dim';
                  }
                }
                return (
                  <button
                    key={`${optionText}-${idx}`}
                    type="button"
                    className={btnClass}
                    onClick={() => onAnswer(false, optionText)}
                    disabled={answered}
                  >
                    <span className="bead"></span>
                    {optionText}
                  </button>
                );
              })}
          </div>
          {!answered && (
            <div className="answer-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="dontknow-btn" onClick={handleDontKnow}>
                জানি না
              </button>
            </div>
          )}
        </div>
      )}

      {answered && (
        <div className={`feedback ${wasCorrect ? 'ok' : 'no'}`}>
          {wasCorrect ? (
            <>
              <span className="fyou">ঠিক আছে ✓</span>
              <span className="flist">
                সঠিক উত্তর: <b>{q.correct}</b>
              </span>
            </>
          ) : (
            <>
              <span className="fyou">তুমি লিখেছিলে: {userAnswer || '(ফাঁকা রাখা হয়েছিল)'}</span>
              <span className="flist">
                সঠিক উত্তর: <b>{q.correct}</b>
              </span>
            </>
          )}
        </div>
      )}

      {answered && (
        <div className="next-row">
          <button className="next-btn" onClick={onNext}>
            {isLastQuestion ? 'ফলাফল দেখি →' : 'পরের প্রশ্ন →'}
          </button>
        </div>
      )}
    </div>
  );
}
