import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getFirmColor, FIRM_COLORS } from '../../constants/firmColors';
import { getSupabaseAuthz } from '../../lib/supabaseAuthz';
import { isHoliday, formatHolidayName } from '../../utils/holidays';
import Field from '../ui/Field';
import './monthly-calendar.css';

interface Appraiser {
  user_id: string;
  full_name: string;
}

interface Claim {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  appointment_start?: string;
  appointment_end?: string;
  firm?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  city?: string;
  pay_amount?: number | null;
  file_total?: number | null;
  profiles?: { full_name?: string } | null;
}

interface MonthlyCalendarProps {
  claims: Claim[];
  onClaimUpdate: () => void;
}

const MAX_VISIBLE_PER_DAY = 3;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlyCalendar({ claims, onClaimUpdate }: MonthlyCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedClaimId, setDraggedClaimId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; claims: Claim[] } | null>(null);
  const [pendingDrop, setPendingDrop] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [selectedAppraiser, setSelectedAppraiser] = useState('');
  const [appraisers, setAppraisers] = useState<Appraiser[]>([]);

  const authz = getSupabaseAuthz();
  const userInfo = authz?.getCurrentUser();
  const isAdmin = userInfo?.role === 'admin';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'appraiser')
        .order('full_name');
      if (data) setAppraisers(data);
    })();
  }, []);

  const scheduledClaims = claims.filter(c => c.appointment_start);
  const unscheduledClaims = claims.filter(c => !c.appointment_start);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const handleDragStart = (e: React.DragEvent, claimId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/claim-id', claimId);
    setDraggedClaimId(claimId);
  };

  const handleDragEnd = () => setDraggedClaimId(null);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleCalendarDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    const claimId = e.dataTransfer.getData('text/claim-id');
    if (!claimId) return;
    setPendingDrop(claimId);
    setPendingDate(dateStr);
    setScheduleTime('09:00');
    setScheduleNotes('');
    setSelectedAppraiser('');
  };

  const handleSaveSchedule = async () => {
    if (!pendingDrop || !pendingDate) return;
    const [y, m, d] = pendingDate.split('-').map(Number);
    const [hour, minute] = scheduleTime.split(':').map(Number);
    const appointmentStart = new Date(y, m - 1, d, hour, minute, 0);
    const appointmentEnd = new Date(appointmentStart.getTime() + 2 * 60 * 60 * 1000);

    try {
      const updateData: any = {
        appointment_start: appointmentStart.toISOString(),
        appointment_end: appointmentEnd.toISOString(),
        status: 'SCHEDULED'
      };
      if (scheduleNotes.trim()) updateData.notes = scheduleNotes.trim();
      if (selectedAppraiser) updateData.assigned_to = selectedAppraiser;

      const { error } = await supabase.from('claims_v').update(updateData).eq('id', pendingDrop);
      if (error) throw error;
      handleCancelSchedule();
      onClaimUpdate();
    } catch (error: any) {
      alert(`Error scheduling claim: ${error.message}`);
    }
  };

  const handleCancelSchedule = () => {
    setPendingDrop(null);
    setPendingDate(null);
    setScheduleTime('09:00');
    setScheduleNotes('');
    setSelectedAppraiser('');
  };

  const handleBacklogDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const claimId = e.dataTransfer.getData('text/claim-id');
    if (!claimId) return;
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;
    if (!claim.appointment_start) return;

    try {
      const { error } = await supabase
        .from('claims_v')
        .update({ appointment_start: null, appointment_end: null, status: 'IN_PROGRESS' })
        .eq('id', claimId);
      if (error) throw error;
      onClaimUpdate();
    } catch (error: any) {
      alert(`Error unscheduling claim: ${error.message}`);
    }
  };

  const getClaimsForDay = (day: number) => {
    return scheduledClaims.filter(claim => {
      if (!claim.appointment_start) return false;
      const d = new Date(claim.appointment_start);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    }).sort((a, b) => new Date(a.appointment_start!).getTime() - new Date(b.appointment_start!).getTime());
  };

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="cal__day cal__day--empty" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holiday = isHoliday(date);
      const daysClaims = getClaimsForDay(day);
      const visibleClaims = daysClaims.slice(0, MAX_VISIBLE_PER_DAY);
      const hiddenCount = daysClaims.length - visibleClaims.length;
      const dailyPayTotal = daysClaims.reduce((sum, c) => sum + (c.pay_amount || 0), 0);
      const dailyFileTotal = daysClaims.reduce((sum, c) => sum + (c.file_total || 0), 0);

      days.push(
        <div
          key={day}
          className={`cal__day${isToday ? ' cal__day--today' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleCalendarDrop(e, dateStr)}
          onClick={() => setSelectedDay({ date: dateStr, claims: daysClaims })}
        >
          <div className="cal__day-num">
            {day}
            {daysClaims.length > 0 && (
              <span className="cal__day-count">
                {daysClaims.length} claim{daysClaims.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {holiday && (
            <div className="cal__day-holiday" title={formatHolidayName(holiday)}>
              {formatHolidayName(holiday)}
            </div>
          )}
          {isAdmin && dailyPayTotal > 0 && (
            <div className="cal__day-payout">${dailyPayTotal.toFixed(2)}</div>
          )}
          {isAdmin && dailyFileTotal > 0 && (
            <div className="cal__day-file-total">${dailyFileTotal.toFixed(2)}</div>
          )}
          {visibleClaims.map(claim => {
            const firmColor = getFirmColor(claim.firm);
            const time = claim.appointment_start
              ? new Date(claim.appointment_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : '';
            return (
              <div
                key={claim.id}
                className={`cal__claim${draggedClaimId === claim.id ? ' cal__claim--dragging' : ''}`}
                style={{ borderLeftColor: firmColor }}
                draggable
                onDragStart={(e) => handleDragStart(e, claim.id)}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.stopPropagation(); navigate(`/claim/${claim.id}?from=calendar`); }}
              >
                <div className="cal__claim-id">#{claim.claim_number}</div>
                <div className="cal__claim-name">{claim.customer_name}</div>
                {time && <div className="cal__claim-time">{time}</div>}
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <div className="cal__day-more">+ {hiddenCount} more</div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="cal">
      {/* Sidebar */}
      <div className="cal__sidebar" onDragOver={handleDragOver} onDrop={handleBacklogDrop}>
        <div className="cal__sidebar-header">
          <div className="cal__sidebar-title">Needs Scheduling</div>
          <div className="cal__sidebar-count">{unscheduledClaims.length}</div>
        </div>
        <div className="cal__sidebar-body">
          {unscheduledClaims.length === 0 ? (
            <div className="cal__sidebar-empty">All claims scheduled!</div>
          ) : (
            unscheduledClaims.map(claim => {
              const firmColor = getFirmColor(claim.firm);
              return (
                <div
                  key={claim.id}
                  className={`cal__backlog-card${draggedClaimId === claim.id ? ' cal__backlog-card--dragging' : ''}`}
                  style={{ borderLeftColor: firmColor }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, claim.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => { e.stopPropagation(); window.open(`/CipherDispatch/claim/${claim.id}`, '_blank'); }}
                >
                  <div className="cal__backlog-name">{claim.customer_name}</div>
                  <div className="cal__backlog-id">#{claim.claim_number}</div>
                  <div className="cal__backlog-location">{claim.city || 'No location'}</div>
                  {claim.firm && (
                    <div className="cal__backlog-firm" style={{ color: firmColor }}>{claim.firm}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="cal__legend">
          <div className="cal__legend-title">Firm Colors</div>
          <div className="cal__legend-list">
            {Object.entries(FIRM_COLORS).map(([firm, color]) => (
              <div key={firm} className="cal__legend-item">
                <div className="cal__legend-dot" style={{ background: color }} />
                <div className="cal__legend-name">{firm}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main calendar */}
      <div className="cal__main">
        <div className="cal__header">
          <button className="cal__nav-btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>&#x2039;</button>
          <div className="cal__month-label">
            <div className="cal__month-name">{MONTH_NAMES[month]}</div>
            <div className="cal__month-year">{year}</div>
          </div>
          <button className="cal__nav-btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>&#x203A;</button>
        </div>

        <div className="cal__weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="cal__weekday">{d}</div>
          ))}
        </div>

        <div className="cal__grid">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <div className="cal__modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="cal__modal" onClick={(e) => e.stopPropagation()}>
            <div className="cal__modal-header">
              <div className="cal__modal-title">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </div>
              <button className="cal__modal-close" onClick={() => setSelectedDay(null)}>&#x2715;</button>
            </div>
            {(() => {
              const h = isHoliday(new Date(selectedDay.date));
              return h ? <div className="cal__schedule-holiday">{formatHolidayName(h)} - Federal Holiday</div> : null;
            })()}
            <div className="cal__modal-sub">
              {selectedDay.claims.length} claim{selectedDay.claims.length !== 1 ? 's' : ''} scheduled
            </div>
            {selectedDay.claims.length === 0 ? (
              <div className="cal__modal-empty">No claims scheduled for this day</div>
            ) : (
              selectedDay.claims.map(claim => (
                <div
                  key={claim.id}
                  className="cal__modal-claim"
                  style={{ borderLeftColor: getFirmColor(claim.firm) }}
                  onClick={() => navigate(`/claim/${claim.id}?from=calendar`)}
                >
                  <div className="cal__modal-claim-number">#{claim.claim_number}</div>
                  <div className="cal__modal-claim-name">{claim.customer_name}</div>
                  <div className="cal__modal-claim-vehicle">
                    {claim.vehicle_year} {claim.vehicle_make} {claim.vehicle_model}
                  </div>
                  {claim.appointment_start && (
                    <div className="cal__modal-claim-time">
                      {new Date(claim.appointment_start).toLocaleTimeString('en-US', {
                        hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {pendingDrop && pendingDate && (
        <div className="cal__modal-overlay" onClick={handleCancelSchedule}>
          <div className="cal__modal cal__modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="cal__modal-header">
              <div className="cal__modal-title">Schedule Appointment</div>
              <button className="cal__modal-close" onClick={handleCancelSchedule}>&#x2715;</button>
            </div>

            <div className="cal__schedule-date">
              <div className="cal__schedule-date-label">Selected Date</div>
              <div className="cal__schedule-date-value">
                {new Date(pendingDate).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </div>
            </div>

            {(() => {
              const h = isHoliday(new Date(pendingDate));
              return h ? <div className="cal__schedule-holiday">Warning: {formatHolidayName(h)} - Federal Holiday</div> : null;
            })()}

            <Field label="Appointment Time">
              <input
                className="field__input"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </Field>

            <Field label="Assign Appraiser" optional>
              <div className="field__select-wrap">
                <select
                  className="field__select"
                  value={selectedAppraiser}
                  onChange={(e) => setSelectedAppraiser(e.target.value)}
                >
                  <option value="">-- Select Appraiser --</option>
                  {appraisers.map(a => (
                    <option key={a.user_id} value={a.user_id}>{a.full_name}</option>
                  ))}
                </select>
                <div className="field__select-arrow">&#x25BE;</div>
              </div>
            </Field>

            <Field label="Additional Notes" optional>
              <textarea
                className="field__textarea"
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Add any notes about this appointment..."
              />
            </Field>

            <div className="cal__schedule-actions">
              <button className="btn btn--primary" onClick={handleSaveSchedule}>Save Schedule</button>
              <button className="btn btn--ghost" onClick={handleCancelSchedule}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
