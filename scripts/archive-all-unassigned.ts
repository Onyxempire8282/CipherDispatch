/**
 * Archive ALL unassigned claims (no date restriction)
 * These are historical imports that should be archived
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  // Find Arianna
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .ilike('full_name', '%arianna%');

  if (!profiles || profiles.length === 0) {
    console.error('❌ Arianna not found');
    process.exit(1);
  }

  const arianna = profiles[0];
  console.log(`✅ Found: ${arianna.full_name} (${arianna.user_id})\n`);

  // Get ALL unassigned claims (no date filter, no status filter)
  const { data: unassigned } = await supabase
    .from('claims')
    .select('id, claim_number, customer_name, status, created_at')
    .is('assigned_to', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (!unassigned || unassigned.length === 0) {
    console.log('✅ No unassigned claims to archive');
    process.exit(0);
  }

  console.log(`📊 Found ${unassigned.length} unassigned claims\n`);

  console.log('Claims to archive:');
  unassigned.forEach(c => {
    const date = new Date(c.created_at).toLocaleDateString();
    console.log(`  ${c.claim_number}: ${c.customer_name} [${c.status || 'UNASSIGNED'}] (${date})`);
  });

  console.log(`\n🔄 Assigning to ${arianna.full_name} and archiving...\n`);

  const { error } = await supabase
    .from('claims')
    .update({
      assigned_to: arianna.user_id,
      archived_at: new Date().toISOString()
    })
    .in('id', unassigned.map(c => c.id));

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`✅ Success! Archived ${unassigned.length} claims`);
  console.log(`   Assigned to: ${arianna.full_name}`);
  console.log(`   Archived at: ${new Date().toISOString()}\n`);
}

main();
