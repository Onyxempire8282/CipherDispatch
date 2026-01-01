/**
 * Value Efficiency API Endpoint
 * Returns profit density analysis by firm (revenue per claim) as JSON
 * Access at: /api/value-efficiency
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  generateValueEfficiencyReport,
  ValueEfficiencyReport,
} from "../../utils/valueEfficiency";

export default function ValueEfficiencyAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<ValueEfficiencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get("pretty");
  const isPretty = prettyParam === "true" || prettyParam === "1";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await generateValueEfficiencyReport();
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to generate value efficiency report");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Return JSON response
  const renderJSON = () => {
    if (loading) {
      return {
        status: "loading",
        message: "Generating value efficiency report...",
      };
    }

    if (error) {
      return {
        status: "error",
        error: error,
        timestamp: new Date().toISOString(),
      };
    }

    return data;
  };

  const jsonContent = JSON.stringify(
    renderJSON(),
    null,
    isPretty ? 2 : undefined
  );

  return (
    <div>
      <pre
        style={{
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          margin: 0,
          fontSize: "14px",
        }}
      >
        {jsonContent}
      </pre>
    </div>
  );
}
