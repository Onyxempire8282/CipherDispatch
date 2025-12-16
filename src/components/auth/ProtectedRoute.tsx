/**
 * ProtectedRoute component for route-level authorization
 * Follows TripleTen best practices: accessible, clear user feedback, secure
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { initializeSupabaseAuthz, getSupabaseAuthz } from '../../lib/supabaseAuthz';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'appraiser';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Initialize authz if needed
      const authz = getSupabaseAuthz();
      if (!authz?.isInitialized) {
        await initializeSupabaseAuthz(supabase);
      }

      const currentAuthz = getSupabaseAuthz();
      const user = currentAuthz?.getCurrentUser();

      if (!user) {
        // Not authenticated
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setUserRole(user.role);

      // Check role if required
      if (requiredRole && user.role !== requiredRole) {
        // Wrong role
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // Authorized
      setAuthorized(true);
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthorized(false);
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth
  if (loading) {
    return <LoadingSpinner fullScreen message="Checking authorization..." />;
  }

  // Not authenticated - redirect to login
  if (!authorized && !userRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wrong role - show access denied
  if (!authorized && requiredRole && userRole !== requiredRole) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <div className="bg-brand-dark-800 border-2 border-red-500 rounded-lg p-8 max-w-md text-center shadow-card-hover">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-red-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-brand-light-100 mb-4">
            Access Denied
          </h2>
          <p className="text-brand-light-300 mb-6">
            You don't have permission to access this page. This area is restricted to{' '}
            <span className="font-semibold text-brand-light-100">{requiredRole}</span> users.
          </p>
          <p className="text-sm text-brand-light-400 mb-6">
            Your current role: <span className="font-semibold">{userRole}</span>
          </p>
          <Button
            variant="primary"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
}
