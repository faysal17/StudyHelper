'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Calendar, CheckSquare, PlusCircle, Database, Sparkles, Layers } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import TaskCreatorModal from './TaskCreatorModal';

export default function Navbar() {
  const pathname = usePathname();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [showDbInfo, setShowDbInfo] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-100 group-hover:text-emerald-400 transition-colors block leading-tight">
                  BCS StudyHelper
                </span>
                <span className="text-xs text-emerald-400/90 font-medium block">
                  বিসিএস স্টাডি হাব & স্পেসড রিপিটিশন
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                href="/"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  pathname === '/'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>ড্যাশবোর্ড (Dashboard)</span>
              </Link>

              <Link
                href="/tasks"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  pathname === '/tasks'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>টাস্ক লাইব্রেরি (Tasks)</span>
              </Link>
            </nav>

            {/* Action Buttons & DB Status */}
            <div className="flex items-center space-x-3">
              {/* DB Status Badge */}
              <button
                onClick={() => setShowDbInfo(true)}
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isSupabaseConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                }`}

              >
                <Database className="w-3.5 h-3.5" />
                <span>{isSupabaseConfigured ? 'Supabase Connected' : 'Local Demo Mode'}</span>
              </button>

              {/* Create Task Button */}
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-2"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>নতুন টাস্ক (Add Task)</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* DB Info Modal */}
      {showDbInfo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center space-x-3 mb-4 text-emerald-400">
              <Database className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-100">Database & Storage Status</h3>
            </div>
            {isSupabaseConfigured ? (
              <p className="text-sm text-slate-300 mb-4">
                Your application is actively connected to Supabase Database & Storage bucket <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">scanned-notes</code>.
              </p>
            ) : (
              <div className="space-y-3 text-sm text-slate-300 mb-4">
                <p>
                  You are currently using the built-in <strong className="text-amber-400">Local Persistent Mock Mode</strong>. All subjects, topics, tasks, image compressions, overlays, and revision schedules are saved in your browser storage.
                </p>
                <p>
                  To connect your real Supabase instance, create a <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">.env.local</code> file with:
                </p>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-emerald-400 overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}
                </pre>
                <p className="text-xs text-slate-400">
                  Run <code className="text-slate-200">supabase_schema.sql</code> in your Supabase SQL Editor to create tables with RLS policies and storage bucket.
                </p>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDbInfo(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creator Modal */}
      <TaskCreatorModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={() => {
          setIsTaskModalOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
