import { useMemo } from 'react';

interface Claim {
  id: string;
  firm?: string;
  pay_amount?: number | null;
  appointment_start?: string;
  status?: string;
}

interface PayoutForecastProps {
  claims: Claim[];
}

interface FirmPayout {
  firmName: string;
  amount: number;
  claimCount: number;
}

// Pay period configuration
const PAY_PERIODS = {
  Sedgwick: { type: 'weekly', payDay: 4 }, // Thursday
  Legacy: { type: 'bi-weekly', payDay: 4 }, // Thursday
  'Complete Claims': { type: 'bi-weekly', payDay: 4 }, // Thursday
  ClaimSolution: { type: 'bi-weekly', payDay: 5 }, // Friday
  Doan: { type: 'bi-weekly', payDay: 5 }, // Friday
  HEA: { type: 'monthly', payDate: 15 }, // 15th of month
  ACD: { type: 'semi-monthly', payDates: [15, 30] }, // 15th and last day
  IANET: { type: 'last-day' }, // Last day of month
};

function getNextPaymentDate(firmName: string, claimDate: Date): Date | null {
  const config = PAY_PERIODS[firmName as keyof typeof PAY_PERIODS];
  if (!config) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (config.type === 'weekly' && 'payDay' in config) {
    // Find next Thursday (payDay = 4)
    const nextPay = new Date(claimDate);
    const daysUntilPayDay = (config.payDay - nextPay.getDay() + 7) % 7;
    nextPay.setDate(nextPay.getDate() + daysUntilPayDay);
    if (daysUntilPayDay === 0) {
      nextPay.setDate(nextPay.getDate() + 7); // Next week if today is pay day
    }
    return nextPay;
  }

  if (config.type === 'bi-weekly' && 'payDay' in config) {
    // Find next bi-weekly Thursday or Friday
    const nextPay = new Date(claimDate);
    const daysUntilPayDay = (config.payDay - nextPay.getDay() + 7) % 7;
    nextPay.setDate(nextPay.getDate() + daysUntilPayDay);
    if (daysUntilPayDay === 0) {
      nextPay.setDate(nextPay.getDate() + 14); // 2 weeks later
    }
    return nextPay;
  }

  if (config.type === 'monthly' && 'payDate' in config) {
    // HEA: pays on 15th for previous month's work
    const nextPay = new Date(claimDate.getFullYear(), claimDate.getMonth() + 1, config.payDate);
    return nextPay;
  }

  if (config.type === 'semi-monthly' && 'payDates' in config) {
    // ACD: pays on 15th and 30th/31st
    const claimDay = claimDate.getDate();
    if (claimDay >= 1 && claimDay <= 15) {
      return new Date(claimDate.getFullYear(), claimDate.getMonth(), 15);
    } else {
      const lastDay = new Date(claimDate.getFullYear(), claimDate.getMonth() + 1, 0).getDate();
      return new Date(claimDate.getFullYear(), claimDate.getMonth(), lastDay);
    }
  }

  if (config.type === 'last-day') {
    // IANET: pays last day of same month
    const lastDay = new Date(claimDate.getFullYear(), claimDate.getMonth() + 1, 0);
    return lastDay;
  }

  return null;
}

function isPaymentThisWeek(paymentDate: Date | null): boolean {
  if (!paymentDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get start of this week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  // Get end of this week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return paymentDate >= startOfWeek && paymentDate <= endOfWeek;
}

export default function PayoutForecast({ claims }: PayoutForecastProps) {
  const forecast = useMemo(() => {
    const firmPayouts = new Map<string, FirmPayout>();

    // Only include scheduled or completed claims with pay_amount
    const eligibleClaims = claims.filter(
      (c) => c.pay_amount && c.appointment_start && (c.status === 'SCHEDULED' || c.status === 'COMPLETED')
    );

    eligibleClaims.forEach((claim) => {
      if (!claim.firm || !claim.pay_amount || !claim.appointment_start) return;

      const claimDate = new Date(claim.appointment_start);
      const paymentDate = getNextPaymentDate(claim.firm, claimDate);

      if (!paymentDate || !isPaymentThisWeek(paymentDate)) return;

      const existing = firmPayouts.get(claim.firm) || {
        firmName: claim.firm,
        amount: 0,
        claimCount: 0,
      };

      firmPayouts.set(claim.firm, {
        firmName: claim.firm,
        amount: existing.amount + claim.pay_amount,
        claimCount: existing.claimCount + 1,
      });
    });

    return Array.from(firmPayouts.values()).sort((a, b) => b.amount - a.amount);
  }, [claims]);

  const totalPayout = forecast.reduce((sum, f) => sum + f.amount, 0);

  if (forecast.length === 0) {
    return (
      <div
        style={{
          background: '#1a202c',
          border: '2px solid #4a5568',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', color: '#e2e8f0', fontSize: '20px', fontWeight: 'bold' }}>
          📊 Expected Payout This Week
        </h3>
        <p style={{ color: '#a0aec0', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
          No payouts scheduled for this week
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#1a202c',
        border: '2px solid #4a5568',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#e2e8f0', fontSize: '20px', fontWeight: 'bold' }}>
          📊 Expected Payout This Week
        </h3>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#10b981',
            marginTop: '12px',
          }}
        >
          ${totalPayout.toFixed(2)}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #4a5568', paddingTop: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: '14px', fontWeight: '600' }}>
          Breakdown by Firm
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {forecast.map((firm) => (
            <div
              key={firm.firmName}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: '#2d3748',
                borderRadius: '8px',
                borderLeft: '4px solid #667eea',
              }}
            >
              <div>
                <div style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '600' }}>
                  {firm.firmName}
                </div>
                <div style={{ color: '#a0aec0', fontSize: '12px', marginTop: '2px' }}>
                  {firm.claimCount} claim{firm.claimCount > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ color: '#10b981', fontSize: '18px', fontWeight: 'bold' }}>
                ${firm.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
