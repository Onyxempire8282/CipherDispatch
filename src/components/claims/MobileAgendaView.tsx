import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isSameDay, addDays, subDays, isValid } from 'date-fns';
import { getFirmColor } from '../../constants/firmColors';
import './mobile-agenda.css';

// Claim type matching MyClaims.tsx
type Claim = {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  appointment_start?: string;
  appointment_end?: string;
  vin?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  firm?: string;
  pay_amount?: number | null;
  file_total?: number | null;
  profiles?: { full_name?: string } | null;
};

interface MobileAgendaViewProps {
  claims: Claim[];
  onClaimUpdate?: () => void;
}

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#2196F3',
  IN_PROGRESS: '#FF9800',
  COMPLETED: '#4CAF50',
  CANCELED: '#ef4444',
};

/**
 * Mobile Daily Agenda View
 *
 * Replaces the desktop calendar grid on mobile devices (<=600px).
 * Shows a vertical list of claims for the selected day.
 *
 * Design decisions:
 * - Vertical scroll only (no horizontal gestures)
 * - Tap to navigate to claim detail
 * - Backlog accessible via bottom sheet
 * - Optimized for field use (large tap targets, clear hierarchy)
 */
export default function MobileAgendaView({ claims, onClaimUpdate }: MobileAgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showBacklog, setShowBacklog] = useState(false);

  // Filter claims for selected date
  const daysClaims = useMemo(() => {
    return claims
      .filter((claim) => {
        if (!claim.appointment_start) return false;
        try {
          const claimDate = parseISO(claim.appointment_start);
          return isValid(claimDate) && isSameDay(claimDate, selectedDate);
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const aTime = a.appointment_start ? new Date(a.appointment_start).getTime() : 0;
        const bTime = b.appointment_start ? new Date(b.appointment_start).getTime() : 0;
        return aTime - bTime;
      });
  }, [claims, selectedDate]);

  // Get unscheduled claims (backlog)
  const backlogClaims = useMemo(() => {
    return claims.filter((claim) => !claim.appointment_start);
  }, [claims]);

  // Navigation handlers
  const goToPrevDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Format time display (e.g., "9:30 AM")
  const formatTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'h:mm a') : '';
    } catch {
      return '';
    }
  };

  // Format time window (e.g., "9:30 AM - 11:30 AM")
  const formatTimeWindow = (start?: string, end?: string): string => {
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    if (startTime && endTime) return `${startTime} - ${endTime}`;
    if (startTime) return startTime;
    return 'No time set';
  };

  // Get display status text
  const getStatusText = (status: string | null): string => {
    if (!status) return 'Assigned';
    return status.replace('_', ' ');
  };

  // Check if selected date is today
  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="mobile-agenda">
      {/* Date Header */}
      <div className="mobile-agenda__header">
        <div className="mobile-agenda__date">
          {format(selectedDate, 'EEEE')}
          <span className="mobile-agenda__date-detail">
            {format(selectedDate, 'MMM d')}
          </span>
        </div>

        {/* Navigation Buttons */}
        <div className="mobile-agenda__nav">
          <button
            className="mobile-agenda__nav-btn"
            onClick={goToPrevDay}
            aria-label="Previous day"
          >
            &lt;
          </button>
          <button
            className={`mobile-agenda__nav-btn mobile-agenda__nav-btn--today ${isToday ? 'mobile-agenda__nav-btn--active' : ''}`}
            onClick={goToToday}
          >
            Today
          </button>
          <button
            className="mobile-agenda__nav-btn"
            onClick={goToNextDay}
            aria-label="Next day"
          >
            &gt;
          </button>
        </div>
      </div>

      {/* Backlog Button */}
      <button
        className="mobile-agenda__backlog-btn"
        onClick={() => setShowBacklog(true)}
      >
        Needs Scheduling
        <span className="mobile-agenda__backlog-count">{backlogClaims.length}</span>
      </button>

      {/* Day's Claims List */}
      <div className="mobile-agenda__list">
        {daysClaims.length === 0 ? (
          /* Empty state: UI-only, does not auto-switch or fetch */
          <div className="mobile-agenda__empty">
            <div className="mobile-agenda__empty-text">
              No inspections scheduled for this day.
            </div>
            <div className="mobile-agenda__empty-actions">
              {!isToday && (
                <button
                  className="mobile-agenda__empty-btn"
                  onClick={goToToday}
                >
                  Go to Today
                </button>
              )}
              {backlogClaims.length > 0 && (
                <button
                  className="mobile-agenda__empty-btn mobile-agenda__empty-btn--secondary"
                  onClick={() => setShowBacklog(true)}
                >
                  View Backlog ({backlogClaims.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          daysClaims.map((claim) => (
            <Link
              key={claim.id}
              to={`/claim/${claim.id}`}
              className="mobile-agenda__item"
              style={{ borderLeftColor: getFirmColor(claim.firm) }}
            >
              {/* Row 1: TIME WINDOW (prominent) + STATUS PILL (always visible) */}
              <div className="mobile-agenda__item-header">
                <span className="mobile-agenda__item-time">
                  {formatTimeWindow(claim.appointment_start, claim.appointment_end)}
                </span>
                <span
                  className="mobile-agenda__item-status"
                  style={{
                    backgroundColor: STATUS_COLORS[claim.status] || '#9E9E9E',
                  }}
                >
                  {getStatusText(claim.status)}
                </span>
              </div>

              {/* Row 2: CLIENT NAME (truncate overflow) */}
              <div className="mobile-agenda__item-client">
                {claim.customer_name}
              </div>

              {/* Row 3: CITY / FIRM (truncate overflow) */}
              <div className="mobile-agenda__item-location">
                <span className="mobile-agenda__item-city">
                  {claim.city || 'No location'}
                </span>
                {claim.firm && (
                  <>
                    <span className="mobile-agenda__item-divider">/</span>
                    <span
                      className="mobile-agenda__item-firm"
                      style={{ color: getFirmColor(claim.firm) }}
                    >
                      {claim.firm}
                    </span>
                  </>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/*
        Backlog Bottom Sheet - READ-ONLY by design
        - Tap item → opens claim detail (navigation only)
        - No drag-and-drop on mobile
        - No scheduling actions
        - No long-press behaviors
        This is intentional for mobile reliability.
      */}
      {showBacklog && (
        <>
          <div
            className="mobile-agenda__overlay"
            onClick={() => setShowBacklog(false)}
          />
          <div className="mobile-agenda__sheet">
            <div className="mobile-agenda__sheet-header">
              <span className="mobile-agenda__sheet-title">
                Needs Scheduling ({backlogClaims.length})
              </span>
              <button
                className="mobile-agenda__sheet-close"
                onClick={() => setShowBacklog(false)}
                aria-label="Close backlog"
              >
                ×
              </button>
            </div>
            <div className="mobile-agenda__sheet-content">
              {backlogClaims.length === 0 ? (
                <div className="mobile-agenda__sheet-empty">
                  No unscheduled claims
                </div>
              ) : (
                backlogClaims.map((claim) => (
                  <Link
                    key={claim.id}
                    to={`/claim/${claim.id}`}
                    className="mobile-agenda__backlog-item"
                    style={{ borderLeftColor: getFirmColor(claim.firm) }}
                    onClick={() => setShowBacklog(false)}
                  >
                    <div className="mobile-agenda__backlog-item-main">
                      <div className="mobile-agenda__backlog-item-customer">
                        {claim.customer_name}
                      </div>
                      <div className="mobile-agenda__backlog-item-location">
                        {claim.city || 'No location'}
                        {claim.firm && (
                          <>
                            <span className="mobile-agenda__backlog-divider">/</span>
                            <span style={{ color: getFirmColor(claim.firm) }}>
                              {claim.firm}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
