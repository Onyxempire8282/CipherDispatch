import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getFirmColor } from '../../constants/firmColors';

interface Claim {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  appointment_start?: string;
  appointment_end?: string;
  firm_name?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  city?: string;
  profiles?: { full_name?: string } | null;
}

interface MonthlyCalendarProps {
  claims: Claim[];
  onClaimUpdate: () => void;
}

const MAX_VISIBLE_PER_DAY = 3;

export default function MonthlyCalendar({ claims, onClaimUpdate }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedClaimId, setDraggedClaimId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; claims: Claim[] } | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

  const handleCalendarDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();

    const claimId = e.dataTransfer.getData('text/claim-id');
    if (!claimId) return;

    // Set default time to 9:00 AM
    const appointmentDate = new Date(dateStr + 'T09:00:00');
    const appointmentEnd = new Date(appointmentDate);
    appointmentEnd.setHours(appointmentEnd.getHours() + 2);

    try {
      const { error } = await supabase
        .from('claims')
        .update({
          appointment_start: appointmentDate.toISOString(),
          appointment_end: appointmentEnd.toISOString(),
          status: 'SCHEDULED'
        })
        .eq('id', claimId);

      if (error) throw error;
      onClaimUpdate();
    } catch (error: any) {
      alert(`Error scheduling claim: ${error.message}`);
    }
  };

  const handleBacklogDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const claimId = e.dataTransfer.getData('text/claim-id');
    if (!claimId) return;

    try {
      const { error } = await supabase
        .from('claims')
        .update({
          appointment_start: null,
          appointment_end: null,
          status: null
        })
        .eq('id', claimId);

      if (error) throw error;
      onClaimUpdate();
    } catch (error: any) {
      alert(`Error unscheduling claim: ${error.message}`);
    }
  };

  const renderCompactClaimCard = (claim: Claim) => {
    const firmColor = getFirmColor(claim.firm_name);
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
          window.open(`/claim/${claim.id}`, '_blank');
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
          opacity: draggedClaimId === claim.id ? 0.5 : 1
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
    const firmColor = getFirmColor(claim.firm_name);

    return (
      <div
        key={claim.id}
        draggable
        onDragStart={(e) => handleDragStart(e, claim.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          window.open(`/claim/${claim.id}`, '_blank');
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
        {claim.firm_name && (
          <div
            style={{
              marginTop: '4px',
              fontSize: '10px',
              color: firmColor,
              fontWeight: 'bold'
            }}
          >
            {claim.firm_name}
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
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.toDateString() === new Date().toDateString();

      const daysClaims = scheduledClaims.filter(claim => {
        if (!claim.appointment_start) return false;
        const claimDate = new Date(claim.appointment_start).toISOString().split('T')[0];
        return claimDate === dateStr;
      });

      const visibleClaims = daysClaims.slice(0, MAX_VISIBLE_PER_DAY);
      const hiddenCount = daysClaims.length - visibleClaims.length;

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
          {daysClaims.length > 0 && (
            <div style={{ fontSize: '10px', color: '#a0aec0', marginBottom: '6px' }}>
              {daysClaims.length} claim{daysClaims.length > 1 ? 's' : ''}
            </div>
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
      {/* Backlog Column */}
      <div
        style={{
          width: '280px',
          background: '#1a202c',
          border: '2px solid #4a5568',
          borderRadius: '8px',
          padding: '16px',
          flexShrink: 0
        }}
        onDragOver={handleDragOver}
        onDrop={handleBacklogDrop}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px', fontWeight: 'bold' }}>
            📋 Needs Scheduling
          </h3>
          <div style={{ fontSize: '14px', color: '#a0aec0', marginTop: '4px' }}>
            {unscheduledClaims.length} claim{unscheduledClaims.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
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
            <div style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '16px' }}>
              {selectedDay.claims.length} claim{selectedDay.claims.length !== 1 ? 's' : ''} scheduled
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedDay.claims.map(claim => (
                <div
                  key={claim.id}
                  onClick={() => window.open(`/claim/${claim.id}`, '_blank')}
                  style={{
                    background: '#2d3748',
                    borderLeft: `4px solid ${getFirmColor(claim.firm_name)}`,
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
    </div>
  );
}
