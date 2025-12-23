import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL || 'https://qrouuoycvxxxutkxkxpp.supabase.co',
  envVars.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3V1b3ljdnh4eHV0a3hreHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODMyNDgsImV4cCI6MjA3Nzc1OTI0OH0.LXKVdTXNgHgoILlHJcSaGnzyWlaT0-oBxbEgl5ipA48'
);

async function checkData() {
  console.log('\n=== INVESTIGATING DATA MISMATCH ===\n');

  // Check all claims
  const { data: allClaims } = await supabase
    .from('claims')
    .select('id, firm_name, status, appointment_start, completion_date, file_total, pay_amount')
    .limit(20);

  console.log('Total claims fetched:', allClaims?.length || 0);
  console.log('\nSample claims with their fields:');
  allClaims?.slice(0, 10).forEach(c => {
    console.log(`  - Firm: ${c.firm_name || 'null'}`);
    console.log(`    Status: ${c.status}`);
    console.log(`    Appointment: ${c.appointment_start || 'null'}`);
    console.log(`    Completion: ${c.completion_date || 'null'}`);
    console.log(`    file_total: ${c.file_total || 'null'}`);
    console.log(`    pay_amount: ${c.pay_amount || 'null'}`);
    console.log('');
  });

  // Check claims with appointments
  const { data: scheduled } = await supabase
    .from('claims')
    .select('id, firm_name, status, appointment_start, file_total, pay_amount')
    .not('appointment_start', 'is', null);

  console.log(`\nClaims with appointments: ${scheduled?.length || 0}`);

  // Check claims with file_total or pay_amount
  const { data: withAmounts } = await supabase
    .from('claims')
    .select('id, firm_name, status, file_total, pay_amount')
    .or('file_total.gt.0,pay_amount.gt.0');

  console.log(`Claims with file_total or pay_amount > 0: ${withAmounts?.length || 0}`);

  // Check completed claims
  const { data: completed } = await supabase
    .from('claims')
    .select('id, firm_name, status, completion_date, file_total')
    .eq('status', 'COMPLETED');

  console.log(`Claims with COMPLETED status: ${completed?.length || 0}`);

  // Group claims by status
  const statusCounts = {};
  allClaims?.forEach(c => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  console.log('\nClaims by status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  process.exit(0);
}

checkData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
