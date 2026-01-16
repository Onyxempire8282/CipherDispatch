/**
 * Script to assign unassigned claims to Arianna and archive them
 * Run with: npx tsx scripts/archive-unassigned.ts
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

  // Step 2: Count unassigned claims
  const { count, error: countError } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .is('assigned_to', null)
    .is('archived_at', null);

  if (countError) {
    console.error('❌ Error counting unassigned claims:', countError);
    process.exit(1);
  }

  console.log(`📊 Found ${count} unassigned claims\n`);

  if (count === 0) {
    console.log('✅ No unassigned claims to archive');
    process.exit(0);
  }

  // Step 3: Show preview of claims to be archived
  const { data: previewClaims, error: previewError } = await supabase
    .from('claims')
    .select('claim_number, customer_name, created_at')
    .is('assigned_to', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!previewError && previewClaims) {
    console.log('📋 Preview of claims to be archived (first 10):');
    previewClaims.forEach(c => {
      console.log(`   - ${c.claim_number}: ${c.customer_name} (${new Date(c.created_at).toLocaleDateString()})`);
    });
    console.log('');
  }

  // Step 4: Update claims
  console.log(`🔄 Assigning ${count} claims to Arianna and archiving...\n`);

  const { error: updateError } = await supabase
    .from('claims')
    .update({
      assigned_to: arianna.user_id,
      archived_at: new Date().toISOString()
    })
    .is('assigned_to', null)
    .is('archived_at', null);

  if (updateError) {
    console.error('❌ Error updating claims:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully assigned and archived claims!');
  console.log(`   - Assigned to: ${arianna.full_name}`);
  console.log(`   - Archived at: ${new Date().toISOString()}`);
  console.log(`   - Total claims: ${count}\n`);

  // Verify
  const { count: remainingCount } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .is('assigned_to', null)
    .is('archived_at', null);

  console.log(`✅ Verification: ${remainingCount} unassigned claims remaining\n`);
}

main().catch(console.error);
