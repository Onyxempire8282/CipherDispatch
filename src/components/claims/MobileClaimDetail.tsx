import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirmColor } from '../../constants/firmColors';
import { supabase } from '../../lib/supabase';
import { getPhotoUrlWithFallback } from '../../utils/uploadManager';
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

// Map claim status to BEM modifier suffix
const STATUS_MOD: Record<string, string> = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'progress',
  WRITING: 'writing',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
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
  onMarkComplete,
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
      `${claim.address_line1 || ''} ${claim.city || ''} ${claim.state || ''} ${claim.zip ? String(claim.zip).replace('.0', '') : ''}`
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

  const nav = useNavigate();
  const isArchived = claim.status === 'CANCELED';
  const hasPhotos = photos.length > 0;

  // Load supplements for original claims
  const [supplements, setSupplements] = useState<any[]>([]);
  useEffect(() => {
    if (claim.id && !claim.is_supplement) {
      supabase
        .from('claims_v')
        .select('*')
        .eq('original_claim_id', claim.id)
        .order('supplement_number')
        .then(({ data }) => setSupplements(data || []));
    }
  }, [claim.id, claim.is_supplement]);

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
            className={`mobile-detail__status${STATUS_MOD[claim.status] ? ` mobile-detail__status--${STATUS_MOD[claim.status]}` : ''}`}
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
        {claim.firm && (
          <div
            className="mobile-detail__firm-badge"
            style={{ borderColor: getFirmColor(claim.firm), color: getFirmColor(claim.firm) }}
          >
            {claim.firm}
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
        <div className="mobile-detail__upload-group">
          <input
            id={`mobile-photo-gallery-${claim.id}`}
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                await onPhoto?.(files);
                e.target.value = '';
              }
            }}
            className="mobile-detail__upload-input"
          />
          <label
            htmlFor={`mobile-photo-gallery-${claim.id}`}
            className="mobile-detail__photo-capture-btn mobile-detail__photo-capture-btn--flush"
          >
            🖼️ Choose from Gallery
          </label>
        </div>

        {/* Supplement Info — shown on supplement claims */}
        {claim.is_supplement && claim.original_claim_id && (
          <div className="mobile-detail__supp-info">
            <div className="mobile-detail__supp-info-label">SUPPLEMENT</div>
            <div className="mobile-detail__supp-badge">
              Supplement {claim.supplement_number} of Original Claim
            </div>
            {claim.supplement_reason && (
              <div className="mobile-detail__supp-origin">
                Reason: {claim.supplement_reason}
              </div>
            )}
            <div className="mobile-detail__supp-origin">
              <Link to={`/claim/${claim.original_claim_id}`} className="mobile-detail__supp-origin-link">
                ← View Original Claim
              </Link>
            </div>
          </div>
        )}

        {/* Appraiser Complete Button — field workers only, IN_PROGRESS */}
        {!isAdmin && claim.status === 'IN_PROGRESS' && (
          <button className="mobile-detail__complete-btn" onClick={onMarkComplete}>
            ✅ Mark Inspection Complete
          </button>
        )}

        {/* Customer Confirmation — admin only, SCHEDULED, not body_shop */}
        {isAdmin && claim.status === 'SCHEDULED' && claim.location_type !== 'body_shop' && (
          <CollapsibleSection title="Confirmation" icon="🔗" defaultOpen={false}>
            {claim.appt_confirmed ? (
              <div className="mobile-detail__confirm-done">✓ Customer confirmed appointment</div>
            ) : claim.confirm_token ? (
              <>
                <div className="mobile-detail__confirm-link">
                  {`${window.location.origin}/CipherDispatch/confirm?token=${claim.confirm_token}`}
                </div>
                <button
                  className="mobile-detail__action-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/CipherDispatch/confirm?token=${claim.confirm_token}`
                    );
                    alert('Link copied!');
                  }}
                >
                  📋 Copy Link
                </button>
              </>
            ) : (
              <button
                className="mobile-detail__action-secondary mobile-detail__action-secondary--amber"
                onClick={async () => {
                  await supabase.rpc('generate_confirm_token', { claim_id: claim.id });
                  window.location.reload();
                }}
              >
                🔗 Generate Confirmation Link
              </button>
            )}
          </CollapsibleSection>
        )}

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
            value={claim.customer_phone ? `📞 ${claim.customer_phone}` : null}
            href={claim.customer_phone ? `tel:${claim.customer_phone}` : undefined}
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
            value={claim.city ? `${claim.city}, ${claim.state || ''} ${claim.zip ? String(claim.zip).replace('.0', '') : ''}` : null}
          />
          <Field
            label="Location Type"
            value={
              claim.location_type === 'body_shop' ? '🔧 Body Shop'
              : claim.location_type === 'dealership' ? '🚗 Dealership'
              : claim.location_type === 'other' ? '📍 Other'
              : '🏠 Customer Address'
            }
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
                const photoUrl = getPhotoUrlWithFallback(photo.storage_path);
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
                className={`mobile-detail__status-badge${STATUS_MOD[claim.status] ? ` mobile-detail__status-badge--${STATUS_MOD[claim.status]}` : ''}`}
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
                className="mobile-detail__action-btn mobile-detail__action-btn--writing"
                onClick={() => onStatusChange('WRITING')}
              >
                ✍️ Writing
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

        {/* Supplements — admin only, original claims only */}
        {isAdmin && !claim.is_supplement && (
          <CollapsibleSection title="Supplements" icon="📎" defaultOpen={false}>
            {supplements.length > 0 ? (
              <div className="mobile-detail__supp-list">
                {supplements.map(s => (
                  <div
                    key={s.id}
                    className="mobile-detail__supp-row"
                    onClick={() => nav(`/claim/${s.id}`)}
                  >
                    <span className="mobile-detail__supp-num">S{s.supplement_number}</span>
                    <span className="mobile-detail__supp-reason">{s.supplement_reason || '—'}</span>
                    <span className={`mobile-detail__supp-status mobile-detail__supp-status--${(s.status || '').toLowerCase()}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Field label="" value="No supplements yet" />
            )}
            <Link
              to={`/admin/claims/${claim.id}/supplement`}
              className="mobile-detail__action-secondary mobile-detail__action-secondary--amber"
            >
              + Create Supplement
            </Link>
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
