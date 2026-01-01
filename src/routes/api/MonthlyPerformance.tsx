/**
 * Monthly Performance API Endpoint
 * Returns current month's completion metrics and capacity analysis as JSON
 * Access at: /api/monthly-performance
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateMonthlyPerformanceReport, MonthlyPerformanceReport } from '../../utils/monthlyPerformance';
import { checkAndLogPreviousMonth } from '../../utils/monthlyHistory';

export default function MonthlyPerformanceAPI() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<MonthlyPerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyParam = searchParams.get('pretty');
  const isPretty = prettyParam === 'true' || prettyParam === '1';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Auto-check and log previous month if new month detected
        await checkAndLogPreviousMonth();

        const result = await generateMonthlyPerformanceReport();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to generate monthly performance report');
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
        message: 'Generating monthly performance report...'
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
            Monthly Performance API
          </h1>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>
            <div>Endpoint: <code>/api/monthly-performance</code></div>
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
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px'
            }}>
              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '2px solid ' + (
                  data.capacity_status === 'UNDER-UTILIZED' ? '#10b981' :
                  data.capacity_status === 'OPTIMAL' ? '#eab308' :
                  data.capacity_status === 'STRETCH' ? '#f97316' :
                  '#ef4444'
                )
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  CAPACITY STATUS
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: data.capacity_status === 'UNDER-UTILIZED' ? '#10b981' :
                         data.capacity_status === 'OPTIMAL' ? '#eab308' :
                         data.capacity_status === 'STRETCH' ? '#f97316' :
                         '#ef4444'
                }}>
                  {data.capacity_status}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  {data.capacity_percentage.toFixed(1)}% of capacity
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  COMPLETED THIS MONTH
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
                  {data.monthly_completed_claims}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  {data.current_month_name} {data.current_year}
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  MONTHLY VELOCITY
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {data.monthly_velocity.toFixed(1)}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  claims/day ({data.business_days_elapsed} bus. days)
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#2d3748',
                borderRadius: '8px',
                border: '1px solid #4a5568'
              }}>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>
                  PROJECTED EOM
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: data.projected_end_of_month > data.max_safe_capacity ? '#ef4444' : '#8b5cf6'
                }}>
                  {data.projected_end_of_month}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  Max: {data.max_safe_capacity}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#2d3748',
              borderRadius: '8px',
              border: '1px solid #4a5568'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Month Progress</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Business Days</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>
                    {data.business_days_elapsed} / {data.total_business_days_in_month}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Days Remaining</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>
                    {data.days_remaining}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: '12px' }}>Recommended Daily Rate</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#eab308' }}>
                    {data.recommended_daily_rate.toFixed(1)} claims/day
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#2d3748',
              borderRadius: '8px',
              border: '1px solid #4a5568'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#667eea' }}>Capacity Gauge Reference</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '120px', color: '#a0aec0', fontSize: '14px' }}>
                    &lt; 60%
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#064e3b',
                    border: '1px solid #10b981',
                    borderRadius: '4px',
                    color: '#10b981',
                    fontWeight: 'bold'
                  }}>
                    UNDER-UTILIZED (Green)
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '120px', color: '#a0aec0', fontSize: '14px' }}>
                    60–85%
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#713f12',
                    border: '1px solid #eab308',
                    borderRadius: '4px',
                    color: '#eab308',
                    fontWeight: 'bold'
                  }}>
                    OPTIMAL (Yellow)
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '120px', color: '#a0aec0', fontSize: '14px' }}>
                    85–105%
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#7c2d12',
                    border: '1px solid #f97316',
                    borderRadius: '4px',
                    color: '#f97316',
                    fontWeight: 'bold'
                  }}>
                    STRETCH (Orange)
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '120px', color: '#a0aec0', fontSize: '14px' }}>
                    &gt; 105%
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#7f1d1d',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    color: '#ef4444',
                    fontWeight: 'bold'
                  }}>
                    BURNOUT (Red)
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
