# Capacity Stress API Documentation

## Overview

The Capacity Stress API tracks weekly throughput and workload metrics to monitor team capacity, backlog growth, and booking pressure. It helps identify capacity constraints and predict when your team might be overloaded.

## What It Tracks

### Weekly Throughput Metrics

1. **claims_assigned**: Number of claims assigned to appraisers this week
2. **claims_completed**: Number of claims completed this week
3. **backlog_growth**: Net change in backlog (assigned - completed)
4. **days_booked_ahead**: How far out you're scheduled (max appointment date - today)

### Capacity Indicators

- **Backlog Status**: Health of your backlog (healthy/warning/critical)
- **Booking Pressure**: How far ahead you're booked (low/medium/high)
- **Throughput Trend**: Whether backlog is improving, stable, or declining

## API Endpoint

### Base URL
```
/api/capacity-stress
```

### Authentication
Requires admin role authentication.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `weeks` | number | 12 | Number of past weeks to include |
| `pretty` | boolean | false | Pretty-print JSON output |

### Examples

```
GET /api/capacity-stress
GET /api/capacity-stress?pretty=true
GET /api/capacity-stress?weeks=8
GET /api/capacity-stress?weeks=12&pretty=true
```

## Response Format

```json
{
  "status": "success",
  "data": {
    "generated_at": "2025-12-30T10:00:00.000Z",
    "period_start": "2025-10-07T00:00:00.000Z",
    "period_end": "2025-12-30T00:00:00.000Z",
    "total_weeks": 13,
    "current_days_booked_ahead": 21,
    "weekly_data": [
      {
        "week_start": "2025-10-07T00:00:00.000Z",
        "week_end": "2025-10-13T23:59:59.999Z",
        "week_label": "Oct 7, 2025",
        "claims_assigned": 45,
        "claims_completed": 38,
        "backlog_growth": 7,
        "days_booked_ahead": 18,
        "utilization_rate": 84.4,
        "is_current_week": false
      },
      {
        "week_start": "2025-12-23T00:00:00.000Z",
        "week_end": "2025-12-29T23:59:59.999Z",
        "week_label": "Dec 23, 2025",
        "claims_assigned": 52,
        "claims_completed": 49,
        "backlog_growth": 3,
        "days_booked_ahead": 21,
        "utilization_rate": 94.2,
        "is_current_week": true
      }
    ],
    "summary": {
      "total_assigned": 580,
      "total_completed": 545,
      "total_backlog_growth": 35,
      "avg_weekly_assigned": 44.6,
      "avg_weekly_completed": 41.9,
      "avg_backlog_growth": 2.7,
      "completion_rate": 94.0,
      "trend": "stable"
    },
    "capacity_indicators": {
      "backlog_status": "healthy",
      "booking_pressure": "high",
      "throughput_trend": "Backlog stable - balanced throughput"
    }
  }
}
```

## Data Fields Explained

### Weekly Data

| Field | Description |
|-------|-------------|
| `week_start` | Monday of the week (ISO 8601) |
| `week_end` | Sunday of the week (ISO 8601) |
| `week_label` | Human-readable week label (e.g., "Oct 7, 2025") |
| `claims_assigned` | Number of claims assigned during this week (claims created with assigned_to set) |
| `claims_completed` | Number of claims completed during this week (status changed to COMPLETED) |
| `backlog_growth` | Net change in backlog (assigned - completed). Positive = backlog growing |
| `days_booked_ahead` | Days from end of week to furthest scheduled appointment |
| `utilization_rate` | Completion efficiency: `(completed / assigned) * 100` |
| `is_current_week` | `true` if this is the current week |

### Summary

| Field | Description |
|-------|-------------|
| `total_assigned` | Total claims assigned across all weeks |
| `total_completed` | Total claims completed across all weeks |
| `total_backlog_growth` | Net backlog change (total assigned - total completed) |
| `avg_weekly_assigned` | Average claims assigned per week |
| `avg_weekly_completed` | Average claims completed per week |
| `avg_backlog_growth` | Average weekly backlog change |
| `completion_rate` | `(total_completed / total_assigned) * 100` |
| `trend` | Trend direction: `improving`, `stable`, or `declining` |

### Capacity Indicators

| Indicator | Values | Description |
|-----------|--------|-------------|
| `backlog_status` | healthy / warning / critical | Based on avg backlog growth: ≤2 = healthy, ≤5 = warning, >5 = critical |
| `booking_pressure` | low / medium / high | Based on days booked ahead: ≤7 = low, ≤14 = medium, >14 = high |
| `throughput_trend` | String description | Human-readable trend interpretation |

## Interpretation Guide

### Backlog Growth

- **Positive (+)**: Backlog is growing - assigning faster than completing ⚠️
  - Small growth (1-2/week): Normal, manageable
  - Medium growth (3-5/week): Watch carefully, may need more capacity
  - Large growth (>5/week): Concerning, capacity insufficient

- **Negative (-)**: Backlog is shrinking - completing faster than assigning ✅
  - Good sign: Working through backlog

- **Zero (0)**: Balanced - assigning = completing 🎯
  - Ideal steady state

### Days Booked Ahead

- **0-7 days (LOW)**: Can handle urgent claims easily
- **8-14 days (MEDIUM)**: Some buffer, but filling up
- **15+ days (HIGH)**: Fully booked, no capacity for rush jobs

### Utilization Rate

- **>90%**: Excellent throughput, keeping up with assignments
- **70-90%**: Good performance, some lag
- **<70%**: Falling behind, backlog accumulating

### Trend Analysis

- **Improving**: Backlog growing slower or shrinking (good)
- **Stable**: Consistent backlog growth (neutral)
- **Declining**: Backlog accelerating (bad)

## Use Cases

### 1. Capacity Planning

**Question**: Do we need to hire more appraisers?

**Look at**:
- `backlog_status`: If critical, you're understaffed
- `avg_backlog_growth`: If consistently positive, assignments exceed capacity
- `trend`: If declining, problem is getting worse

**Decision**:
- Healthy backlog + low pressure = Current capacity OK
- Critical backlog + high pressure = Need more appraisers
- Warning backlog + medium pressure = Monitor closely

### 2. Workload Balancing

**Question**: Are we overloading the team?

**Look at**:
- `days_booked_ahead`: If >21 days, team is overbooked
- `utilization_rate`: If <70%, team struggling to keep up
- `weekly_data` patterns: Spikes indicate uneven workload distribution

**Action**:
- High booking + declining trend = Slow down new assignments temporarily
- Low utilization + growing backlog = Address blockers preventing completion

### 3. Scheduling Flexibility

**Question**: Can we handle a rush claim?

**Look at**:
- `current_days_booked_ahead`: Shows earliest available slot
- `booking_pressure`: Indicates scheduling flexibility
- `backlog_growth`: Shows if backlog is growing (less flexibility)

**Answer**:
- Low pressure (<7 days) = Yes, can schedule urgently
- High pressure (>14 days) = Limited flexibility, may need overtime

### 4. Performance Monitoring

**Question**: Is throughput improving or declining?

**Look at**:
- `trend`: Overall direction
- `completion_rate`: Percentage of assignments completed
- Week-over-week `backlog_growth`: Weekly fluctuations

**Insight**:
- Improving trend + high completion rate = Good performance
- Declining trend + low completion rate = Performance issues

## Data Requirements

### Assignment Tracking

Claims are considered "assigned" when:
- `created_at` timestamp (when claim was created)
- `assigned_to` is not null (has an appraiser assigned)

**Note**: Uses `created_at` as a proxy for assignment date. If your workflow assigns claims after creation, this may not be accurate.

### Completion Tracking

Claims are considered "completed" when:
- `status` = 'COMPLETED'
- `completion_date` is set (when it was marked complete)

### Scheduling Data

Booking ahead calculation uses:
- `appointment_start` for scheduled claims
- Only counts claims with status = 'SCHEDULED' or 'IN_PROGRESS'

## Calculation Details

### Claims Assigned

```typescript
// Count claims created this week with an appraiser assigned
WHERE created_at BETWEEN week_start AND week_end
  AND assigned_to IS NOT NULL
```

### Claims Completed

```typescript
// Count claims completed this week
WHERE status = 'COMPLETED'
  AND completion_date BETWEEN week_start AND week_end
```

### Backlog Growth

```typescript
backlog_growth = claims_assigned - claims_completed
```

### Days Booked Ahead

```typescript
// Find latest scheduled appointment
const latestAppointment = MAX(appointment_start)
  WHERE status IN ('SCHEDULED', 'IN_PROGRESS')

days_booked_ahead = latestAppointment - today
```

### Utilization Rate

```typescript
utilization_rate = (claims_completed / claims_assigned) * 100
```

### Trend Calculation

```typescript
// Compare recent 3 weeks vs previous 3 weeks
recent_avg_backlog = AVG(backlog_growth[-3:])
previous_avg_backlog = AVG(backlog_growth[-6:-3])

improvement = previous_avg_backlog - recent_avg_backlog

if (improvement > 1) return 'improving'
if (improvement < -1) return 'declining'
return 'stable'
```

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch capacity stress report
const response = await fetch('/api/capacity-stress?pretty=true');
const result = await response.json();

if (result.status === 'success') {
  const data = result.data;

  console.log(`Backlog Status: ${data.capacity_indicators.backlog_status}`);
  console.log(`Booked ${data.current_days_booked_ahead} days ahead`);
  console.log(`Trend: ${data.summary.trend}`);

  // Check if hiring needed
  if (data.capacity_indicators.backlog_status === 'critical') {
    console.log('⚠️ Consider hiring more appraisers');
  }

  // Show weekly breakdown
  data.weekly_data.forEach(week => {
    console.log(`${week.week_label}: +${week.claims_assigned} / -${week.claims_completed} = ${week.backlog_growth >= 0 ? '+' : ''}${week.backlog_growth}`);
  });
}
```

### Python

```python
import requests

response = requests.get('https://your-domain.com/api/capacity-stress')
data = response.json()['data']

print(f"Backlog Status: {data['capacity_indicators']['backlog_status']}")
print(f"Booking Pressure: {data['capacity_indicators']['booking_pressure']}")
print(f"Completion Rate: {data['summary']['completion_rate']}%")

# Alert if capacity issues
if data['capacity_indicators']['backlog_status'] in ['warning', 'critical']:
    print(f"⚠️ Alert: Backlog is {data['capacity_indicators']['backlog_status']}")
    print(f"Average backlog growth: {data['summary']['avg_backlog_growth']} claims/week")
```

### cURL

```bash
# Get capacity stress report
curl "https://your-domain.com/api/capacity-stress?pretty=true"

# Get last 8 weeks
curl "https://your-domain.com/api/capacity-stress?weeks=8&pretty=true"
```

## Thresholds & Alerts

### Recommended Alert Thresholds

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| Backlog Growth | >3 claims/week | >5 claims/week |
| Days Booked Ahead | >14 days | >21 days |
| Utilization Rate | <80% | <70% |
| Completion Rate | <85% | <75% |

### Alert Scenarios

**Scenario 1: Growing Backlog**
```
backlog_status = 'critical'
avg_backlog_growth = 6.5
trend = 'declining'
```
**Action**: Hire additional appraisers or reduce new claim intake

**Scenario 2: Booking Pressure**
```
booking_pressure = 'high'
days_booked_ahead = 28
utilization_rate = 92%
```
**Action**: Team is efficient but overbooked. Consider adding capacity or extending hours.

**Scenario 3: Low Throughput**
```
utilization_rate = 65%
completion_rate = 68%
trend = 'declining'
```
**Action**: Investigate blockers preventing completions. Training needed? Process issues?

## Implementation Files

### Backend Logic
- `src/utils/capacityStress.ts` - Throughput calculation engine
  - `generateCapacityStressReport()` - Main function
  - `calculateClaimsAssigned()` - Assignment tracking
  - `calculateClaimsCompleted()` - Completion tracking
  - `calculateDaysBookedAhead()` - Booking calculation
  - `determineTrend()` - Trend analysis

### API Endpoint
- `src/routes/api/CapacityStress.tsx` - API endpoint component
- `src/main.tsx` - Route registration

### Dependencies
- Uses existing claims table fields: `created_at`, `status`, `assigned_to`, `completion_date`, `appointment_start`
- No additional database changes required

## Limitations

1. **Assignment Date Proxy**: Uses `created_at` as assignment date. May not be accurate if claims sit unassigned.
2. **No Appraiser Breakdown**: Tracks team-wide capacity, not per-appraiser metrics.
3. **Completion Date Dependency**: Requires `completion_date` to be populated when claims are completed.
4. **No Cancellation Tracking**: Canceled claims not counted separately.
5. **Week Boundaries**: Uses Monday-Sunday weeks (may not align with pay periods).

## Future Enhancements

- **Per-Appraiser Metrics**: Break down capacity by individual appraiser
- **Claim Type Analysis**: Separate metrics by claim type or complexity
- **Forecast Capacity**: Predict future capacity needs based on trends
- **Cancellation Rate**: Track claims that are canceled vs completed
- **Time-to-Complete**: Average days from assignment to completion
- **Workload Distribution**: Detect uneven assignments across team
- **Seasonal Patterns**: Identify weekly/monthly capacity patterns
- **Alerts**: Automated notifications when thresholds exceeded
- **Visualization**: Charts showing trends over time

## Related APIs

Combine with other APIs for comprehensive insights:

- **[/api/firm-reliability](FIRM_RELIABILITY_API.md)**: See which firms cause delays affecting throughput
- **[/api/payout-variance](PAYOUT_VARIANCE_API.md)**: Correlate capacity stress with payment delays
