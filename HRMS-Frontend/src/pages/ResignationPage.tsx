import React, { useState, useEffect } from 'react';
import { resignationApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, Modal, FormInput, Select, SearchIcon } from '../components/common';
import { LogOut, Plus, CheckCircle2, AlertCircle, FileCheck, Shield, Laptop, DollarSign, BookOpen, Clock } from 'lucide-react';
import { useDebounce } from '../lib/useDebounce';
import toast from 'react-hot-toast';

export default function ResignationPage() {
  const [resignations, setResignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
  const [applying, setApplying] = useState(false);
  const [applyForm, setApplyForm] = useState({
    preferredLastWorkingDay: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    noticePeriodDays: 30,
    reason: '',
    comments: '',
  });

  // HR Review Modal state
  const [selectedResignation, setSelectedResignation] = useState<any | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'Approved',
    officialLastWorkingDay: '',
    clearanceAssetsReturned: false,
    clearanceNoDues: false,
    clearanceKtDone: false,
  });
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    loadResignations();
  }, [page, statusFilter, debouncedSearch]);

  const loadResignations = async () => {
    setLoading(true);
    try {
      const res = await resignationApi.getResignations({
        page,
        limit,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });

      const data = res.data;
      setResignations(data.resignations || []);
      if (data.totalPages !== undefined) setTotalPages(data.totalPages || 1);
      if (data.total !== undefined) setTotalCount(data.total);
    } catch {
      toast.error('Failed to load resignation records');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.reason.trim()) {
      toast.error('Please state the reason for your resignation');
      return;
    }
    setApplying(true);
    try {
      await resignationApi.apply(applyForm);
      toast.success('Resignation submitted for HR and Manager review');
      setShowApplyModal(false);
      setApplyForm({
        preferredLastWorkingDay: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        noticePeriodDays: 30,
        reason: '',
        comments: '',
      });
      loadResignations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit resignation');
    } finally {
      setApplying(false);
    }
  };

  const handleUpdateClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResignation) return;
    setReviewing(true);
    try {
      await resignationApi.updateStatus(selectedResignation.id, reviewForm);
      toast.success('Exit clearance updated successfully');
      setSelectedResignation(null);
      loadResignations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update clearance');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Resignation & Exit Clearance (Offboarding)"
        subtitle="Submit separation requests, track notice period progress, and complete departmental no-dues clearance"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setShowApplyModal(true)}
          >
            Apply for Resignation
          </Button>
        }
      />

      {/* Clearance Checklist Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card stat-total">
          <div className="stat-icon-wrap"><Laptop size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Hardware & Assets</span>
            <span className="stat-value">Handover</span>
          </div>
        </div>
        <div className="stat-card stat-present">
          <div className="stat-icon-wrap"><BookOpen size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Knowledge Transfer</span>
            <span className="stat-value">KT Signoff</span>
          </div>
        </div>
        <div className="stat-card stat-active">
          <div className="stat-icon-wrap"><DollarSign size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Finance & Accounts</span>
            <span className="stat-value">No-Dues</span>
          </div>
        </div>
        <div className="stat-card stat-absent">
          <div className="stat-icon-wrap"><FileCheck size={22} /></div>
          <div className="stat-info">
            <span className="stat-label">Experience Letter</span>
            <span className="stat-value">Relieving</span>
          </div>
        </div>
      </div>

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
              placeholder="Search by employee name or reason..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved / Serving Notice</option>
              <option value="Completed">Relieved / Completed</option>
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

      {/* Resignations Table */}
      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading resignation records...</p>
          </div>
        ) : resignations.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <LogOut size={44} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p>No separation applications on file.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Application Date</th>
                    <th>Preferred Last Day</th>
                    <th>Notice Days</th>
                    <th>Clearance Items</th>
                    <th>Status</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {resignations.map(r => {
                    const statusStr = r.status || 'Pending';
                    const allClear = r.clearance_assets_returned && r.clearance_no_dues && r.clearance_kt_done;

                    return (
                      <tr key={r.id}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>{r.user_name || 'Me'}</strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {r.emp_id} • {r.department}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {new Date(r.resignation_date || r.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {new Date(r.preferred_last_working_day).toLocaleDateString()}
                        </td>
                        <td>{r.notice_period_days} Days</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Badge variant={r.clearance_assets_returned ? 'green' : 'gray'}>Assets</Badge>
                            <Badge variant={r.clearance_kt_done ? 'green' : 'gray'}>KT</Badge>
                            <Badge variant={r.clearance_no_dues ? 'green' : 'gray'}>Finance</Badge>
                          </div>
                        </td>
                        <td>
                          <Badge
                            variant={statusStr === 'Completed' ? 'purple' : statusStr === 'Approved' ? 'green' : statusStr === 'Rejected' ? 'red' : 'amber'}
                            dot
                          >
                            {statusStr}
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedResignation(r);
                                setReviewForm({
                                  status: r.status || 'Approved',
                                  officialLastWorkingDay: r.official_last_working_day ? new Date(r.official_last_working_day).toISOString().split('T')[0] : '',
                                  clearanceAssetsReturned: !!r.clearance_assets_returned,
                                  clearanceNoDues: !!r.clearance_no_dues,
                                  clearanceKtDone: !!r.clearance_kt_done,
                                });
                              }}
                            >
                              Manage Clearance
                            </Button>
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
                  Showing {resignations.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} applications
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

      {/* Apply Resignation Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Submit Separation & Resignation Request"
        maxWidth="500px"
      >
        <form onSubmit={handleApply}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormInput
                label="Preferred Last Working Day"
                type="date"
                value={applyForm.preferredLastWorkingDay}
                onChange={e => setApplyForm(p => ({ ...p, preferredLastWorkingDay: e.target.value }))}
                required
              />
              <FormInput
                label="Contractual Notice (Days)"
                type="number"
                value={String(applyForm.noticePeriodDays)}
                onChange={e => setApplyForm(p => ({ ...p, noticePeriodDays: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="form-label">Primary Reason for Separation</label>
              <textarea
                className="form-input"
                rows={3}
                value={applyForm.reason}
                onChange={e => setApplyForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. Higher studies, career advancement, personal relocation"
                required
              />
            </div>
            <div>
              <label className="form-label">Transition / Handover Notes (Optional)</label>
              <textarea
                className="form-input"
                rows={2}
                value={applyForm.comments}
                onChange={e => setApplyForm(p => ({ ...p, comments: e.target.value }))}
                placeholder="Details of pending deliverables, KT documentation, or designated successor"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowApplyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={applying}>
              Submit Resignation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Clearance Modal (Admin / HR) */}
      {selectedResignation && (
        <Modal
          isOpen={!!selectedResignation}
          onClose={() => setSelectedResignation(null)}
          title={`Exit Clearance for ${selectedResignation.user_name || 'Employee'}`}
          maxWidth="480px"
        >
          <form onSubmit={handleUpdateClearance}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Select
                label="Separation Status"
                value={reviewForm.status}
                onChange={e => setReviewForm(p => ({ ...p, status: e.target.value }))}
                options={[
                  { value: 'Pending', label: 'Pending Review' },
                  { value: 'Approved', label: 'Approved (Serving Notice)' },
                  { value: 'Completed', label: 'Relieved (Exit Completed)' },
                  { value: 'Rejected', label: 'Rejected' },
                ]}
              />

              <FormInput
                label="Confirmed Official Last Working Day"
                type="date"
                value={reviewForm.officialLastWorkingDay}
                onChange={e => setReviewForm(p => ({ ...p, officialLastWorkingDay: e.target.value }))}
              />

              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', background: 'var(--surface-1)' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                  Department Clearance Checklist:
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reviewForm.clearanceAssetsReturned}
                    onChange={e => setReviewForm(p => ({ ...p, clearanceAssetsReturned: e.target.checked }))}
                  />
                  <span>IT Hardware, Laptop & Access Cards Returned</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reviewForm.clearanceKtDone}
                    onChange={e => setReviewForm(p => ({ ...p, clearanceKtDone: e.target.checked }))}
                  />
                  <span>Project Knowledge Transfer & Repository Handover Done</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reviewForm.clearanceNoDues}
                    onChange={e => setReviewForm(p => ({ ...p, clearanceNoDues: e.target.checked }))}
                  />
                  <span>Finance & Payroll No-Dues Cleared (Final Settlement)</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Button type="button" variant="secondary" onClick={() => setSelectedResignation(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={reviewing}>
                Save Clearance
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
