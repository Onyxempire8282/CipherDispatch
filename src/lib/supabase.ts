import { createClient } from '@supabase/supabase-js';
import { supabaseCD } from './supabaseCD';
import { getSupabaseAuthz } from './supabaseAuthz';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export async function getCurrentFirmId(): Promise<string | null> {
  // Use auth context to get user ID — supabaseCD uses service role key
  // so auth.getUser() returns null on it
  const authz = getSupabaseAuthz();
  const userId = authz?.getCurrentUser()?.id;
  if (!userId) return null;
  const { data } = await supabaseCD
    .from('profiles')
    .select('firm_id')
    .eq('user_id', userId)
    .single();
  return data?.firm_id ?? null;
}
