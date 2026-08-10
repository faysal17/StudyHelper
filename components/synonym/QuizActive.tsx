'use client';

import { useState, useEffect, useRef } from 'react';

type Question = {
  type: 'synonym' | 'odd';
  word: string;
  shown: string;
  correct: string;
  realThree?: string[];
  options?: string[];
};

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
  allWords,
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
  allWords: string[];
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

      <div className="qtype">
        {answerMode === 'write' ? 'সঠিক মূল শব্দ লিখুন' : q.type === 'odd' ? 'ভিন্ন শব্দটি বাছাই করুন' : 'সঠিক মূল শব্দ বাছাই করুন'}
      </div>

      <div className="headword-card">
        <div className="prompt">
          {q.type === 'odd' ? 'নিচের কোন শব্দটি এই শব্দের সমার্থক নয়?' : 'নিচের শব্দটি কোন মূল শব্দের সমার্থক?'}
        </div>
        <div className="headword">{q.shown}</div>
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
            list="synonymOptions"
            autoComplete="off"
            spellCheck={false}
            placeholder="মূল শব্দটি লিখুন..."
          />

          <datalist id="synonymOptions">
            {allWords.map((word) => (
              <option key={word} value={word} />
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
              q.options.map((optionText) => {
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
                    key={optionText}
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
                সঠিক মূল শব্দ: <b>{q.word}</b>
              </span>
            </>
          ) : (
            <>
              <span className="fyou">তুমি লিখেছিলে: {userAnswer || '(ফাঁকা রাখা হয়েছিল)'}</span>
              <span className="flist">
                সঠিক মূল শব্দ: <b>{q.word}</b>
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
