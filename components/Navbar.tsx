'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, Calendar, CheckSquare, Plus, Database } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import TaskCreatorModal from './TaskCreatorModal';

export default function Navbar() {
  const pathname = usePathname();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            {/* Minimal Logo */}
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-950 shadow-sm group-hover:scale-105 transition-transform">
                <Layers className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-zinc-300 transition-colors">
                StudyHub
              </span>
            </Link>

            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 ${
                  pathname === '/'
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/tasks"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 ${
                  pathname === '/tasks'
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Tasks</span>
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <span
                className={`hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${
                  isSupabaseConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
                title={isSupabaseConfigured ? 'Connected to Supabase' : 'Local Storage Mode'}
              >
                <Database className="w-3 h-3" />
                <span>{isSupabaseConfigured ? 'Supabase' : 'Local'}</span>
              </span>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all shadow-sm flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        </div>
      </header>

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
