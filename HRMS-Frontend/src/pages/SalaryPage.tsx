import React, { useState, useEffect } from 'react';
import { payrollApi, userApi } from '../services/api.service';
import { PageHeader, Card, Button, FormInput, Select, Modal } from '../components/common';
import { DollarSign, Shield, FileText, CheckCircle2, Info, ArrowUpRight, ArrowDownRight, User, Calculator, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalaryPage() {
  const [salaryData, setSalaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewPeriod, setViewPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin salary assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ userId: '', annualCtc: '720000', structureId: '' });
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    loadSalary();
    if (admin) loadUsers();
  }, []);

  const loadSalary = async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getMySalary();
      setSalaryData(res.data);
    } catch {
      toast.error('Failed to load salary details');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await userApi.getUsers(1, 100);
      setUsersList(res.data.users || res.data || []);
    } catch {
      // ignore
    }
  };

  const handleAssignSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.userId || !assignForm.annualCtc) {
      toast.error('Please select an employee and enter Annual CTC');
      return;
    }
    setAssigning(true);
    try {
      await payrollApi.assignSalary({
        userId: assignForm.userId,
        annualCtc: parseFloat(assignForm.annualCtc),
      });
      toast.success('Salary structure assigned successfully');
      setShowAssignModal(false);
      loadSalary();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign salary');
    } finally {
      setAssigning(false);
    }
  };

  const b = salaryData?.breakdown;
  const multiplier = viewPeriod === 'annual' ? 12 : 1;

  const fmt = (val: number = 0) =>
    `₹ ${(val * multiplier).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="page-container">
      <PageHeader
        title="Salary Structure & Compensation"
        subtitle="Transparent, dynamic breakdown of your earnings, statutory contributions, and net take-home pay"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div
              style={{
                background: 'var(--surface-0)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '4px',
                display: 'flex',
                gap: '4px',
              }}
            >
              <button
                type="button"
                className={`btn-filter ${viewPeriod === 'monthly' ? 'active' : ''}`}
                onClick={() => setViewPeriod('monthly')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: viewPeriod === 'monthly' ? 'var(--primary)' : 'transparent',
                  color: viewPeriod === 'monthly' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`btn-filter ${viewPeriod === 'annual' ? 'active' : ''}`}
                onClick={() => setViewPeriod('annual')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: viewPeriod === 'annual' ? 'var(--primary)' : 'transparent',
                  color: viewPeriod === 'annual' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                Annual (CTC)
              </button>
            </div>
            {isAdmin && (
              <Button
                variant="primary"
                icon={<Calculator size={16} />}
                onClick={() => setShowAssignModal(true)}
              >
                Assign Compensation
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading real-time compensation breakdown...</p>
          </div>
        </Card>
      ) : !salaryData || !b ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <DollarSign size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No active salary structure assigned yet.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card stat-total">
              <div className="stat-icon-wrap">
                <DollarSign size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Annual Cost to Company (CTC)</span>
                <span className="stat-value">{fmt(b.monthlyGross)}</span>
              </div>
            </div>

            <div className="stat-card stat-active">
              <div className="stat-icon-wrap">
                <ArrowUpRight size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Gross Earnings ({viewPeriod})</span>
                <span className="stat-value">{fmt(b.earnings.grossEarnings)}</span>
              </div>
            </div>

            <div className="stat-card stat-absent">
              <div className="stat-icon-wrap">
                <ArrowDownRight size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Deductions ({viewPeriod})</span>
                <span className="stat-value">{fmt(b.deductions.totalDeductions)}</span>
              </div>
            </div>

            <div className="stat-card stat-present">
              <div className="stat-icon-wrap">
                <CheckCircle2 size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Net Take-Home Pay ({viewPeriod})</span>
                <span className="stat-value">{fmt(b.netSalary)}</span>
              </div>
            </div>
          </div>

          {/* Dual Column: Earnings vs Deductions Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Earnings Card */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#22c55e' }}>●</span> Earnings Components
                </h3>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#22c55e' }}>
                  {fmt(b.earnings.grossEarnings)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { name: 'Basic Salary', val: b.earnings.basic, formula: b.formulas.basic },
                  { name: 'House Rent Allowance (HRA)', val: b.earnings.hra, formula: b.formulas.hra },
                  { name: 'Dearness Allowance (DA)', val: b.earnings.da, formula: b.formulas.da },
                  { name: 'Conveyance Allowance', val: b.earnings.conveyance, formula: b.formulas.conveyance },
                  { name: 'Medical Allowance', val: b.earnings.medical, formula: b.formulas.medical },
                  { name: 'Special Allowance', val: b.earnings.specialAllowance, formula: b.formulas.specialAllowance },
                ].map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(86, 124, 141, 0.06)',
                      border: '1px solid rgba(86, 124, 141, 0.12)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{item.formula}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {fmt(item.val)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Deductions Card */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#ef4444' }}>●</span> Statutory & Other Deductions
                </h3>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>
                  {fmt(b.deductions.totalDeductions)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { name: 'Provident Fund (Employee EPF)', val: b.deductions.pfEmployee, formula: b.formulas.pfEmployee },
                  { name: 'Employee State Insurance (ESI)', val: b.deductions.esiEmployee, formula: b.formulas.esiEmployee },
                  { name: 'Professional Tax (PT)', val: b.deductions.professionalTax, formula: b.formulas.professionalTax },
                  { name: 'Tax Deducted at Source (TDS)', val: b.deductions.tdsTax, formula: b.formulas.tdsTax },
                ].map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.12)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{item.formula}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ef4444' }}>
                      {fmt(item.val)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Employer Contributions Info Box */}
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'rgba(47, 65, 86, 0.08)',
                  border: '1px solid rgba(47, 65, 86, 0.15)',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={14} /> Employer Contributions (Included in CTC):
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Employer PF (12% of Basic):</span>
                  <strong>{fmt(b.deductions.pfEmployer)}</strong>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Employer ESI (3.25%):</span>
                  <strong>{fmt(b.deductions.esiEmployer)}</strong>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Admin Compensation Assignment Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Employee Compensation"
        maxWidth="500px"
      >
        <form onSubmit={handleAssignSalary}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Select
              label="Select Employee"
              value={assignForm.userId}
              onChange={e => setAssignForm(p => ({ ...p, userId: e.target.value }))}
              options={[
                { value: '', label: '-- Select Employee --' },
                ...usersList.map(u => ({ value: u.id, label: `${u.user_name} (${u.emp_id}) - ${u.department || 'General'}` }))
              ]}
              required
            />
            <FormInput
              label="Annual Cost to Company (CTC in ₹)"
              type="number"
              value={assignForm.annualCtc}
              onChange={e => setAssignForm(p => ({ ...p, annualCtc: e.target.value }))}
              placeholder="e.g. 720000"
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={assigning}>
              Save Structure
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
