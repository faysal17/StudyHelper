'use client';

import { useState } from 'react';
import type { RevisionItem } from '@/lib/wordClassification';

export default function ClassificationBlock({
  revisionList = [],
  onStartReview,
}: {
  revisionList: RevisionItem[];
  onStartReview: (answerMode: 'write' | 'mcq', reviewList: RevisionItem[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="synonym-revision-block"
      style={{
        background: 'rgba(23, 56, 50, 0.3)',
        border: '1px solid rgba(201, 162, 75, 0.15)',
        borderRadius: 'var(--border-radius-md)',
        padding: '20px',
        marginTop: '8px',
        transition: 'var(--transition)',
      }}
    >
      <div
        className="block-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: revisionList.length > 0 ? 'var(--gold)' : 'var(--jade)',
              display: 'inline-block',
            }}
          ></span>
          <h4
            style={{
              fontFamily: "'Tiro Bangla', serif",
              fontSize: '18px',
              margin: 0,
              color: 'var(--paper)',
              fontWeight: 'normal',
            }}
          >
            শব্দের শ্রেণিবিভাগ ({revisionList.length}টি তথ্য)
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: 'var(--gold-dim)',
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '16px', transition: 'var(--transition)' }}>
          {revisionList.length === 0 ? (
            <p
              className="empty-state"
              style={{ padding: '8px 0 0', margin: 0, fontSize: '14px', color: 'var(--ivory-dim)', textAlign: 'left' }}
            >
              আজকের জন্য কোনো রিভিশন বাকি নেই। দুর্দান্ত প্রস্তুতি!
            </p>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '16px',
                  borderBottom: '1px solid rgba(238, 230, 210, 0.08)',
                  paddingBottom: '16px',
                }}
              >
                <button
                  className="logout-btn"
                  style={{
                    borderColor: 'var(--gold)',
                    color: 'var(--gold)',
                    padding: '8px 16px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    flex: 1,
                  }}
                  onClick={() => onStartReview('write', revisionList)}
                >
                  লিখে রিভিশন
                </button>
                <button
                  className="logout-btn"
                  style={{
                    borderColor: 'var(--jade)',
                    color: 'var(--jade)',
                    padding: '8px 16px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    flex: 1,
                  }}
                  onClick={() => onStartReview('mcq', revisionList)}
                >
                  MCQ রিভিশন
                </button>
              </div>

              <ul className="review-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
                {revisionList.map((item, idx) => (
                  <li
                    key={idx}
                    className="review-item revision-item"
                    style={{
                      padding: '14px 18px',
                      background: 'var(--surface-2)',
                      border: '1px solid rgba(238, 230, 210, 0.12)',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="study-word" style={{ fontSize: '18px', color: 'var(--paper)', fontWeight: 600, fontFamily: "'Tiro Bangla', serif" }}>
                        {item.word}
                      </span>
                      <span className="study-syns" style={{ fontSize: '13.5px', color: 'var(--ivory-dim)', lineHeight: '1.5' }}>
                        {item.label}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
