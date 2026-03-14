import { createClient } from '@supabase/supabase-js';

export const supabaseCD = createClient(
  import.meta.env.VITE_CD_SUPABASE_URL!,
  import.meta.env.VITE_CD_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true
    }
  }
);
