import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseCD } from '../../lib/supabaseCD';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { getSupabaseAuthz } from '../../lib/supabaseAuthz';
import { NavBar } from '../../components/NavBar';
import './kpi-dashboard.css';

export default function KPIDashboard() {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [slaAlerts, setSlaAlerts] = useState<any>(null);
  const [selectedFirm, setSelectedFirm] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const authz = getSupabaseAuthz();
  const userInfo = authz?.getCurrentUser();
  const isAdmin = userInfo?.role === 'admin';
  const currentUserId = userInfo?.id;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const thisWeekStart = getWeekStart(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const loadData = async () => {
    setLoading(true);
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    const [claimsRes, profilesRes, slaRes] = await Promise.all([
      supabaseCD
        .from('claims')
        .select("*")
        .gte('created_at', thirteenMonthsAgo.toISOString())
        .is('archived_at', null),
      supabaseCD.from('profiles').select('user_id, full_name, role'),
      supabaseCD.functions.invoke('sla-check').catch(() => ({ data: null })),
    ]);

    // Filter out supplements to avoid double-counting in metrics
    const allClaims = (claimsRes.data || []).filter((c: any) => !c.is_supplement);
    setClaims(allClaims);
    setProfiles(profilesRes.data || []);
    setSlaAlerts(slaRes.data?.alerts || null);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ─── Financial ────────────────────────────────────────────────
  const financial = useMemo(() => {
    const completed = claims.filter(c => c.status === 'COMPLETED' && c.completion_date);
    const sum = (arr: any[]) => arr.reduce((s, c) => s + (c.pay_amount || 0), 0);

    const thisWeekRev = sum(completed.filter(c => new Date(c.completion_date) >= thisWeekStart));
    const lastWeekRev = sum(completed.filter(c => {
      const d = new Date(c.completion_date);
      return d >= lastWeekStart && d < thisWeekStart;
    }));
    const weekPct = lastWeekRev > 0 ? ((thisWeekRev - lastWeekRev) / lastWeekRev) * 100 : null;

    const thisMoStr  = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const lastMoDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMoStr  = `${lastMoDate.getFullYear()}-${String(lastMoDate.getMonth() + 1).padStart(2, '0')}`;
    const yoyStr     = `${currentYear - 1}-${String(currentMonth + 1).padStart(2, '0')}`;

    const thisMonthRev     = sum(completed.filter(c => c.completed_month === thisMoStr));
    const lastMonthRev     = sum(completed.filter(c => c.completed_month === lastMoStr));
    const yoyRev           = sum(completed.filter(c => c.completed_month === yoyStr));
    const monthPct         = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : null;
    const yoyPct           = yoyRev > 0 ? ((thisMonthRev - yoyRev) / yoyRev) * 100 : null;

    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const upcomingPayouts = sum(claims.filter(c =>
      c.payout_status === 'unpaid' &&
      c.status === 'COMPLETED' &&
      c.expected_payout_date &&
      new Date(c.expected_payout_date) <= twoWeeks
    ));

    return { thisWeekRev, lastWeekRev, weekPct, thisMonthRev, lastMonthRev, yoyRev, monthPct, yoyPct, upcomingPayouts };
  }, [claims]);

  // ─── Volume ───────────────────────────────────────────────────
  const volumeData = useMemo(() => {
    const weeklyData = Array.from({ length: 5 }, (_, i) => {
      const offset = 4 - i;
      const wStart = new Date(thisWeekStart);
      wStart.setDate(wStart.getDate() - offset * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      return {
        label: offset === 0 ? 'This Wk' : offset === 1 ? 'Last Wk' : `${offset}w ago`,
        count: claims.filter(c => { const d = new Date(c.created_at); return d >= wStart && d < wEnd; }).length,
        current: offset === 0,
      };
    });

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const offset = 5 - i;
      const mDate = new Date(currentYear, currentMonth - offset, 1);
      const mStr = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
      return {
        label: mDate.toLocaleString('default', { month: 'short' }),
        count: claims.filter(c => c.created_at?.startsWith(mStr)).length,
        current: offset === 0,
      };
    });

    const active = claims.filter(c => !['COMPLETED', 'CANCELED'].includes(c.status));
    const statusBreakdown = [
      { status: 'IN_PROGRESS', label: 'IN PROGRESS', count: active.filter(c => c.status === 'IN_PROGRESS').length, color: '#60a5fa' },
      { status: 'SCHEDULED',   label: 'SCHEDULED',   count: active.filter(c => c.status === 'SCHEDULED').length,   color: '#e8952a' },
      { status: 'WRITING',     label: 'WRITING',     count: active.filter(c => c.status === 'WRITING').length,     color: '#a78bfa' },
      { status: 'COMPLETED',   label: 'COMPLETED',   count: claims.filter(c => c.status === 'COMPLETED').length,   color: '#4ade80' },
      { status: 'CANCELED',    label: 'CANCELED',    count: claims.filter(c => c.status === 'CANCELED').length,    color: '#4a5058' },
    ];

    return { weeklyData, monthlyData, statusBreakdown };
  }, [claims]);

  // ─── Inspector Metrics ────────────────────────────────────────
  const inspectorData = useMemo(() => {
    const pool = profiles.filter(p => ['appraiser', 'writer'].includes(p.role));
    const targets = isAdmin ? pool : pool.filter(p => p.user_id === currentUserId);

    return targets.map(p => {
      const mine     = claims.filter(c => c.assigned_to === p.user_id);
      const open     = mine.filter(c => !['COMPLETED', 'CANCELED'].includes(c.status));
      const done     = mine.filter(c => c.status === 'COMPLETED');
      const rate     = mine.length > 0 ? Math.round((done.length / mine.length) * 100) : 0;
      const turns    = done.filter(c => c.completion_date).map(c =>
        (new Date(c.completion_date).getTime() - new Date(c.created_at).getTime()) / 86400000
      );
      const avgDays  = turns.length > 0 ? (turns.reduce((a, b) => a + b, 0) / turns.length).toFixed(1) : '—';
      const thisWk   = done.filter(c => c.completion_date && new Date(c.completion_date) >= thisWeekStart).length;
      return { name: p.full_name || 'Unknown', role: p.role, open: open.length, rate, avgDays, thisWk, total: done.length };
    }).sort((a, b) => b.open - a.open);
  }, [claims, profiles]);

  // ─── Firm Intelligence ────────────────────────────────────────
  const firmData = useMemo(() => {
    const firms = [...new Set(claims.map(c => c.firm).filter(Boolean))] as string[];
    const months = Array.from({ length: 12 }, (_, i) => {
      const offset = 11 - i;
      const d = new Date(currentYear, currentMonth - offset, 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) };
    });

    const COLORS = ['#e8952a', '#4ade80', '#60a5fa', '#a78bfa', '#f87171', '#fbbf24', '#34d399', '#fb923c'];
    const yearStr = String(currentYear);

    const ranked = firms.map(firm => {
      const yearTotal = claims.filter(c => c.firm === firm && c.created_at?.startsWith(yearStr)).length;
      const byMonth   = months.map(m => claims.filter(c => c.firm === firm && c.created_at?.startsWith(m.key)).length);
      const peak      = months.map((m, i) => ({ label: m.label, count: byMonth[i] }))
        .sort((a, b) => b.count - a.count).slice(0, 3).filter(m => m.count > 0);
      return { firm, yearTotal, byMonth, peak };
    }).sort((a, b) => b.yearTotal - a.yearTotal);

    const topFirms = ranked.slice(0, 7);
    const chartData = months.map((m, i) => {
      const entry: any = { month: m.label };
      topFirms.forEach(f => { entry[f.firm] = f.byMonth[i]; });
      return entry;
    });

    return { ranked, topFirms, chartData, colors: COLORS };
  }, [claims]);

  // ─── Alert count ──────────────────────────────────────────────
  const alertCount = slaAlerts
    ? (slaAlerts.unscheduled_over_5_days?.length || 0)
    + (slaAlerts.supplements_open_over_48hrs?.length || 0)
    + (slaAlerts.writing_stale_over_24hrs?.length || 0)
    : 0;

  // ─── Formatters ───────────────────────────────────────────────
  const fmt$ = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n.toFixed(0)}`;
  const fmtPct = (n: number | null) => n === null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
  const pctCls = (n: number | null) => n === null ? '' : n >= 0 ? 'kpi__delta--up' : 'kpi__delta--down';

  const TOOLTIP_STYLE = {
    background: '#1e2328', border: '1px solid #2e353d',
    borderRadius: 4, fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#b8bdc2',
  };

  if (loading) return (
    <>
      <NavBar role="admin" />
      <div className="kpi__loading">
        <div className="kpi__loading-spinner" />
        <div className="kpi__loading-text">LOADING DASHBOARD</div>
      </div>
    </>
  );

  return (
    <div className="kpi">
      <NavBar role="admin" />
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="kpi__page-header">
        <div>
          <div className="kpi__page-label">COMMAND CENTER</div>
          <h1 className="kpi__page-title">KPI DASHBOARD</h1>
          <div className="kpi__page-sub">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="kpi__header-right">
          {alertCount > 0 && (
            <div className="kpi__alert-badge">{alertCount} ALERT{alertCount > 1 ? 'S' : ''}</div>
          )}
          <button className="kpi__refresh-btn" onClick={loadData}>
            ↻ REFRESH
          </button>
          <div className="kpi__updated">
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ── Alert Strip ────────────────────────────────────────── */}
      {alertCount > 0 && slaAlerts && (
        <div className="kpi__alerts">
          {slaAlerts.unscheduled_over_5_days?.map((c: any) => (
            <div key={c.id} className="kpi__alert kpi__alert--red">
              <span className="kpi__alert-dot" />
              <strong>#{c.claim_number}</strong> unscheduled {Math.floor((now.getTime() - new Date(c.created_at).getTime()) / 86400000)}d — {c.customer_name}
              {c.firm && <span className="kpi__alert-firm">{c.firm}</span>}
            </div>
          ))}
          {slaAlerts.supplements_open_over_48hrs?.map((c: any) => (
            <div key={c.id} className="kpi__alert kpi__alert--orange">
              <span className="kpi__alert-dot" />
              Supplement <strong>#{c.claim_number}</strong> open 48h+ with no activity — {c.firm}
            </div>
          ))}
          {slaAlerts.writing_stale_over_24hrs?.map((c: any) => (
            <div key={c.id} className="kpi__alert kpi__alert--yellow">
              <span className="kpi__alert-dot" />
              <strong>#{c.claim_number}</strong> sitting in WRITING queue 24h+ — {c.customer_name}
            </div>
          ))}
        </div>
      )}

      <div className="kpi__body">
        {/* ── Row 1: Financial + Volume ──────────────────────────── */}
        <div className="kpi__row kpi__row--top">

          {/* FINANCIAL */}
          <div className="kpi__panel kpi__panel--financial">
            <div className="kpi__panel-hd">
              <div className="kpi__panel-title">REVENUE</div>
              <div className="kpi__panel-sub">Financial Performance</div>
            </div>

            <div className="kpi__fin-grid">
              <div className="kpi__fin-card">
                <div className="kpi__fin-label">THIS WEEK</div>
                <div className="kpi__fin-amount">{fmt$(financial.thisWeekRev)}</div>
                <div className={`kpi__delta ${pctCls(financial.weekPct)}`}>{fmtPct(financial.weekPct)} vs last week</div>
                <div className="kpi__fin-base">Last week {fmt$(financial.lastWeekRev)}</div>
              </div>

              <div className="kpi__fin-card kpi__fin-card--lit">
                <div className="kpi__fin-label">THIS MONTH</div>
                <div className="kpi__fin-amount kpi__fin-amount--amber">{fmt$(financial.thisMonthRev)}</div>
                <div className={`kpi__delta ${pctCls(financial.monthPct)}`}>{fmtPct(financial.monthPct)} vs last month</div>
                <div className="kpi__fin-base">Last month {fmt$(financial.lastMonthRev)}</div>
              </div>

              <div className="kpi__fin-card">
                <div className="kpi__fin-label">YEAR OVER YEAR</div>
                <div className="kpi__fin-amount">{fmt$(financial.thisMonthRev)}</div>
                <div className={`kpi__delta ${pctCls(financial.yoyPct)}`}>
                  {fmtPct(financial.yoyPct)} vs {now.toLocaleString('default', { month: 'short' })} {currentYear - 1}
                </div>
                <div className="kpi__fin-base">Last year {fmt$(financial.yoyRev)}</div>
              </div>

              <div className="kpi__fin-card kpi__fin-card--payout">
                <div className="kpi__fin-label">INCOMING (14 DAYS)</div>
                <div className="kpi__fin-amount kpi__fin-amount--green">{fmt$(financial.upcomingPayouts)}</div>
                <div className="kpi__fin-base">Projected payouts due</div>
              </div>
            </div>
          </div>

          {/* VOLUME */}
          <div className="kpi__panel kpi__panel--volume">
            <div className="kpi__panel-hd">
              <div className="kpi__panel-title">CLAIM VOLUME</div>
              <div className="kpi__panel-sub">Trends & Pipeline</div>
            </div>

            <div className="kpi__status-strip">
              {volumeData.statusBreakdown.map(s => (
                <div key={s.status} className="kpi__status-pill" style={{ '--pill-color': s.color } as any}>
                  <div className="kpi__status-dot" />
                  <span className="kpi__status-label">{s.label}</span>
                  <span className="kpi__status-count">{s.count}</span>
                </div>
              ))}
            </div>

            <div className="kpi__charts-row">
              <div className="kpi__chart-block">
                <div className="kpi__chart-label">WEEKLY</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={volumeData.weeklyData} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#6b7480', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7480', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar dataKey="count" name="Claims" radius={[2, 2, 0, 0]}>
                      {volumeData.weeklyData.map((e, i) => <Cell key={i} fill={e.current ? '#e8952a' : '#2e353d'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="kpi__chart-block">
                <div className="kpi__chart-label">MONTHLY</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={volumeData.monthlyData} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#6b7480', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7480', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar dataKey="count" name="Claims" radius={[2, 2, 0, 0]}>
                      {volumeData.monthlyData.map((e, i) => <Cell key={i} fill={e.current ? '#e8952a' : '#3d464f'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Inspectors + Firms ──────────────────────────── */}
        <div className="kpi__row kpi__row--bottom">

          {/* INSPECTORS */}
          <div className="kpi__panel kpi__panel--inspectors">
            <div className="kpi__panel-hd">
              <div className="kpi__panel-title">INSPECTOR PERFORMANCE</div>
              <div className="kpi__panel-sub">{isAdmin ? 'All Field Appraisers' : 'My Statistics'}</div>
            </div>

            <div className="kpi__ins-table">
              <div className="kpi__ins-head">
                <span>APPRAISER</span>
                <span>OPEN</span>
                <span>COMPLETION RATE</span>
                <span>AVG DAYS</span>
                <span>THIS WEEK</span>
              </div>

              {inspectorData.length === 0 ? (
                <div className="kpi__empty">No appraiser data yet</div>
              ) : inspectorData.map(ins => (
                <div key={ins.name} className="kpi__ins-row">
                  <div className="kpi__ins-name">
                    <div className="kpi__ins-avatar">{ins.name[0]}</div>
                    <div>
                      <div className="kpi__ins-fullname">{ins.name}</div>
                      <div className="kpi__ins-role">{ins.role.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="kpi__ins-cell">
                    <span className={`kpi__open-tag ${ins.open > 5 ? 'kpi__open-tag--warn' : ins.open > 0 ? 'kpi__open-tag--active' : ''}`}>
                      {ins.open}
                    </span>
                  </div>
                  <div className="kpi__ins-cell kpi__ins-cell--rate">
                    <div className="kpi__rate-track">
                      <div className="kpi__rate-fill" style={{ width: `${ins.rate}%` }} />
                    </div>
                    <span className="kpi__rate-num">{ins.rate}%</span>
                  </div>
                  <div className="kpi__ins-cell kpi__ins-mono">{ins.avgDays}d</div>
                  <div className="kpi__ins-cell kpi__ins-mono">{ins.thisWk}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FIRM INTELLIGENCE */}
          <div className="kpi__panel kpi__panel--firms">
            <div className="kpi__panel-hd">
              <div className="kpi__panel-title">FIRM INTELLIGENCE</div>
              <div className="kpi__panel-sub">12-Month Volume · Peak Seasons · Rankings</div>
            </div>

            <div className="kpi__firm-layout">
              <div className="kpi__firm-rank">
                <div className="kpi__firm-rank-hd">RANKINGS — {currentYear}</div>
                {firmData.ranked.slice(0, 8).map((f, i) => (
                  <div
                    key={f.firm}
                    className={`kpi__firm-row ${selectedFirm === f.firm ? 'kpi__firm-row--sel' : ''}`}
                    onClick={() => setSelectedFirm(selectedFirm === f.firm ? null : f.firm)}
                  >
                    <span className="kpi__firm-num">{i + 1}</span>
                    <span className="kpi__firm-dot" style={{ background: firmData.colors[i % firmData.colors.length] }} />
                    <span className="kpi__firm-name">{f.firm}</span>
                    <span className="kpi__firm-total">{f.yearTotal}</span>
                    {f.peak[0] && (
                      <span className="kpi__firm-peak">↑ {f.peak[0].label}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="kpi__firm-chart">
                <div className="kpi__chart-label">12-MONTH VOLUME BY FIRM {selectedFirm ? `— ${selectedFirm}` : ''}</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={firmData.chartData} barCategoryGap="20%" barGap={1} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: '#6b7480', fontSize: 8, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7480', fontSize: 8, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    {firmData.topFirms.map((f, i) => (
                      <Bar
                        key={f.firm}
                        dataKey={f.firm}
                        stackId="s"
                        fill={firmData.colors[i % firmData.colors.length]}
                        opacity={selectedFirm && selectedFirm !== f.firm ? 0.15 : 1}
                        radius={i === firmData.topFirms.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="kpi__firm-legend">
                  {firmData.topFirms.map((f, i) => (
                    <div
                      key={f.firm}
                      className={`kpi__legend-item ${selectedFirm === f.firm ? 'kpi__legend-item--sel' : ''}`}
                      onClick={() => setSelectedFirm(selectedFirm === f.firm ? null : f.firm)}
                    >
                      <span className="kpi__legend-dot" style={{ background: firmData.colors[i % firmData.colors.length] }} />
                      <span>{f.firm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
