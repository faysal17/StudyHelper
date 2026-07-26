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

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Layers },
    { href: '/rank', label: 'Rank Hub', icon: Calendar },
    { href: '/tasks', label: 'Task Library', icon: CheckSquare },
    { href: '/syllabus', label: 'Syllabus', icon: ListTree },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Left: App Brand & Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-bold font-mono text-zinc-950 group-hover:scale-105 transition-transform shadow-sm">
                BCS
              </div>
              <span className="text-sm font-bold text-zinc-100 hidden sm:inline-block tracking-tight">
                Hunter System
              </span>
            </Link>

            <nav className="flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Quick Action Controls & User Account */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Task</span>
            </button>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            {/* Username Badge */}
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
                  pathname === '/tools'
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
