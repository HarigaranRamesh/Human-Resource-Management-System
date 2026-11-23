import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User, Phone, Mail, Lock, Briefcase, Building, Calendar, Shield, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi, accessApi } from '../services/api.service';
import { PageHeader, Card, Button, FormInput, Select, AddIcon } from '../components/common';

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [form, setForm] = useState({
    user_name: '',
    mobileNo: '',
    email: '',
    password: '',
    roleName: 'Employee',
    department: '',
    position: '',
    joiningDate: '',
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await accessApi.getRoles();
      const rawRoles: any[] = Array.isArray(res.data) ? res.data : [];
      if (rawRoles.length > 0) {
        const roleOptions = rawRoles
          .map(r => ({
            value: r.role || r.name,
            label: `${r.role || r.name}${r.is_system ? ' (System)' : ''}`,
          }))
          .sort((a, b) => (a.value === 'Employee' ? -1 : b.value === 'Employee' ? 1 : 0));
        setRoles(roleOptions);
      } else {
        setRoles([
          { value: 'Employee', label: 'Employee' },
          { value: 'Manager', label: 'Manager' },
          { value: 'HR', label: 'HR' },
          { value: 'Admin', label: 'Admin' },
        ]);
      }
    } catch {
      setRoles([
        { value: 'Employee', label: 'Employee' },
        { value: 'Manager', label: 'Manager' },
        { value: 'HR', label: 'HR' },
        { value: 'Admin', label: 'Admin' },
      ]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_name.trim() || !form.mobileNo.trim()) {
      toast.error('Please enter employee name and mobile number');
      return;
    }
    setLoading(true);
    try {
      await userApi.createUser({
        ...form,
        password: form.password.trim() || 'HariHrms@1234',
        roleName: form.roleName || 'Employee',
      });
      toast.success(`User ${form.user_name} created successfully with role ${form.roleName || 'Employee'}`);
      navigate('/home/viewuser');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <PageHeader
        title="Add New User"
        subtitle="Create an employee profile, configure employment details, and assign access permissions"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/home/viewuser')}
          >
            Back to Users
          </Button>
        }
      />

      <form onSubmit={handleSubmit} style={{ width: '100%', boxSizing: 'border-box' }}>
        {/* Top Summary / Preview Banner spanning full width */}
        <Card style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.5rem', padding: '1.25rem 1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2F4156 0%, #567C8D 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.4rem',
                border: '2px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '0 4px 14px rgba(47, 65, 86, 0.18)',
                flexShrink: 0,
              }}
            >
              {(form.user_name || 'New').slice(0, 2).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {form.user_name.trim() || 'New Employee Profile'}
                </h2>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: 'rgba(86, 124, 141, 0.15)',
                    color: '#2F4156',
                    padding: '3px 10px',
                    borderRadius: '6px',
                  }}
                >
                  {form.roleName || 'Employee'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#567C8D', fontWeight: 500 }}>
                {form.position || 'Designation not specified'} {form.department ? `• ${form.department}` : ''}
              </p>
            </div>
          </div>
        </Card>

        {/* 2-Column Desktop Grid Spanning 100% Width (50% left, 50% right) */}
        <div className="create-user-grid">
          {/* Card 1: Personal & Account Details */}
          <Card style={{ height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <User size={18} color="#567C8D" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Personal & Login Information
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <FormInput
                name="user_name"
                label="Full Name"
                type="text"
                placeholder="e.g. Harigaran Ramesh"
                value={form.user_name}
                onChange={handleChange}
                icon={<User size={16} />}
                required
              />

              <FormInput
                name="mobileNo"
                label="Mobile Number (Used for OTP & Login)"
                type="tel"
                placeholder="10-digit mobile number"
                value={form.mobileNo}
                onChange={handleChange}
                icon={<Phone size={16} />}
                required
              />

              <FormInput
                name="email"
                label="Official Email Address"
                type="email"
                placeholder="employee@harihrms.com"
                value={form.email}
                onChange={handleChange}
                icon={<Mail size={16} />}
              />

              <div>
                <FormInput
                  name="password"
                  label="Login Password (Optional)"
                  type="password"
                  placeholder="Defaults to HariHrms@1234 if left blank"
                  value={form.password}
                  onChange={handleChange}
                  icon={<Lock size={16} />}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginTop: '5px' }}>
                  💡 Default temporary password will be set to <code>HariHrms@1234</code>.
                </small>
              </div>
            </div>
          </Card>

          {/* Card 2: Employment & Access Role */}
          <Card style={{ height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <Briefcase size={18} color="#567C8D" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Employment & Role Details
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <Select
                name="roleName"
                label="Assigned System Role"
                value={form.roleName}
                onChange={handleChange}
                options={roles}
                placeholder="Select assigned role..."
                required
              />

              <FormInput
                name="position"
                label="Position / Designation"
                type="text"
                placeholder="e.g. Senior Full Stack Engineer"
                value={form.position}
                onChange={handleChange}
                icon={<Briefcase size={16} />}
              />

              <FormInput
                name="department"
                label="Department"
                type="text"
                placeholder="e.g. Engineering, Product Design, Finance"
                value={form.department}
                onChange={handleChange}
                icon={<Building size={16} />}
              />

              <FormInput
                name="joiningDate"
                label="Date of Joining"
                type="date"
                value={form.joiningDate}
                onChange={handleChange}
                icon={<Calendar size={16} />}
              />
            </div>
          </Card>
        </div>

        {/* Action Bar Card Spanning Full Width */}
        <Card style={{ width: '100%', boxSizing: 'border-box' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Shield size={16} color="#567C8D" />
              <span>User will be added with active status and immediate portal access credentials.</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/home/viewuser')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                icon={<AddIcon size={16} />}
              >
                Create User
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
