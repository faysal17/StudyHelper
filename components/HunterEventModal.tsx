'use client';

import { Shield, Award, ArrowUp, ArrowDown, Sparkles, Skull, CheckCircle2, Laugh } from 'lucide-react';
import ParticleEffects from './ParticleEffects';

export type EventType = 'rank-up' | 'rank-down' | 'level-up' | 'level-down' | 'weekly-transition';

interface HunterEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventType: EventType;
  oldRankStr?: string;
  newRankStr?: string;
  oldLevel?: number;
  newLevel?: number;
  oldGlobalPosition?: number;
  newGlobalPosition?: number;
}

export default function HunterEventModal({
  isOpen,
  onClose,
  eventType,
  oldRankStr = 'E-Rank',
  newRankStr = 'D-Rank',
  oldLevel = 5,
  newLevel = 6,
  oldGlobalPosition = 450,
  newGlobalPosition = 380,
}: HunterEventModalProps) {
  if (!isOpen) return null;

  const isCelebration = eventType === 'rank-up' || eventType === 'level-up';

  return (
    <>
      <ParticleEffects
        mode={isCelebration ? 'confetti-fireworks' : 'emoji-rain'}
        isActive={isOpen}
      />

      <div className="fixed inset-0 z-[100000] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
        <div
          className={`bg-zinc-900 border ${
            isCelebration ? 'border-amber-500/40 shadow-amber-500/10' : 'border-red-500/40 shadow-red-500/10'
          } rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden`}
        >
          {/* Header Icon */}
          <div
            className={`w-16 h-16 rounded-2xl ${
              isCelebration ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            } border flex items-center justify-center mx-auto shadow-inner`}
          >
            {eventType === 'rank-up' && <Award className="w-8 h-8 animate-bounce" />}
            {eventType === 'rank-down' && <Laugh className="w-8 h-8 text-red-400 animate-spin" />}
            {eventType === 'level-up' && <Sparkles className="w-8 h-8 text-amber-400" />}
            {eventType === 'level-down' && <Skull className="w-8 h-8 text-red-400" />}
            {eventType === 'weekly-transition' && <Shield className="w-8 h-8 text-cyan-400" />}
          </div>

          {/* Title & Headline */}
          <div>
            {eventType === 'rank-up' && (
              <>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  🎉 Hunter Rank Up Confirmed!
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mt-1">
                  Promoted to {newRankStr}!
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Official Global Rank Position Improved from #{oldGlobalPosition} $\rightarrow$ #{newGlobalPosition}!
                </p>
              </>
            )}

            {eventType === 'rank-down' && (
              <>
                <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                  🤣 Rank Demotion Executed!
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-red-300 mt-1">
                  Demoted to {newRankStr}!
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Official Global Rank Position Dropped from #{oldGlobalPosition} $\rightarrow$ #{newGlobalPosition}!
                </p>
              </>
            )}

            {eventType === 'level-up' && (
              <>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  ⚡ Level Up!
                </span>
                <h2 className="text-xl font-extrabold text-zinc-100 mt-1">
                  Advanced to Level {newLevel}!
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Great focus! Keep grinding to climb higher Hunter Ranks.
                </p>
              </>
            )}

            {eventType === 'level-down' && (
              <>
                <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
                  🤣 Level Dropped!
                </span>
                <h2 className="text-xl font-extrabold text-red-300 mt-1">
                  Demoted to Level {newLevel}!
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Excess stop penalties or inactivity reduced your level. Lock in!
                </p>
              </>
            )}

            {eventType === 'weekly-transition' && (
              <>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  📅 Official Weekly Rank Finalized!
                </span>
                <h2 className="text-xl font-extrabold text-zinc-100 mt-1">
                  Weekly Rank: #{newGlobalPosition}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Your provisional mid-week study performance is now official!
                </p>
              </>
            )}
          </div>

          {/* Visual Position Cards */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-around font-mono">
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">Previous</span>
              <span className="text-sm font-bold text-zinc-400">#{oldGlobalPosition}</span>
            </div>

            <div className="flex items-center text-zinc-600">
              {isCelebration ? (
                <ArrowUp className="w-5 h-5 text-emerald-400 animate-bounce" />
              ) : (
                <ArrowDown className="w-5 h-5 text-red-400 animate-bounce" />
              )}
            </div>

            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">New Rank</span>
              <span className={`text-base font-extrabold ${isCelebration ? 'text-amber-400' : 'text-red-400'}`}>
                #{newGlobalPosition}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 ${
              isCelebration
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCelebration ? 'Claim Glory & Continue' : 'Accept Roast & Continue'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
