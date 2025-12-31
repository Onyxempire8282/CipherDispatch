/**
 * Survival Runway API Endpoint
 * Returns 30-day cash forecast with payment delay scenarios as JSON
 * Access at: /api/survival-runway
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateSurvivalRunwayReport, SurvivalRunwayReport } from '../../utils/survivalRunway';

export default function SurvivalRunwayAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<SurvivalRunwayReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get('pretty');
  const daysParam = searchParams.get('days');
  const delayParam = searchParams.get('delay');

  const isPretty = prettyParam === 'true' || prettyParam === '1';
  const days = daysParam ? parseInt(daysParam) : 30;
  const delay = delayParam ? parseInt(delayParam) : 7;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await generateSurvivalRunwayReport(days, delay);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to generate survival runway report');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [days, delay]);

  // Return JSON response
  const renderJSON = () => {
    if (loading) {
      return {
        status: 'loading',
        message: 'Generating survival runway forecast...'
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
            Survival Runway API
          </h1>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>
            <div>Endpoint: <code>/api/survival-runway</code></div>
            <div style={{ marginTop: '8px' }}>
              <strong>Query Parameters:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>?pretty=true</code> - Pretty-print JSON output</li>
              <li><code>?days=30</code> - Forecast period in days (default: 30)</li>
              <li><code>?delay=7</code> - Payment delay scenario in days (default: 7)</li>
            </ul>
            <div style={{ marginTop: '8px' }}>
              <strong>Examples:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>/api/survival-runway</code> - Default (30 days, 7-day delay)</li>
              <li><code>/api/survival-runway?pretty=true</code> - Pretty-printed output</li>
              <li><code>/api/survival-runway?days=60&delay=14</code> - 60-day forecast with 14-day delay</li>
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
                border: '2px solid #10b981'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  EXPECTED CASH (30 DAYS)
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#10b981'
                }}>
                  ${data.expected_cash_in_30_days.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  {data.summary.total_payouts_expected} expected payouts
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '2px solid ' + (
                  data.risk_assessment.impact_level === 'low' ? '#10b981' :
                  data.risk_assessment.impact_level === 'moderate' ? '#3b82f6' :
                  data.risk_assessment.impact_level === 'high' ? '#f59e0b' :
                  '#ef4444'
                )
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  DELAYED PAYMENT IMPACT
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: data.delayed_payment_impact >= 0 ? '#ef4444' : '#10b981'
                }}>
                  {data.delayed_payment_impact >= 0 ? '-' : '+'}${Math.abs(data.delayed_payment_impact).toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  {Math.abs(data.impact_percentage).toFixed(1)}% impact from {delay}-day delay
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '2px solid ' + (
                  data.risk_assessment.impact_level === 'low' ? '#10b981' :
                  data.risk_assessment.impact_level === 'moderate' ? '#3b82f6' :
                  data.risk_assessment.impact_level === 'high' ? '#f59e0b' :
                  '#ef4444'
                )
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  IMPACT LEVEL
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: data.risk_assessment.impact_level === 'low' ? '#10b981' :
                         data.risk_assessment.impact_level === 'moderate' ? '#3b82f6' :
                         data.risk_assessment.impact_level === 'high' ? '#f59e0b' :
                         '#ef4444'
                }}>
                  {data.risk_assessment.impact_level}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  {data.risk_assessment.cash_flow_health}
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
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Avg Daily (Expected)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                    ${data.summary.avg_daily_expected.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Avg Daily (Delayed)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
                    ${data.summary.avg_daily_delayed.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Largest Single Day</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                    ${data.summary.largest_single_day.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
                    {data.summary.largest_single_day_date}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Days with Payouts</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {data.summary.days_with_payouts} / {data.forecast_days}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: data.risk_assessment.impact_level === 'critical' ? '#7f1d1d' :
                         data.risk_assessment.impact_level === 'high' ? '#78350f' :
                         data.risk_assessment.impact_level === 'moderate' ? '#1e3a8a' :
                         '#064e3b',
              borderRadius: '8px',
              border: '2px solid ' + (
                data.risk_assessment.impact_level === 'critical' ? '#ef4444' :
                data.risk_assessment.impact_level === 'high' ? '#f59e0b' :
                data.risk_assessment.impact_level === 'moderate' ? '#3b82f6' :
                '#10b981'
              ),
              fontSize: '14px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#e2e8f0' }}>
                Risk Assessment & Recommendations
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0' }}>
                {data.risk_assessment.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{rec}</li>
                ))}
              </ul>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#2d3748',
              borderRadius: '8px',
              border: '1px solid #4a5568',
              fontSize: '14px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>
                Daily Cash Forecast (Next {data.forecast_days} Days)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #4a5568' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#a0aec0' }}>Date</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Expected</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Delayed</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Cumulative</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Cum (Delayed)</th>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#a0aec0' }}>Firms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily_forecast.slice(0, 30).map((day, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #374151',
                          background: day.payout_count > 0 ? '#1e293b' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px', color: '#e2e8f0' }}>
                          {day.date_label}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: day.expected_amount > 0 ? '#10b981' : '#6b7280',
                          fontWeight: day.expected_amount > 0 ? 'bold' : 'normal'
                        }}>
                          {day.expected_amount > 0 ? `$${day.expected_amount.toLocaleString()}` : '-'}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: day.delayed_amount > 0 ? '#f59e0b' : '#6b7280'
                        }}>
                          {day.delayed_amount > 0 ? `$${day.delayed_amount.toLocaleString()}` : '-'}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: '#3b82f6',
                          fontWeight: 'bold'
                        }}>
                          ${day.cumulative_expected.toLocaleString()}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          color: '#f59e0b'
                        }}>
                          ${day.cumulative_delayed.toLocaleString()}
                        </td>
                        <td style={{
                          padding: '8px',
                          color: '#a0aec0',
                          fontSize: '11px'
                        }}>
                          {day.firms_paying.length > 0 ? day.firms_paying.join(', ') : '-'}
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
