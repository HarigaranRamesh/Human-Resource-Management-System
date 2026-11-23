import React, { useState, useEffect } from 'react';
import { payrollApi } from '../services/api.service';
import { PageHeader, Card, Button, Badge, ActionIconButton, Modal } from '../components/common';
import { Download, Eye, Calendar, DollarSign, Play, CheckCircle2, AlertCircle, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  // Admin Payroll Run Modal
  const [showRunModal, setShowRunModal] = useState(false);
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [running, setRunning] = useState(false);

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = localStorage.getItem('isSystemAdmin') === 'true' || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    loadPayslips();
  }, []);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getMyPayslips();
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) {
        // If no past runs yet, generate on-the-fly current preview so employee can test download immediately
        const curMonth = new Date().getMonth() + 1;
        const curYear = new Date().getFullYear();
        const previewRes = await payrollApi.getPayslipDetail(localStorage.getItem('userId') || '', curMonth, curYear);
        if (previewRes.data) {
          setPayslips([previewRes.data]);
        }
      } else {
        setPayslips(list);
      }
    } catch {
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (slip: any) => {
    const uid = slip.user_id || localStorage.getItem('userId');
    const token = localStorage.getItem('authToken');
    const url = `/api/payroll/download-pdf?userId=${uid}&month=${slip.month}&year=${slip.year}`;

    // Fetch as blob with Authorization header to ensure authenticated download
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Payslip_${slip.user_name || 'Employee'}_${monthNames[slip.month]}_${slip.year}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(`Payslip for ${monthNames[slip.month]} ${slip.year} downloaded`);
      })
      .catch(() => toast.error('Failed to download payslip PDF'));
  };

  const handleExecuteRun = async () => {
    setRunning(true);
    try {
      await payrollApi.executeRun(runMonth, runYear);
      toast.success(`Payroll run for ${monthNames[runMonth]} ${runYear} completed successfully!`);
      setShowRunModal(false);
      loadPayslips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payroll run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Payslip Management & History"
        subtitle="View, inspect, and download monthly official salary statements with itemized tax and deduction breakdowns"
        actions={
          isAdmin && (
            <Button
              variant="primary"
              icon={<Play size={16} />}
              onClick={() => setShowRunModal(true)}
            >
              Run Monthly Payroll
            </Button>
          )
        }
      />

      <Card>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading payslip records...</p>
          </div>
        ) : payslips.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No payslips generated for your profile yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Days Worked</th>
                  <th>Loss of Pay (LOP)</th>
                  <th>Gross Earnings</th>
                  <th>Total Deductions</th>
                  <th>Net Take-Home</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((slip) => (
                  <tr key={`${slip.user_id}-${slip.month}-${slip.year}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(86, 124, 141, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)',
                          }}
                        >
                          <Calendar size={16} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {monthNames[slip.month]} {slip.year}
                          </span>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {slip.emp_id || 'Employee'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{slip.days_worked || 30}</strong> / {slip.days_in_month || 30}
                    </td>
                    <td>
                      {parseFloat(slip.lop_days || 0) > 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>{slip.lop_days} Day(s)</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>0</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹ {parseFloat(slip.gross_earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>
                      ₹ {parseFloat(slip.total_deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.98rem' }}>
                        ₹ {parseFloat(slip.net_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <Badge variant={slip.status === 'Finalized' ? 'success' : 'warning'}>
                        {slip.status || 'Finalized'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => setSelectedSlip(slip)}
                        >
                          View
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Download size={14} />}
                          onClick={() => handleDownloadPdf(slip)}
                        >
                          Download PDF
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

      {/* Detailed Payslip Statement Modal */}
      {selectedSlip && (
        <Modal
          isOpen={!!selectedSlip}
          onClose={() => setSelectedSlip(null)}
          title={`Salary Statement: ${monthNames[selectedSlip.month]} ${selectedSlip.year}`}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(47, 65, 86, 0.08)',
                border: '1px solid rgba(47, 65, 86, 0.15)',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{selectedSlip.user_name}</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedSlip.emp_id} • {selectedSlip.department || 'General'} • {selectedSlip.position}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Net Take-Home Pay</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#22c55e' }}>
                  ₹ {parseFloat(selectedSlip.net_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Attendance & Days Summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                textAlign: 'center',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'var(--surface-0)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Days in Month</span>
                <div style={{ fontWeight: 700 }}>{selectedSlip.days_in_month || 30}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Days Worked</span>
                <div style={{ fontWeight: 700, color: '#22c55e' }}>{selectedSlip.days_worked || 30}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Loss of Pay (LOP)</span>
                <div style={{ fontWeight: 700, color: selectedSlip.lop_days > 0 ? '#ef4444' : 'inherit' }}>
                  {selectedSlip.lop_days || 0}
                </div>
              </div>
            </div>

            {/* Dual Grid: Earnings vs Deductions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Earnings */}
              <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#16a34a', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Earnings</span>
                  <span>Amount</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Basic Salary</span>
                    <strong>₹ {parseFloat(selectedSlip.basic || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>HRA</span>
                    <strong>₹ {parseFloat(selectedSlip.hra || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  {parseFloat(selectedSlip.da || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>DA</span>
                      <strong>₹ {parseFloat(selectedSlip.da).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Conveyance</span>
                    <strong>₹ {parseFloat(selectedSlip.conveyance || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Medical</span>
                    <strong>₹ {parseFloat(selectedSlip.medical || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Special Allowance</span>
                    <strong>₹ {parseFloat(selectedSlip.special_allowance || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Gross Earnings</span>
                    <span>₹ {parseFloat(selectedSlip.gross_earnings || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#dc2626', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Deductions</span>
                  <span>Amount</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Employee PF (EPF)</span>
                    <strong>₹ {parseFloat(selectedSlip.pf_employee || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  {parseFloat(selectedSlip.esi_employee || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>ESI</span>
                      <strong>₹ {parseFloat(selectedSlip.esi_employee).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Professional Tax (PT)</span>
                    <strong>₹ {parseFloat(selectedSlip.professional_tax || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  {parseFloat(selectedSlip.tds_tax || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Income Tax (TDS)</span>
                      <strong>₹ {parseFloat(selectedSlip.tds_tax).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total Deductions</span>
                    <span style={{ color: '#ef4444' }}>₹ {parseFloat(selectedSlip.total_deductions || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setSelectedSlip(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={<Download size={15} />}
                onClick={() => handleDownloadPdf(selectedSlip)}
              >
                Download Official PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Payroll Processing Wizard Modal */}
      <Modal
        isOpen={showRunModal}
        onClose={() => setShowRunModal(false)}
        title="Execute Monthly Payroll Run"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
            This will calculate statutory PF, ESI, Professional Tax, attendance LOP, and generate official payslips for all active employees.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Month</label>
              <select
                className="form-input"
                value={runMonth}
                onChange={e => setRunMonth(parseInt(e.target.value, 10))}
              >
                {monthNames.slice(1).map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Year</label>
              <select
                className="form-input"
                value={runYear}
                onChange={e => setRunYear(parseInt(e.target.value, 10))}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setShowRunModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={<Play size={15} />} loading={running} onClick={handleExecuteRun}>
              Start Payroll Run
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
