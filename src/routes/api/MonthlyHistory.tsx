/**
 * Monthly History API Endpoint
 * Returns historical monthly performance data for trend analysis
 * Access at: /api/monthly-history
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateMonthlyHistoryReport, MonthlyHistoryReport } from '../../utils/monthlyHistory';

export default function MonthlyHistoryAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<MonthlyHistoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get('pretty');
  const isPretty = prettyParam === 'true' || prettyParam === '1';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await generateMonthlyHistoryReport();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to generate monthly history report');
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
        status: 'loading',
        message: 'Generating monthly history report...'
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#2d3748',
          borderRadius: '8px',
          border: '1px solid #4a5568'
        }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#667eea', fontSize: '24px' }}>
            Monthly History API
          </h1>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>
            <div>Endpoint: <code>/api/monthly-history</code></div>
            <div style={{ marginTop: '8px' }}>
              <strong>Query Parameters:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>?pretty=true</code> - Pretty-print JSON output</li>
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
          <>
            <div style={{
              marginTop: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  MONTHS TRACKED
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {data.months_tracked}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  Total historical records
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  EARLIEST MONTH
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                  {data.earliest_month || 'N/A'}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  First logged month
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  LATEST MONTH
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {data.latest_month || 'N/A'}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  Most recent month
                </div>
              </div>
            </div>

            {data.historical_performance.length > 0 && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>
                  Recent Performance Snapshot
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #4a5568' }}>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#a0aec0' }}>Month</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#a0aec0' }}>Completed</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#a0aec0' }}>Backlog</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#a0aec0' }}>Velocity</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#a0aec0' }}>Burnout</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#a0aec0' }}>Firms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.historical_performance.slice(-6).reverse().map((month, idx) => (
                        <tr key={month.month} style={{
                          borderBottom: '1px solid #374151',
                          background: idx % 2 === 0 ? '#1f2937' : 'transparent'
                        }}>
                          <td style={{ padding: '8px', color: '#e2e8f0', fontWeight: 'bold' }}>
                            {month.month}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>
                            {month.completed_claims}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b' }}>
                            {month.backlog}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#3b82f6' }}>
                            {month.avg_velocity.toFixed(1)}
                          </td>
                          <td style={{
                            padding: '8px',
                            textAlign: 'right',
                            color: month.burnout_ratio > 1.0 ? '#ef4444' :
                                   month.burnout_ratio > 0.85 ? '#f97316' :
                                   month.burnout_ratio > 0.6 ? '#eab308' : '#10b981'
                          }}>
                            {(month.burnout_ratio * 100).toFixed(1)}%
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#8b5cf6' }}>
                            {month.firms_active}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
