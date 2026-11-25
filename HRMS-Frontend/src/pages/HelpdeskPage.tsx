import React, { useState, useEffect } from 'react';
import { helpdeskApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, Modal, FormInput, Select, SearchIcon } from '../components/common';
import { LifeBuoy, Plus, CheckCircle2, Clock, AlertTriangle, MessageSquare, Filter, Check } from 'lucide-react';
import { useDebounce } from '../lib/useDebounce';
import toast from 'react-hot-toast';

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  // New Ticket Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: 'Payroll',
    priority: 'Medium',
  });

  // Ticket Detail / Resolution Modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    loadTickets();
  }, [page, categoryFilter, statusFilter, debouncedSearch]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await helpdeskApi.getTickets({
        page,
        limit,
        type: categoryFilter || undefined,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });

      const data = res.data;
      const list = Array.isArray(data) ? data : data.tasks || data.tickets || [];
      if (list.length === 0 && !search && !categoryFilter && !statusFilter) {
        // Sample starter tickets if brand new install
        const sampleTickets = [
          {
            id: 'TICK-101',
            title: 'HRA Proofs verification for Tax Calculation',
            type: 'Payroll',
            priority: 'High',
            status: 'In Progress',
            created_at: new Date().toISOString(),
            description: 'Submitted rent receipts for FY26-27. Need updated TDS deduction in upcoming payroll run.',
            user_name: 'Harigaran',
          },
          {
            id: 'TICK-102',
            title: 'Request second monitor for workstation setup',
            type: 'Support',
            priority: 'Medium',
            status: 'Pending',
            created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            description: 'Require Dell 27-inch 4K monitor for UI layout and responsive verification.',
            user_name: 'Harigaran',
          },
        ];
        setTickets(sampleTickets);
        setTotalCount(2);
        setTotalPages(1);
      } else {
        setTickets(list);
        if (data.totalPages !== undefined) setTotalPages(data.totalPages || 1);
        if (data.total !== undefined) setTotalCount(data.total);
      }
    } catch {
      toast.error('Failed to load helpdesk tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
      toast.error('Please enter a ticket title and description');
      return;
    }
    setSaving(true);
    try {
      await helpdeskApi.createTicket({
        title: ticketForm.title,
        description: ticketForm.description,
        type: ticketForm.category,
        priority: ticketForm.priority,
        dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      });

      toast.success('Helpdesk ticket raised successfully');
      setShowCreateModal(false);
      setTicketForm({
        title: '',
        description: '',
        category: 'Payroll',
        priority: 'Medium',
      });
      loadTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to raise ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setUpdating(true);
    try {
      await helpdeskApi.updateTicket(ticketId, { status: newStatus });
      toast.success(`Ticket marked as ${newStatus}`);
      setSelectedTicket(null);
      loadTickets();
    } catch {
      toast.error('Failed to update ticket status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="HR Helpdesk & Service Requests"
        subtitle="Submit queries, track resolution SLAs for Payroll, IT support, and employee grievances"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            Raise New Ticket
          </Button>
        }
      />

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
              placeholder="Search tickets by subject, category, or ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-input"
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              <option value="Payroll">Payroll & Salary</option>
              <option value="Support">IT & Hardware</option>
              <option value="HR">HR Policies & Benefits</option>
              <option value="Documentation">Documents</option>
              <option value="Other">General Queries</option>
            </select>
          </div>

          <div style={{ minWidth: '140px' }}>
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Open / Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Resolved</option>
            </select>
          </div>

          {(search || categoryFilter || statusFilter) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setPage(1); }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Tickets Table */}
      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading helpdesk tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <LifeBuoy size={44} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
            <p>No tickets matching query.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Raised On</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t, idx) => {
                    const statusStr = t.status || 'Pending';
                    const priorityStr = t.priority || 'Medium';

                    return (
                      <tr key={t.id || idx}>
                        <td>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setSelectedTicket(t)}>
                              {t.title}
                            </strong>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {t.description?.slice(0, 80)}{t.description?.length > 80 ? '...' : ''}
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge variant="blue">{t.type || 'General'}</Badge>
                        </td>
                        <td>
                          <Badge variant={priorityStr === 'Critical' || priorityStr === 'High' ? 'red' : priorityStr === 'Medium' ? 'amber' : 'green'}>
                            {priorityStr}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={statusStr === 'Completed' || statusStr === 'Resolved' ? 'green' : statusStr === 'In Progress' ? 'blue' : 'amber'} dot>
                            {statusStr}
                          </Badge>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {new Date(t.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedTicket(t)}
                          >
                            View Details
                          </Button>
                        </td>
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
                  Showing {tickets.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} tickets
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

      {/* Raise Ticket Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Raise Helpdesk Support Ticket"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateTicket}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormInput
              label="Subject / Summary"
              value={ticketForm.title}
              onChange={e => setTicketForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Discrepancy in HRA Tax calculation on payslip"
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Select
                label="Category"
                value={ticketForm.category}
                onChange={e => setTicketForm(p => ({ ...p, category: e.target.value }))}
                options={[
                  { value: 'Payroll', label: 'Payroll & Salary' },
                  { value: 'Support', label: 'IT & Hardware' },
                  { value: 'HR', label: 'HR Policies & Benefits' },
                  { value: 'Documentation', label: 'Documents & Letters' },
                  { value: 'Other', label: 'General Inquiries' },
                ]}
              />
              <Select
                label="Urgency / Priority"
                value={ticketForm.priority}
                onChange={e => setTicketForm(p => ({ ...p, priority: e.target.value }))}
                options={[
                  { value: 'Low', label: 'Low (Within 5 days)' },
                  { value: 'Medium', label: 'Medium (Within 2 days)' },
                  { value: 'High', label: 'High (Within 24 hours)' },
                  { value: 'Critical', label: 'Critical (Blocker)' },
                ]}
              />
            </div>
            <div>
              <label className="form-label">Detailed Description</label>
              <textarea
                className="form-input"
                rows={4}
                value={ticketForm.description}
                onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Provide specific details, employee ID, dates, and background context..."
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Details & Resolution Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket #${selectedTicket.id?.slice(0, 8)}: ${selectedTicket.title}`}
          maxWidth="520px"
        >
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              <Badge variant="blue">{selectedTicket.type || 'General'}</Badge>
              <Badge variant="amber">{selectedTicket.priority || 'Medium'} Priority</Badge>
              <Badge variant={selectedTicket.status === 'Completed' ? 'green' : 'amber'} dot>
                {selectedTicket.status || 'Pending'}
              </Badge>
            </div>
            <div style={{ padding: '1rem', background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {selectedTicket.description}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Created: {new Date(selectedTicket.created_at || Date.now()).toLocaleString()}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedTicket.status !== 'Completed' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Check size={14} />}
                    style={{ background: '#22c55e', borderColor: '#22c55e' }}
                    loading={updating}
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'Completed')}
                  >
                    Mark as Resolved
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setSelectedTicket(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
