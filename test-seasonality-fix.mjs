// Test script to validate the seasonality fix
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  "https://your-supabase-url.supabase.co",
  "your-anon-key"
);

async function testSeasonalityFix() {
  console.log("🔍 TESTING CRITICAL SEASONALITY FIX");
  console.log("==================================\n");

  try {
    // Test 1: Check raw claims data
    const { data: rawClaims, error: rawError } = await supabase
      .from("claims")
      .select("firm_name, completion_date, status")
      .eq("status", "COMPLETED")
      .not("completion_date", "is", null)
      .not("firm_name", "is", null);

    if (rawError) {
      console.error("❌ Error fetching raw claims:", rawError.message);
      return;
    }

    console.log(
      `✅ Found ${rawClaims.length} completed claims in claims table\n`
    );

    // Group by firm and month
    const monthlyGroups = {};
    for (const claim of rawClaims) {
      const date = new Date(claim.completion_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${claim.firm_name}-${year}-${month}`;

      monthlyGroups[key] = (monthlyGroups[key] || 0) + 1;
    }

    console.log("📊 Live Claims Data by Firm/Month:");
    const sortedKeys = Object.keys(monthlyGroups).sort();
    for (const key of sortedKeys.slice(0, 20)) {
      // Show first 20
      const [firm, year, month] = key.split("-");
      const count = monthlyGroups[key];
      console.log(
        `  ${firm} ${year}-${month.padStart(2, "0")}: ${count} completed`
      );
    }

    // Check specific validation cases
    const acdDec2025 = monthlyGroups["ACD-2025-12"] || 0;
    const heaJan2025 = monthlyGroups["HEA-2025-1"] || 0;

    console.log("\n🎯 VALIDATION TARGETS:");
    console.log(`  ACD December 2025: ${acdDec2025} (should be 10)`);
    console.log(`  HEA January 2025: ${heaJan2025} (should be 13)`);

    if (acdDec2025 === 10) {
      console.log("  ✅ ACD December 2025 validation PASSED");
    } else {
      console.log("  ❌ ACD December 2025 validation FAILED");
    }

    if (heaJan2025 === 13) {
      console.log("  ✅ HEA January 2025 validation PASSED");
    } else {
      console.log("  ❌ HEA January 2025 validation FAILED");
    }
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
}

// Test if this file exists for quick validation
if (typeof process !== "undefined" && process.argv) {
  testSeasonalityFix();
}

export { testSeasonalityFix };
