import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge } from '../components/common';
import { Calendar, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MonthlyReportPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    loadMonthlyReport();
  }, [month, year]);

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const uid = localStorage.getItem('userId');
      const res = await attendanceApi.getMonthlyReport({ userId: uid, month, year });
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load monthly attendance');
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getRecordForDay = (day: number) => {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.find(r => (r.date || '').startsWith(dayStr));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const presentDays = records.filter(r => r.attendance_type === 'Present').length;
  const absentDays = records.filter(r => r.attendance_type === 'Absent').length;
  const leaveDays = records.filter(r => r.attendance_type && r.attendance_type !== 'Present' && r.attendance_type !== 'Absent').length;

  return (
    <div className="page-container">
      <PageHeader
        title="Monthly Attendance Calendar"
        subtitle="Individual monthly attendance ledger, shift adherence, and time-off tracking"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={prevMonth} />
            <span style={{ fontWeight: 700, minWidth: '130px', textAlign: 'center', color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </span>
            <Button variant="secondary" icon={<ChevronRight size={16} />} onClick={nextMonth} />
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card stat-present">
          <div className="stat-icon-wrap"><CheckCircle2 size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Present Days</span>
            <span className="stat-value">{presentDays}</span>
          </div>
        </div>
        <div className="stat-card stat-absent">
          <div className="stat-icon-wrap"><XCircle size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Absent Days</span>
            <span className="stat-value">{absentDays}</span>
          </div>
        </div>
        <div className="stat-card stat-active">
          <div className="stat-icon-wrap"><Clock size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Approved Leaves</span>
            <span className="stat-value">{leaveDays}</span>
          </div>
        </div>
        <div className="stat-card stat-total">
          <div className="stat-icon-wrap"><Calendar size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Month Days</span>
            <span className="stat-value">{daysInMonth}</span>
          </div>
        </div>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading attendance calendar...</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '0.75rem',
              padding: '0.5rem 0',
            }}
          >
            {daysArray.map((day) => {
              const rec = getRecordForDay(day);
              const dateObj = new Date(year, month - 1, day);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const isFuture = dateObj > new Date();

              const status = isFuture
                ? 'Upcoming'
                : rec
                ? rec.attendance_type
                : isWeekend
                ? 'Weekend'
                : 'Absent';

              const statusColor =
                status === 'Present'
                  ? '#22c55e'
                  : status === 'Absent'
                  ? '#ef4444'
                  : status === 'Weekend'
                  ? '#94a3b8'
                  : status === 'Upcoming'
                  ? '#cbd5e1'
                  : '#3b82f6';

              return (
                <div
                  key={day}
                  style={{
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '85px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{day}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: statusColor,
                        background: `${statusColor}18`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {status}
                    </span>
                    {rec?.geo_login_time && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        In: {new Date(rec.geo_login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
