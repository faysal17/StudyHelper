'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const DEMO_SESSION_KEY = 'studyhub_user_session';

function hasLocalDemoSession(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(DEMO_SESSION_KEY));
}

// Single, consistent auth gate for every route except /login — replaces the
// several inconsistent per-page checks (some pages had one, most didn't;
// see AUDIT.md section 1.2). Checks the session once on mount and reacts to
// real sign-in/sign-out events afterward rather than re-checking on every
// navigation, which would just add to the app's already-documented
// redundant-request problem.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        setAuthenticated(Boolean(data?.session));
        setChecking(false);
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        setAuthenticated(Boolean(session));
        setChecking(false);
      });

      return () => {
        active = false;
        sub.subscription.unsubscribe();
      };
    }

    setAuthenticated(hasLocalDemoSession());
    setChecking(false);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (checking || authenticated || pathname === '/login') return;
    router.push('/login');
  }, [checking, authenticated, pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (checking || !authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return <>{children}</>;
}
