'use client';

import { Skull, AlertTriangle, ArrowRight } from 'lucide-react';
import { getQuitTauntMessage } from '@/lib/gamification';
import ModalShell from './ModalShell';

interface QuitTauntModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRank: string;
  isPenaltyApplied: boolean;
  penaltyAmount: number;
}

const OVERLAY_CLASSNAME =
  'fixed inset-0 z-[100000] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 !m-0 animate-in fade-in duration-200';

export default function QuitTauntModal({
  isOpen,
  onClose,
  currentRank,
  isPenaltyApplied,
  penaltyAmount,
}: QuitTauntModalProps) {
  const tauntMessage = getQuitTauntMessage(currentRank);

  return (
    <ModalShell isOpen={isOpen} overlayClassName={OVERLAY_CLASSNAME}>
      <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center space-y-5 shadow-2xl relative">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto shadow-inner">
          <Skull className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-base font-bold text-red-400 uppercase tracking-wide font-mono">
            Focus Session Abandoned!
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            {currentRank} Status Assessment
          </p>
        </div>

        {/* Quitter Roast Message */}
        <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-left space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-red-200 italic leading-relaxed">
            &ldquo;{tauntMessage}&rdquo;
          </p>

          {isPenaltyApplied && (
            <div className="pt-2 border-t border-red-500/20 flex items-center space-x-1.5 text-xs text-red-400 font-mono font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>DEDUCTION: -{penaltyAmount} XP (Excess Stop Allowance Limit)</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all shadow-md flex items-center justify-center space-x-1.5"
        >
          <span>Accept Shame & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </ModalShell>
  );
}
