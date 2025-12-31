# Revenue Risk API Documentation

## Overview

The Revenue Risk API analyzes revenue concentration across firms to identify dependency risks. It calculates revenue share percentages for each firm and measures how dependent your business is on your top clients.

## What It Tracks

### Revenue Metrics by Firm

1. **revenue_share_percentage**: What percentage of total revenue each firm contributes
2. **top_3_firm_dependency_ratio**: Combined revenue share of your top 3 firms
3. **Herfindahl-Hirschman Index (HHI)**: Market concentration index (0-10000)

### Risk Indicators

- **Concentration Level**: How risky your revenue concentration is (low/moderate/high/critical)
- **Diversification Status**: Overall health of revenue distribution
- **Recommendations**: Actionable advice based on concentration metrics

## API Endpoint

### Base URL
```
/api/revenue-risk
```

### Authentication
Requires admin role authentication.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pretty` | boolean | false | Pretty-print JSON output |

### Examples

```
GET /api/revenue-risk
GET /api/revenue-risk?pretty=true
```

## Response Format

```json
{
  "status": "success",
  "data": {
    "generated_at": "2025-12-30T10:00:00.000Z",
    "total_revenue": 245680.50,
    "total_claims": 458,
    "unique_firms": 12,
    "firm_revenues": [
      {
        "firm_name": "Sedgwick",
        "normalized_name": "Sedgwick",
        "total_revenue": 98750.25,
        "claim_count": 185,
        "revenue_share_percentage": 40.19,
        "avg_revenue_per_claim": 533.78
      }
    ],
    "top_3_firms": [
      {
        "firm_name": "Sedgwick",
        "normalized_name": "Sedgwick",
        "total_revenue": 98750.25,
        "claim_count": 185,
        "revenue_share_percentage": 40.19,
        "avg_revenue_per_claim": 533.78
      },
      {
        "firm_name": "ClaimSolution",
        "normalized_name": "ClaimSolution",
        "total_revenue": 62450.00,
        "claim_count": 124,
        "revenue_share_percentage": 25.42,
        "avg_revenue_per_claim": 503.63
      },
      {
        "firm_name": "Complete Claims",
        "normalized_name": "Complete Claims",
        "total_revenue": 38920.50,
        "claim_count": 78,
        "revenue_share_percentage": 15.84,
        "avg_revenue_per_claim": 499.24
      }
    ],
    "top_3_firm_dependency_ratio": 81.45,
    "revenue_concentration": {
      "top_1_percentage": 40.19,
      "top_3_percentage": 81.45,
      "top_5_percentage": 92.33,
      "herfindahl_index": 2458
    },
    "risk_assessment": {
      "concentration_level": "critical",
      "diversification_status": "Critically concentrated - extreme dependency risk",
      "recommendations": [
        "CRITICAL: Over 80% revenue from top 3 firms - extremely high risk",
        "Immediately diversify client base to reduce dependency",
        "Losing any top firm would severely impact business",
        "Single firm dependency: Sedgwick accounts for 40.2% of revenue"
      ]
    }
  }
}
```

## Data Fields Explained

### Firm Revenue Object

| Field | Description |
|-------|-------------|
| `firm_name` | Original firm name |
| `normalized_name` | Standardized firm name for grouping |
| `total_revenue` | Total revenue from completed claims (file_total or pay_amount) |
| `claim_count` | Number of completed claims |
| `revenue_share_percentage` | Percentage of total revenue this firm represents |
| `avg_revenue_per_claim` | Average revenue per claim for this firm |

### Top-Level Metrics

| Field | Description |
|-------|-------------|
| `total_revenue` | Sum of all completed claim revenue |
| `total_claims` | Total number of completed claims |
| `unique_firms` | Number of distinct firms |
| `top_3_firm_dependency_ratio` | **KEY METRIC**: % of revenue from top 3 firms |

### Revenue Concentration

| Field | Description |
|-------|-------------|
| `top_1_percentage` | % revenue from largest firm |
| `top_3_percentage` | % revenue from top 3 firms (same as dependency ratio) |
| `top_5_percentage` | % revenue from top 5 firms |
| `herfindahl_index` | HHI score: 0 = perfect competition, 10000 = monopoly |

### Risk Assessment

| Field | Values | Description |
|-------|--------|-------------|
| `concentration_level` | low / moderate / high / critical | Risk level based on top 3 dependency |
| `diversification_status` | String | Human-readable status summary |
| `recommendations` | Array of strings | Actionable recommendations |

## Interpretation Guide

### Top 3 Firm Dependency Ratio

This is the **primary risk metric**:

- **< 40%**: **LOW RISK** - Well diversified, no single client dominance
- **40-60%**: **MODERATE RISK** - Some concentration, monitor closely
- **60-80%**: **HIGH RISK** - Significant dependency, actively diversify
- **> 80%**: **CRITICAL RISK** - Extreme dependency, immediate action needed

### Single Firm Dependency

Watch for individual firm concentration:

- **> 50%**: Critical - One firm is majority of revenue
- **35-50%**: High risk - Losing this firm would be devastating
- **25-35%**: Moderate risk - Significant but manageable
- **< 25%**: Healthy - No single firm dominance

### Herfindahl-Hirschman Index (HHI)

Industry standard concentration measure:

- **< 1000**: **Unconcentrated** - Competitive, well-distributed
- **1000-1500**: **Moderately concentrated** - Some concentration
- **1500-2500**: **Highly concentrated** - Significant concentration
- **> 2500**: **Very highly concentrated** - Extreme concentration

**Formula**: Sum of squared market shares
```
HHI = Σ(market_share%)²
```

Example:
- 5 firms at 20% each: HHI = 5 × (20²) = 2000
- 1 firm at 100%: HHI = 10000 (monopoly)

### Risk Levels

**Critical (>80% top 3)**
- Losing any top firm = business crisis
- Cannot sustain operations if major client leaves
- Immediate diversification required

**High (60-80% top 3)**
- Major business disruption if top firm leaves
- Limited flexibility in pricing/terms with top clients
- Actively pursue new clients

**Moderate (40-60% top 3)**
- Some dependency but manageable
- Monitor relationships closely
- Continue diversification efforts

**Low (<40% top 3)**
- Healthy distribution
- Losing one client is manageable
- Maintain balance

## Use Cases

### 1. Business Risk Assessment

**Question**: How risky is our client concentration?

**Look at**:
- `top_3_firm_dependency_ratio`: Primary risk metric
- `concentration_level`: Overall risk level
- `top_1_percentage`: Single firm risk

**Decision**:
- Critical level → Stop accepting low-value work from smaller firms, focus on diversification
- High level → Set target to reduce top 3 to <70% within 6 months
- Moderate level → Maintain current diversification efforts
- Low level → Current strategy working, maintain balance

### 2. Strategic Planning

**Question**: Should we pursue this new firm aggressively?

**Look at**:
- `firm_revenues` ranking: Where would new firm fit?
- `top_3_firm_dependency_ratio`: Would this reduce concentration?
- `unique_firms`: Do we need more firms or better balance?

**Strategy**:
- If concentration is high → Prioritize new firm onboarding
- If already diversified → Focus on profitable firms regardless of size
- If one firm dominates → Actively seek firms similar in size to #2 and #3

### 3. Contract Negotiations

**Question**: How much leverage do we have with this firm?

**Look at**:
- `revenue_share_percentage` for that firm
- `top_3_firm_dependency_ratio`

**Negotiating Position**:
- Firm is >40% of revenue → Weak position, they have leverage
- Firm is 20-40% → Moderate position, negotiate carefully
- Firm is <20% → Strong position, you can be firm on terms

### 4. Pricing Strategy

**Question**: Can we afford to lose this client over pricing?

**Look at**:
- Their `revenue_share_percentage`
- `recommendations` from risk assessment

**Pricing Decision**:
- Critical dependency → Must be flexible on pricing
- High dependency → Negotiate but consider compromise
- Moderate dependency → Stand firm on rates
- Low dependency → Can afford to walk away

## Calculation Details

### Revenue Aggregation

```typescript
// For each completed claim
revenue = claim.file_total || claim.pay_amount || 0

// Group by normalized firm name
firm_revenue = SUM(revenue) WHERE firm_name = 'X'
```

### Revenue Share Percentage

```typescript
revenue_share_percentage = (firm_revenue / total_revenue) * 100
```

### Top 3 Dependency Ratio

```typescript
// Sort firms by revenue descending
sorted_firms = SORT(firms, by: revenue, DESC)

// Take top 3
top_3_revenue = SUM(sorted_firms[0:3].revenue)

// Calculate ratio
top_3_dependency_ratio = (top_3_revenue / total_revenue) * 100
```

### Herfindahl Index

```typescript
HHI = 0
for each firm:
  HHI += (revenue_share_percentage)²

// Returns value 0-10000
```

## Alert Thresholds

### Recommended Monitoring

| Metric | Warning | Critical |
|--------|---------|----------|
| Top 3 Dependency | >60% | >80% |
| Top 1 Dependency | >35% | >50% |
| Herfindahl Index | >1500 | >2500 |
| Unique Firms | <5 | <3 |

### Alert Scenarios

**Scenario 1: Single Firm Dominance**
```json
{
  "top_1_percentage": 52.3,
  "top_3_percentage": 78.5,
  "concentration_level": "critical"
}
```
**Action**: One firm is majority revenue. Negotiate long-term contract with them while aggressively pursuing new large clients.

**Scenario 2: Top-Heavy Distribution**
```json
{
  "top_1_percentage": 38.2,
  "top_3_percentage": 85.1,
  "concentration_level": "critical"
}
```
**Action**: Top 3 firms dominate. Focus on growing mid-tier firms (#4-#8) to reduce concentration.

**Scenario 3: Healthy Diversification**
```json
{
  "top_1_percentage": 18.5,
  "top_3_percentage": 42.3,
  "concentration_level": "low",
  "herfindahl_index": 850
}
```
**Action**: Maintain current approach. Revenue well distributed.

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch revenue risk report
const response = await fetch('/api/revenue-risk?pretty=true');
const result = await response.json();

if (result.status === 'success') {
  const data = result.data;

  console.log(`Top 3 Dependency: ${data.top_3_firm_dependency_ratio}%`);
  console.log(`Risk Level: ${data.risk_assessment.concentration_level}`);
  console.log(`HHI: ${data.revenue_concentration.herfindahl_index}`);

  // Check if concentration is too high
  if (data.risk_assessment.concentration_level === 'critical') {
    console.log('⚠️ ALERT: Revenue critically concentrated!');
    data.risk_assessment.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }

  // Show top 3 firms
  console.log('\nTop 3 Firms:');
  data.top_3_firms.forEach((firm, idx) => {
    console.log(`${idx + 1}. ${firm.normalized_name}: $${firm.total_revenue.toLocaleString()} (${firm.revenue_share_percentage}%)`);
  });
}
```

### Python

```python
import requests

response = requests.get('https://your-domain.com/api/revenue-risk')
data = response.json()['data']

print(f"Total Revenue: ${data['total_revenue']:,.2f}")
print(f"Top 3 Dependency: {data['top_3_firm_dependency_ratio']:.1f}%")
print(f"Concentration: {data['risk_assessment']['concentration_level']}")

# Alert if risky
if data['risk_assessment']['concentration_level'] in ['high', 'critical']:
    print("\n⚠️ WARNING: High revenue concentration detected!")
    for rec in data['risk_assessment']['recommendations']:
        print(f"  • {rec}")
```

### cURL

```bash
# Get revenue risk report
curl "https://your-domain.com/api/revenue-risk?pretty=true"

# Extract just top 3 dependency ratio (with jq)
curl "https://your-domain.com/api/revenue-risk" | jq '.data.top_3_firm_dependency_ratio'
```

## Implementation Files

### Backend Logic
- `src/utils/revenueRisk.ts` - Revenue aggregation and risk analysis
  - `generateRevenueRiskReport()` - Main function
  - `aggregateRevenueByFirm()` - Revenue grouping
  - `calculateHerfindahlIndex()` - HHI calculation
  - `determineConcentrationLevel()` - Risk assessment
  - `generateRecommendations()` - Action items

### API Endpoint
- `src/routes/api/RevenueRisk.tsx` - API endpoint component
- `src/main.tsx` - Route registration (line 100)

### Dependencies
- Uses `normalizeFirmName()` from `payoutForecasting.ts` for consistent firm naming
- Requires completed claims with `file_total` or `pay_amount` populated

## Limitations

1. **Completed Claims Only**: Only analyzes completed claims with revenue data
2. **Revenue Data Quality**: Depends on accurate `file_total` or `pay_amount` values
3. **No Time Windowing**: Analyzes all completed claims, not a specific period
4. **Historical View**: Shows past concentration, not future projections
5. **No Profitability**: Measures revenue, not profit (high-revenue firm might be low-margin)

## Future Enhancements

- **Time Period Filtering**: Analyze concentration for specific date ranges (last 6 months, YTD, etc.)
- **Trend Analysis**: Track concentration changes over time
- **Profitability Weighting**: Factor in margins, not just revenue
- **Scenario Modeling**: "What if we lost Firm X?" impact analysis
- **Target Setting**: Set and track progress toward concentration goals
- **Alerts**: Automated notifications when concentration exceeds thresholds
- **Geographic Concentration**: Analyze concentration by region
- **Claim Type Concentration**: Risk by claim complexity/type

## Related APIs

Combine with other APIs for comprehensive business intelligence:

- **[/api/firm-reliability](FIRM_RELIABILITY_API.md)**: See if your high-revenue firms pay on time
- **[/api/payout-variance](PAYOUT_VARIANCE_API.md)**: Cash flow impact of concentrated revenue
- **[/api/capacity-stress](CAPACITY_STRESS_API.md)**: Ensure top firms aren't overloading capacity

## Best Practices

### Monthly Review
1. Check `top_3_firm_dependency_ratio` monthly
2. Monitor `concentration_level` for changes
3. Review recommendations and act on them

### Quarterly Planning
1. Set concentration reduction targets if needed
2. Identify firms to grow from mid-tier to top-tier
3. Plan marketing efforts to attract new firms

### Risk Mitigation
1. If >80% concentrated: Consider it a business emergency
2. If >60% concentrated: Make diversification a top priority
3. If 40-60% concentrated: Continue diversification efforts
4. If <40% concentrated: Maintain current balance

### Client Relationship Management
1. Firms >40% revenue: Weekly check-ins, executive relationship
2. Firms 20-40% revenue: Bi-weekly updates, account management
3. Firms <20% revenue: Monthly reviews, standard service

## Documentation

For understanding the business risk:
- [Herfindahl-Hirschman Index (Wikipedia)](https://en.wikipedia.org/wiki/Herfindahl%E2%80%93Hirschman_index)
- DOJ/FTC use HHI >2500 as "highly concentrated" in merger reviews
- Business diversification best practices suggest no single client >25% revenue
