/**
 * Find ALL unassigned claims with different filter combinations
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Checking unassigned claims with various filters...\n');

  // Test 1: Just unassigned, no other filters
  const { data: test1 } = await supabase
    .from('claims')
    .select('id, claim_number, customer_name, status, created_at, archived_at')
    .is('assigned_to', null);

  console.log(`Test 1: ALL unassigned (no filters): ${test1?.length || 0}`);

  // Test 2: Unassigned + not archived
  const { data: test2 } = await supabase
    .from('claims')
    .select('id, claim_number, customer_name, status, created_at, archived_at')
    .is('assigned_to', null)
    .is('archived_at', null);

  console.log(`Test 2: Unassigned + active: ${test2?.length || 0}`);

  // Test 3: Unassigned + not archived + after Dec 1
  const { data: test3 } = await supabase
    .from('claims')
    .select('id, claim_number, customer_name, status, created_at, archived_at')
    .is('assigned_to', null)
    .is('archived_at', null)
    .gte('created_at', '2025-12-01T00:00:00.000Z');

  console.log(`Test 3: Unassigned + active + after Dec 1: ${test3?.length || 0}`);

  // Test 4: Full UI filter
  const { data: test4 } = await supabase
    .from('claims')
    .select('id, claim_number, customer_name, status, created_at, archived_at')
    .is('assigned_to', null)
    .is('archived_at', null)
    .gte('created_at', '2025-12-01T00:00:00.000Z')
    .or('status.is.null,status.in.(SCHEDULED,IN_PROGRESS,COMPLETED)');

  console.log(`Test 4: Full UI filter: ${test4?.length || 0}\n`);

  // Show breakdown by status
  if (test2 && test2.length > 0) {
    console.log('Status breakdown (unassigned + active):');
    const statusCount = test2.reduce((acc, c) => {
      const status = c.status || 'NULL';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log('');
  }

  // Show first 10 unassigned claims
  if (test2 && test2.length > 0) {
    console.log('First 10 unassigned active claims:');
    test2.slice(0, 10).forEach(c => {
      const date = new Date(c.created_at).toLocaleDateString();
      console.log(`   ${c.claim_number}: ${c.customer_name} [${c.status || 'NULL'}] (${date})`);
    });
  }
}

main().catch(console.error);
