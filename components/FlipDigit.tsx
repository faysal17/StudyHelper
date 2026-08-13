'use client';

import { useState, useEffect } from 'react';

export default function FlipDigit({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const [flipKey, setFlipKey] = useState(0);

  useEffect(() => {
    if (value !== displayValue) {
      setPrevValue(displayValue);
      setDisplayValue(value);
      setFlipping(true);
      setFlipKey((k) => k + 1);

      const t = setTimeout(() => {
        setFlipping(false);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [value, displayValue]);

  return (
    <div
      className="relative w-20 h-32 sm:w-32 sm:h-48 md:w-40 md:h-60 lg:w-48 lg:h-72 bg-zinc-950 border border-zinc-800/90 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none overflow-hidden group"
      style={{ perspective: '1000px' }}
    >
      {/* 1. Static Top Half: New Value */}
      <div className="absolute top-0 inset-x-0 bottom-1/2 bg-zinc-900 border-b border-zinc-950/80 flex items-end justify-center overflow-hidden">
        <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter translate-y-1/2 select-none">
          {displayValue}
        </span>
      </div>

      {/* 2. Static Bottom Half: Old Value */}
      <div className="absolute bottom-0 inset-x-0 top-1/2 bg-zinc-900 flex items-start justify-center overflow-hidden">
        <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter -translate-y-1/2 select-none">
          {prevValue}
        </span>
      </div>

      {/* 3. Animated Top Flap (Old Value folding down from 0 to -90 deg) */}
      {flipping && (
        <div
          key={`top-${flipKey}`}
          className="absolute top-0 inset-x-0 bottom-1/2 bg-zinc-900 border-b border-zinc-950/80 flex items-end justify-center overflow-hidden z-20"
          style={{
            transformOrigin: 'bottom',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            animation: 'flipTopFold 0.25s ease-in forwards',
          }}
        >
          <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter translate-y-1/2 select-none">
            {prevValue}
          </span>
        </div>
      )}

      {/* 4. Animated Bottom Flap (New Value unfolding from 90 to 0 deg) */}
      {flipping && (
        <div
          key={`bot-${flipKey}`}
          className="absolute bottom-0 inset-x-0 top-1/2 bg-zinc-900 flex items-start justify-center overflow-hidden z-20"
          style={{
            transformOrigin: 'top',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            animation: 'flipBottomUnfold 0.25s ease-out 0.25s forwards',
            transform: 'rotateX(90deg)',
          }}
        >
          <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold font-mono text-zinc-100 tracking-tighter -translate-y-1/2 select-none">
            {displayValue}
          </span>
        </div>
      )}

      {/* Center Line Split & Overlay */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-950 z-30 shadow-md pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/40 pointer-events-none z-10" />

      {/* Scoped Keyframes */}
      <style jsx>{`
        @keyframes flipTopFold {
          0% {
            transform: rotateX(0deg);
          }
          100% {
            transform: rotateX(-90deg);
          }
        }
        @keyframes flipBottomUnfold {
          0% {
            transform: rotateX(90deg);
          }
          100% {
            transform: rotateX(0deg);
          }
        }
      `}</style>
    </div>
  );
}
