'use client';

import { Zap, TrendingDown, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import ModalShell from './ModalShell';

interface XPChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  reason: string;
  multiplier?: number;
  newTotalXP?: number;
}

const OVERLAY_CLASSNAME =
  'fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[999999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200';

export default function XPChangeModal({
  isOpen,
  onClose,
  amount,
  reason,
  multiplier = 1.0,
  newTotalXP,
}: XPChangeModalProps) {
  const isGain = amount >= 0;

  return (
    <ModalShell isOpen={isOpen} overlayClassName={OVERLAY_CLASSNAME}>
      <div
        className={`bg-zinc-900 border ${
          isGain ? 'border-amber-500/40 shadow-amber-500/20' : 'border-red-500/40 shadow-red-500/20'
        } rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative overflow-hidden z-[100002]`}
      >
        {/* Header Icon */}
        <div
          className={`w-16 h-16 rounded-2xl ${
            isGain ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          } border flex items-center justify-center mx-auto shadow-inner`}
        >
          {isGain ? <Zap className="w-8 h-8 animate-bounce text-amber-400" /> : <TrendingDown className="w-8 h-8 text-red-400" />}
        </div>

        {/* XP Amount & Badge */}
        <div className="space-y-1">
          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
            isGain ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {isGain ? '⚡ XP Gained!' : '🛑 XP Deducted!'}
          </span>

          <div className="pt-2">
            <span className={`text-4xl font-extrabold font-mono ${isGain ? 'text-amber-400' : 'text-red-400'}`}>
              {isGain ? `+${amount}` : `${amount}`} XP
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-medium pt-1">{reason}</p>

          {isGain && multiplier > 1.0 && (
            <p className="text-[10px] font-mono text-cyan-400 flex items-center justify-center gap-1 pt-1">
              <Sparkles className="w-3 h-3" /> Includes {multiplier}x Momentum XP Boost!
            </p>
          )}
        </div>

        {/* Total XP Footer */}
        {typeof newTotalXP === 'number' && (
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 flex items-center justify-between">
            <span>Total Experience:</span>
            <span className="font-bold text-zinc-100">{newTotalXP.toLocaleString()} XP</span>
          </div>
        )}

        <button
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 ${
            isGain
              ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isGain ? 'Awesome!' : 'Understood'}</span>
        </button>
      </div>
    </ModalShell>
  );
}
