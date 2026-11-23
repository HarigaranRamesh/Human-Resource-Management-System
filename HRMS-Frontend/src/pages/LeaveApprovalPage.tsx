import React, { useState, useEffect } from 'react';
import { leaveApplicationApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, Modal } from '../components/common';
import { Check, X, Calendar, User, Clock, CheckCircle2, XCircle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeaveApprovalPage() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('All');
  const [actionItem, setActionItem] = useState<{ id: string; action: 'approve' | 'reject'; name: string } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPending();
  }, [selectedDept]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await leaveApplicationApi.getPending(selectedDept === 'All' ? undefined : selectedDept);
      setPendingRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load pending leave requests');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="page-container">
      <PageHeader
        title="Leave Approvals Inbox"
        subtitle="Review, approve, or reject pending team member leave applications"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
            <select
              className="form-input"
              style={{ width: '180px', padding: '6px 12px' }}
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Sales & Business">Sales & Business</option>
              <option value="Product & Design">Product & Design</option>
            </select>
          </div>
        }
      />

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading pending applications...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={48} style={{ color: '#22c55e', opacity: 0.8, margin: '0 auto 1rem', display: 'block' }} />
            <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>Inbox Zero!</h4>
            <p style={{ margin: 0 }}>All team leave applications have been reviewed.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Total Days</th>
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
                            background: 'linear-gradient(135deg, #2F4156, #567C8D)',
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
