/**
 * Check for ALL unassigned claims regardless of filters
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Checking ALL unassigned claims (no filters)...\n');

  // Check all unassigned claims (no archived filter, no date filter)
  const { data: allUnassigned, error } = await supabase
    .from('claims')
    .select('claim_number, customer_name, status, created_at, assigned_to, archived_at')
    .is('assigned_to', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`📊 Total unassigned claims in database: ${allUnassigned?.length || 0}\n`);

  if (allUnassigned && allUnassigned.length > 0) {
    console.log('📋 Breakdown:');

    const active = allUnassigned.filter(c => !c.archived_at);
    const archived = allUnassigned.filter(c => c.archived_at);
    const beforeDec = allUnassigned.filter(c => c.created_at < '2025-12-01');

    console.log(`   Active (not archived): ${active.length}`);
    console.log(`   Already archived: ${archived.length}`);
    console.log(`   Created before Dec 1, 2025: ${beforeDec.length}\n`);

    console.log('First 20 unassigned claims:');
    allUnassigned.slice(0, 20).forEach(c => {
      const date = new Date(c.created_at).toLocaleDateString();
      const archivedFlag = c.archived_at ? ' [ARCHIVED]' : '';
      console.log(`   - ${c.claim_number}: ${c.customer_name} (${date})${archivedFlag}`);
    });
  }
}

main().catch(console.error);
