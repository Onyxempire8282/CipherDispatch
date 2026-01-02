/**
 * Completed Claims By Month API Endpoint
 * Returns completed claims grouped by firm, year, month from live claims table
 * Access at: /api/completed-claims-by-month
 */

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface CompletedClaimData {
  firm: string;
  year: number;
  month: number;
  completed: number;
}

export default function CompletedClaimsByMonthAPI() {
  const [data, setData] = useState<CompletedClaimData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompletedClaims() {
      try {
        console.log(
          "🔍 Fetching completed claims by month from live claims table..."
        );

        // Query claims table directly for live data
        const { data: claims, error } = await supabase
          .from("claims")
          .select("firm_name, completion_date")
          .eq("status", "COMPLETED")
          .not("completion_date", "is", null)
          .not("firm_name", "is", null);

        if (error) {
          throw new Error(`Failed to fetch completed claims: ${error.message}`);
        }

        if (!claims || claims.length === 0) {
          console.warn("⚠️ No completed claims found in claims table");
          setData([]);
          setLoading(false);
          return;
        }

        console.log(`✅ Found ${claims.length} completed claims`);

        // Group by firm, year, month
        const groupedData: { [key: string]: number } = {};

        for (const claim of claims) {
          const completionDate = new Date(claim.completion_date);
          const year = completionDate.getFullYear();
          const month = completionDate.getMonth() + 1; // 1-12

          const key = `${claim.firm_name}-${year}-${month}`;
          groupedData[key] = (groupedData[key] || 0) + 1;
        }

        // Convert to array format
        const result: CompletedClaimData[] = [];
        for (const [key, count] of Object.entries(groupedData)) {
          const [firm, yearStr, monthStr] = key.split("-");
          result.push({
            firm: firm,
            year: parseInt(yearStr),
            month: parseInt(monthStr),
            completed: count,
          });
        }

        // Sort by year, month, firm for consistent output
        result.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          if (a.month !== b.month) return a.month - b.month;
          return a.firm.localeCompare(b.firm);
        });

        console.log(`📊 Grouped into ${result.length} firm/month combinations`);
        setData(result);
      } catch (err: any) {
        console.error("❌ Error fetching completed claims by month:", err);
        setError(err.message || "Failed to fetch completed claims data");
      } finally {
        setLoading(false);
      }
    }

    fetchCompletedClaims();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#666" }}>
        <h2>Loading...</h2>
        <p>Fetching completed claims by month...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "#e74c3c" }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>Completed Claims By Month API</h2>
      <p>Live data from claims table (status = 'COMPLETED')</p>
      <p>
        <strong>Total entries:</strong> {data.length}
      </p>
      <pre style={{ background: "#f4f4f4", padding: 10 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
