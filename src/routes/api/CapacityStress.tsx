/**
 * Capacity Stress API Endpoint
 * Returns weekly throughput and capacity metrics as JSON
 * Access at: /api/capacity-stress
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateCapacityStressReport, CapacityStressReport } from '../../utils/capacityStress';

export default function CapacityStressAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<CapacityStressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get('pretty');
  const weeksParam = searchParams.get('weeks');

  const isPretty = prettyParam === 'true' || prettyParam === '1';
  const weeks = weeksParam ? parseInt(weeksParam) : 12;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await generateCapacityStressReport(weeks);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to generate capacity stress report');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [weeks]);

  // Return JSON response
  const renderJSON = () => {
    if (loading) {
      return {
        status: 'loading',
        message: 'Generating capacity stress report...'
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
            Capacity Stress API
          </h1>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>
            <div>Endpoint: <code>/api/capacity-stress</code></div>
            <div style={{ marginTop: '8px' }}>
              <strong>Query Parameters:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>?pretty=true</code> - Pretty-print JSON output</li>
              <li><code>?weeks=12</code> - Number of past weeks to include (default: 12)</li>
            </ul>
            <div style={{ marginTop: '8px' }}>
              <strong>Examples:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>/api/capacity-stress</code> - Default (12 weeks)</li>
              <li><code>/api/capacity-stress?pretty=true</code> - Pretty-printed output</li>
              <li><code>/api/capacity-stress?weeks=8</code> - Last 8 weeks</li>
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
                border: '2px solid ' + (
                  data.capacity_indicators.backlog_status === 'healthy' ? '#10b981' :
                  data.capacity_indicators.backlog_status === 'warning' ? '#f59e0b' :
                  '#ef4444'
                )
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  BACKLOG STATUS
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: data.capacity_indicators.backlog_status === 'healthy' ? '#10b981' :
                         data.capacity_indicators.backlog_status === 'warning' ? '#f59e0b' :
                         '#ef4444'
                }}>
                  {data.capacity_indicators.backlog_status}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  Avg Backlog Growth: {data.summary.avg_backlog_growth.toFixed(1)} claims/week
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '2px solid ' + (
                  data.capacity_indicators.booking_pressure === 'low' ? '#10b981' :
                  data.capacity_indicators.booking_pressure === 'medium' ? '#f59e0b' :
                  '#ef4444'
                )
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  BOOKING PRESSURE
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: data.capacity_indicators.booking_pressure === 'low' ? '#10b981' :
                         data.capacity_indicators.booking_pressure === 'medium' ? '#f59e0b' :
                         '#ef4444'
                }}>
                  {data.capacity_indicators.booking_pressure}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  Booked {data.current_days_booked_ahead} days ahead
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '2px solid ' + (
                  data.summary.trend === 'improving' ? '#10b981' :
                  data.summary.trend === 'stable' ? '#3b82f6' :
                  '#ef4444'
                )
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  THROUGHPUT TREND
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: data.summary.trend === 'improving' ? '#10b981' :
                         data.summary.trend === 'stable' ? '#3b82f6' :
                         '#ef4444'
                }}>
                  {data.summary.trend}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  {data.capacity_indicators.throughput_trend}
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
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Summary Statistics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Total Assigned</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {data.summary.total_assigned}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Total Completed</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                    {data.summary.total_completed}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Net Backlog Change</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: data.summary.total_backlog_growth > 0 ? '#ef4444' : '#10b981'
                  }}>
                    {data.summary.total_backlog_growth > 0 ? '+' : ''}{data.summary.total_backlog_growth}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Completion Rate</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {data.summary.completion_rate.toFixed(1)}%
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
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Assigned</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Completed</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Backlog Δ</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Utilization</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Days Booked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weekly_data.map((week, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #374151',
                          background: week.is_current_week ? '#1e293b' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px', color: '#e2e8f0' }}>
                          {week.week_label}
                          {week.is_current_week && (
                            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#667eea' }}>
                              (CURRENT)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#3b82f6' }}>
                          {week.claims_assigned}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>
                          {week.claims_completed}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: week.backlog_growth > 0 ? '#ef4444' : '#10b981',
                          fontWeight: 'bold'
                        }}>
                          {week.backlog_growth > 0 ? '+' : ''}{week.backlog_growth}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: week.utilization_rate >= 90 ? '#10b981' :
                                 week.utilization_rate >= 70 ? '#f59e0b' : '#ef4444'
                        }}>
                          {week.utilization_rate.toFixed(1)}%
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: week.days_booked_ahead <= 7 ? '#10b981' :
                                 week.days_booked_ahead <= 14 ? '#f59e0b' : '#ef4444'
                        }}>
                          {week.days_booked_ahead} days
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
