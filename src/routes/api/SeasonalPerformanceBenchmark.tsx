/**
 * Seasonal Performance Benchmark API Endpoint
 * Returns seasonal performance index comparison as JSON
 * Access at: /api/seasonal-performance-benchmark
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  generateSeasonalPerformanceBenchmarkReport,
  SeasonalPerformanceBenchmarkReport,
} from "../../utils/seasonalPerformanceBenchmark";

export default function SeasonalPerformanceBenchmarkAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<SeasonalPerformanceBenchmarkReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get("pretty");
  const isPretty = prettyParam === "true" || prettyParam === "1";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await generateSeasonalPerformanceBenchmarkReport();
        setData(result);
      } catch (err: any) {
        setError(
          err.message ||
            "Failed to generate seasonal performance benchmark report"
        );
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
        message: "Generating seasonal performance benchmark report...",
      };
    }

    if (error) {
      return {
        status: "error",
        error: error,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: "success",
      data: data || null,
      timestamp: new Date().toISOString(),
    };
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
