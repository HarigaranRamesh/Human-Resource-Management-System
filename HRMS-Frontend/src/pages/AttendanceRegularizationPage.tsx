import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, Modal, FormInput, SearchIcon } from '../components/common';
import { Clock, Plus, Check, X, CheckCircle2, AlertCircle, Filter, Calendar, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useDebounce } from '../lib/useDebounce';
import toast from 'react-hot-toast';

export default function AttendanceRegularizationPage() {
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'inbox'>('my');

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  // Apply Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    checkInTime: '09:30',
    checkOutTime: '18:30',
    reason: '',
  });

  // Review Modal state
  const [actionItem, setActionItem] = useState<{ id: string; action: 'approve' | 'reject'; name: string } | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    if (admin) {
      setActiveTab('inbox');
    }
  }, []);

  useEffect(() => {
    loadRegularizations();
  }, [page, statusFilter, debouncedSearch, activeTab]);

  const loadRegularizations = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getRegularizations({
        page,
        limit,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        myOnly: activeTab === 'my' ? true : undefined,
      });

      const data = res.data;
      setRegularizations(data.regularizations || []);
      if (data.totalPages !== undefined) setTotalPages(data.totalPages || 1);
      if (data.total !== undefined) setTotalCount(data.total);
    } catch {
      toast.error('Failed to load regularization records');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.reason.trim()) {
      toast.error('Please specify the date and reason for regularization');
      return;
    }
    setSubmitting(true);
    try {
      await attendanceApi.applyRegularization(form);
      toast.success('Regularization request submitted for manager approval');
      setShowApplyModal(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        checkInTime: '09:30',
        checkOutTime: '18:30',
        reason: '',
      });
      loadRegularizations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit regularization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewDecision = async () => {
    if (!actionItem) return;
    setReviewing(true);
    try {
      await attendanceApi.reviewRegularization(actionItem.id, {
        approved: actionItem.action === 'approve',
        remarks: reviewRemarks || (actionItem.action === 'approve' ? 'Approved' : 'Rejected'),
      });
      toast.success(`Request ${actionItem.action === 'approve' ? 'approved' : 'rejected'}`);
      setActionItem(null);
      setReviewRemarks('');
      loadRegularizations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Review action failed');
    } finally {
      setReviewing(false);
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '—';
    try {
      const d = new Date(timeStr);
      return isNaN(d.getTime()) ? timeStr : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Attendance Regularization & Punches"
        subtitle="Submit clock-in/out correction requests for missing punches, on-duty visits, and review approvals"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowApplyModal(true)}
            >
              Request Regularization
            </Button>
          </div>
        }
      />

      {/* Admin / Employee Tab Switcher */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn-filter ${activeTab === 'inbox' ? 'active' : ''}`}
            onClick={() => { setActiveTab('inbox'); setPage(1); }}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: activeTab === 'inbox' ? '#2F4156' : '#FFFFFF',
              color: activeTab === 'inbox' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Review Inbox (All Employees)
          </button>
          <button
            type="button"
            className={`btn-filter ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => { setActiveTab('my'); setPage(1); }}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: activeTab === 'my' ? '#2F4156' : '#FFFFFF',
              color: activeTab === 'my' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            My Submitted Requests
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <SearchIcon
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '36px' }}
              placeholder="Search by employee name, ID, or reason..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {(search || statusFilter) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Regularizations Table */}
      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading regularization requests...</p>
          </div>
        ) : regularizations.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Clock size={44} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p>No regularization records found.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Attendance Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    {isAdmin && activeTab === 'inbox' && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {regularizations.map(item => {
                    const isPending = item.approved === null;
                    const isApproved = item.approved === true;

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.user_name || 'Me'}</strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {item.emp_id} • {item.department}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                            <span>{new Date(item.date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td><code>{formatTime(item.geo_login_time)}</code></td>
                        <td><code>{formatTime(item.geo_logout_time)}</code></td>
                        <td style={{ maxWidth: '240px', wordBreak: 'break-word' }}>
                          {item.reason_for_applying}
                        </td>
                        <td>
                          {isPending ? (
                            <Badge variant="amber" dot>Pending Review</Badge>
                          ) : isApproved ? (
                            <Badge variant="green" dot>Approved</Badge>
                          ) : (
                            <Badge variant="red" dot>Rejected</Badge>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {item.remarks || '—'}
                        </td>
                        {isAdmin && activeTab === 'inbox' && (
                          <td style={{ textAlign: 'right' }}>
                            {isPending && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={<X size={14} />}
                                  style={{ color: '#ef4444' }}
                                  onClick={() => setActionItem({ id: item.id, action: 'reject', name: item.user_name })}
                                >
                                  Reject
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={<Check size={14} />}
                                  style={{ background: '#22c55e', borderColor: '#22c55e' }}
                                  onClick={() => setActionItem({ id: item.id, action: 'approve', name: item.user_name })}
                                >
                                  Approve
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Showing {regularizations.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} records
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    ‹ Prev
                  </Button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 8px' }}>
                    {page} / {totalPages}
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next ›
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Apply Regularization Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply for Attendance Regularization"
        maxWidth="480px"
      >
        <form onSubmit={handleApply}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormInput
              label="Date of Attendance"
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormInput
                label="Check In Time"
                type="time"
                value={form.checkInTime}
                onChange={e => setForm(p => ({ ...p, checkInTime: e.target.value }))}
                required
              />
              <FormInput
                label="Check Out Time"
                type="time"
                value={form.checkOutTime}
                onChange={e => setForm(p => ({ ...p, checkOutTime: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label">Reason for Regularization</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. Forgot punch due to urgent client meeting, biometrics hardware offline"
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowApplyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      {actionItem && (
        <Modal
          isOpen={!!actionItem}
          onClose={() => setActionItem(null)}
          title={`${actionItem.action === 'approve' ? 'Approve' : 'Reject'} Regularization for ${actionItem.name}`}
          maxWidth="460px"
        >
          <div>
            <label className="form-label">Review Remarks (Optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={reviewRemarks}
              onChange={e => setReviewRemarks(e.target.value)}
              placeholder={actionItem.action === 'approve' ? 'e.g. Approved per manager confirmation' : 'e.g. Rejected, please verify with shift lead'}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Button variant="secondary" onClick={() => setActionItem(null)}>
                Cancel
              </Button>
              <Button
                variant={actionItem.action === 'approve' ? 'primary' : 'danger'}
                loading={reviewing}
                onClick={handleReviewDecision}
              >
                Confirm {actionItem.action === 'approve' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
