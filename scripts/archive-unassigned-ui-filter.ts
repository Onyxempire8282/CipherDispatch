/**
 * Script to assign unassigned claims to Arianna and archive them
 * Uses EXACT same filters as the Admin UI
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Finding Arianna in profiles...\n');

  // Step 1: Find Arianna's user_id
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, full_name, role')
    .ilike('full_name', '%arianna%');

  if (profileError) {
    console.error('❌ Error finding Arianna:', profileError);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.error('❌ Arianna not found in profiles table');
    process.exit(1);
  }

  const arianna = profiles[0];
  console.log('✅ Found Arianna:');
  console.log(`   Name: ${arianna.full_name}`);
  console.log(`   Role: ${arianna.role}`);
  console.log(`   ID: ${arianna.user_id}\n`);

  // Step 2: Get unassigned claims using EXACT same filters as Admin UI
  const { data: unassignedClaims, error: claimsError } = await supabase
    .from('claims')
    .select('id, claim_number, customer_name, status, created_at, assigned_to, archived_at')
    .is('archived_at', null)  // Active claims only
    .gte('created_at', '2025-12-01T00:00:00.000Z')  // Dec 1, 2025 or later
    .or('status.is.null,status.in.(SCHEDULED,IN_PROGRESS,COMPLETED)')  // Active statuses
    .is('assigned_to', null)  // Unassigned only
    .order('created_at', { ascending: false });

  if (claimsError) {
    console.error('❌ Error fetching unassigned claims:', claimsError);
    process.exit(1);
  }

  const count = unassignedClaims?.length || 0;
  console.log(`📊 Found ${count} unassigned claims matching UI filters\n`);

  if (count === 0) {
    console.log('✅ No unassigned claims to archive');
    process.exit(0);
  }

  // Step 3: Show preview of claims to be archived
  console.log('📋 Claims to be archived:');
  unassignedClaims.forEach(c => {
    const date = new Date(c.created_at).toLocaleDateString();
    console.log(`   - ${c.claim_number}: ${c.customer_name} (${date}, ${c.status || 'UNASSIGNED'})`);
  });
  console.log('');

  // Step 4: Confirm action
  console.log(`⚠️  About to:`);
  console.log(`   - Assign ${count} claims to ${arianna.full_name}`);
  console.log(`   - Archive them (set archived_at = NOW())`);
  console.log(`   - They will disappear from all UI views\n`);

  // Step 5: Update claims
  console.log(`🔄 Executing update...\n`);

  const claimIds = unassignedClaims.map(c => c.id);

  const { error: updateError } = await supabase
    .from('claims')
    .update({
      assigned_to: arianna.user_id,
      archived_at: new Date().toISOString()
    })
    .in('id', claimIds);

  if (updateError) {
    console.error('❌ Error updating claims:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully assigned and archived claims!');
  console.log(`   - Assigned to: ${arianna.full_name}`);
  console.log(`   - Archived at: ${new Date().toISOString()}`);
  console.log(`   - Total claims: ${count}\n`);

  // Verify
  const { data: remainingUnassigned } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .is('archived_at', null)
    .gte('created_at', '2025-12-01T00:00:00.000Z')
    .or('status.is.null,status.in.(SCHEDULED,IN_PROGRESS,COMPLETED)')
    .is('assigned_to', null);

  const remainingCount = remainingUnassigned?.length || 0;
  console.log(`✅ Verification: ${remainingCount} unassigned claims remaining in UI\n`);
}

main().catch(console.error);
