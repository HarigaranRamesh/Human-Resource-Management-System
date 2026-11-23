import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserMinus, CheckSquare, AlertCircle, Key, Loader2, Eye, EyeOff, TrendingUp, DollarSign, Clock, Calendar, ArrowUpRight, ArrowDownRight, Building, Award, Shield } from 'lucide-react';
// @ts-ignore
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';
import toast from 'react-hot-toast';
import { dashboardApi, attendanceApi, userApi } from '../services/api.service';
import { isSystemAdmin } from '../lib/auth';
import EmployeeProfile from '../components/EmployeeProfile';
import { Modal, Button } from '../components/common';
import { useNavigate } from 'react-router-dom';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

export default function DashboardPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin stats
  const [stats, setStats] = useState<any>({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    departmentDistribution: [],
    attendanceTrends: [],
    payrollSummary: { totalAnnualCtc: 0, avgAnnualCtc: 0, monthlyBurn: 0 },
  });
  const [roleCounts, setRoleCounts] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Attendance Clock-in/out
  const [checkStatus, setCheckStatus] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Change password
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase();
    const admin = isSystemAdmin() || role.includes('admin') || role.includes('hr');
    setIsAdmin(admin);
    if (admin) {
      loadAdminStats();
    }
    checkAttendance();
  }, []);

  const loadAdminStats = async () => {
    setStatsLoading(true);
    try {
      const [statsRes, roleRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRoleCounts(),
      ]);
      setStats(statsRes.data);
      setRoleCounts(roleRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const checkAttendance = async () => {
    try {
      const res = await attendanceApi.check();
      setCheckStatus(!!res.data?.message);
    } catch {
      // ignore
    }
  };

  const handleAttendance = (action: 'login' | 'logout') => {
    if (attendanceLoading) return;
    setAttendanceLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const payload = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try {
          if (action === 'login') {
            await attendanceApi.login(payload);
            setCheckStatus(true);
            toast.success('Clock-in successful');
          } else {
            await attendanceApi.logout(payload);
            setCheckStatus(false);
            toast.success('Clock-out successful');
          }
          if (isAdmin) loadAdminStats();
        } catch {
          toast.error(`Clock-${action === 'login' ? 'in' : 'out'} failed`);
        } finally {
          setAttendanceLoading(false);
        }
      },
      () => {
        toast.error('Please enable location access');
        setAttendanceLoading(false);
      }
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPwd !== pwdForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (pwdForm.newPwd.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPwd(true);
    try {
      await userApi.changePassword(pwdForm.current, pwdForm.newPwd);
      toast.success('Password changed successfully');
      setShowChangePwd(false);
      setPwdForm({ current: '', newPwd: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPwd(false);
    }
  };

  // Status doughnut chart
  const doughnutData = {
    labels: ['Present Today', 'On Leave', 'Absent'],
    datasets: [{
      data: [
        stats.presentToday || 0,
        stats.onLeaveToday || 0,
        Math.max(0, (stats.activeEmployees || 0) - (stats.presentToday || 0) - (stats.onLeaveToday || 0)),
      ],
      backgroundColor: ['#22c55e', '#567C8D', '#ef4444'],
      hoverBackgroundColor: ['#4ade80', '#6d99ab', '#f87171'],
      borderWidth: 0,
    }],
  };

  // Department distribution bar data
  const deptData = {
    labels: (stats.departmentDistribution || []).map((d: any) => d.name),
    datasets: [{
      label: 'Headcount',
      data: (stats.departmentDistribution || []).map((d: any) => d.count),
      backgroundColor: '#567C8D',
      hoverBackgroundColor: '#2F4156',
      borderRadius: 8,
      borderSkipped: false as const,
      barThickness: 28,
    }],
  };

  // 7-Day Attendance trend bar data
  const trendData = {
    labels: (stats.attendanceTrends || []).map((t: any) => t.date),
    datasets: [
      {
        label: 'Present',
        data: (stats.attendanceTrends || []).map((t: any) => t.present),
        backgroundColor: '#22c55e',
        borderRadius: 6,
      },
      {
        label: 'Absent',
        data: (stats.attendanceTrends || []).map((t: any) => t.absent),
        backgroundColor: '#ef4444',
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
      y: { min: 0, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(200, 217, 230, 0.2)', borderDash: [4, 4] } },
    },
  };

  const attendanceRate = stats.activeEmployees > 0
    ? Math.round((stats.presentToday / stats.activeEmployees) * 100)
    : 0;

  const statCards = [
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'stat-total', meta: '+100 Active Roster' },
    { label: 'Present Today', value: stats.presentToday, icon: CheckSquare, color: 'stat-present', meta: `${attendanceRate}% Attendance Rate` },
    { label: 'Absent Today', value: stats.absentToday, icon: AlertCircle, color: 'stat-absent', meta: 'Unmarked / Absent' },
    { label: 'On Leave Today', value: stats.onLeaveToday || 0, icon: Clock, color: 'stat-active', meta: 'Approved Time-off' },
    { label: 'Monthly Payroll Burn', value: `₹ ${Math.round((stats.payrollSummary?.monthlyBurn || 0) / 100000)}L`, icon: DollarSign, color: 'stat-inactive', meta: 'Calculated Monthly' },
  ];

  return (
    <div className="dashboard-page">
      {isAdmin ? (
        <>
          {/* Executive Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h1 className="dashboard-title">Executive Operations & Workforce Intelligence</h1>
              <p className="dashboard-subtitle">Enterprise analytics, statutory headcount distribution, and payroll metrics</p>
            </div>

            {/* Quick Live Clock In/Out */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: checkStatus ? '#22c55e' : 'var(--text-secondary)',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: checkStatus ? '#22c55e' : '#ef4444' }} />
                {checkStatus ? 'Currently Clocked In' : 'Not Clocked In'}
              </div>
              <Button
                variant={checkStatus ? 'secondary' : 'primary'}
                loading={attendanceLoading}
                onClick={() => handleAttendance(checkStatus ? 'logout' : 'login')}
              >
                {checkStatus ? 'Clock Out' : 'Clock In Now'}
              </Button>
            </div>
          </div>

          {/* Pro Stats 5-Card Row */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            {statCards.map(({ label, value, icon: Icon, color, meta }) => (
              <div key={label} className={`stat-card ${color}`}>
                <div className="stat-icon-wrap">
                  <Icon size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">{label}</span>
                  <span className="stat-value">
                    {statsLoading ? <Loader2 size={20} className="spin" /> : value}
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                    {meta}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Hub Launchpad */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            {[
              { label: 'Org Chart (Hierarchy)', icon: Building, path: '/home/org-chart', color: '#2F4156' },
              { label: 'Payroll & Salaries', icon: DollarSign, path: '/home/salary', color: '#567C8D' },
              { label: 'Download Payslips', icon: Award, path: '/home/payslip', color: '#2F4156' },
              { label: 'Leave Approvals', icon: Clock, path: '/home/leaveapproval', color: '#567C8D' },
              { label: 'Document Vault', icon: Shield, path: '/home/documents', color: '#2F4156' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                style={{
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `${item.color}15`,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <item.icon size={18} />
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Pro Visual Charts Grid */}
          <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
            {/* Status Doughnut */}
            <div className="chart-card">
              <h3 className="chart-title">
                <span className="chart-title-icon">📊</span>
                Today's Workforce Presence
              </h3>
              <div className="chart-container" style={{ position: 'relative' }}>
                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>

            {/* Department Headcount Bar */}
            <div className="chart-card chart-card-wide">
              <h3 className="chart-title">
                <span className="chart-title-icon">🏢</span>
                Headcount by Department
              </h3>
              <div className="chart-container">
                <Bar data={deptData} options={chartOptions} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <EmployeeProfile />
      )}

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePwd}
        onClose={() => setShowChangePwd(false)}
        title={<><Key size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Change Password</>}
        maxWidth="440px"
      >
        <form onSubmit={handleChangePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(['current', 'newPwd', 'confirm'] as const).map((field) => (
              <div key={field} className="form-field">
                <label className="form-label">
                  {field === 'current' ? 'Current Password' : field === 'newPwd' ? 'New Password' : 'Confirm Password'}
                </label>
                <div className="input-with-eye">
                  <input
                    type={showPwd[field === 'current' ? 'current' : field === 'newPwd' ? 'new' : 'confirm'] ? 'text' : 'password'}
                    className="form-input"
                    value={pwdForm[field]}
                    onChange={e => setPwdForm(prev => ({ ...prev, [field]: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPwd(prev => ({
                      ...prev,
                      [field === 'current' ? 'current' : field === 'newPwd' ? 'new' : 'confirm']:
                        !prev[field === 'current' ? 'current' : field === 'newPwd' ? 'new' : 'confirm']
                    }))}
                  >
                    {showPwd[field === 'current' ? 'current' : field === 'newPwd' ? 'new' : 'confirm']
                      ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setShowChangePwd(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingPwd}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
