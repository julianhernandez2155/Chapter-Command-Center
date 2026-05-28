import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables in client configuration.');
}

const appAuthLock = async <T,>(_name: string, _acquireTimeout: number, fn: () => Promise<T>) => fn();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'chapter-command-center-auth',
    lock: appAuthLock,
    lockAcquireTimeout: 2000,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
