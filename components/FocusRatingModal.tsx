'use client';

import { useState } from 'react';
import { Star, Award, CheckCircle2, AlertTriangle } from 'lucide-react';
import ModalShell from './ModalShell';

interface FocusRatingModalProps {
  isOpen: boolean;
  targetMinutes: number;
  onRate: (stars: number) => void;
}

export default function FocusRatingModal({ isOpen, targetMinutes, onRate }: FocusRatingModalProps) {
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [selectedStar, setSelectedStar] = useState<number>(5);

  const starLabels: Record<number, { text: string; xpBonus: string; color: string }> = {
    5: { text: 'Flawless Concentration!', xpBonus: '+100% XP Bonus (+30 XP)', color: 'text-amber-400' },
    4: { text: 'Solid Focus Session', xpBonus: 'Standard XP (+15 XP)', color: 'text-emerald-400' },
    3: { text: 'Mild Distractions', xpBonus: '70% XP (+10 XP)', color: 'text-yellow-400' },
    2: { text: 'Heavily Distracted', xpBonus: '40% XP (+5 XP)', color: 'text-orange-400' },
    1: { text: 'Total Disaster', xpBonus: '0 XP Awarded (Try harder!)', color: 'text-red-400' },
  };

  const activeStar = hoveredStar || selectedStar;
  const currentInfo = starLabels[activeStar] || starLabels[5];

  return (
    <ModalShell isOpen={isOpen}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full text-center space-y-6 shadow-2xl relative">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
          <Award className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-100">Session Completed!</h2>
          <p className="text-xs text-zinc-400 mt-1">
            How focused were you during this {targetMinutes}-minute focus session?
          </p>
        </div>

        {/* 5-Star Rating Buttons */}
        <div className="flex items-center justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setSelectedStar(star)}
              className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= activeStar ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating Feedback Box */}
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
          <p className={`text-xs font-bold ${currentInfo.color}`}>{currentInfo.text}</p>
          <p className="text-[11px] font-mono text-zinc-400">{currentInfo.xpBonus}</p>
        </div>

        <button
          onClick={() => onRate(selectedStar)}
          className="w-full py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all shadow-md flex items-center justify-center space-x-1.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Claim Session Rewards</span>
        </button>
      </div>
    </ModalShell>
  );
}
