import React, { useState, useEffect } from 'react';
import { userApi, leaveApplicationApi, attendanceApi } from '../services/api.service';
import { Loader2, User, Camera, Calendar, DollarSign, Download, Shield, FileText, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const id = localStorage.getItem('userId');

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const curMonth = new Date().getMonth() + 1;
      const curYear = new Date().getFullYear();

      const [profileRes, leaveRes, attRes] = await Promise.all([
        userApi.getUserById(id!),
        leaveApplicationApi.getBalance().catch(() => ({ data: [] })),
        attendanceApi.getMonthlyReport({ userId: id, month: curMonth, year: curYear }).catch(() => ({ data: [] })),
      ]);
      setProfile(profileRes.data);
      setLeaveBalances(Array.isArray(leaveRes.data) ? leaveRes.data : []);
      setAttendanceRecords(Array.isArray(attRes.data) ? attRes.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append('photo', file);
    if (id) fd.append('userId', id);

    setUploadingPhoto(true);
    try {
      const res = await userApi.uploadProfilePhoto(fd);
      setProfile((prev: any) => ({ ...prev, profile_image: res.data.profileImage }));
      toast.success('Profile photo updated successfully!');
    } catch {
      toast.error('Failed to update photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading" style={{ padding: '4rem', textAlign: 'center' }}>
        <Loader2 size={36} className="spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!profile) return null;

  const totalLeavesAvailable = leaveBalances.reduce((acc, b) => acc + (b.available || 0), 0) || 12;
  const presentDays = attendanceRecords.filter(r => r.attendance_type === 'Present').length;
  const absentDays = attendanceRecords.filter(r => r.attendance_type === 'Absent').length;

  return (
    <div className="employee-profile">
      {/* Profile Header */}
      <div className="profile-header-card" style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <div className="profile-avatar-lg" style={{ overflow: 'hidden' }}>
            {profile.profile_image ? (
              <img src={profile.profile_image} alt={profile.user_name} className="profile-img" />
            ) : (
              <User size={48} />
            )}
          </div>
          <label
            htmlFor="profile-camera"
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
              border: '2px solid #FFFFFF',
            }}
            title="Upload profile photo"
          >
            <Camera size={15} />
            <input
              id="profile-camera"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        <div className="profile-info">
          <h2 className="profile-name">{profile.user_name || '—'}</h2>
          <p className="profile-role">{profile.position || profile.role_name || profile.role?.role || 'Staff'}</p>
          <p className="profile-email">{profile.email || '—'}</p>
          <p className="profile-dept">{profile.department || 'General'}</p>
          {uploadingPhoto && <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>Uploading photo...</span>}
        </div>
      </div>

      {/* Quick Launchpad Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          margin: '1.25rem 0',
        }}
      >
        <button
          onClick={() => navigate('/home/salary')}
          style={{
            background: 'var(--surface-0)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <DollarSign size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Salary Structure</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>View full breakdown</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/home/payslip')}
          style={{
            background: 'var(--surface-0)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Download size={20} style={{ color: '#22c55e' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Download Payslip</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Official monthly PDF</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/home/documents')}
          style={{
            background: 'var(--surface-0)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Shield size={20} style={{ color: '#567C8D' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Document Vault</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Upload certificates & IDs</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/home/org-chart')}
          style={{
            background: 'var(--surface-0)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <User size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Org Chart</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Reporting hierarchy tree</div>
          </div>
        </button>
      </div>

      {/* Stats tiles */}
      <div className="profile-tiles-grid">
        {[
          { label: 'Available Leaves', value: `${totalLeavesAvailable} Days`, color: 'tile-green' },
          { label: 'Present Days (This Month)', value: `${presentDays} Days`, color: 'tile-blue' },
          { label: 'Absent Days', value: `${absentDays} Days`, color: 'tile-red' },
          { label: 'Assigned Shift', value: profile.shift?.name || 'General Shift', color: 'tile-orange' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`profile-tile ${color}`}>
            <span className="tile-label">{label}</span>
            <span className="tile-value">{value}</span>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="profile-details-card">
        <h3 className="profile-section-title">Employment Information</h3>
        <div className="profile-details-grid">
          {[
            { label: 'Mobile', value: profile.mobile_no || profile.mobileNo },
            { label: 'Employee ID', value: profile.emp_id || profile.employeeId },
            { label: 'Joining Date', value: profile.doj ? new Date(profile.doj).toLocaleDateString() : '—' },
            { label: 'Department', value: profile.department },
            { label: 'Shift Timing', value: profile.shift?.name ? `${profile.shift.name} (${profile.shift.start_time} - ${profile.shift.end_time})` : 'General Shift (09:30 - 18:30)' },
            { label: 'Reporting Manager', value: profile.manager_name || 'System Administrator' },
          ].map(({ label, value }) => (
            <div key={label} className="profile-detail-row">
              <span className="detail-label">{label}</span>
              <span className="detail-value">{value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
