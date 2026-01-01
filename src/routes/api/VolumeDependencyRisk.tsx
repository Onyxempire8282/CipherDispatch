/**
 * Volume Dependency Risk API Endpoint
 * Returns operational dependency risk analysis based on claim volume as JSON
 * Access at: /api/volume-dependency-risk
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  generateVolumeDependencyRiskReport,
  VolumeDependencyRiskReport,
} from "../../utils/volumeDependencyRisk";

export default function VolumeDependencyRiskAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<VolumeDependencyRiskReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get("pretty");
  const isPretty = prettyParam === "true" || prettyParam === "1";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await generateVolumeDependencyRiskReport();
        setData(result);
      } catch (err: any) {
        setError(
          err.message || "Failed to generate volume dependency risk report"
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
        message: "Generating volume dependency risk report...",
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
