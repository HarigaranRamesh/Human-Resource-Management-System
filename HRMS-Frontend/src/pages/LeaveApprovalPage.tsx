import React, { useState, useEffect } from 'react';
import { leaveApplicationApi } from '../services/api.service';
import { PageHeader, Card, Button, Modal, SearchIcon } from '../components/common';
import { Check, X, CheckCircle2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useDebounce } from '../lib/useDebounce';
import toast from 'react-hot-toast';

export default function LeaveApprovalPage() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('All');
  const [actionItem, setActionItem] = useState<{ id: string; action: 'approve' | 'reject'; name: string } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination, search, sort
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 10;

  useEffect(() => {
    loadPending();
  }, [page, selectedDept, debouncedSearch, sortBy, sortOrder]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await leaveApplicationApi.getPending({
        page,
        limit,
        department: selectedDept === 'All' ? undefined : selectedDept,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      });

      const data = res.data;
      if (Array.isArray(data)) {
        setPendingRequests(data);
        setTotalRequests(data.length);
        setTotalPages(1);
      } else {
        setPendingRequests(data.requests || []);
        if (data.totalPages !== undefined) setTotalPages(data.totalPages || 1);
        if (data.total !== undefined) setTotalRequests(data.total);
      }
    } catch {
      toast.error('Failed to load pending leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown size={13} style={{ opacity: 0.35, marginLeft: '4px', verticalAlign: 'middle' }} />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp size={14} style={{ color: 'var(--primary)', marginLeft: '4px', verticalAlign: 'middle' }} />
    ) : (
      <ChevronDown size={14} style={{ color: 'var(--primary)', marginLeft: '4px', verticalAlign: 'middle' }} />
    );
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedDept('All');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const handleDecision = async () => {
    if (!actionItem) return;
    setSubmitting(true);
    try {
      if (actionItem.action === 'approve') {
        await leaveApplicationApi.approve(actionItem.id, decisionReason || 'Approved by Manager');
        toast.success(`Leave request for ${actionItem.name} approved`);
      } else {
        await leaveApplicationApi.reject(actionItem.id, decisionReason || 'Rejected by Manager');
        toast.success(`Leave request for ${actionItem.name} rejected`);
      }
      setActionItem(null);
      setDecisionReason('');
      loadPending();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters = Boolean(search || (selectedDept && selectedDept !== 'All'));

  return (
    <div className="page-container">
      <PageHeader
        title="Leave Approvals Inbox"
        subtitle={totalRequests > 0 ? `Review, approve, or reject pending team member leave applications (${totalRequests} pending)` : "Review, approve, or reject pending team member leave applications"}
      />

      {/* Filter and Debounced Search Toolbar */}
      <Card style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Input with Debounce */}
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
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Department Filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              className="form-input"
              value={selectedDept}
              onChange={e => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Sales & Business">Sales & Business</option>
              <option value="Product & Design">Product & Design</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading pending applications...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={48} style={{ color: '#22c55e', opacity: 0.8, margin: '0 auto 1rem', display: 'block' }} />
            <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>Inbox Zero!</h4>
            <p style={{ margin: 0 }}>
              {hasActiveFilters ? 'No pending requests match the filter criteria.' : 'All team leave applications have been reviewed.'}
            </p>
            {hasActiveFilters && (
              <div style={{ marginTop: '0.75rem' }}>
                <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('user_name')}
                    >
                      Employee {renderSortIndicator('user_name')}
                    </th>
                    <th>Leave Type</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('from_date')}
                    >
                      Duration {renderSortIndicator('from_date')}
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('total_days')}
                    >
                      Total Days {renderSortIndicator('total_days')}
                    </th>
                    <th>Reason</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#2F4156',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              overflow: 'hidden',
                            }}
                          >
                            {req.profile_image ? (
                              <img src={req.profile_image} alt={req.user_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (req.user_name || 'U').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{req.user_name}</strong>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {req.emp_id} • {req.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{req.leave_type}</span>
                        {req.is_half_day && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>Half Day ({req.half_day_period})</div>
                        )}
                      </td>
                      <td>
                        {new Date(req.from_date).toLocaleDateString()} to {new Date(req.to_date).toLocaleDateString()}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{req.total_days} Day(s)</span>
                      </td>
                      <td style={{ maxWidth: '240px', wordBreak: 'break-word' }}>
                        {req.reason}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<X size={14} />}
                            style={{ color: '#ef4444' }}
                            onClick={() => {
                              setActionItem({ id: req.id, action: 'reject', name: req.user_name });
                              setDecisionReason('');
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Check size={14} />}
                            style={{ background: '#22c55e', borderColor: '#22c55e' }}
                            onClick={() => {
                              setActionItem({ id: req.id, action: 'approve', name: req.user_name });
                              setDecisionReason('Approved');
                            }}
                          >
                            Approve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <span className="page-info" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Showing {pendingRequests.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalRequests)} of {totalRequests} pending requests
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ‹ Prev
                  </Button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 8px' }}>
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next ›
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Decision Confirmation Modal */}
      {actionItem && (
        <Modal
          isOpen={!!actionItem}
          onClose={() => setActionItem(null)}
          title={`${actionItem.action === 'approve' ? 'Approve' : 'Reject'} Leave for ${actionItem.name}`}
          maxWidth="460px"
        >
          <div>
            <label className="form-label">Reviewer Comments / Remarks</label>
            <textarea
              className="form-input"
              rows={3}
              value={decisionReason}
              onChange={e => setDecisionReason(e.target.value)}
              placeholder={actionItem.action === 'approve' ? 'e.g. Approved, enjoy your leave!' : 'e.g. Critical project deadline, please reschedule.'}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Button variant="secondary" onClick={() => setActionItem(null)}>
                Cancel
              </Button>
              <Button
                variant={actionItem.action === 'approve' ? 'primary' : 'danger'}
                loading={submitting}
                onClick={handleDecision}
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
