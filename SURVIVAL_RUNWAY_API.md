# Survival Runway API Documentation

## Overview

The Survival Runway API provides a 30-day rolling cash forecast that predicts incoming payments and models the impact of payment delays on cash flow. This helps answer critical questions like "How much cash will we have in 30 days?" and "What happens if firms pay late?"

## What It Tracks

### Cash Flow Forecast

1. **expected_cash_in_30_days**: Total cash expected to arrive in next 30 days
2. **delayed_payment_impact**: Financial impact if all firms pay 7 days late
3. **Daily forecast**: Day-by-day breakdown of expected cash inflows

### Delay Scenarios

- **Normal scenario**: Payments arrive on expected dates (based on firm pay cycles)
- **Delayed scenario**: All payments arrive N days late (default: 7 days)
- **Impact calculation**: Difference between scenarios shows vulnerability to delays

## API Endpoint

### Base URL
```
/api/survival-runway
```

### Authentication
Requires admin role authentication.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pretty` | boolean | false | Pretty-print JSON output |
| `days` | number | 30 | Number of days to forecast |
| `delay` | number | 7 | Payment delay scenario in days |

### Examples

```
GET /api/survival-runway
GET /api/survival-runway?pretty=true
GET /api/survival-runway?days=60&delay=14
GET /api/survival-runway?days=30&delay=7&pretty=true
```

## Response Format

```json
{
  "status": "success",
  "data": {
    "generated_at": "2025-12-30T10:00:00.000Z",
    "forecast_start": "2025-12-30T00:00:00.000Z",
    "forecast_end": "2026-01-29T00:00:00.000Z",
    "forecast_days": 30,
    "expected_cash_in_30_days": 52450.75,
    "delayed_scenario_cash": 38920.50,
    "delayed_payment_impact": 13530.25,
    "impact_percentage": 25.8,
    "daily_forecast": [
      {
        "date": "2025-12-30T00:00:00.000Z",
        "date_label": "Mon, Dec 30",
        "expected_amount": 4250.00,
        "delayed_amount": 0,
        "cumulative_expected": 4250.00,
        "cumulative_delayed": 0,
        "payout_count": 2,
        "firms_paying": ["Sedgwick", "ClaimSolution"]
      }
    ],
    "summary": {
      "total_payouts_expected": 12,
      "avg_daily_expected": 1748.36,
      "avg_daily_delayed": 1297.35,
      "largest_single_day": 8750.00,
      "largest_single_day_date": "Wed, Jan 8",
      "days_with_payouts": 8,
      "days_without_payouts": 22
    },
    "risk_assessment": {
      "impact_level": "moderate",
      "cash_flow_health": "Moderately sensitive to delays",
      "recommendations": [
        "Moderate delay sensitivity (10-25% impact from 7-day delay)",
        "Monitor payment timing closely",
        "Maintain working capital cushion",
        "22 days with no expected payments - uneven cash flow distribution"
      ]
    }
  }
}
```

## Data Fields Explained

### Top-Level Metrics

| Field | Description |
|-------|-------------|
| `forecast_start` | Start date of forecast window (today) |
| `forecast_end` | End date of forecast window (today + N days) |
| `forecast_days` | Number of days forecasted |
| `expected_cash_in_30_days` | **KEY METRIC**: Total cash expected in forecast period |
| `delayed_scenario_cash` | Cash received if all payments delayed N days |
| `delayed_payment_impact` | **KEY METRIC**: Difference (expected - delayed) |
| `impact_percentage` | Impact as % of expected cash |

### Daily Forecast Object

| Field | Description |
|-------|-------------|
| `date` | Date (ISO 8601) |
| `date_label` | Human-readable date (e.g., "Mon, Dec 30") |
| `expected_amount` | Cash expected to arrive on this date (normal scenario) |
| `delayed_amount` | Cash arriving on this date in delayed scenario |
| `cumulative_expected` | Running total of expected cash (normal scenario) |
| `cumulative_delayed` | Running total in delayed scenario |
| `payout_count` | Number of payouts expected this day |
| `firms_paying` | List of firms paying on this date |

### Summary Statistics

| Field | Description |
|-------|-------------|
| `total_payouts_expected` | Total number of payment events in window |
| `avg_daily_expected` | Average daily cash inflow (normal scenario) |
| `avg_daily_delayed` | Average daily cash inflow (delayed scenario) |
| `largest_single_day` | Biggest single-day cash inflow |
| `largest_single_day_date` | Date of largest inflow |
| `days_with_payouts` | Number of days with expected payments |
| `days_without_payouts` | Number of days with no payments |

### Risk Assessment

| Field | Values | Description |
|-------|--------|-------------|
| `impact_level` | low / moderate / high / critical | Sensitivity to payment delays |
| `cash_flow_health` | String | Overall cash flow stability assessment |
| `recommendations` | Array of strings | Actionable recommendations |

## Interpretation Guide

### Expected Cash in 30 Days

This is your **cash runway** - how much money you expect to collect:

- **$0**: Critical - no expected payments, cash flow gap
- **< $10,000**: Low - may need to increase volume or pricing
- **$10,000 - $50,000**: Moderate - typical for small operations
- **> $50,000**: Strong - healthy revenue pipeline

### Delayed Payment Impact

Shows financial hit if all firms pay late:

- **< 10% impact**: **LOW RISK** - Delays minimally affect you
- **10-25% impact**: **MODERATE RISK** - Noticeable but manageable
- **25-50% impact**: **HIGH RISK** - Significant vulnerability
- **> 50% impact**: **CRITICAL RISK** - Extremely delay-sensitive

**Positive impact** (expected > delayed): Delays hurt you
**Negative impact** (delayed > expected): Delays don't affect forecast window (payments shift in later)

### Impact Level

- **Low**: Robust cash flow, delays < 10% impact
- **Moderate**: Some sensitivity, 10-25% impact
- **High**: Significant vulnerability, 25-50% impact
- **Critical**: Extreme sensitivity, > 50% impact or no expected cash

### Cash Flow Patterns

**Days with Payouts vs Days Without**
- Many days without payouts = Lumpy cash flow, higher risk
- Even distribution = Smoother, more predictable cash flow

**Largest Single Day**
- If one day is >50% of total = Concentrated risk, watch that date
- Even distribution = Better diversification

## How It Works

### Data Sources

The forecast uses:
1. **Completed claims**: With `completion_date` → forecasts when payment expected
2. **Scheduled claims**: With `appointment_start` → forecasts future completions → future payments
3. **Firm pay cycles**: Weekly, bi-weekly, monthly schedules from `payoutForecasting.ts`

### Calculation Logic

**Expected Cash (Normal Scenario)**:
```typescript
for each claim:
  if status = COMPLETED:
    work_date = completion_date
    amount = file_total || pay_amount
  else if appointment_start exists:
    work_date = appointment_start
    amount = pay_amount || firm_base_fee

  payout_date = getPayPeriod(firm, work_date).payoutDate

  if payout_date within next 30 days:
    expected_cash += amount
```

**Delayed Scenario**:
```typescript
// Shift all payout dates by N days (default 7)
delayed_payout_date = payout_date + delay_days

// Calculate cash that arrives within window in delayed scenario
if delayed_payout_date within next 30 days:
  delayed_cash += amount
```

**Impact**:
```typescript
delayed_payment_impact = expected_cash - delayed_cash
impact_percentage = (impact / expected_cash) * 100
```

### Why This Matters

**Scenario**: You expect $50,000 in 30 days

**If 7-day delay impact = $10,000 (20%)**:
- You'd only get $40,000 in those 30 days
- The other $10,000 shifts to days 31-37
- If you need $45,000 for expenses, you're short $5,000

This helps you:
- Build appropriate cash reserves
- Know which firms to follow up with urgently
- Decide if you can take on new expenses

## Use Cases

### 1. Cash Flow Planning

**Question**: Can we afford this expense next month?

**Look at**:
- `expected_cash_in_30_days`: Available cash
- `delayed_payment_impact`: Risk buffer needed
- `daily_forecast`: When cash actually arrives

**Decision**:
- If expense < expected_cash AND low impact level → Safe
- If expense close to expected cash AND high impact → Risky
- If expense > expected cash → Can't afford unless you have reserves

### 2. Emergency Reserve Planning

**Question**: How much emergency cash should we keep?

**Look at**:
- `delayed_payment_impact`: Minimum buffer needed
- `impact_level`: Overall risk
- `impact_percentage`: How vulnerable you are

**Reserve Target**:
- Critical impact (>50%) → Keep 50%+ of monthly revenue in reserve
- High impact (25-50%) → Keep 25-30% in reserve
- Moderate impact (10-25%) → Keep 15-20% in reserve
- Low impact (<10%) → Keep 10% in reserve

### 3. Collections Priority

**Question**: Which firms should I follow up with first?

**Look at**:
- `daily_forecast.firms_paying`: See which firms paying soon
- Cross-reference with `/api/firm-reliability`: See which firms are often late
- `largest_single_day`: Pay extra attention to large payment days

**Strategy**:
- Firms with large payments arriving soon → Follow up 1 week before
- Firms with history of delays (from reliability API) → Follow up 2 weeks before
- Firms on `largest_single_day` → Extra attention, that day is critical

### 4. Growth Decisions

**Question**: Can we hire or invest in equipment?

**Look at**:
- `expected_cash_in_30_days`: Short-term cash availability
- `impact_level`: Stability of cash flow
- `days_without_payouts`: Cash flow smoothness

**Decision**:
- High expected cash + low impact + few gap days → Safe to invest
- Low expected cash OR high impact OR many gap days → Wait

### 5. Pricing & Terms Negotiation

**Question**: Should we offer net-30 vs net-45 terms?

**Look at**:
- `impact_percentage`: Current delay sensitivity
- `cash_flow_health`: Overall stability

**Terms Decision**:
- Critical/high impact → Only offer net-15 or net-30, no exceptions
- Moderate impact → Net-30 standard, net-45 for premium clients
- Low impact → Flexible, can afford net-45 or net-60

## Alert Thresholds

### Recommended Monitoring

| Metric | Warning | Critical |
|--------|---------|----------|
| Impact Percentage | >25% | >50% |
| Expected Cash | <$15,000 | <$5,000 or $0 |
| Days Without Payouts | >20 days | >25 days |
| Impact Level | high | critical |

### Alert Scenarios

**Scenario 1: No Expected Cash**
```json
{
  "expected_cash_in_30_days": 0,
  "impact_level": "critical",
  "cash_flow_health": "No expected payments - critical cash flow gap"
}
```
**Action**: URGENT - You have no revenue pipeline for next 30 days. Immediately accelerate claim completions or schedule new appointments.

**Scenario 2: High Delay Sensitivity**
```json
{
  "expected_cash_in_30_days": 42000,
  "delayed_payment_impact": 21000,
  "impact_percentage": 50.0,
  "impact_level": "critical"
}
```
**Action**: Half your expected cash could be delayed out of the 30-day window. Build 50% cash reserve, aggressively follow up on receivables.

**Scenario 3: Lumpy Cash Flow**
```json
{
  "expected_cash_in_30_days": 45000,
  "summary": {
    "largest_single_day": 32000,
    "days_with_payouts": 3,
    "days_without_payouts": 27
  }
}
```
**Action**: 71% of expected cash arrives on ONE day. If that payment is late/missed, huge impact. Diversify client base and spread out work.

**Scenario 4: Healthy Cash Flow**
```json
{
  "expected_cash_in_30_days": 58000,
  "delayed_payment_impact": 4800,
  "impact_percentage": 8.3,
  "impact_level": "low",
  "days_with_payouts": 12
}
```
**Action**: Good position. Stable cash flow, low delay sensitivity. Maintain current operations.

## Comparison with Other Scenarios

### Different Delay Windows

Test various delay scenarios to understand vulnerability:

```bash
# Minimal delay (3 days)
GET /api/survival-runway?delay=3

# Standard delay (7 days)
GET /api/survival-runway?delay=7

# Severe delay (14 days)
GET /api/survival-runway?delay=14

# Extreme delay (30 days)
GET /api/survival-runway?delay=30
```

**Interpretation**:
- If 3-day delay has >10% impact → Very tight cash flow
- If 7-day delay has >25% impact → Need better reserves
- If 14-day delay has >50% impact → Critically delay-sensitive
- If 30-day delay has >75% impact → Extreme vulnerability

### Different Forecast Windows

```bash
# Next 2 weeks
GET /api/survival-runway?days=14

# Next month
GET /api/survival-runway?days=30

# Next 2 months
GET /api/survival-runway?days=60

# Next quarter
GET /api/survival-runway?days=90
```

**Use**:
- 14-day: Immediate cash needs
- 30-day: Monthly planning
- 60-day: Quarterly budgeting
- 90-day: Strategic planning

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch survival runway forecast
const response = await fetch('/api/survival-runway?pretty=true');
const result = await response.json();

if (result.status === 'success') {
  const data = result.data;

  console.log(`Expected Cash (30 days): $${data.expected_cash_in_30_days.toLocaleString()}`);
  console.log(`Delay Impact: $${Math.abs(data.delayed_payment_impact).toLocaleString()} (${data.impact_percentage}%)`);
  console.log(`Impact Level: ${data.risk_assessment.impact_level}`);

  // Check if we can afford a $20,000 expense
  const plannedExpense = 20000;
  const buffer = data.delayed_payment_impact;
  const availableCash = data.expected_cash_in_30_days - buffer;

  if (availableCash >= plannedExpense) {
    console.log(`✓ Can afford $${plannedExpense} expense (${availableCash} available after risk buffer)`);
  } else {
    console.log(`✗ Cannot afford $${plannedExpense} expense (only ${availableCash} safe to spend)`);
  }

  // Show upcoming payment days
  console.log('\nUpcoming Payment Days:');
  data.daily_forecast
    .filter(day => day.payout_count > 0)
    .forEach(day => {
      console.log(`${day.date_label}: $${day.expected_amount.toLocaleString()} from ${day.firms_paying.join(', ')}`);
    });
}
```

### Python

```python
import requests

response = requests.get('https://your-domain.com/api/survival-runway')
data = response.json()['data']

print(f"Expected Cash: ${data['expected_cash_in_30_days']:,.2f}")
print(f"Delay Impact: ${abs(data['delayed_payment_impact']):,.2f} ({data['impact_percentage']}%)")
print(f"Cash Flow Health: {data['risk_assessment']['cash_flow_health']}")

# Check if high risk
if data['risk_assessment']['impact_level'] in ['high', 'critical']:
    print("\n⚠️ WARNING: High sensitivity to payment delays!")
    for rec in data['risk_assessment']['recommendations']:
        print(f"  • {rec}")

# Calculate safe spending amount
safe_to_spend = data['expected_cash_in_30_days'] - abs(data['delayed_payment_impact'])
print(f"\nSafe to spend (after delay buffer): ${safe_to_spend:,.2f}")
```

### cURL

```bash
# Get 30-day forecast
curl "https://your-domain.com/api/survival-runway?pretty=true"

# Get 60-day forecast with 14-day delay scenario
curl "https://your-domain.com/api/survival-runway?days=60&delay=14&pretty=true"

# Extract just expected cash (with jq)
curl "https://your-domain.com/api/survival-runway" | jq '.data.expected_cash_in_30_days'

# Extract impact percentage
curl "https://your-domain.com/api/survival-runway" | jq '.data.impact_percentage'
```

### Excel/Spreadsheet Integration

```python
import requests
import pandas as pd

# Fetch data
response = requests.get('https://your-domain.com/api/survival-runway')
data = response.json()['data']

# Convert daily forecast to DataFrame
df = pd.DataFrame(data['daily_forecast'])

# Export to Excel
df.to_excel('cash_forecast.xlsx', index=False)

# Create pivot table
summary = df.groupby('date_label').agg({
    'expected_amount': 'sum',
    'cumulative_expected': 'max',
    'payout_count': 'sum'
})
```

## Implementation Files

### Backend Logic
- `src/utils/survivalRunway.ts` - Forecast calculation engine
  - `generateSurvivalRunwayReport()` - Main function (line 135)
  - `fetchClaimsForForecast()` - Data retrieval (line 77)
  - `determineImpactLevel()` - Risk assessment (line 90)
  - `generateRecommendations()` - Advisory logic (line 97)

### API Endpoint
- `src/routes/api/SurvivalRunway.tsx` - API endpoint component
- `src/main.tsx` - Route registration (line 109)

### Dependencies
- Uses `forecastPayouts()` from `payoutForecasting.ts` for payout predictions
- Requires claim data: `completion_date`, `appointment_start`, `file_total`, `pay_amount`

## Limitations

1. **Forecast Accuracy**: Only as good as firm pay cycle data and claim scheduling
2. **Uniform Delay Assumption**: Assumes ALL firms delay by same amount (reality varies)
3. **No Variability**: Doesn't model random delays, only systematic delay
4. **Completed Work Only**: Forecasts based on completed or scheduled work, not potential future work
5. **No Expenses**: Shows revenue only, not expenses/outflows
6. **No Actual Payout Tracking**: Uses expected dates, not historical actual payment patterns per firm

## Future Enhancements

- **Firm-Specific Delays**: Model different delay patterns per firm (use reliability data)
- **Probabilistic Forecasts**: Show confidence intervals (e.g., "80% confident between $40k-$60k")
- **Expense Integration**: Show net cash (revenue - expenses) not just revenue
- **Burn Rate**: Calculate how many days of runway at current expense rate
- **Historical Accuracy**: Track forecast vs actual and improve predictions
- **Monte Carlo Simulation**: Run thousands of scenarios with random delays
- **Cash Gap Alerts**: Notify when forecasted cash falls below minimum threshold
- **Payment Probability**: Weight forecast by firm reliability scores
- **Seasonal Patterns**: Adjust for historical seasonal payment patterns

## Related APIs

Combine with other APIs for complete financial picture:

- **[/api/firm-reliability](FIRM_RELIABILITY_API.md)**: See which firms are likely to delay payments
- **[/api/payout-variance](PAYOUT_VARIANCE_API.md)**: See historical accuracy of forecasts
- **[/api/revenue-risk](REVENUE_RISK_API.md)**: Understand concentration risk in forecasted cash
- **[/api/capacity-stress](CAPACITY_STRESS_API.md)**: Ensure you can complete work to hit forecast

## Best Practices

### Daily Review
- Check `expected_cash_in_30_days` daily
- Monitor `impact_level` for changes
- Watch for large payment days approaching

### Weekly Planning
- Review `daily_forecast` for upcoming week
- Follow up with firms paying in next 7 days
- Adjust spending based on expected cash

### Monthly Analysis
- Compare actual vs forecasted cash (learn from variance)
- Adjust forecasts based on actual firm payment patterns
- Set next month's budget based on forecast

### Risk Mitigation

**If Impact Level = Critical:**
- Maintain cash reserves = 50%+ of monthly revenue
- Weekly collections calls to all firms with outstanding payments
- Consider requiring deposits for new work
- Don't commit to expenses >10% of expected cash without reserves

**If Impact Level = High:**
- Maintain 25-30% cash reserves
- Bi-weekly collections follow-ups
- Be cautious with large expenses
- Diversify client base to reduce lumpy cash flow

**If Impact Level = Moderate:**
- Maintain 15-20% cash reserves
- Monthly collections reviews
- Standard financial planning

**If Impact Level = Low:**
- Maintain 10% cash reserves
- Quarterly cash flow reviews
- Strong position for growth investments

## Real-World Applications

### Banking & Credit

Show this data when:
- Applying for line of credit (demonstrates cash flow predictability)
- Negotiating terms with vendors
- Planning equipment financing

### Investor Relations

Use for:
- Demonstrating business predictability
- Showing cash flow management
- Proving operational maturity

### Internal Planning

Critical for:
- Payroll planning (can we afford to hire?)
- Equipment purchases (can we buy that vehicle?)
- Growth investments (can we expand to new market?)
- Dividend/distribution planning (owner draws)
