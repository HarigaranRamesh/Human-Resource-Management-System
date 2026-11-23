import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge } from '../components/common';
import { Calendar, Users, CheckCircle, XCircle, Clock, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadDailyReport();
  }, [date]);

  const loadDailyReport = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getDailyReport({ date });
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load daily attendance report');
    } finally {
      setLoading(false);
    }
  };

  const presentCount = records.filter(r => r.attendance_type === 'Present').length;
  const absentCount = records.filter(r => r.attendance_type === 'Absent').length;
  const leaveCount = records.filter(r => r.attendance_type !== 'Present' && r.attendance_type !== 'Absent').length;

  const filtered = records.filter(r =>
    (r.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.emp_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.department || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Daily Attendance Operations Log"
        subtitle="Real-time daily clock-in/out records, location verification, and late arrival monitoring"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="date"
              className="form-input"
              style={{ width: '160px' }}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card stat-total">
          <div className="stat-icon-wrap"><Users size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Roster</span>
            <span className="stat-value">{records.length}</span>
          </div>
        </div>
        <div className="stat-card stat-present">
          <div className="stat-icon-wrap"><CheckCircle size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Present Today</span>
            <span className="stat-value">{presentCount}</span>
          </div>
        </div>
        <div className="stat-card stat-absent">
          <div className="stat-icon-wrap"><XCircle size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Absent</span>
            <span className="stat-value">{absentCount}</span>
          </div>
        </div>
        <div className="stat-card stat-active">
          <div className="stat-icon-wrap"><Clock size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">On Leave</span>
            <span className="stat-value">{leaveCount}</span>
          </div>
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            Attendance Entries ({new Date(date).toLocaleDateString()})
          </h3>
          <div className="search-bar" style={{ width: '240px' }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading records for {date}...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No records matching query.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Late Mark</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.emp_id || i}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{r.user_name}</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{r.emp_id}</div>
                    </td>
                    <td>{r.department || 'General'}</td>
                    <td>
                      <Badge variant={r.attendance_type === 'Present' ? 'success' : r.attendance_type === 'Absent' ? 'danger' : 'warning'}>
                        {r.attendance_type || 'Absent'}
                      </Badge>
                    </td>
                    <td>
                      {r.geo_login_time ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} style={{ color: '#22c55e' }} />
                          <span>{new Date(r.geo_login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {r.geo_logout_time ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} style={{ color: '#567C8D' }} />
                          <span>{new Date(r.geo_logout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {r.late_mark ? (
                        <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>
                          Late ({r.late_minutes || 0}m)
                        </span>
                      ) : (
                        <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>On Time</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
