type Claim = {
  claim_number?: string;
  customer_name?: string;
  customer_phone?: string;
  email?: string;
  vin?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string | null;
  status?: string;
  appointment_start?: string;
  appointment_end?: string;
  notes?: string;
  firm?: string;
  created_at?: string;
  profiles?: {
    full_name?: string;
  } | null;
};

export const downloadClaimsCSV = (claims: Claim[]) => {
  const headers = [
    'Claim Number',
    'Customer Name',
    'Phone',
    'Email',
    'VIN',
    'Vehicle Year',
    'Vehicle Make',
    'Vehicle Model',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'Postal Code',
    'Status',
    'Assigned To',
    'Appointment Start',
    'Appointment End',
    'Notes',
    'Firm Name',
    'Created At'
  ];

  const rows = claims.map(claim => [
    claim.claim_number || '',
    claim.customer_name || '',
    claim.customer_phone || '',
    claim.email || '',
    claim.vin || '',
    claim.vehicle_year?.toString() || '',
    claim.vehicle_make || '',
    claim.vehicle_model || '',
    claim.address_line1 || '',
    claim.address_line2 || '',
    claim.city || '',
    claim.state || '',
    claim.zip || '',
    claim.status || '',
    claim.profiles?.full_name || 'Unassigned',
    claim.appointment_start || '',
    claim.appointment_end || '',
    claim.notes || '',
    claim.firm || '',
    claim.created_at || ''
  ].map(field => `"${String(field).replace(/"/g, '""')}"`));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `claims_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
