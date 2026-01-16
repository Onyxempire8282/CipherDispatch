import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  console.log('Connecting to:', process.env.VITE_SUPABASE_URL);
  console.log('');

  const { count: totalCount } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true });

  console.log(`Total claims in database: ${totalCount}`);

  const { data: sample } = await supabase
    .from('claims')
    .select('claim_number, assigned_to, archived_at, created_at, status')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\nFirst 5 claims:');
  sample?.forEach(c => {
    const assigned = c.assigned_to ? 'ASSIGNED' : 'UNASSIGNED';
    const archived = c.archived_at ? 'ARCHIVED' : 'ACTIVE';
    const date = new Date(c.created_at).toLocaleDateString();
    console.log(`  ${c.claim_number}: ${assigned}, ${archived}, ${c.status || 'NULL'} (${date})`);
  });

  const { count: unassignedCount } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .is('assigned_to', null);

  console.log(`\nTotal unassigned (any status, any date): ${unassignedCount}`);

  const { count: activeUnassignedCount } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .is('assigned_to', null)
    .is('archived_at', null);

  console.log(`Active unassigned: ${activeUnassignedCount}`);
}

main();
