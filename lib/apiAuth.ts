import { NextRequest } from 'next/server';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface AuthenticatedRequest {
  user: User;
  // Scoped to the caller's JWT, so RLS applies to every query made with it.
  supabase: SupabaseClient;
}

// Verifies the bearer token a client sent and returns a Supabase client
// scoped to that user (RLS-enforced), or null if the request isn't from an
// authenticated session. Route handlers must reject on null rather than
// falling back to any default/unauthenticated behavior.
export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedRequest | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return { user: data.user, supabase };
}
