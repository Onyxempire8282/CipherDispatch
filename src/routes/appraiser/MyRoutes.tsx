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
import { closeRoute } from '../../utils/routeOperations';
import { NavBar } from "../../components/NavBar";
import PageHeader from "../../components/ui/PageHeader";
import "./my-routes.css";

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
    const modifier = status === 'active' || status === 'closed' || status === 'draft'
      ? status
      : 'draft';
    return (
      <span className={`routes__badge routes__badge--${modifier}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="routes">
        <NavBar role="appraiser" />
        <PageHeader label="Appraiser" title="My Routes" />
        <div className="routes__loading">
          Loading routes...
        </div>
      </div>
    );
  }

  return (
    <div className="routes">
      <NavBar role="appraiser" />
      <PageHeader label="Appraiser" title="My Routes" />
      <div className="routes__container">
        {/* Summary Hint */}
        {routes.length > 0 && (
          <div className="routes__summary">
            {(() => {
              const active = routes.filter(r => r.status === 'active');
              const closable = active.filter(r => r.total_miles != null);
              const closed = routes.filter(r => r.status === 'closed');

              if (closable.length > 0) {
                return (
                  <span>
                    <span className="routes__summary-count">{closable.length}</span>
                    {' '}route{closable.length !== 1 ? 's' : ''} ready to close
                    {closed.length > 0 && (
                      <span> · <span className="routes__summary-closed">{closed.length}</span> already logged</span>
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
                    All routes closed · <span className="routes__summary-closed">{closed.length}</span> mileage log{closed.length !== 1 ? 's' : ''} recorded
                  </span>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="routes__success">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="routes__error">
            {error}
          </div>
        )}

        {/* Routes List */}
        {routes.length === 0 ? (
          <div className="routes__empty">
            No routes found. Routes are created during route optimization.
          </div>
        ) : (
          <div className="routes__list">
            {routes.map((route) => (
              <div key={route.id} className="routes__card">
                <div className="routes__card-header">
                  <div>
                    <div className="routes__card-date">
                      {formatDate(route.date)}
                    </div>
                    {getStatusBadge(route.status)}
                  </div>
                  <div className="routes__card-miles">
                    {route.total_miles != null ? (
                      <span className="routes__card-miles-value">
                        {route.total_miles.toFixed(1)} mi
                      </span>
                    ) : (
                      <span>No mileage data</span>
                    )}
                  </div>
                </div>

                {(route.start_address || route.end_address) && (
                  <div className="routes__addresses">
                    {route.start_address && <div>From: {route.start_address}</div>}
                    {route.end_address && <div>To: {route.end_address}</div>}
                  </div>
                )}

                {/* Close Route Button - only for active routes */}
                {route.status === 'active' && (
                  <button
                    className={`routes__close-btn${closingRouteId === route.id ? ' routes__close-btn--closing' : ''}${route.total_miles == null ? ' routes__close-btn--no-miles' : ''}`}
                    onClick={() => handleCloseRoute(route.id)}
                    disabled={closingRouteId === route.id || route.total_miles == null}
                  >
                    {closingRouteId === route.id
                      ? 'Closing Route...'
                      : route.total_miles == null
                      ? 'Complete route optimization first'
                      : 'Close Route & Log Mileage'}
                  </button>
                )}

                {route.status === 'closed' && (
                  <div className="routes__closed-banner">
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
