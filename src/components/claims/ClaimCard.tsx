/**
 * ClaimCard component with improved visual hierarchy
 * Follows TripleTen best practices: accessible, clear sections, mobile-first
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { getFirmColor } from '../../constants/firmColors';
import { formatAppointmentDateTime } from '../../utils/dateHelpers';
import { getSupabaseAuthz } from '../../lib/supabaseAuthz';

export interface ClaimCardData {
  id: string;
  claim_number: string;
  customer_name: string;
  status?: string | null;
  appointment_start?: string;
  appointment_end?: string;
  vin?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  assigned_to?: string | null;
  assigned_user_name?: string;
  firm_name?: string;
  notes?: string;
  pay_amount?: number | null;
  file_total?: number | null;
}

export interface ClaimCardProps {
  claim: ClaimCardData;
  showFirmBadge?: boolean;
  showAssignment?: boolean;
  showVin?: boolean;
  showNotes?: boolean;
}

export default function ClaimCard({
  claim,
  showFirmBadge = true,
  showAssignment = true,
  showVin = true,
  showNotes = true,
}: ClaimCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/claim/${claim.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const firmColor = showFirmBadge && claim.firm_name ? getFirmColor(claim.firm_name) : undefined;

  const authz = getSupabaseAuthz();
  const userInfo = authz?.getCurrentUser();
  const isAdmin = userInfo?.role === "admin";

  return (
    <Card
      firmColor={firmColor}
      hover={true}
      onClick={handleClick}
      className="space-y-3"
    >
      {/* Header: Claim Number and Badges */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-brand-light-100 flex-1">
          #{claim.claim_number}
        </h3>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="status" status={claim.status} />
          {showFirmBadge && claim.firm_name && (
            <Badge variant="firm" label={claim.firm_name} color={firmColor} />
          )}
          {showNotes && claim.notes && (
            <Badge variant="note" />
          )}
        </div>
      </div>

      {/* Payment Amount - Admin Only */}
      {isAdmin && claim.pay_amount != null && (
        <div className="border-t border-brand-dark-700 pt-3">
          <p className="text-xs font-medium text-brand-light-400 mb-1">💰 Pay Amount</p>
          <p className="text-sm text-brand-light-100 font-semibold">
            ${claim.pay_amount.toFixed(2)}
          </p>
        </div>
      )}

      {/* File Total - Admin Only */}
      {isAdmin && claim.file_total != null && (
        <div className="border-t border-brand-dark-700 pt-3">
          <p className="text-xs font-medium text-brand-light-400 mb-1">📄 File Total</p>
          <p className="text-sm text-brand-light-100 font-semibold">
            ${claim.file_total.toFixed(2)}
          </p>
        </div>
      )}

      {/* Customer Section */}
      <div className="border-t border-brand-dark-700 pt-3">
        <p className="text-xs font-medium text-brand-light-400 mb-1">👤 Customer</p>
        <p className="text-sm text-brand-light-100 font-medium">{claim.customer_name}</p>
      </div>

      {/* Appointment Section */}
      <div className="border-t border-brand-dark-700 pt-3">
        <p className="text-xs font-medium text-brand-light-400 mb-1">📅 Appointment</p>
        <p className="text-sm text-brand-light-100">
          {formatAppointmentDateTime(claim.appointment_start)}
        </p>
      </div>

      {/* Vehicle Section */}
      <div className="border-t border-brand-dark-700 pt-3">
        <p className="text-xs font-medium text-brand-light-400 mb-1">🚗 Vehicle</p>
        {claim.vehicle_year || claim.vehicle_make || claim.vehicle_model ? (
          <div className="space-y-1">
            <p className="text-sm text-brand-light-100">
              {claim.vehicle_year} {claim.vehicle_make} {claim.vehicle_model}
            </p>
            {showVin && claim.vin && (
              <p className="text-xs text-brand-light-300 font-mono">
                VIN: {claim.vin.substring(0, 10)}...
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-brand-light-400 italic">No vehicle info</p>
        )}
      </div>

      {/* Assignment Section (optional) */}
      {showAssignment && (
        <div className="border-t border-brand-dark-700 pt-3">
          <p className="text-xs font-medium text-brand-light-400 mb-1">Assigned To</p>
          <p className="text-sm text-brand-light-100">
            {claim.assigned_user_name || claim.assigned_to || (
              <span className="text-brand-light-400 italic">Unassigned</span>
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
