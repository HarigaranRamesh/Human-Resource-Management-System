import React, { useState, useEffect } from 'react';
import { leaveApplicationApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, FormInput, Select, Modal } from '../components/common';
import { Calendar, Plus, CheckCircle, Clock, XCircle, AlertCircle, CalendarPlus, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeaveRequestPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);

  const [form, setForm] = useState({
    leaveType: 'Casual Leave',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    isHalfDay: false,
    halfDayPeriod: 'First Half',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, balRes] = await Promise.all([
        leaveApplicationApi.getMyRequests(),
        leaveApplicationApi.getBalance(),
      ]);
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
      setBalances(Array.isArray(balRes.data) ? balRes.data : []);
    } catch {
      toast.error('Failed to load leave records');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (form.isHalfDay) return 0.5;
    const start = new Date(form.fromDate);
    const end = new Date(form.toDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    return Math.max(1, diff);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.error('Please enter a reason for your leave request');
      return;
    }
    const days = calculateDays();
    setApplying(true);
    try {
      await leaveApplicationApi.apply({
        leaveType: form.leaveType,
        fromDate: form.fromDate,
        toDate: form.toDate,
        totalDays: days,
        isHalfDay: form.isHalfDay,
        halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : undefined,
        reason: form.reason,
      });
      toast.success('Leave application submitted for approval');
      setShowApplyModal(false);
      setForm({
        leaveType: 'Casual Leave',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        isHalfDay: false,
        halfDayPeriod: 'First Half',
        reason: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit leave');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Time-Off & Leave Management"
        subtitle="Check leave balances, apply for planned or casual leaves, and track manager approval statuses"
        actions={
          <Button
            variant="primary"
            icon={<CalendarPlus size={16} />}
            onClick={() => setShowApplyModal(true)}
          >
            Apply for Leave
          </Button>
        }
      />

      {/* Balance Summary Tiles */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {(balances.length > 0 ? balances : [
          { label: 'Casual Leave', available: 12, allocated: 12, used: 0 },
          { label: 'Sick Leave', available: 10, allocated: 10, used: 0 },
          { label: 'Planned Leave', available: 15, allocated: 15, used: 0 },
          { label: 'Comp OFF', available: 4, allocated: 4, used: 0 },
        ]).map((bal) => (
          <div key={bal.label} className="stat-card stat-total">
            <div className="stat-icon-wrap">
              <Calendar size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">{bal.label}</span>
              <span className="stat-value">{bal.available} <small style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {bal.allocated} Days</small></span>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            My Leave Request History
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading leave applications...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CalendarPlus size={44} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p>No leave requests found. Enjoy your working week!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Total Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Manager Decision</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{req.leave_type}</strong>
                      {req.is_half_day && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>Half Day ({req.half_day_period})</div>
                      )}
                    </td>
                    <td>
                      {new Date(req.from_date).toLocaleDateString()} to {new Date(req.to_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{req.total_days} Day{req.total_days > 1 ? 's' : ''}</span>
                    </td>
                    <td style={{ maxWidth: '240px', wordBreak: 'break-word' }}>
                      {req.reason}
                    </td>
                    <td>
                      <Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning'}>
                        {req.status}
                      </Badge>
                    </td>
                    <td>
                      {req.decision_reason ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{req.approver_name || 'Manager'}: </span>
                          <em>{req.decision_reason}</em>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Pending review</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Submit Leave Application"
        maxWidth="500px"
      >
        <form onSubmit={handleApply}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Select
              label="Leave Type"
              value={form.leaveType}
              onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
              options={[
                { value: 'Casual Leave', label: 'Casual Leave' },
                { value: 'Sick Leave', label: 'Sick Leave' },
                { value: 'Planned Leave', label: 'Planned / Privilege Leave' },
                { value: 'Comp OFF', label: 'Compensatory Off (Comp OFF)' },
                { value: 'Maternity Leave', label: 'Maternity Leave' },
                { value: 'Paternity Leave', label: 'Paternity Leave' },
              ]}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormInput
                label="From Date"
                type="date"
                value={form.fromDate}
                onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                required
              />
              <FormInput
                label="To Date"
                type="date"
                value={form.toDate}
                onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isHalfDay"
                checked={form.isHalfDay}
                onChange={e => setForm(p => ({ ...p, isHalfDay: e.target.checked }))}
              />
              <label htmlFor="isHalfDay" style={{ fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}>
                Apply as Half-Day
              </label>
            </div>

            {form.isHalfDay && (
              <Select
                label="Half-Day Period"
                value={form.halfDayPeriod}
                onChange={e => setForm(p => ({ ...p, halfDayPeriod: e.target.value }))}
                options={[
                  { value: 'First Half', label: 'First Half (Morning)' },
                  { value: 'Second Half', label: 'Second Half (Afternoon)' },
                ]}
              />
            )}

            <div>
              <label className="form-label">Total Duration: <strong>{calculateDays()} Day(s)</strong></label>
            </div>

            <div>
              <label className="form-label">Reason for Absence</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Please describe the purpose of your time off..."
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowApplyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={applying}>
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
