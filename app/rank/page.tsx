'use client';

import { useState, useEffect } from 'react';
import { UserSettings } from '@/lib/types';
import { fetchUserSettings } from '@/lib/supabase';
import { calculateLevelAndProgress, calculateGlobalHunterRank } from '@/lib/gamification';
import { calculateMomentum } from '@/lib/momentum';
import { Shield, Zap, Flame, Award, Lock, CheckCircle2, ArrowLeft, Clock, BookOpen, RotateCcw, Activity, AlertTriangle, TrendingUp, HelpCircle, Info, Calculator, Percent, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function HunterRankPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchUserSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalXP = settings?.xp || 0;
  const streakDays = settings?.streak_days || 0;
  const focusSecondsToday = settings?.focus_seconds_today || 0;
  const stopsToday = settings?.stops_today || 0;

  const { level, xpInCurrentLevel, xpRequiredForNextLevel, progressPercent, rankInfo } =
    calculateLevelAndProgress(totalXP);

  const momentum = calculateMomentum(settings);

  // Live Provisional Rank calculation
  const provisionalGlobalRank = calculateGlobalHunterRank(level, momentum.score);

  // Live components calculation
  const streakBonus = Math.min(15, streakDays * 3);
  const stopPenalty = stopsToday * 15;

  const rankRoadmap = [
    {
      rank: 'E-Rank',
      title: 'Procrastinating Worm',
      levelRange: 'Lvl 1 – 5',
      minLevel: 1,
      maxLevel: 5,
      color: 'text-red-400',
      bgStyle: 'bg-red-500/10',
      borderStyle: 'border-red-500/30',
      desc: 'Lowest rank for casual slackers. Requires real consistency to crawl out of the mud.',
    },
    {
      rank: 'D-Rank',
      title: 'Delusional Pretender',
      levelRange: 'Lvl 6 – 15',
      minLevel: 6,
      maxLevel: 15,
      color: 'text-orange-400',
      bgStyle: 'bg-orange-500/10',
      borderStyle: 'border-orange-500/30',
      desc: 'Thinking you are studying when you are just staring at screens without retention.',
    },
    {
      rank: 'C-Rank',
      title: 'Barely Functioning Amateur',
      levelRange: 'Lvl 16 – 30',
      minLevel: 16,
      maxLevel: 30,
      color: 'text-yellow-400',
      bgStyle: 'bg-yellow-500/10',
      borderStyle: 'border-yellow-500/30',
      desc: 'Half-hearted study sessions. Needs serious discipline and active recall to level up.',
    },
    {
      rank: 'B-Rank',
      title: 'The Steady Grinder',
      levelRange: 'Lvl 31 – 50',
      minLevel: 31,
      maxLevel: 50,
      color: 'text-blue-400',
      bgStyle: 'bg-blue-500/10',
      borderStyle: 'border-blue-500/30',
      desc: 'Obsessive daily study habits forming. You put in the hours while others sleep.',
    },
    {
      rank: 'A-Rank',
      title: 'The Discipline Demon',
      levelRange: 'Lvl 51 – 75',
      minLevel: 51,
      maxLevel: 75,
      color: 'text-purple-400',
      bgStyle: 'bg-purple-500/10',
      borderStyle: 'border-purple-500/30',
      desc: 'Demolishing topics and subtopics with high recall precision and total focus.',
    },
    {
      rank: 'S-Rank',
      title: 'Sovereign of the Syllabus',
      levelRange: 'Lvl 76+',
      minLevel: 76,
      maxLevel: 999,
      color: 'text-amber-300',
      bgStyle: 'bg-amber-500/20',
      borderStyle: 'border-amber-500/40 shadow-lg shadow-amber-500/10',
      desc: 'The ultimate academic aura. Total domain control over memory, revision, and discipline.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all text-xs font-medium flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          StudyHub Hunter Profile
        </span>
      </div>

      {/* Hunter Profile Card: Big #500 Global Rank Displayed Prominently Beside Title */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-zinc-800 space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border ${rankInfo.badgeBg} ${rankInfo.badgeBorder} flex items-center justify-center shadow-2xl`}>
              <Shield className={`w-8 h-8 sm:w-10 sm:h-10 ${rankInfo.badgeText}`} />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${rankInfo.badgeBg} ${rankInfo.badgeText} ${rankInfo.badgeBorder}`}>
                  {rankInfo.rank}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-400">
                  Level {level}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mt-1 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{rankInfo.title}</span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">Accumulated {totalXP.toLocaleString()} Total Experience Points</p>
            </div>
          </div>

          {/* Big Global Rank Number Position (#500) directly beside title */}
          <div className="self-stretch sm:self-auto flex items-center justify-end">
            <div className="px-5 py-3 bg-zinc-950/90 border border-amber-500/30 rounded-2xl text-right font-mono shadow-xl">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block">
                Global Hunter Position
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold text-zinc-100 drop-shadow-md">
                #{provisionalGlobalRank}
              </span>
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="space-y-2 pt-4 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>XP to Level {level + 1}</span>
            </span>
            <span className="text-zinc-200 font-semibold">
              {xpInCurrentLevel} / {xpRequiredForNextLevel} XP ({progressPercent}%)
            </span>
          </div>

          <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden border border-zinc-800">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Global Leaderboard Status Card: Streak, Focus Today & Provisional Rank */}
      <div className="glass-panel p-5 rounded-xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Global Leaderboard Status</h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Live Hunter Metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          {/* Streak Metric */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-bold">Daily Streak</span>
              <span className="text-xl font-extrabold text-amber-400">{streakDays}d</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="w-5 h-5 fill-amber-400" />
            </div>
          </div>

          {/* Focus Today Metric */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-bold">Focus Today</span>
              <span className="text-xl font-extrabold text-blue-400">{Math.floor(focusSecondsToday / 60)}m</span>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Provisional Live Rank Metric */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-bold">Provisional Rank</span>
              <span className="text-xl font-extrabold text-cyan-400">#{provisionalGlobalRank}</span>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Free Stops Tracker & 7-Day Multi-Day Rolling Momentum Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Remaining Free Stops Tracker */}
        <div className="glass-panel p-5 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Free Stop Allowances</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Discipline Tracker</span>
          </div>

          <div className="space-y-3">
            {/* Daily Stops Meter */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-200">Daily Free Stops</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">2 Free stops allowed per day</p>
              </div>
              <span className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg border ${
                momentum.remainingStopsToday > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {momentum.remainingStopsToday} / 2 Left
              </span>
            </div>

            {/* Weekly Stops Meter */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-200">Weekly Free Stops</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">7 Free stops allowed per week</p>
              </div>
              <span className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg border ${
                momentum.remainingStopsWeek > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {momentum.remainingStopsWeek} / 7 Left
              </span>
            </div>

            {momentum.remainingStopsToday === 0 && (
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/40 text-[11px] text-red-300 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>EXHAUSTED: Excess stops now deduct -30 XP penalty!</span>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Rolling Multi-Day Momentum Velocity Graph */}
        <div className="glass-panel p-5 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-zinc-100">7-Day Rolling Momentum</h3>
            </div>

            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${momentum.badgeBg} ${momentum.color} ${momentum.badgeBorder} flex items-center gap-1`}>
              <span>{momentum.icon}</span>
              <span>{momentum.velocityTier}</span>
            </span>
          </div>

          <div className="flex items-center justify-between px-1">
            <div>
              <span className="text-2xl font-extrabold font-mono text-zinc-100">{momentum.score}%</span>
              <p className="text-[10px] text-zinc-400 font-mono">Multi-Day Rolling Acceleration</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-amber-400">{momentum.xpMultiplier}x XP Boost</span>
              <p className="text-[10px] text-zinc-500 font-mono">Current Multiplier</p>
            </div>
          </div>

          {/* 7-Day Rolling Target Bar Chart */}
          <div className="pt-2">
            <div className="flex items-end justify-between gap-2 h-24 px-2 bg-zinc-950/80 rounded-xl border border-zinc-800/80 p-2">
              {momentum.weeklyTargetLog.map((day, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      idx === 6
                        ? 'bg-gradient-to-t from-cyan-500 to-cyan-300 shadow-md shadow-cyan-500/20'
                        : day.ratio >= 1.0
                        ? 'bg-emerald-500/80'
                        : day.ratio > 0
                        ? 'bg-amber-500/80'
                        : 'bg-zinc-800'
                    }`}
                    style={{ height: `${Math.max(10, Math.round(day.ratio * 100))}%` }}
                    title={`${day.dayName}: ${day.focusMinutes}m / ${day.targetMinutes}m target (${day.isWeekend ? `Weekend ${day.targetMinutes/60}h` : `Weekday ${day.targetMinutes/60}h`})`}
                  />
                  <span className="text-[9px] font-mono text-zinc-500">
                    {day.dayName} {day.isWeekend ? '*' : ''}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-zinc-500 font-mono mt-1.5 text-center">
              * Weekend Days target {momentum.weekendTargetMins / 60}h | Weekdays target {momentum.weekdayTargetMins / 60}h
            </p>
          </div>
        </div>
      </div>

      {/* Live Momentum Calculation Breakdown Box */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Live Momentum Calculation Formula</h2>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg">
            Live Score: {momentum.score}%
          </span>
        </div>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/90 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-zinc-800/80">
            <span>Formula</span>
            <span className="text-zinc-200 font-bold">
              Score = Rolling 7-Day Consistency + Streak Bonus - Stop Friction
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
            {/* Step 1: 7-Day Weighted Focus Ratio */}
            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80 space-y-1">
              <span className="text-zinc-400 font-semibold block text-[10px] uppercase">1. Rolling 7-Day Consistency</span>
              <p className="text-zinc-200 font-bold text-sm">
                {Math.round(momentum.score - streakBonus + stopPenalty)} / 100 pts
              </p>
              <p className="text-[10px] text-zinc-500">
                Targets: Weekday {momentum.weekdayTargetMins / 60}h | Weekend {momentum.weekendTargetMins / 60}h
              </p>
            </div>

            {/* Step 2: Streak Bonus */}
            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80 space-y-1">
              <span className="text-amber-400 font-semibold block text-[10px] uppercase">2. Streak Bonus</span>
              <p className="text-amber-300 font-bold text-sm">
                +{streakBonus} pts
              </p>
              <p className="text-[10px] text-zinc-500">
                From your active {streakDays}d study streak (+3 pts/day, max 15)
              </p>
            </div>

            {/* Step 3: Stop Friction */}
            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80 space-y-1">
              <span className="text-red-400 font-semibold block text-[10px] uppercase">3. Stop Friction Penalty</span>
              <p className="text-red-300 font-bold text-sm">
                -{stopPenalty} pts
              </p>
              <p className="text-[10px] text-zinc-500">
                From {stopsToday} stopped focus sessions today (-15 pts/stop)
              </p>
            </div>
          </div>

          {/* Final Multiplier Summary */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center justify-between text-cyan-200 text-[11px]">
            <span>Active Velocity Status: <strong>{momentum.icon} {momentum.velocityTier}</strong></span>
            <span className="font-bold text-amber-300">{momentum.xpMultiplier}x XP Multiplier Active</span>
          </div>
        </div>
      </div>

      {/* Gamification & XP Math Transparency Breakdown Card */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
        <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
          <Info className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Gamification & XP Math Transparency</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* XP Economy Formula */}
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
            <h3 className="font-bold text-zinc-200 font-mono">1. Grindy Level Curve</h3>
            <p className="text-zinc-400 leading-relaxed font-mono text-[11px]">
              Level XP Cost = <span className="text-amber-400">floor(100 × Level^1.5)</span>.
              Leveling gets exponentially harder as you climb higher ranks!
            </p>
          </div>

          {/* Self-Rating Star Multipliers */}
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
            <h3 className="font-bold text-zinc-200 font-mono">2. Post-Session Focus Ratings</h3>
            <p className="text-zinc-400 leading-relaxed font-mono text-[11px]">
              ★★★★★ = <span className="text-emerald-400">2.0× (+100% XP Bonus)</span> | ★★★★☆ = 1.0× | ★★★☆☆ = 0.7× | ★★☆☆☆ = 0.3× | ★☆☆☆☆ = 0.0×
            </p>
          </div>

          {/* Stop Penalty Rules */}
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
            <h3 className="font-bold text-zinc-200 font-mono">3. Quitting & Stop Penalties</h3>
            <p className="text-zinc-400 leading-relaxed font-mono text-[11px]">
              2 Free stops/day, 7/week. Stopping past daily limit deducts <span className="text-red-400">-30 XP</span> per stop + triggers rank quitter roasts.
            </p>
          </div>

          {/* Rolling Momentum Rules */}
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
            <h3 className="font-bold text-zinc-200 font-mono">4. Rolling 7-Day Momentum</h3>
            <p className="text-zinc-400 leading-relaxed font-mono text-[11px]">
              Slacking off after a big day decays momentum. Maintain 60%+ momentum for <span className="text-cyan-400">1.2× - 1.5× XP Boosts</span>!
            </p>
          </div>
        </div>
      </div>

      {/* Rank Roadmap Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Hunter Rank Roadmap</h2>
            <p className="text-xs text-zinc-400">Progression ladder from E-Rank slacker to S-Rank Sovereign</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rankRoadmap.map((item) => {
            const isUnlocked = level >= item.minLevel;
            const isCurrent = level >= item.minLevel && level <= item.maxLevel;

            return (
              <div
                key={item.rank}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                  isCurrent
                    ? `${item.bgStyle} ${item.borderStyle} ring-1 ring-amber-500/20 shadow-md`
                    : isUnlocked
                    ? 'bg-zinc-950/60 border-zinc-800'
                    : 'bg-zinc-950/30 border-zinc-800/60 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${item.bgStyle} ${item.color} ${item.borderStyle}`}
                    >
                      {item.rank}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{item.levelRange}</span>
                  </div>

                  {isCurrent ? (
                    <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Current
                    </span>
                  ) : isUnlocked ? (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                <div>
                  <h3 className={`text-sm font-bold ${isUnlocked ? 'text-zinc-100' : 'text-zinc-400'}`}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to Earn XP Section */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>How to Earn XP & Level Up</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex items-center space-x-1.5 text-blue-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Focus Timer</span>
            </div>
            <p className="text-zinc-400 leading-normal">
              <strong>+15 XP</strong> for every 25m Focus Session (+5 XP per extra 10m).
            </p>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Active Recall</span>
            </div>
            <p className="text-zinc-400 leading-normal">
              <strong>+25 XP</strong> for 100% test recall score (+15 XP for 80%+).
            </p>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex items-center space-x-1.5 text-purple-400 font-semibold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Syllabus Master</span>
            </div>
            <p className="text-zinc-400 leading-normal">
              <strong>+30 XP</strong> for completing a subtopic in the Syllabus Hub.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
