export interface ScriptTemplate {
  label: string;
  body: string;
}

export const CUSTOMER_SCRIPTS: ScriptTemplate[] = [
  {
    label: "① Initial Scheduling Outreach",
    body: `Hello {customer_name},

My name is Nneka, and I'm reaching out on behalf of {insurer}. We are an independent appraisal firm working to coordinate your vehicle inspection. We'd like to schedule an appointment for our licensed auto damage appraiser to inspect your vehicle. Our appraiser will be in your area and is available on [DATE] between [TIME]. The inspection typically takes no more than 15 minutes.

Please confirm the following:
- What is the current condition of the vehicle? Is it driveable with limited use, or is it road ready?
- Is the inspection location still correct? {inspection_address}
- Does the proposed time work for you?

If any changes occur, please contact us as soon as possible so we can reschedule. You can reach us at (252) 288-5055.

Thank you, and we look forward to assisting you.

Best regards,
Nneka
Independent Appraisal Coordinator
Flavor Holdings LLC`,
  },
  {
    label: "② Appointment Confirmed — Phone",
    body: `Reached out and spoke with {customer_name}. Appointment inspection has been scheduled for [DATE] between [TIME].`,
  },
  {
    label: "③ Appointment Confirmed — Text Response",
    body: `{customer_name} responded to message. Appointment inspection has been scheduled for [DATE] between [TIME].`,
  },
  {
    label: "④ Reschedule Request",
    body: `Dear {customer_name},

I hope this message finds you well. I would like to request a rescheduling for your vehicle inspection appointment to [DATE] between [TIME]. Please let me know if this works.

I appreciate your time and assistance. Looking forward to your confirmation.

Best regards,
Nneka Blue-Long
(252) 288-5055`,
  },
  {
    label: "⑤ No Response — Attempt Logged",
    body: `Reached out to {customer_name}. Despite our efforts, have not received a response via phone/text for appointment scheduling.`,
  },
  {
    label: "⑥ Weather Advisory — Customer",
    body: `Hello {customer_name},

This is Nneka and I am contacting you on behalf of {insurer}. I'd like to schedule an appointment for our auto appraiser to inspect your vehicle. We have availability on [DATE] between [TIME].

We hope you're staying safe during the current weather conditions. Due to the weather advisory, please ensure your vehicle is accessible and free of snow or ice, if safe to do so. Should there be any delays or rescheduling due to weather, we will notify you promptly.

If you have any questions, please reach out at (252) 288-5055.

Stay safe,
Nneka Blue-Long`,
  },
  {
    label: "⑦ Inspection Complete — Thank You",
    body: `Hello {customer_name},

Thank you for your time today. Your vehicle inspection has been completed. If you have any questions regarding next steps, please contact your adjuster at {insurer} or reach us at (252) 288-5055.

Best regards,
Nneka
Flavor Holdings LLC`,
  },
  {
    label: "⑧ Unable to Access Vehicle",
    body: `Attempted vehicle inspection at {inspection_address}. Unable to access the vehicle at the scheduled time. Please contact us at (252) 288-5055 to reschedule.`,
  },
];

export const FIRM_SCRIPTS: ScriptTemplate[] = [
  {
    label: "① Copart Approval Hold",
    body: `Reaching out to follow up regarding approval status for Copart. Do we have an update on whether approval has been granted? Once confirmed, we'd like to proceed with scheduling the inspection as soon as possible.`,
  },
  {
    label: "② Appointment Confirmed — Firm Notification",
    body: `Spoke with {customer_name}. Appointment inspection has been confirmed for [DATE] between [TIME] at {inspection_address}.`,
  },
  {
    label: "③ Appointment Confirmed — Mileage Pending (CCS)",
    body: `Appointment accepted for [DATE], but need approval for mileage first. MILEAGE REQUEST: [DETAILS]`,
  },
  {
    label: "④ Weather Advisory — Firm",
    body: `Due to the current weather advisory, we have proactively reached out to {customer_name} to address their scheduled inspection appointment. Customer has been advised of potential delays and has been asked to ensure their vehicle is accessible and free of snow or ice, if safe to do so. [OUTCOME]`,
  },
  {
    label: "⑤ No Response — Status Update to Firm",
    body: `We have made multiple attempts to reach {customer_name} via phone and text for appointment scheduling. As of [DATE], we have not received a response. Please advise on how you would like us to proceed.`,
  },
  {
    label: "⑥ Mileage Approval Request",
    body: `Requesting mileage approval for inspection at {inspection_address}. Estimated mileage: [MILES]. Please confirm approval so we can proceed with scheduling.`,
  },
  {
    label: "⑦ Inspection Complete — Report Pending",
    body: `Vehicle inspection for {customer_name} has been completed. Report is currently being prepared and will be submitted shortly.`,
  },
  {
    label: "⑧ Inspection Complete — Report Delivered",
    body: `Inspection report for {customer_name} has been completed and submitted. Please confirm receipt.`,
  },
  {
    label: "⑨ Reinspection Request",
    body: `A reinspection is needed for claim #{claim_number} — {customer_name}. Reason: [REASON]. Please advise on approval and scheduling.`,
  },
  {
    label: "⑩ Unable to Access Vehicle — Firm Notification",
    body: `Inspector was unable to access the vehicle for {customer_name} at {inspection_address} on [DATE]. Please advise on how you would like us to proceed.`,
  },
  {
    label: "⑪ Total Loss Flag",
    body: `During inspection of {customer_name}'s vehicle, preliminary assessment indicates this may be a total loss. Full report to follow. Please advise if any additional steps are required on your end.`,
  },
];

export function interpolateScript(
  template: string,
  claimData: Record<string, any>,
  appraiserName?: string
): string {
  return template
    .replace(/\{customer_name\}/g, claimData.customer_name || "[CUSTOMER NAME]")
    .replace(/\{insurer\}/g, claimData.insurance_company || claimData.tpa_name || "[INSURER]")
    .replace(/\{inspection_address\}/g, claimData.inspection_address || claimData.address_line1 || "[INSPECTION ADDRESS]")
    .replace(/\{appraiser_name\}/g, appraiserName || "[APPRAISER NAME]")
    .replace(/\{claim_number\}/g, claimData.claim_number || "[CLAIM #]");
}
