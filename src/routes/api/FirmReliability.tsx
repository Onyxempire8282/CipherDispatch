/**
 * Firm Reliability API Endpoint
 * Returns firm reliability metrics as JSON
 * Access at: /api/firm-reliability
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateFirmReliabilityReport, getFirmMetrics, FirmReliabilityReport, FirmReliabilityMetrics } from '../../utils/firmReliability';

export default function FirmReliabilityAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<FirmReliabilityReport | FirmReliabilityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firmParam = searchParams.get('firm');
  const prettyParam = searchParams.get('pretty');
  const isPretty = prettyParam === 'true' || prettyParam === '1';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        let result: FirmReliabilityReport | FirmReliabilityMetrics | null;

        if (firmParam) {
          // Get metrics for specific firm
          result = await getFirmMetrics(firmParam);
          if (!result) {
            setError(`Firm not found: ${firmParam}`);
            setLoading(false);
            return;
          }
        } else {
          // Get all firms
          result = await generateFirmReliabilityReport();
        }

        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to generate reliability report');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [firmParam]);

  // Return JSON response
  const renderJSON = () => {
    if (loading) {
      return {
        status: 'loading',
        message: 'Generating firm reliability metrics...'
      };
    }

    if (error) {
      return {
        status: 'error',
        message: error
      };
    }

    return {
      status: 'success',
      data
    };
  };

  const jsonResponse = renderJSON();
  const jsonString = isPretty
    ? JSON.stringify(jsonResponse, null, 2)
    : JSON.stringify(jsonResponse);

  return (
    <div style={{
      fontFamily: 'monospace',
      padding: '20px',
      background: '#1a202c',
      color: '#e2e8f0',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#2d3748',
          borderRadius: '8px',
          border: '1px solid #4a5568'
        }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#667eea', fontSize: '24px' }}>
            Firm Reliability API
          </h1>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>
            <div>Endpoint: <code>/api/firm-reliability</code></div>
            <div style={{ marginTop: '8px' }}>
              <strong>Query Parameters:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>?firm=FirmName</code> - Get metrics for specific firm</li>
              <li><code>?pretty=true</code> - Pretty-print JSON output</li>
            </ul>
            <div style={{ marginTop: '8px' }}>
              <strong>Examples:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>/api/firm-reliability</code> - All firms</li>
              <li><code>/api/firm-reliability?pretty=true</code> - All firms (pretty)</li>
              <li><code>/api/firm-reliability?firm=Sedgwick</code> - Specific firm</li>
            </ul>
          </div>
        </div>

        <div style={{
          background: '#0d1117',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #30363d',
          overflow: 'auto'
        }}>
          <pre style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '13px',
            lineHeight: '1.6'
          }}>
            {jsonString}
          </pre>
        </div>

        {!loading && !error && data && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: '#2d3748',
            borderRadius: '8px',
            border: '1px solid #4a5568',
            fontSize: '14px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Data Summary</h3>
            {'overall_summary' in data ? (
              <div>
                <div>Total Firms: <strong>{data.total_firms}</strong></div>
                <div>Total Claims Tracked: <strong>{data.overall_summary.total_claims_tracked}</strong></div>
                <div>Total Paid Claims: <strong>{data.overall_summary.total_paid_claims}</strong></div>
                <div>Total Unpaid Claims: <strong>{data.overall_summary.total_unpaid_claims}</strong></div>
                <div>Overall Avg Days Late: <strong>{data.overall_summary.overall_avg_days_late.toFixed(1)}</strong> days</div>
                <div>Overall On-Time %: <strong>{data.overall_summary.overall_on_time_percentage.toFixed(1)}%</strong></div>
                <div>Total Outstanding: <strong>${data.overall_summary.total_outstanding_balance.toFixed(2)}</strong></div>
              </div>
            ) : (
              <div>
                <div>Firm: <strong>{data.firm_name}</strong></div>
                <div>Paid Claims: <strong>{data.total_paid_claims}</strong></div>
                <div>Unpaid Claims: <strong>{data.total_unpaid_claims}</strong></div>
                <div>Avg Days Late: <strong>{data.avg_days_late.toFixed(1)}</strong> days</div>
                <div>On-Time %: <strong>{data.on_time_percentage.toFixed(1)}%</strong></div>
                <div>Outstanding Balance: <strong>${data.total_outstanding_balance.toFixed(2)}</strong></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
