import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { getFirmColor } from '../../constants/firmColors';
import './mobile-claims.css';

/**
 * Mobile Claims List Component
 *
 * Mobile-optimized "My Claims" view for screens <=600px.
 * Replaces the desktop grid view with a scannable vertical list.
 *
 * HIERARCHY (per spec):
 * - Header: "My Claims" title + search icon (expands on tap)
 * - Filters: Horizontal scrollable pills (All, Scheduled, In Progress, Completed)
 * - Sort: Single control (Newest/Oldest dropdown)
 * - Cards: CLAIM# + STATUS | CUSTOMER | DATE · TIME | FIRM
 *
 * ROLE GATING:
 * - Appraisers: View-only list, no create button
 * - Admins: FAB allowed for creating new claims
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

type ClaimStatus = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter claims by status and search query
  const filteredClaims = useMemo(() => {
    let result = [...claims];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.claim_number?.toLowerCase().includes(query) ||
          c.customer_name?.toLowerCase().includes(query) ||
          c.firm_name?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter((c) => c.status === selectedStatus);
    }

    // Apply sort by appointment date
    result.sort((a, b) => {
      const aTime = a.appointment_start ? new Date(a.appointment_start).getTime() : 0;
      const bTime = b.appointment_start ? new Date(b.appointment_start).getTime() : 0;
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [claims, selectedStatus, sortOrder, searchQuery]);

  /**
   * Format appointment datetime for card display.
   * Shows "DATE · TIME" format for scannable hierarchy.
   */
  const formatDateTime = (dateStr?: string): { date: string; time: string } => {
    if (!dateStr) return { date: 'Not scheduled', time: '' };
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return { date: 'Invalid date', time: '' };
      return {
        date: format(date, 'MMM d'),
        time: format(date, 'h:mm a'),
      };
    } catch {
      return { date: 'Invalid date', time: '' };
    }
  };

  // Get status display text (space-separated, no underscore)
  const getStatusText = (status: string | null): string => {
    if (!status) return 'Assigned';
    return status.replace('_', ' ');
  };

  return (
    <div className="mobile-claims">
      {/*
        HEADER: "My Claims" title with search icon
        - Search icon only by default
        - Tapping opens full-width search input
      */}
      <div className="mobile-claims__header">
        {searchOpen ? (
          <div className="mobile-claims__search-bar">
            <input
              type="text"
              className="mobile-claims__search-input"
              placeholder="Search claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              className="mobile-claims__search-close"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <h1 className="mobile-claims__title">My Claims</h1>
            <button
              className="mobile-claims__search-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search claims"
            >
              🔍
            </button>
          </>
        )}
      </div>

      {/*
        FILTERS: Horizontal scrollable pills
        - One active state at a time
        - No wrapping, no dropdowns
      */}
      <div className="mobile-claims__filters">
        <button
          className={`mobile-claims__filter-pill ${selectedStatus === 'ALL' ? 'mobile-claims__filter-pill--active' : ''}`}
          onClick={() => setSelectedStatus('ALL')}
        >
          All
        </button>
        <button
          className={`mobile-claims__filter-pill ${selectedStatus === 'SCHEDULED' ? 'mobile-claims__filter-pill--active' : ''}`}
          onClick={() => setSelectedStatus('SCHEDULED')}
        >
          Scheduled
        </button>
        <button
          className={`mobile-claims__filter-pill ${selectedStatus === 'IN_PROGRESS' ? 'mobile-claims__filter-pill--active' : ''}`}
          onClick={() => setSelectedStatus('IN_PROGRESS')}
        >
          In Progress
        </button>
        <button
          className={`mobile-claims__filter-pill ${selectedStatus === 'COMPLETED' ? 'mobile-claims__filter-pill--active' : ''}`}
          onClick={() => setSelectedStatus('COMPLETED')}
        >
          Completed
        </button>
      </div>

      {/*
        SORT: Single control (dropdown)
        - Secondary visual priority
        - NOT two side-by-side buttons
      */}
      <div className="mobile-claims__sort">
        <select
          className="mobile-claims__sort-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/*
        CLAIMS LIST: Vertical scroll, no grid
      */}
      <div className="mobile-claims__list">
        {filteredClaims.length === 0 ? (
          <div className="mobile-claims__empty">
            <div className="mobile-claims__empty-text">No claims found</div>
            <div className="mobile-claims__empty-subtext">
              {searchQuery
                ? 'Try a different search term'
                : selectedStatus !== 'ALL'
                ? 'Try selecting a different filter'
                : 'No claims assigned yet'}
            </div>
          </div>
        ) : (
          filteredClaims.map((claim) => {
            const { date, time } = formatDateTime(claim.appointment_start);

            return (
              <Link
                key={claim.id}
                to={`/claim/${claim.id}`}
                className="mobile-claims__card"
                style={{ borderLeftColor: getFirmColor(claim.firm_name) }}
              >
                {/*
                  CARD HIERARCHY (critical):
                  Row 1: CLAIM NUMBER + STATUS BADGE
                  Row 2: CUSTOMER NAME
                  Row 3: DATE · TIME
                  Row 4: FIRM BADGE (if present)

                  Rules:
                  - Entire card tappable (Link wrapper)
                  - Status badge always visible
                  - Firm color as left border
                  - Max 3 text rows below header
                  - Truncate overflow with ellipsis
                */}

                {/* Row 1: Claim Number + Status Badge */}
                <div className="mobile-claims__card-row1">
                  <span className="mobile-claims__card-number">#{claim.claim_number}</span>
                  <span
                    className="mobile-claims__card-status"
                    style={{ backgroundColor: STATUS_COLORS[claim.status] || '#9E9E9E' }}
                  >
                    {getStatusText(claim.status)}
                  </span>
                </div>

                {/* Row 2: Customer Name */}
                <div className="mobile-claims__card-row2">{claim.customer_name}</div>

                {/* Row 3: Date · Time */}
                <div className="mobile-claims__card-row3">
                  {date}
                  {time && <span className="mobile-claims__card-time-sep"> · </span>}
                  {time}
                </div>

                {/* Row 4: Firm Badge (only if present) */}
                {claim.firm_name && (
                  <div
                    className="mobile-claims__card-row4"
                    style={{ color: getFirmColor(claim.firm_name) }}
                  >
                    {claim.firm_name}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>

      {/*
        FAB: Floating Action Button for creating new claims
        ROLE GATING: Only shown for admins (controlled by showCreateButton prop)
        Appraisers do not see this button
      */}
      {showCreateButton && (
        <Link to={createButtonPath} className="mobile-claims__fab">
          +
        </Link>
      )}
    </div>
  );
}
