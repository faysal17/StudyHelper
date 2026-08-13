'use client';

import { Shield, Award, ArrowUp, ArrowDown, Sparkles, Skull, CheckCircle2, Laugh } from 'lucide-react';
import ParticleEffects from './ParticleEffects';
import ModalShell from './ModalShell';

export type EventType = 'rank-up' | 'rank-down' | 'level-up' | 'level-down' | 'weekly-transition';

const OVERLAY_CLASSNAME =
  'fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[999999] bg-zinc-950/90 backdrop-blur-xl flex items-center justify-center p-4 text-zinc-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200';

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
  const isCelebration = eventType === 'rank-up' || eventType === 'level-up';

  return (
    <ModalShell isOpen={isOpen} overlayClassName={OVERLAY_CLASSNAME} lockScroll>
      <ParticleEffects
        mode={isCelebration ? 'confetti-fireworks' : 'emoji-rain'}
        isActive={isOpen}
      />

      <div
        className={`bg-zinc-900 border ${
          isCelebration ? 'border-amber-500/40 shadow-amber-500/20' : 'border-red-500/40 shadow-red-500/20'
        } rounded-3xl p-6 sm:p-10 max-w-lg w-full text-center space-y-6 shadow-2xl relative overflow-hidden z-[100002]`}
      >
        {/* Header Icon */}
        <div
          className={`w-20 h-20 rounded-3xl ${
            isCelebration ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          } border flex items-center justify-center mx-auto shadow-2xl`}
        >
          {eventType === 'rank-up' && <Award className="w-10 h-10 animate-bounce text-amber-400" />}
          {eventType === 'rank-down' && <Laugh className="w-10 h-10 text-red-400 animate-spin" />}
          {eventType === 'level-up' && <Sparkles className="w-10 h-10 text-amber-400" />}
          {eventType === 'level-down' && <Skull className="w-10 h-10 text-red-400" />}
          {eventType === 'weekly-transition' && <Shield className="w-10 h-10 text-cyan-400" />}
        </div>

        {/* Title & Headline */}
        <div className="space-y-2">
          {eventType === 'rank-up' && (
            <>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                🎉 Hunter Rank Up Confirmed!
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 pt-2">
                Promoted to {newRankStr}!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 pt-1">
                Official Global Rank Position Improved from #{oldGlobalPosition} → #{newGlobalPosition}!
              </p>
            </>
          )}

          {eventType === 'rank-down' && (
            <>
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                🤣 Rank Demotion Executed!
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-red-300 pt-2">
                Demoted to {newRankStr}!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 pt-1">
                Official Global Rank Position Dropped from #{oldGlobalPosition} → #{newGlobalPosition}!
              </p>
            </>
          )}

          {eventType === 'level-up' && (
            <>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                ⚡ Level Up!
              </span>
              <h2 className="text-2xl font-extrabold text-zinc-100 pt-2">
                Advanced to Level {newLevel}!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 pt-1">
                Great focus! Keep grinding to climb higher Hunter Ranks.
              </p>
            </>
          )}

          {eventType === 'level-down' && (
            <>
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                🤣 Level Dropped!
              </span>
              <h2 className="text-2xl font-extrabold text-red-300 pt-2">
                Demoted to Level {newLevel}!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 pt-1">
                Excess stop penalties or inactivity reduced your level. Lock in!
              </p>
            </>
          )}

          {eventType === 'weekly-transition' && (
            <>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
                📅 Official Weekly Rank Finalized!
              </span>
              <h2 className="text-2xl font-extrabold text-zinc-100 pt-2">
                Weekly Rank: #{newGlobalPosition}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 pt-1">
                Your provisional mid-week study performance is now official!
              </p>
            </>
          )}
        </div>

        {/* Visual Position Cards */}
        <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-around font-mono">
          <div className="text-center">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Previous</span>
            <span className="text-lg font-bold text-zinc-400">#{oldGlobalPosition}</span>
          </div>

          <div className="flex items-center text-zinc-600">
            {isCelebration ? (
              <ArrowUp className="w-6 h-6 text-emerald-400 animate-bounce" />
            ) : (
              <ArrowDown className="w-6 h-6 text-red-400 animate-bounce" />
            )}
          </div>

          <div className="text-center">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">New Position</span>
            <span className={`text-xl font-extrabold ${isCelebration ? 'text-amber-400' : 'text-red-400'}`}>
              #{newGlobalPosition}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center space-x-2 ${
            isCelebration
              ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{isCelebration ? 'Claim Glory & Continue' : 'Accept Roast & Continue'}</span>
        </button>
      </div>
    </ModalShell>
  );
}
