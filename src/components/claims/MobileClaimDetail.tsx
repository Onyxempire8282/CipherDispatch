import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getFirmColor } from '../../constants/firmColors';
import { supabase } from '../../lib/supabase';
import './mobile-claim-detail.css';

/**
 * Mobile Claim Detail Component
 *
 * Mobile-optimized view for claim details (<=600px).
 * Uses collapsible sections for better scanning.
 *
 * ROLE GATING:
 * - Appraisers: View + Photo capture ONLY. No edit, no status changes, no admin data.
 * - Admins: Full access to all sections and actions.
 *
 * SECTION DEFAULTS (reduces cognitive load for field workers):
 * - Expanded: Customer, Location, Appointment, Photos (if exist)
 * - Collapsed: Vehicle, Notes, Payment (admin), Status & Actions (admin), Danger Zone (admin)
 *
 * EDIT MODE GUARDRAILS (admin only):
 * - Requires explicit Edit action
 * - Does not auto-expand sections
 * - Does not cause layout jumps
 */

interface MobileClaimDetailProps {
  claim: any;
  photos: any[];
  users: any[];
  isAdmin: boolean;
  isEditing: boolean;
  backLink: string;
  onStartEditing: () => void;
  onSaveEdits: () => void;
  onCancelEdits: () => void;
  onStatusChange: (status: string) => void;
  onMarkComplete: () => void;
  onPhotoClick: (index: number) => void;
  onPhotoCapture: string;
  onPhoto?: (files: FileList) => void;
}

// Status colors matching existing app
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#2196F3',
  IN_PROGRESS: '#FF9800',
  COMPLETED: '#4CAF50',
  CANCELED: '#ef4444',
};

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mobile-detail__section">
      <button
        className="mobile-detail__section-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mobile-detail__section-title">
          {icon} {title}
        </span>
        <span className={`mobile-detail__section-chevron ${isOpen ? 'mobile-detail__section-chevron--open' : ''}`}>
          ›
        </span>
      </button>
      {isOpen && <div className="mobile-detail__section-content">{children}</div>}
    </div>
  );
}

// Field Display Component (read-only)
function Field({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  return (
    <div className="mobile-detail__field">
      <div className="mobile-detail__field-label">{label}</div>
      {href ? (
        <a href={href} className="mobile-detail__field-value mobile-detail__field-value--link">
          {value}
        </a>
      ) : (
        <div className="mobile-detail__field-value">{value || <span className="mobile-detail__field-empty">Not set</span>}</div>
      )}
    </div>
  );
}

export default function MobileClaimDetail({
  claim,
  photos,
  users,
  isAdmin,
  isEditing,
  backLink,
  onStartEditing,
  onSaveEdits,
  onCancelEdits,
  onStatusChange,
  onPhotoClick,
  onPhotoCapture,
  onPhoto,
}: MobileClaimDetailProps) {
  // Get status display text
  const getStatusText = (status: string | null): string => {
    if (!status) return 'Assigned';
    return status.replace('_', ' ');
  };

  // Open location in maps app
  const openInMaps = () => {
    const q = encodeURIComponent(
      `${claim.address_line1 || ''} ${claim.city || ''} ${claim.state || ''} ${claim.postal_code || ''}`
    );
    window.open(`https://www.google.com/maps?q=${q}`, '_blank');
  };

  // Format appointment datetime
  const formatAppointment = (dateStr?: string): string => {
    if (!dateStr) return 'Not scheduled';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Get assigned user name (shown to all, but not editable by appraiser)
  const getAssignedUserName = (): string => {
    if (!claim.assigned_to) return 'Unassigned';
    const user = users.find((u) => u.user_id === claim.assigned_to);
    return user?.full_name || 'Unknown User';
  };

  const isArchived = claim.status === 'CANCELED';
  const hasPhotos = photos.length > 0;

  return (
    <div className="mobile-detail">
      {/* Sticky Header - Claim # and Status badge visible to all */}
      <div className="mobile-detail__header">
        <Link to={backLink} className="mobile-detail__back">
          ‹
        </Link>
        <div className="mobile-detail__header-info">
          <span className="mobile-detail__claim-number">#{claim.claim_number}</span>
          {/* Status badge: read-only for all users */}
          <span
            className="mobile-detail__status"
            style={{ backgroundColor: STATUS_COLORS[claim.status] || '#9E9E9E' }}
          >
            {getStatusText(claim.status)}
          </span>
        </div>
        {/*
          ROLE GATING: Edit button - Admin only
          Appraisers must NOT see edit controls at all (not disabled, not rendered)
        */}
        {isAdmin && !isEditing && !isArchived && (
          <button className="mobile-detail__edit-btn" onClick={onStartEditing}>
            Edit
          </button>
        )}
        {/*
          EDIT MODE GUARDRAILS: Save/Cancel actions remain in header
          - Does not cause layout jumps
          - Primary navigation (back button) stays stable
        */}
        {isAdmin && isEditing && (
          <div className="mobile-detail__edit-actions">
            <button className="mobile-detail__save-btn" onClick={onSaveEdits}>
              Save
            </button>
            <button className="mobile-detail__cancel-btn" onClick={onCancelEdits}>
              ×
            </button>
          </div>
        )}
      </div>

      {/* Customer Name Banner - visible to all */}
      <div className="mobile-detail__banner">
        <div className="mobile-detail__customer-name">{claim.customer_name}</div>
        {claim.firm_name && (
          <div
            className="mobile-detail__firm-badge"
            style={{ borderColor: getFirmColor(claim.firm_name), color: getFirmColor(claim.firm_name) }}
          >
            {claim.firm_name}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="mobile-detail__content">
        {/*
          PRIMARY ACTION for all users: Photo Capture
          This is the main action for appraisers in the field
        */}
        <Link to={onPhotoCapture} className="mobile-detail__photo-capture-btn">
          📷 Guided Photo Capture
        </Link>

        {/* TEMP: fallback manual upload for appraisers when guided capture is blocked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          <input
            id={`mobile-photo-gallery-${claim.id}`}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                onPhoto?.(e.target.files);
                e.target.value = '';
              }
            }}
            style={{ display: 'none' }}
          />
          <label
            htmlFor={`mobile-photo-gallery-${claim.id}`}
            className="mobile-detail__photo-capture-btn"
            style={{ marginBottom: 0 }}
          >
            🖼️ Choose from Gallery
          </label>
        </div>

        {/*
          SECTION DEFAULTS - Guardrail 1:
          Expanded: Customer, Location, Appointment, Photos (if exist)
          Collapsed: Vehicle, Notes, Payment, Status & Actions, Danger Zone
        */}

        {/* Customer Info Section - EXPANDED by default, read-only for all */}
        <CollapsibleSection title="Customer" icon="👤" defaultOpen={true}>
          <Field label="Name" value={claim.customer_name} />
          <Field
            label="Phone"
            value={claim.phone ? `📞 ${claim.phone}` : null}
            href={claim.phone ? `tel:${claim.phone}` : undefined}
          />
          <Field
            label="Email"
            value={claim.email ? `✉️ ${claim.email}` : null}
            href={claim.email ? `mailto:${claim.email}` : undefined}
          />
        </CollapsibleSection>

        {/* Location Section - EXPANDED by default, read-only for all */}
        <CollapsibleSection title="Location" icon="📍" defaultOpen={true}>
          <Field
            label="Address"
            value={
              claim.address_line1
                ? `${claim.address_line1}${claim.address_line2 ? `, ${claim.address_line2}` : ''}`
                : null
            }
          />
          <Field
            label="City"
            value={claim.city ? `${claim.city}, ${claim.state || ''} ${claim.postal_code || ''}` : null}
          />
          <button className="mobile-detail__maps-btn" onClick={openInMaps}>
            🗺️ Open in Maps
          </button>
        </CollapsibleSection>

        {/* Appointment Section - EXPANDED by default, read-only for all */}
        <CollapsibleSection title="Appointment" icon="📅" defaultOpen={true}>
          <Field label="Start" value={formatAppointment(claim.appointment_start)} />
          <Field label="End" value={formatAppointment(claim.appointment_end)} />
          {/* Assigned To is read-only for appraisers - they can see who but not change */}
          <Field label="Assigned To" value={getAssignedUserName()} />
        </CollapsibleSection>

        {/* Vehicle Info Section - COLLAPSED by default, read-only for all */}
        <CollapsibleSection title="Vehicle" icon="🚗" defaultOpen={false}>
          <Field label="VIN" value={claim.vin} />
          <div className="mobile-detail__field-row">
            <Field label="Year" value={claim.vehicle_year} />
            <Field label="Make" value={claim.vehicle_make} />
            <Field label="Model" value={claim.vehicle_model} />
          </div>
          <Field label="Date of Loss" value={claim.date_of_loss ? new Date(claim.date_of_loss).toLocaleDateString() : null} />
          <Field label="Insurance" value={claim.insurance_company} />
        </CollapsibleSection>

        {/* Notes Section - COLLAPSED by default, read-only for all */}
        {claim.notes && (
          <CollapsibleSection title="Notes" icon="📋" defaultOpen={false}>
            <div className="mobile-detail__notes">{claim.notes}</div>
          </CollapsibleSection>
        )}

        {/* Photos Section - EXPANDED only if photos exist, visible to all */}
        <CollapsibleSection title={`Photos (${photos.length})`} icon="📸" defaultOpen={hasPhotos}>
          {photos.length === 0 ? (
            <div className="mobile-detail__photos-empty">
              No photos yet. Use Guided Photo Capture to add photos.
            </div>
          ) : (
            <div className="mobile-detail__photos-grid">
              {photos.map((photo, index) => {
                const photoUrl = supabase.storage
                  .from('claim-photos')
                  .getPublicUrl(photo.storage_path).data.publicUrl;
                return (
                  <div
                    key={photo.id}
                    className="mobile-detail__photo"
                    style={{ backgroundImage: `url(${photoUrl})` }}
                    onClick={() => onPhotoClick(index)}
                  />
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/*
          ROLE GATING: Admin-only sections below
          These sections must NOT render for appraisers (not disabled, completely hidden)
        */}

        {/* Payment Section - ADMIN ONLY, COLLAPSED by default */}
        {isAdmin && (
          <CollapsibleSection title="Payment" icon="💰" defaultOpen={false}>
            <Field
              label="Pay Amount"
              value={claim.pay_amount ? `$${claim.pay_amount.toFixed(2)}` : null}
            />
            <Field
              label="File Total"
              value={claim.file_total ? `$${claim.file_total.toFixed(2)}` : null}
            />
            {claim.status === 'COMPLETED' && (
              <>
                <Field label="Payout Status" value={claim.payout_status || 'Not applicable'} />
                <Field
                  label="Expected Payout"
                  value={
                    claim.expected_payout_date
                      ? new Date(claim.expected_payout_date).toLocaleDateString()
                      : null
                  }
                />
              </>
            )}
          </CollapsibleSection>
        )}

        {/* Status & Actions Section - ADMIN ONLY, COLLAPSED by default */}
        {isAdmin && (
          <CollapsibleSection title="Status & Actions" icon="⚡" defaultOpen={false}>
            <div className="mobile-detail__status-current">
              <span className="mobile-detail__status-label">Current Status:</span>
              <span
                className="mobile-detail__status-badge"
                style={{ backgroundColor: STATUS_COLORS[claim.status] || '#9E9E9E' }}
              >
                {getStatusText(claim.status)}
              </span>
            </div>
            <div className="mobile-detail__status-actions">
              <button
                className="mobile-detail__action-btn mobile-detail__action-btn--scheduled"
                onClick={() => onStatusChange('SCHEDULED')}
              >
                📅 Scheduled
              </button>
              <button
                className="mobile-detail__action-btn mobile-detail__action-btn--progress"
                onClick={() => onStatusChange('IN_PROGRESS')}
              >
                🔧 In Progress
              </button>
              <button
                className="mobile-detail__action-btn mobile-detail__action-btn--complete"
                onClick={() => onStatusChange('COMPLETED')}
              >
                ✅ Complete
              </button>
              <button
                className="mobile-detail__action-btn mobile-detail__action-btn--cancel"
                onClick={() => onStatusChange('CANCELED')}
              >
                ❌ Cancel
              </button>
            </div>
          </CollapsibleSection>
        )}

        {/* Danger Zone - ADMIN ONLY, COLLAPSED by default */}
        {isAdmin && (
          <CollapsibleSection title="Danger Zone" icon="⚠️" defaultOpen={false}>
            <p className="mobile-detail__danger-warning">
              Permanent deletion cannot be undone. All photos and data will be lost.
            </p>
            <button
              className="mobile-detail__delete-btn"
              onClick={() => onStatusChange('DELETE')}
            >
              🗑️ Permanently Delete Claim
            </button>
          </CollapsibleSection>
        )}
      </div>

      {/*
        ROLE GATING: Bottom action bar removed for appraisers
        Appraisers do NOT have status change capabilities.
        Their only action is photo capture (button at top of content).
        Admins use the Status & Actions section instead.
      */}
    </div>
  );
}
