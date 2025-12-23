import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL || 'https://qrouuoycvxxxutkxkxpp.supabase.co',
  envVars.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3V1b3ljdnh4eHV0a3hreHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODMyNDgsImV4cCI6MjA3Nzc1OTI0OH0.LXKVdTXNgHgoILlHJcSaGnzyWlaT0-oBxbEgl5ipA48'
);

async function checkFirmNames() {
  console.log('\n=== CHECKING ACTUAL FIRM NAMES IN DATABASE ===\n');

  // Get all unique firm names
  const { data: claims, error } = await supabase
    .from('claims')
    .select('firm_name, status, appointment_start, completion_date, pay_amount, file_total')
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total claims fetched: ${claims.length}\n`);

  // Get unique firm names
  const firmNames = new Set();
  claims.forEach(c => {
    if (c.firm_name) firmNames.add(c.firm_name);
  });

  console.log('UNIQUE FIRM NAMES IN DATABASE:');
  console.log('================================');
  Array.from(firmNames).sort().forEach(name => {
    const count = claims.filter(c => c.firm_name === name).length;
    const withScheduled = claims.filter(c => c.firm_name === name && c.appointment_start).length;
    const withAmount = claims.filter(c => c.firm_name === name && (c.pay_amount || c.file_total)).length;

    console.log(`\n"${name}"`);
    console.log(`  Total claims: ${count}`);
    console.log(`  With appointments: ${withScheduled}`);
    console.log(`  With amounts: ${withAmount}`);
  });

  // Check for ClaimSolution specifically
  console.log('\n\n=== SEARCHING FOR CLAIMSOLUTION ===');
  const claimSolutionVariations = claims.filter(c =>
    c.firm_name && (
      c.firm_name.toLowerCase().includes('claim') ||
      c.firm_name.toLowerCase().includes('solution')
    )
  );

  console.log(`Found ${claimSolutionVariations.length} claims with "claim" or "solution" in firm name:`);
  claimSolutionVariations.forEach(c => {
    console.log(`  - "${c.firm_name}" (${c.status}, ${c.pay_amount || c.file_total || 'no amount'})`);
  });

  process.exit(0);
}

checkFirmNames().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
