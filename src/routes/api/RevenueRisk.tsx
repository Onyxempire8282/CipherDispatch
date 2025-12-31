/**
 * Revenue Risk API Endpoint
 * Returns revenue concentration and firm dependency analysis as JSON
 * Access at: /api/revenue-risk
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateRevenueRiskReport, RevenueRiskReport } from '../../utils/revenueRisk';

export default function RevenueRiskAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<RevenueRiskReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get('pretty');
  const isPretty = prettyParam === 'true' || prettyParam === '1';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await generateRevenueRiskReport();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to generate revenue risk report');
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
        message: 'Generating revenue risk report...'
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
            Revenue Risk API
          </h1>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>
            <div>Endpoint: <code>/api/revenue-risk</code></div>
            <div style={{ marginTop: '8px' }}>
              <strong>Query Parameters:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>?pretty=true</code> - Pretty-print JSON output</li>
            </ul>
            <div style={{ marginTop: '8px' }}>
              <strong>Examples:</strong>
            </div>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><code>/api/revenue-risk</code> - Default output</li>
              <li><code>/api/revenue-risk?pretty=true</code> - Pretty-printed output</li>
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
                  data.risk_assessment.concentration_level === 'low' ? '#10b981' :
                  data.risk_assessment.concentration_level === 'moderate' ? '#3b82f6' :
                  data.risk_assessment.concentration_level === 'high' ? '#f59e0b' :
                  '#ef4444'
                )
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  CONCENTRATION LEVEL
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: data.risk_assessment.concentration_level === 'low' ? '#10b981' :
                         data.risk_assessment.concentration_level === 'moderate' ? '#3b82f6' :
                         data.risk_assessment.concentration_level === 'high' ? '#f59e0b' :
                         '#ef4444'
                }}>
                  {data.risk_assessment.concentration_level}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  Top 3 Firms: {data.top_3_firm_dependency_ratio.toFixed(1)}%
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  TOTAL REVENUE
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#10b981'
                }}>
                  ${data.total_revenue.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  {data.total_claims} claims from {data.unique_firms} firms
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  HERFINDAHL INDEX
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: data.revenue_concentration.herfindahl_index > 2500 ? '#ef4444' :
                         data.revenue_concentration.herfindahl_index > 1500 ? '#f59e0b' :
                         '#10b981'
                }}>
                  {data.revenue_concentration.herfindahl_index}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  {data.revenue_concentration.herfindahl_index > 2500 ? 'Highly concentrated' :
                   data.revenue_concentration.herfindahl_index > 1500 ? 'Moderately concentrated' :
                   'Well diversified'}
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
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Top 3 Firms (Dependency Analysis)</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {data.top_3_firms.map((firm, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr auto auto',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#1a202c',
                      borderRadius: '6px',
                      border: '1px solid #374151'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#f59e0b' : idx === 1 ? '#6b7280' : '#cd7f32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{firm.normalized_name}</div>
                      <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                        {firm.claim_count} claims @ ${firm.avg_revenue_per_claim.toFixed(2)}/claim avg
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                        ${firm.total_revenue.toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      textAlign: 'right',
                      padding: '4px 8px',
                      background: '#374151',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      color: firm.revenue_share_percentage > 40 ? '#ef4444' :
                             firm.revenue_share_percentage > 25 ? '#f59e0b' : '#3b82f6'
                    }}>
                      {firm.revenue_share_percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
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
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Revenue Concentration Metrics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Top 1 Firm</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: data.revenue_concentration.top_1_percentage > 50 ? '#ef4444' :
                           data.revenue_concentration.top_1_percentage > 35 ? '#f59e0b' : '#10b981'
                  }}>
                    {data.revenue_concentration.top_1_percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Top 3 Firms</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: data.revenue_concentration.top_3_percentage > 80 ? '#ef4444' :
                           data.revenue_concentration.top_3_percentage > 60 ? '#f59e0b' : '#10b981'
                  }}>
                    {data.revenue_concentration.top_3_percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Top 5 Firms</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {data.revenue_concentration.top_5_percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Unique Firms</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {data.unique_firms}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: data.risk_assessment.concentration_level === 'critical' ? '#7f1d1d' :
                         data.risk_assessment.concentration_level === 'high' ? '#78350f' :
                         data.risk_assessment.concentration_level === 'moderate' ? '#1e3a8a' :
                         '#064e3b',
              borderRadius: '8px',
              border: '2px solid ' + (
                data.risk_assessment.concentration_level === 'critical' ? '#ef4444' :
                data.risk_assessment.concentration_level === 'high' ? '#f59e0b' :
                data.risk_assessment.concentration_level === 'moderate' ? '#3b82f6' :
                '#10b981'
              ),
              fontSize: '14px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#e2e8f0' }}>
                Risk Assessment & Recommendations
              </h3>
              <div style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 'bold', color: '#e2e8f0' }}>
                {data.risk_assessment.diversification_status}
              </div>
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
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>All Firms (Revenue Distribution)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #4a5568' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#a0aec0' }}>Rank</th>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#a0aec0' }}>Firm</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Claims</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Total Revenue</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Avg/Claim</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#a0aec0' }}>Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.firm_revenues.map((firm, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #374151',
                          background: idx < 3 ? '#1e293b' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px', color: '#a0aec0' }}>#{idx + 1}</td>
                        <td style={{ padding: '8px', color: '#e2e8f0', fontWeight: idx < 3 ? 'bold' : 'normal' }}>
                          {firm.normalized_name}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#3b82f6' }}>
                          {firm.claim_count}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>
                          ${firm.total_revenue.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#8b5cf6' }}>
                          ${firm.avg_revenue_per_claim.toFixed(2)}
                        </td>
                        <td style={{
                          padding: '8px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: firm.revenue_share_percentage > 40 ? '#ef4444' :
                                 firm.revenue_share_percentage > 25 ? '#f59e0b' :
                                 firm.revenue_share_percentage > 15 ? '#3b82f6' : '#a0aec0'
                        }}>
                          {firm.revenue_share_percentage.toFixed(2)}%
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
