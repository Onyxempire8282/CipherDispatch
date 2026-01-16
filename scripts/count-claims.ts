import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data: allClaims } = await supabase
    .from('claims')
    .select('id, claim_number, assigned_to, status, archived_at, created_at')
    .gte('created_at', '2025-12-01');

  if (!allClaims) {
    console.log('No claims found');
    return;
  }

  console.log(`\nTotal claims after Dec 1, 2025: ${allClaims.length}`);

  const active = allClaims.filter(c => !c.archived_at);
  const archived = allClaims.filter(c => c.archived_at);
  const unassigned = active.filter(c => !c.assigned_to);
  const assigned = active.filter(c => c.assigned_to);

  console.log(`\nActive (not archived): ${active.length}`);
  console.log(`  - Unassigned: ${unassigned.length}`);
  console.log(`  - Assigned: ${assigned.length}`);
  console.log(`\nArchived: ${archived.length}\n`);

  if (unassigned.length > 0) {
    console.log('Unassigned claims:');
    unassigned.forEach(c => {
      console.log(`  ${c.claim_number}: ${c.status || 'NULL'}`);
    });
  }
}

main();
