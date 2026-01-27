/**
 * My Routes Page
 *
 * Displays user's routes and allows closing active routes.
 * Closing a route snapshots existing mileage data to mileage_logs.
 *
 * This is the UI trigger for the mileage logging system.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { closeRoute } from '../../utils/routeOperations';

interface Route {
  id: string;
  date: string;
  status: 'draft' | 'active' | 'closed';
  total_miles: number | null;
  start_address: string | null;
  end_address: string | null;
  created_at: string;
}

export default function MyRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [closingRouteId, setClosingRouteId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndRoutes();
  }, []);

  const loadUserAndRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Fetch user's routes
      const { data, error: fetchError } = await supabase
        .from('routes')
        .select('id, date, status, total_miles, start_address, end_address, created_at')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setRoutes(data ?? []);
    } catch (err: any) {
      console.error('Error loading routes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRoute = async (routeId: string) => {
    if (!userId) return;

    try {
      setClosingRouteId(routeId);
      setError(null);
      setSuccessMessage(null);

      const result = await closeRoute(routeId, userId);

      // Update local state
      setRoutes(prev =>
        prev.map(r =>
          r.id === routeId ? { ...r, status: 'closed' as const } : r
        )
      );

      setSuccessMessage(
        `Route closed successfully. ${result.totalMiles} miles logged for ${result.claimCount} claims.`
      );

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error closing route:', err);
      setError(err.message);
    } finally {
      setClosingRouteId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      draft: { bg: '#4a5568', text: '#e2e8f0' },
      active: { bg: '#2563eb', text: '#ffffff' },
      closed: { bg: '#059669', text: '#ffffff' },
    };
    const s = styles[status] || styles.draft;
    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          background: s.bg,
          color: s.text,
        }}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)', padding: 32 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', color: '#e2e8f0' }}>
          Loading routes...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)', padding: 32 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0, color: '#e2e8f0' }}>My Routes</h1>
          <Link
            to="/"
            style={{
              padding: '10px 20px',
              background: '#4a5568',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Back
          </Link>
        </div>

        {/* Summary Hint */}
        {routes.length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: 16,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#94a3b8',
              fontSize: 14,
            }}
          >
            {(() => {
              const active = routes.filter(r => r.status === 'active');
              const closable = active.filter(r => r.total_miles != null);
              const closed = routes.filter(r => r.status === 'closed');

              if (closable.length > 0) {
                return (
                  <span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{closable.length}</span>
                    {' '}route{closable.length !== 1 ? 's' : ''} ready to close
                    {closed.length > 0 && (
                      <span> · <span style={{ color: '#6ee7b7' }}>{closed.length}</span> already logged</span>
                    )}
                  </span>
                );
              } else if (active.length > 0) {
                return (
                  <span>
                    {active.length} active route{active.length !== 1 ? 's' : ''} awaiting mileage data from route optimization
                  </span>
                );
              } else if (closed.length > 0) {
                return (
                  <span>
                    All routes closed · <span style={{ color: '#6ee7b7' }}>{closed.length}</span> mileage log{closed.length !== 1 ? 's' : ''} recorded
                  </span>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div
            style={{
              padding: 16,
              marginBottom: 16,
              background: '#065f46',
              border: '1px solid #059669',
              borderRadius: 8,
              color: '#d1fae5',
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: 16,
              marginBottom: 16,
              background: '#7f1d1d',
              border: '1px solid #ef4444',
              borderRadius: 8,
              color: '#fecaca',
            }}
          >
            {error}
          </div>
        )}

        {/* Routes List */}
        {routes.length === 0 ? (
          <div
            style={{
              background: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
              color: '#a0aec0',
            }}
          >
            No routes found. Routes are created during route optimization.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {routes.map((route) => (
              <div
                key={route.id}
                style={{
                  background: '#2d3748',
                  border: '1px solid #4a5568',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                      {formatDate(route.date)}
                    </div>
                    {getStatusBadge(route.status)}
                  </div>
                  <div style={{ textAlign: 'right', color: '#a0aec0', fontSize: 14 }}>
                    {route.total_miles != null ? (
                      <span style={{ color: '#10b981', fontWeight: 600, fontSize: 20 }}>
                        {route.total_miles.toFixed(1)} mi
                      </span>
                    ) : (
                      <span>No mileage data</span>
                    )}
                  </div>
                </div>

                {(route.start_address || route.end_address) && (
                  <div style={{ color: '#a0aec0', fontSize: 14, marginBottom: 12 }}>
                    {route.start_address && <div>From: {route.start_address}</div>}
                    {route.end_address && <div>To: {route.end_address}</div>}
                  </div>
                )}

                {/* Close Route Button - only for active routes */}
                {route.status === 'active' && (
                  <button
                    onClick={() => handleCloseRoute(route.id)}
                    disabled={closingRouteId === route.id || route.total_miles == null}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      background: closingRouteId === route.id ? '#4a5568' : '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: closingRouteId === route.id || route.total_miles == null ? 'not-allowed' : 'pointer',
                      opacity: route.total_miles == null ? 0.5 : 1,
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => {
                      if (closingRouteId !== route.id && route.total_miles != null) {
                        e.currentTarget.style.background = '#047857';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (closingRouteId !== route.id) {
                        e.currentTarget.style.background = '#059669';
                      }
                    }}
                  >
                    {closingRouteId === route.id
                      ? 'Closing Route...'
                      : route.total_miles == null
                      ? 'Complete route optimization first'
                      : 'Close Route & Log Mileage'}
                  </button>
                )}

                {route.status === 'closed' && (
                  <div
                    style={{
                      padding: '12px 24px',
                      background: '#1a3d2e',
                      border: '1px solid #059669',
                      borderRadius: 8,
                      color: '#6ee7b7',
                      textAlign: 'center',
                      fontSize: 14,
                    }}
                  >
                    Mileage logged
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
