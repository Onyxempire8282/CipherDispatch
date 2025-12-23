/**
 * Payout Detail Modal Component
 * Shows detailed claim information for a specific payout
 */

import { useState } from 'react';
import { PayoutForecast, Claim } from '../utils/payoutForecasting';

interface ClaimDetail extends Claim {
  claim_number?: string;
  customer_name?: string;
}

interface PayoutDetailModalProps {
  payout: PayoutForecast;
  claims: ClaimDetail[];
  onClose: () => void;
  onUpdateAmount: (claimId: string, newAmount: number) => Promise<void>;
}

export function PayoutDetailModal({
  payout,
  claims,
  onClose,
  onUpdateAmount
}: PayoutDetailModalProps) {
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  const handleEditAmount = (claimId: string, currentAmount: number) => {
    setEditingClaimId(claimId);
    setEditAmount(currentAmount.toString());
  };

  const handleSaveAmount = async (claimId: string) => {
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      alert('Please enter a valid amount');
      return;
    }

    await onUpdateAmount(claimId, newAmount);
    setEditingClaimId(null);
    setEditAmount('');
  };

  const handleCancelEdit = () => {
    setEditingClaimId(null);
    setEditAmount('');
  };

  const totalAmount = claims.reduce((sum, c) => sum + (c.file_total || c.pay_amount || 0), 0);

  return (
    <div className="payout-modal-overlay" onClick={onClose}>
      <div className="payout-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="payout-modal__header">
          <div>
            <h3 className="payout-modal__title">
              {payout.firm} - Payout Details
            </h3>
            <div className="payout-modal__subtitle">
              Pay Date: {payout.payoutDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div className="payout-modal__subtitle">
              Work Period: {payout.periodStart.toLocaleDateString()} - {payout.periodEnd.toLocaleDateString()}
            </div>
          </div>
          <button className="payout-modal__close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="payout-modal__summary">
          <div>
            <div className="payout-dashboard__summary-label">Total Claims</div>
            <div className="payout-modal__summary-count">
              {claims.length}
            </div>
          </div>
          <div className="payout-modal__summary-total">
            <div className="payout-modal__summary-total-label">
              Total Expected Payout
            </div>
            <div className="payout-modal__summary-total-amount">
              ${totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Claims List */}
        <h4 className="payout-modal__claims-header">
          Claims Included in This Payout
        </h4>

        <div className="payout-modal__claims-list">
          {claims.map((claim) => {
            const amount = claim.file_total || claim.pay_amount || 0;
            const isEditing = editingClaimId === claim.id;
            const statusClass = claim.status === 'COMPLETED'
              ? 'claim-card__status--completed'
              : 'claim-card__status--scheduled';

            return (
              <div key={claim.id} className="claim-card">
                <div className="claim-card__grid">
                  <div>
                    <div className="claim-card__field-label">Claim Number</div>
                    <div className="claim-card__claim-number">
                      #{claim.claim_number || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="claim-card__field-label">Customer</div>
                    <div className="claim-card__customer">
                      {claim.customer_name || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="claim-card__field-label">Status</div>
                    <div className={`claim-card__status ${statusClass}`}>
                      {claim.status}
                    </div>
                  </div>
                  <div className="claim-card__amount-section">
                    {isEditing ? (
                      <div className="claim-card__edit-controls">
                        <input
                          type="number"
                          className="claim-card__edit-input"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          className="claim-card__save-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveAmount(claim.id);
                          }}
                        >
                          ✓
                        </button>
                        <button
                          className="claim-card__cancel-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="claim-card__field-label">Amount</div>
                        <div className="claim-card__edit-controls">
                          <div className="claim-card__amount">
                            ${amount.toFixed(2)}
                          </div>
                          <button
                            className="claim-card__edit-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAmount(claim.id, amount);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="claim-card__footer">
                  <div>
                    Date: <span className="claim-card__footer-value">
                      {claim.completion_date
                        ? new Date(claim.completion_date).toLocaleDateString()
                        : claim.appointment_start
                        ? new Date(claim.appointment_start).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    Type: <span className="claim-card__footer-value">
                      {claim.file_total ? 'file_total' : 'pay_amount'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
