import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { getFirmColor } from '../../constants/firmColors';
import './mobile-claims.css';

/**
 * Mobile Claims List Component
 *
 * Replaces the desktop grid view on mobile devices (<=600px).
 * Displays claims as a vertical list with filter/sort bar.
 *
 * Design decisions:
 * - Large tap targets for field use
 * - Filter pills at top for quick status filtering
 * - Compact card layout with key info visible
 * - No grid, vertical scroll only
 */

type Claim = {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  appointment_start?: string;
  appointment_end?: string;
  firm_name?: string;
  city?: string;
  state?: string;
};

type ClaimStatus = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | null;

interface MobileClaimsListProps {
  claims: Claim[];
  showCreateButton?: boolean;
  createButtonPath?: string;
}

// Status colors matching existing app
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#2196F3',
  IN_PROGRESS: '#FF9800',
  COMPLETED: '#4CAF50',
  CANCELED: '#ef4444',
};

export default function MobileClaimsList({
  claims,
  showCreateButton = false,
  createButtonPath = '/admin/claims/new',
}: MobileClaimsListProps) {
  const [selectedStatus, setSelectedStatus] = useState<ClaimStatus>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter claims by status
  const filteredClaims = useMemo(() => {
    let result = [...claims];

    // Apply status filter
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === null) {
        result = result.filter((c) => !c.status);
      } else {
        result = result.filter((c) => c.status === selectedStatus);
      }
    }

    // Apply sort
    result.sort((a, b) => {
      const aTime = a.appointment_start ? new Date(a.appointment_start).getTime() : 0;
      const bTime = b.appointment_start ? new Date(b.appointment_start).getTime() : 0;
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [claims, selectedStatus, sortOrder]);

  // Get status counts for filter pills
  const statusCounts = useMemo(() => {
    return {
      all: claims.length,
      scheduled: claims.filter((c) => c.status === 'SCHEDULED').length,
      inProgress: claims.filter((c) => c.status === 'IN_PROGRESS').length,
      completed: claims.filter((c) => c.status === 'COMPLETED').length,
      unassigned: claims.filter((c) => !c.status).length,
    };
  }, [claims]);

  // Format appointment time for display
  const formatAppointment = (dateStr?: string): string => {
    if (!dateStr) return 'Not scheduled';
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'MMM d, h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  // Get status display text
  const getStatusText = (status: string | null): string => {
    if (!status) return 'Assigned';
    return status.replace('_', ' ');
  };

  return (
    <div className="mobile-claims">
      {/* Filter Bar - Horizontal scrollable pills */}
      <div className="mobile-claims__filters">
        <button
          className={`mobile-claims__filter-btn ${selectedStatus === 'ALL' ? 'mobile-claims__filter-btn--active' : ''}`}
          onClick={() => setSelectedStatus('ALL')}
        >
          All ({statusCounts.all})
        </button>
        <button
          className={`mobile-claims__filter-btn ${selectedStatus === 'SCHEDULED' ? 'mobile-claims__filter-btn--active' : ''}`}
          onClick={() => setSelectedStatus('SCHEDULED')}
          style={{ '--filter-color': STATUS_COLORS.SCHEDULED } as React.CSSProperties}
        >
          Scheduled ({statusCounts.scheduled})
        </button>
        <button
          className={`mobile-claims__filter-btn ${selectedStatus === 'IN_PROGRESS' ? 'mobile-claims__filter-btn--active' : ''}`}
          onClick={() => setSelectedStatus('IN_PROGRESS')}
          style={{ '--filter-color': STATUS_COLORS.IN_PROGRESS } as React.CSSProperties}
        >
          In Progress ({statusCounts.inProgress})
        </button>
        <button
          className={`mobile-claims__filter-btn ${selectedStatus === 'COMPLETED' ? 'mobile-claims__filter-btn--active' : ''}`}
          onClick={() => setSelectedStatus('COMPLETED')}
          style={{ '--filter-color': STATUS_COLORS.COMPLETED } as React.CSSProperties}
        >
          Completed ({statusCounts.completed})
        </button>
      </div>

      {/* Sort Toggle */}
      <div className="mobile-claims__sort">
        <span className="mobile-claims__sort-label">Sort:</span>
        <button
          className={`mobile-claims__sort-btn ${sortOrder === 'newest' ? 'mobile-claims__sort-btn--active' : ''}`}
          onClick={() => setSortOrder('newest')}
        >
          Newest
        </button>
        <button
          className={`mobile-claims__sort-btn ${sortOrder === 'oldest' ? 'mobile-claims__sort-btn--active' : ''}`}
          onClick={() => setSortOrder('oldest')}
        >
          Oldest
        </button>
      </div>

      {/* Claims List */}
      <div className="mobile-claims__list">
        {filteredClaims.length === 0 ? (
          <div className="mobile-claims__empty">
            <div className="mobile-claims__empty-text">No claims found</div>
            <div className="mobile-claims__empty-subtext">
              {selectedStatus !== 'ALL'
                ? 'Try selecting a different filter'
                : 'No claims assigned yet'}
            </div>
          </div>
        ) : (
          filteredClaims.map((claim) => (
            <Link
              key={claim.id}
              to={`/claim/${claim.id}`}
              className="mobile-claims__card"
              style={{ borderLeftColor: getFirmColor(claim.firm_name) }}
            >
              {/* Row 1: Claim # + Status Badge */}
              <div className="mobile-claims__card-header">
                <span className="mobile-claims__card-number">#{claim.claim_number}</span>
                <span
                  className="mobile-claims__card-status"
                  style={{ backgroundColor: STATUS_COLORS[claim.status] || '#9E9E9E' }}
                >
                  {getStatusText(claim.status)}
                </span>
              </div>

              {/* Row 2: Customer Name */}
              <div className="mobile-claims__card-customer">{claim.customer_name}</div>

              {/* Row 3: Appointment + Firm */}
              <div className="mobile-claims__card-meta">
                <span className="mobile-claims__card-appointment">
                  {formatAppointment(claim.appointment_start)}
                </span>
                {claim.firm_name && (
                  <span
                    className="mobile-claims__card-firm"
                    style={{ color: getFirmColor(claim.firm_name) }}
                  >
                    {claim.firm_name}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Floating Action Button for Create New Claim */}
      {showCreateButton && (
        <Link to={createButtonPath} className="mobile-claims__fab">
          +
        </Link>
      )}
    </div>
  );
}
