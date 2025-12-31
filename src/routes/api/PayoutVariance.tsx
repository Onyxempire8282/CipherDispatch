/**
 * Payout Variance API Endpoint
 * Returns weekly expected vs actual payout variance as JSON
 * Access at: /api/payout-variance
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generatePayoutVarianceReport, PayoutVarianceReport } from '../../utils/payoutVariance';

export default function PayoutVarianceAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PayoutVarianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get('pretty');
  const historicalParam = searchParams.get('historical');
  const projectionParam = searchParams.get('projection');

  const isPretty = prettyParam === 'true' || prettyParam === '1';
  const historicalWeeks = historicalParam ? parseInt(historicalParam) : 12;
  const projectionWeeks = projectionParam ? parseInt(projectionParam) : 4;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await generatePayoutVarianceReport(historicalWeeks, projectionWeeks);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to generate payout variance report');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [historicalWeeks, projectionWeeks]);

  // Return JSON response
  const renderJSON = () => {
    if (loading) {
      return {
        status: 'loading',
        message: 'Generating payout variance report...'
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
            Payout Variance API
          </h1>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>
            <div>Endpoint: <code>/api/payout-variance</code></div>
            <div style={{ marginTop: '8px' }}>
              <strong>Query Parameters:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>?pretty=true</code> - Pretty-print JSON output</li>
              <li><code>?historical=12</code> - Number of past weeks to include (default: 12)</li>
              <li><code>?projection=4</code> - Number of future weeks to project (default: 4)</li>
            </ul>
            <div style={{ marginTop: '8px' }}>
              <strong>Examples:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>/api/payout-variance</code> - Default (12 weeks history, 4 weeks projection)</li>
              <li><code>/api/payout-variance?pretty=true</code> - Pretty-printed output</li>
              <li><code>/api/payout-variance?historical=8&projection=2</code> - Custom range</li>
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
              padding: '16px',
              background: '#2d3748',
              borderRadius: '8px',
              border: '1px solid #4a5568',
              fontSize: '14px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Summary Statistics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Total Expected (Historical)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                    ${data.summary.total_expected.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Total Actual (Historical)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                    ${data.summary.total_actual.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Total Variance</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: data.summary.total_variance >= 0 ? '#f59e0b' : '#ef4444'
                  }}>
                    ${Math.abs(data.summary.total_variance).toLocaleString()}
                    {data.summary.total_variance >= 0 ? ' (under-collected)' : ' (over-collected)'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Accuracy Percentage</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {data.summary.accuracy_percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#2d3748',
              borderRadius: '8px',
              border: '1px solid #4a5568',
              fontSize: '14px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Rolling Average (4 weeks)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Avg Weekly Expected</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                    ${data.rolling_average.avg_expected.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Avg Weekly Actual</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                    ${data.rolling_average.avg_actual.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Avg Weekly Variance</div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: data.rolling_average.avg_variance >= 0 ? '#f59e0b' : '#ef4444'
                  }}>
                    ${Math.abs(data.rolling_average.avg_variance).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#2d3748',
              borderRadius: '8px',
              border: '1px solid #4a5568',
              fontSize: '14px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Weekly Breakdown</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #4a5568' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#a0aec0' }}>Week</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Expected</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Actual</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Variance</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Accuracy</th>
                      <th style={{ textAlign: 'center', padding: '8px', color: '#a0aec0' }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weekly_data.map((week, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #374151',
                          background: week.is_projection ? '#1e293b' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px', color: '#e2e8f0' }}>{week.week_label}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>
                          ${week.expected_payout.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#3b82f6' }}>
                          ${week.actual_paid.toLocaleString()}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: week.variance >= 0 ? '#f59e0b' : '#10b981',
                          fontWeight: 'bold'
                        }}>
                          {week.variance >= 0 ? '+' : ''}${week.variance.toLocaleString()}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: Math.abs(week.variance_percentage) < 10 ? '#10b981' : '#f59e0b'
                        }}>
                          {week.variance_percentage >= 0 ? '+' : ''}{week.variance_percentage.toFixed(1)}%
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {week.is_projection ? (
                            <span style={{ color: '#8b5cf6', fontSize: '12px' }}>PROJECTION</span>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '12px' }}>HISTORICAL</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
