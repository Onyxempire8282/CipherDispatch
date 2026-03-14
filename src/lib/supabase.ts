import { createClient } from '@supabase/supabase-js';
import { supabaseCD } from './supabaseCD';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export async function getCurrentFirmId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabaseCD
    .from('profiles')
    .select('firm_id')
    .eq('user_id', user.id)
    .single();
  return data?.firm_id ?? null;
}
