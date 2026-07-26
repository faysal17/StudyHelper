'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Layers, Calendar, CheckSquare, ListTree, Plus, LogOut, User, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import TaskCreatorModal from './TaskCreatorModal';
import Tooltip from './Tooltip';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    } else {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('studyhub_user_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.email) setUserEmail(parsed.email);
          } catch {}
        }
      }
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('studyhub_user_session');
    }
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between relative">
          {/* Left-most: StudyHub Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-950 shadow-sm group-hover:scale-105 transition-transform">
                <Layers className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-zinc-300 transition-colors">
                StudyHub
              </span>
            </Link>
          </div>

          {/* Centered Navigation Tabs (Order: Dashboard -> Tasks -> Syllabus -> Rank Hub) */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center space-x-1">
            {/* 1. Dashboard */}
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 ${
                pathname === '/'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            {/* 2. Tasks */}
            <Link
              href="/tasks"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 ${
                pathname === '/tasks'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
            </Link>

            {/* 3. Syllabus */}
            <Link
              href="/syllabus"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 ${
                pathname === '/syllabus' || pathname === '/topics'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Syllabus</span>
            </Link>

            {/* 4. Rank Hub */}
            <Link
              href="/rank"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 ${
                pathname === '/rank'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Rank Hub</span>
            </Link>
          </nav>

          {/* Right-most Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all shadow-sm flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Task</span>
            </button>

            {userEmail && (
              <span className="hidden lg:flex items-center space-x-1.5 text-xs text-zinc-400 font-mono bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                <User className="w-3 h-3 text-zinc-500" />
                <span className="truncate max-w-[140px]">{userEmail}</span>
              </span>
            )}

            {/* Tools Icon Link */}
            <Tooltip content="Hunter Tools Hub">
              <Link
                href="/tools"
                className={`p-2 rounded-lg border transition-colors ${
                  pathname === '/tools' || pathname.startsWith('/tools/')
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Wrench className="w-4 h-4 text-amber-400" />
              </Link>
            </Tooltip>

            {/* Settings Icon Link */}
            <Tooltip content="User Settings">
              <Link
                href="/settings"
                className={`p-2 rounded-lg border transition-colors ${
                  pathname === '/settings'
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
              </Link>
            </Tooltip>

            {/* Logout / Sign Out Button */}
            <Tooltip content="Sign Out">
              <button
                onClick={handleSignOut}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <TaskCreatorModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={() => {
          if (typeof window !== 'undefined') window.location.reload();
        }}
      />
    </>
  );
}
