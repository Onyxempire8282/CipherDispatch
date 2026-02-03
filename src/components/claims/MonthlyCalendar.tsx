import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getFirmColor, FIRM_COLORS } from '../../constants/firmColors';
import { getSupabaseAuthz } from '../../lib/supabaseAuthz';
import { isHoliday, formatHolidayName } from '../../utils/holidays';

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

export default function MonthlyCalendar({ claims, onClaimUpdate }: MonthlyCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedClaimId, setDraggedClaimId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; claims: Claim[] } | null>(null);

  // Pending drop state for scheduling modal
  const [pendingDrop, setPendingDrop] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  // Scheduling modal inputs
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [selectedAppraiser, setSelectedAppraiser] = useState('');

  // Appraisers list
  const [appraisers, setAppraisers] = useState<Appraiser[]>([]);

  // Check if current user is admin for pay field visibility
  const authz = getSupabaseAuthz();
  const userInfo = authz?.getCurrentUser();
  const isAdmin = userInfo?.role === 'admin';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch appraisers on component mount
  useEffect(() => {
    const fetchAppraisers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'appraiser')
        .order('full_name');

      if (!error && data) {
        setAppraisers(data);
      }
    };

    fetchAppraisers();
  }, []);

  // Separate scheduled and unscheduled claims
  const scheduledClaims = claims.filter(c => c.appointment_start);
  const unscheduledClaims = claims.filter(c => !c.appointment_start);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDragStart = (e: React.DragEvent, claimId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/claim-id', claimId);
    setDraggedClaimId(claimId);
  };

  const handleDragEnd = () => {
    setDraggedClaimId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCalendarDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();

    const claimId = e.dataTransfer.getData('text/claim-id');
    if (!claimId) return;

    // Instead of updating immediately, open the scheduling modal
    setPendingDrop(claimId);
    setPendingDate(dateStr);
    setScheduleTime('09:00');
    setScheduleNotes('');
    setSelectedAppraiser('');
  };

  const handleSaveSchedule = async () => {
    if (!pendingDrop || !pendingDate) return;

    // Combine date and time preserving local timezone
    const [year, month, day] = pendingDate.split('-').map(Number);
    const [hour, minute] = scheduleTime.split(':').map(Number);

    const appointmentStart = new Date(year, month - 1, day, hour, minute, 0);
    const appointmentEnd = new Date(appointmentStart.getTime() + 2 * 60 * 60 * 1000);

    try {
      const updateData: any = {
        appointment_start: appointmentStart.toISOString(),
        appointment_end: appointmentEnd.toISOString(),
        status: 'SCHEDULED'
      };

      // Add notes if provided
      if (scheduleNotes.trim()) {
        updateData.notes = scheduleNotes.trim();
      }

      // Add appraiser if selected
      if (selectedAppraiser) {
        updateData.assigned_to = selectedAppraiser;
      }

      const { error } = await supabase
        .from('claims_v')
        .update(updateData)
        .eq('id', pendingDrop);

      if (error) throw error;

      // Clear pending state and close modal
      setPendingDrop(null);
      setPendingDate(null);
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

    // Find the claim to check if it's currently scheduled
    const claim = claims.find(c => c.id === claimId);
    if (!claim) {
      alert('Claim not found');
      return;
    }

    // If already unscheduled, no need to update
    if (!claim.appointment_start) {
      alert('Claim is already unscheduled');
      return;
    }

    try {
      const { error } = await supabase
        .from('claims_v')
        .update({
          appointment_start: null,
          appointment_end: null,
          status: 'IN_PROGRESS'
        })
        .eq('id', claimId);

      if (error) throw error;
      onClaimUpdate();
    } catch (error: any) {
      alert(`Error unscheduling claim: ${error.message}`);
    }
  };

  const renderCompactClaimCard = (claim: Claim) => {
    const firmColor = getFirmColor(claim.firm);
    const timeDisplay = claim.appointment_start
      ? new Date(claim.appointment_start).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : '';

    return (
      <div
        key={claim.id}
        draggable
        onDragStart={(e) => handleDragStart(e, claim.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/claim/${claim.id}?from=calendar`);
        }}
        style={{
          cursor: 'grab',
          padding: '6px 8px',
          margin: '4px 0',
          background: '#2d3748',
          border: `2px solid ${firmColor}`,
          borderRadius: '4px',
          fontSize: '12px',
          color: '#e2e8f0',
          opacity: draggedClaimId === claim.id ? 0.5 : 1,
          userSelect: 'none'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '13px' }}>
          #{claim.claim_number}
        </div>
        <div style={{ fontSize: '11px', color: '#a0aec0', marginBottom: '2px' }}>
          {claim.customer_name}
        </div>
        {timeDisplay && (
          <div style={{ fontSize: '10px', color: '#cbd5e0' }}>
            🕒 {timeDisplay}
          </div>
        )}
      </div>
    );
  };

  const renderBacklogCard = (claim: Claim) => {
    const firmColor = getFirmColor(claim.firm);

    return (
      <div
        key={claim.id}
        draggable
        onDragStart={(e) => handleDragStart(e, claim.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          window.open(`/CipherDispatch/claim/${claim.id}`, '_blank');
        }}
        style={{
          cursor: 'grab',
          padding: '10px',
          margin: '6px 0',
          background: '#2d3748',
          borderLeft: `4px solid ${firmColor}`,
          borderRadius: '6px',
          fontSize: '14px',
          color: '#e2e8f0',
          opacity: draggedClaimId === claim.id ? 0.5 : 1,
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '15px' }}>
          {claim.customer_name}
        </div>
        <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '2px' }}>
          #{claim.claim_number}
        </div>
        <div style={{ fontSize: '11px', color: '#718096' }}>
          {claim.city || 'No location'}
        </div>
        {claim.firm && (
          <div
            style={{
              marginTop: '4px',
              fontSize: '10px',
              color: firmColor,
              fontWeight: 'bold'
            }}
          >
            {claim.firm}
          </div>
        )}
      </div>
    );
  };

  // Render calendar days
  const renderCalendarDays = () => {
    const days = [];

    // Empty cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} style={{ background: '#1a202c' }} />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Check if this day is a holiday
      const holiday = isHoliday(date);

      const daysClaims = scheduledClaims.filter(claim => {
        if (!claim.appointment_start) return false;
        const claimDate = new Date(claim.appointment_start);
        return claimDate.getFullYear() === year &&
               claimDate.getMonth() === month &&
               claimDate.getDate() === day;
      }).sort((a, b) => {
        // Sort by appointment time (earliest first)
        const timeA = new Date(a.appointment_start!).getTime();
        const timeB = new Date(b.appointment_start!).getTime();
        return timeA - timeB;
      });

      const visibleClaims = daysClaims.slice(0, MAX_VISIBLE_PER_DAY);
      const hiddenCount = daysClaims.length - visibleClaims.length;

      // Calculate daily pay total and file total
      const dailyPayTotal = daysClaims.reduce((sum, claim) => {
        return sum + (claim.pay_amount || 0);
      }, 0);
      const dailyFileTotal = daysClaims.reduce((sum, claim) => {
        return sum + (claim.file_total || 0);
      }, 0);

      days.push(
        <div
          key={day}
          onDragOver={handleDragOver}
          onDrop={(e) => handleCalendarDrop(e, dateStr)}
          onClick={() => setSelectedDay({ date: dateStr, claims: daysClaims })}
          style={{
            background: isToday ? '#2d3748' : '#1e2938',
            border: isToday ? '2px solid #667eea' : '1px solid #4a5568',
            padding: '6px',
            minHeight: '120px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = isToday ? '#667eea' : '#4a5568'}
        >
          <div style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: isToday ? '#667eea' : '#e2e8f0',
            marginBottom: '6px'
          }}>
            {day}
          </div>
          {holiday && (
            <div
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: '#ffffff',
                fontSize: '9px',
                padding: '3px 6px',
                borderRadius: '4px',
                marginBottom: '6px',
                fontWeight: 'bold',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                border: '1px solid #7f1d1d'
              }}
              title={formatHolidayName(holiday)}
            >
              🇺🇸 {formatHolidayName(holiday)}
            </div>
          )}
          {daysClaims.length > 0 && (
            <>
              <div style={{ fontSize: '10px', color: '#a0aec0', marginBottom: '2px' }}>
                {daysClaims.length} claim{daysClaims.length > 1 ? 's' : ''}
              </div>
              {isAdmin && dailyPayTotal > 0 && (
                <div style={{ fontSize: '10px', color: '#10b981', marginBottom: '2px', fontWeight: 'bold' }}>
                  💰 ${dailyPayTotal.toFixed(2)}
                </div>
              )}
              {isAdmin && dailyFileTotal > 0 && (
                <div style={{ fontSize: '10px', color: '#3b82f6', marginBottom: '4px', fontWeight: 'bold' }}>
                  📄 ${dailyFileTotal.toFixed(2)}
                </div>
              )}
            </>
          )}
          <div>
            {visibleClaims.map(claim => renderCompactClaimCard(claim))}
          </div>
          {hiddenCount > 0 && (
            <div style={{
              fontSize: '11px',
              color: '#667eea',
              textAlign: 'center',
              marginTop: '4px',
              fontWeight: 'bold'
            }}>
              + {hiddenCount} more
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div style={{ display: 'flex', gap: '16px', minHeight: '80vh' }}>
      {/* Backlog Column - Sticky */}
      <div
        style={{
          width: '280px',
          background: '#1a202c',
          border: '2px solid #4a5568',
          borderRadius: '8px',
          padding: '16px',
          flexShrink: 0,
          position: 'sticky',
          top: '16px',
          alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onDragOver={handleDragOver}
        onDrop={handleBacklogDrop}
      >
        <div style={{ marginBottom: '16px', flexShrink: 0 }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px', fontWeight: 'bold' }}>
            📋 Needs Scheduling
          </h3>
          <div style={{ fontSize: '14px', color: '#a0aec0', marginTop: '4px' }}>
            {unscheduledClaims.length} claim{unscheduledClaims.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {unscheduledClaims.map(claim => renderBacklogCard(claim))}
          {unscheduledClaims.length === 0 && (
            <div style={{ textAlign: 'center', color: '#718096', fontSize: '14px', padding: '20px' }}>
              All claims scheduled!
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1 }}>
        {/* Calendar Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          background: '#2d3748',
          padding: '12px 16px',
          borderRadius: '8px'
        }}>
          <button
            onClick={handlePrevMonth}
            style={{
              background: '#4a5568',
              color: '#e2e8f0',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ‹
          </button>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '20px', fontWeight: 'bold' }}>
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={handleNextMonth}
            style={{
              background: '#4a5568',
              color: '#e2e8f0',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ›
          </button>
        </div>

        {/* Color Legend */}
        <div style={{
          background: '#2d3748',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px', fontWeight: 'bold' }}>
            📊 Firm Color Legend
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(FIRM_COLORS).map(([firm, color]) => (
              <div
                key={firm}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: '#1a202c',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px',
                    background: color,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                />
                <span style={{ color: '#e2e8f0' }}>{firm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekday Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          marginBottom: '2px'
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              style={{
                background: '#2d3748',
                padding: '12px 6px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#a0aec0'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          background: '#4a5568'
        }}>
          {renderCalendarDays()}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div
          onClick={() => setSelectedDay(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a202c',
              border: '2px solid #4a5568',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '20px' }}>
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>
            {(() => {
              const modalHoliday = isHoliday(new Date(selectedDay.date));
              if (modalHoliday) {
                return (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      color: '#ffffff',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      boxShadow: '0 4px 6px rgba(220, 38, 38, 0.3)',
                      border: '2px solid #7f1d1d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>🇺🇸</span>
                    <span style={{ fontSize: '15px' }}>{formatHolidayName(modalHoliday)} - Federal Holiday</span>
                  </div>
                );
              }
              return null;
            })()}
            <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '16px' }}>
              {selectedDay.claims.length} claim{selectedDay.claims.length !== 1 ? 's' : ''} scheduled
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedDay.claims.map(claim => (
                <div
                  key={claim.id}
                  onClick={() => navigate(`/claim/${claim.id}?from=calendar`)}
                  style={{
                    background: '#2d3748',
                    borderLeft: `4px solid ${getFirmColor(claim.firm)}`,
                    borderRadius: '6px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>
                    #{claim.claim_number}
                  </div>
                  <div style={{ fontSize: '15px', color: '#e2e8f0', marginBottom: '8px' }}>
                    {claim.customer_name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '4px' }}>
                    {claim.vehicle_year} {claim.vehicle_make} {claim.vehicle_model}
                  </div>
                  {claim.appointment_start && (
                    <div style={{ fontSize: '13px', color: '#cbd5e0' }}>
                      🕒 {new Date(claim.appointment_start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  )}
                </div>
              ))}
              {selectedDay.claims.length === 0 && (
                <div style={{ textAlign: 'center', color: '#718096', padding: '40px' }}>
                  No claims scheduled for this day
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Modal */}
      {pendingDrop && pendingDate && (
        <div
          onClick={handleCancelSchedule}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a202c',
              border: '2px solid #4a5568',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '20px', fontWeight: 'bold' }}>
                📅 Schedule Appointment
              </h3>
              <button
                onClick={handleCancelSchedule}
                style={{
                  background: 'transparent',
                  color: '#a0aec0',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Date Display */}
            <div style={{ marginBottom: '20px', padding: '12px', background: '#2d3748', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '4px' }}>
                Selected Date
              </div>
              <div style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: 'bold' }}>
                {new Date(pendingDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            {/* Holiday Warning */}
            {(() => {
              const schedulingHoliday = isHoliday(new Date(pendingDate));
              if (schedulingHoliday) {
                return (
                  <div
                    style={{
                      marginBottom: '20px',
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: '2px solid #92400e',
                      borderRadius: '8px',
                      color: '#1a202c',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <span style={{ fontSize: '14px' }}>
                      Warning: {formatHolidayName(schedulingHoliday)} - Federal Holiday
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Time Picker */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                Appointment Time
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  background: '#475569',
                  color: '#ffffff'
                }}
              />
            </div>

            {/* Appraiser Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                Assign Appraiser (Optional)
              </label>
              <select
                value={selectedAppraiser}
                onChange={(e) => setSelectedAppraiser(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  background: '#475569',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Select Appraiser --</option>
                {appraisers.map(appraiser => (
                  <option key={appraiser.user_id} value={appraiser.user_id}>
                    {appraiser.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes Textarea */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                Additional Notes (Optional)
              </label>
              <textarea
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Add any notes about this appointment..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '15px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  background: '#475569',
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSaveSchedule}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                }}
              >
                ✅ Save Schedule
              </button>
              <button
                onClick={handleCancelSchedule}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#4b5563';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#6b7280';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
