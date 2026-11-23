import React, { useState, useEffect } from 'react';
import { userApi, documentApi } from '../services/api.service';
import { resolveAssetUrl } from '../lib/api';
import { PageHeader, Card, Button, FormInput, Select, Badge } from '../components/common';
import {
  User, Camera, Save, Mail, Phone, Building, Briefcase, Calendar,
  CreditCard, ShieldCheck, FileText, Upload, Trash2, Download,
  CheckCircle2, AlertCircle, Heart, Users, MapPin, Sparkles, ExternalLink,
  Shield, Eye, Lock, KeyRound, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ViewEditUserPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'family' | 'documents' | 'bank' | 'employment' | 'security'>('personal');
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Security & Password Form State
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdForm.current) {
      toast.error('Current password is required');
      return;
    }
    if (!pwdForm.newPwd || pwdForm.newPwd.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (pwdForm.newPwd !== pwdForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setChangingPwd(true);
    try {
      await userApi.changePassword(pwdForm.current, pwdForm.newPwd);
      toast.success('🎉 Password updated successfully! Please remember your new credentials.');
      setPwdForm({ current: '', newPwd: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update password');
    } finally {
      setChangingPwd(false);
    }
  };

  const [form, setForm] = useState({
    user_name: '',
    email: '',
    mobile_no: '',
    department: '',
    position: '',
    gender: 'Male',
    blood_group: 'O+',
    marital_status: 'Single',
    dob: '',
    current_address: '',
    permanent_address: '',
    father_name: '',
    mother_name: '',
    emergency_contact_name: '',
    emergency_contact_no: '',
    emergency_contact_relation: 'Parent',
    aadhar_no: '',
    pan_no: '',
    voter_id: '',
    passport_no: '',
    bank_name: '',
    branch_name: '',
    account_no: '',
    ifsc_code: '',
  });

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (userId) {
      loadProfile(userId);
      loadDocuments();
    }
  }, [userId]);

  const loadProfile = async (id: string) => {
    setLoading(true);
    try {
      const res = await userApi.getUserById(id);
      const data = res.data;
      setProfile(data);
      setForm({
        user_name: data.user_name || '',
        email: data.email || '',
        mobile_no: data.mobile_no || '',
        department: data.department || '',
        position: data.position || '',
        gender: data.gender || 'Male',
        blood_group: data.blood_group || 'O+',
        marital_status: data.marital_status || 'Single',
        dob: data.dob ? data.dob.split('T')[0] : '',
        current_address: data.current_address || '',
        permanent_address: data.permanent_address || '',
        father_name: data.father_name || '',
        mother_name: data.mother_name || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_no: data.emergency_contact_no || '',
        emergency_contact_relation: data.emergency_contact_relation || 'Parent',
        aadhar_no: data.aadhar_no || '',
        pan_no: data.pan_no || '',
        voter_id: data.voter_id || '',
        passport_no: data.passport_no || '',
        bank_name: data.bank_name || '',
        branch_name: data.branch_name || '',
        account_no: data.account_no || '',
        ifsc_code: data.ifsc_code || '',
      });
    } catch {
      toast.error('Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await documentApi.getMyDocuments();
      const docs = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setDocuments(docs);
    } catch {
      // ignore
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append('photo', file);
    if (userId) fd.append('userId', userId);

    setUploadingPhoto(true);
    try {
      const res = await userApi.uploadProfilePhoto(fd);
      const newUrl = res.data.profileImage;
      const resolved = resolveAssetUrl(newUrl);
      setProfile((prev: any) => ({ ...prev, profile_image: resolved }));
      localStorage.setItem('profileImage', resolved);
      window.dispatchEvent(new Event('profileUpdated'));
      toast.success('Profile photo updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (docType: string, file: File) => {
    if (!userId) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('userId', userId);
    fd.append('category', 'Government ID');
    fd.append('docType', docType);
    fd.append('docName', `${docType} - ${file.name}`);

    setUploadingDocType(docType);
    try {
      await documentApi.uploadDocument(fd);
      toast.success(`${docType} uploaded successfully`);
      loadDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to upload ${docType}`);
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleDeleteDocument = async (docId: string, docType: string) => {
    if (!confirm(`Are you sure you want to delete your uploaded ${docType}?`)) return;
    try {
      await documentApi.deleteDocument(docId);
      toast.success(`${docType} deleted`);
      loadDocuments();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await userApi.updateUser(userId, form);
      toast.success('My Profile details saved successfully');
      loadProfile(userId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getDocForType = (type: string) => {
    return documents.find(d =>
      (d.doc_type || '').toLowerCase() === type.toLowerCase() ||
      (d.doc_name || '').toLowerCase().includes(type.toLowerCase())
    );
  };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <PageHeader
        title="My Profile & Personal Dossier"
        subtitle="Manage your personal details, emergency contacts, parent information, government IDs, and document uploads"
      />

      {loading ? (
        <Card>
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontWeight: 600 }}>Loading employee dossier...</p>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSave} style={{ width: '100%', boxSizing: 'border-box' }}>
          {/* ══════════════════════════════════════════════════════
              TOP HERO CARD: AVATAR & OFFICIAL OVERVIEW
              ══════════════════════════════════════════════════════ */}
          <Card style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.5rem', padding: '1.5rem 1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2F4156 0%, #567C8D 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '2.1rem',
                    overflow: 'hidden',
                    border: '3px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 8px 24px rgba(47, 65, 86, 0.25)',
                  }}
                >
                  {profile?.profile_image ? (
                    <img
                      src={resolveAssetUrl(profile.profile_image)}
                      alt={profile.user_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    (profile?.user_name || 'U').slice(0, 2).toUpperCase()
                  )}
                </div>

                <label
                  htmlFor="avatar-upload"
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    background: '#567C8D',
                    color: '#FFFFFF',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
                    border: '2.5px solid #FFFFFF',
                    transition: 'transform 0.2s ease',
                  }}
                  title="Upload profile photo"
                >
                  <Camera size={15} />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {profile?.user_name || 'Employee Profile'}
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
                    {profile?.role?.role || profile?.roleName || 'Employee'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#16a34a',
                      padding: '3px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    Active Status
                  </span>
                </div>

                <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: '#567C8D', fontWeight: 600 }}>
                  Emp ID: <strong>{profile?.emp_id || 'N/A'}</strong> • {profile?.position || 'Designation'} • {profile?.department || 'Department'}
                </p>

                {uploadingPhoto && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
                    ⏳ Uploading profile photo...
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* ══════════════════════════════════════════════════════
              PROFILE NAVIGATION PILL TABS
              ══════════════════════════════════════════════════════ */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.75rem',
              marginBottom: '1.5rem',
              width: '100%',
            }}
          >
            {[
              { id: 'personal', label: 'Personal & Address', icon: <User size={16} /> },
              { id: 'family', label: 'Family & Emergency Contacts', icon: <Users size={16} /> },
              { id: 'documents', label: 'Government IDs & Documents', icon: <FileText size={16} /> },
              { id: 'bank', label: 'Bank Account Details', icon: <CreditCard size={16} /> },
              { id: 'employment', label: 'Official Employment (Admin)', icon: <Building size={16} /> },
              { id: 'security', label: 'Security & Password', icon: <Lock size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '10px',
                  border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #2F4156 0%, #567C8D 100%)' : 'var(--surface-0)',
                  color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: activeTab === tab.id ? '0 4px 14px rgba(47, 65, 86, 0.25)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════
              TAB 1: PERSONAL & RESIDENTIAL DETAILS
              ══════════════════════════════════════════════════════ */}
          {activeTab === 'personal' && (
            <Card style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <User size={18} color="#567C8D" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Personal Information & Addresses
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                <FormInput
                  label="Full Name"
                  value={form.user_name}
                  onChange={e => setForm(p => ({ ...p, user_name: e.target.value }))}
                  required
                  icon={<User size={16} />}
                />

                <FormInput
                  label="Mobile Number (Login & SMS OTP)"
                  value={form.mobile_no}
                  onChange={e => setForm(p => ({ ...p, mobile_no: e.target.value }))}
                  required
                  icon={<Phone size={16} />}
                />

                <FormInput
                  label="Official Email Address"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                  icon={<Mail size={16} />}
                />

                <Select
                  label="Blood Group"
                  value={form.blood_group}
                  onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}
                  options={[
                    { value: 'A+', label: 'A+' },
                    { value: 'B+', label: 'B+' },
                    { value: 'O+', label: 'O+' },
                    { value: 'AB+', label: 'AB+' },
                    { value: 'A-', label: 'A-' },
                    { value: 'B-', label: 'B-' },
                    { value: 'O-', label: 'O-' },
                    { value: 'AB-', label: 'AB-' },
                  ]}
                />

                <Select
                  label="Gender"
                  value={form.gender}
                  onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />

                <Select
                  label="Marital Status"
                  value={form.marital_status}
                  onChange={e => setForm(p => ({ ...p, marital_status: e.target.value }))}
                  options={[
                    { value: 'Single', label: 'Single' },
                    { value: 'Married', label: 'Married' },
                    { value: 'Divorced', label: 'Divorced' },
                    { value: 'Widowed', label: 'Widowed' },
                  ]}
                />

                <FormInput
                  label="Date of Birth"
                  type="date"
                  value={form.dob}
                  onChange={e => setForm(p => ({ ...p, dob: e.target.value }))}
                  icon={<Calendar size={16} />}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                <FormInput
                  label="Current Residential Address"
                  value={form.current_address}
                  onChange={e => setForm(p => ({ ...p, current_address: e.target.value }))}
                  placeholder="Street address, City, State, PIN code"
                  icon={<MapPin size={16} />}
                />

                <FormInput
                  label="Permanent Address"
                  value={form.permanent_address}
                  onChange={e => setForm(p => ({ ...p, permanent_address: e.target.value }))}
                  placeholder="Permanent native home address with PIN code"
                  icon={<MapPin size={16} />}
                />
              </div>
            </Card>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 2: FAMILY & EMERGENCY CONTACT DETAILS
              ══════════════════════════════════════════════════════ */}
          {activeTab === 'family' && (
            <Card style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <Users size={18} color="#567C8D" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Parents & Emergency Contacts
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                <FormInput
                  label="Father's Full Name"
                  value={form.father_name}
                  onChange={e => setForm(p => ({ ...p, father_name: e.target.value }))}
                  placeholder="Enter father's name"
                  icon={<User size={16} />}
                />

                <FormInput
                  label="Mother's Full Name"
                  value={form.mother_name}
                  onChange={e => setForm(p => ({ ...p, mother_name: e.target.value }))}
                  placeholder="Enter mother's name"
                  icon={<User size={16} />}
                />

                <FormInput
                  label="Emergency Contact Person Name"
                  value={form.emergency_contact_name}
                  onChange={e => setForm(p => ({ ...p, emergency_contact_name: e.target.value }))}
                  placeholder="Primary contact in case of emergency"
                  icon={<Heart size={16} />}
                />

                <FormInput
                  label="Emergency Contact Phone Number"
                  value={form.emergency_contact_no}
                  onChange={e => setForm(p => ({ ...p, emergency_contact_no: e.target.value }))}
                  placeholder="10-digit mobile number"
                  icon={<Phone size={16} />}
                />

                <Select
                  label="Emergency Contact Relationship"
                  value={form.emergency_contact_relation}
                  onChange={e => setForm(p => ({ ...p, emergency_contact_relation: e.target.value }))}
                  options={[
                    { value: 'Father', label: 'Father' },
                    { value: 'Mother', label: 'Mother' },
                    { value: 'Spouse', label: 'Spouse' },
                    { value: 'Sibling', label: 'Brother / Sister' },
                    { value: 'Guardian', label: 'Guardian' },
                    { value: 'Friend', label: 'Friend' },
                  ]}
                />
              </div>
            </Card>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 3: GOVERNMENT IDS & REAL DOCUMENT UPLOADS
              ══════════════════════════════════════════════════════ */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Identity Numbers Card */}
              <Card style={{ width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <FileText size={18} color="#567C8D" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Government Identification Numbers
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <FormInput
                    label="Aadhaar Card Number"
                    value={form.aadhar_no}
                    onChange={e => setForm(p => ({ ...p, aadhar_no: e.target.value }))}
                    placeholder="12-digit UID (e.g. 1234 5678 9012)"
                  />

                  <FormInput
                    label="PAN Card Number"
                    value={form.pan_no}
                    onChange={e => setForm(p => ({ ...p, pan_no: e.target.value.toUpperCase() }))}
                    placeholder="10-digit alphanumeric (e.g. ABCDE1234F)"
                  />

                  <FormInput
                    label="Voter ID Card Number"
                    value={form.voter_id}
                    onChange={e => setForm(p => ({ ...p, voter_id: e.target.value.toUpperCase() }))}
                    placeholder="EPIC / Voter ID Number"
                  />

                  <FormInput
                    label="Passport Number"
                    value={form.passport_no}
                    onChange={e => setForm(p => ({ ...p, passport_no: e.target.value.toUpperCase() }))}
                    placeholder="Passport Number (e.g. A1234567)"
                  />
                </div>
              </Card>

              {/* Dedicated Upload Cards for Aadhaar, PAN, Voter ID, Passport */}
              <Card style={{ width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} color="#567C8D" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Upload Verification Documents (PDF, PNG, JPG)
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#567C8D', fontWeight: 600 }}>
                    Documents stored securely in Document Vault
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {[
                    { id: 'Aadhaar Card', title: 'Aadhaar Card', subtitle: 'Upload front & back copy' },
                    { id: 'PAN Card', title: 'PAN Card', subtitle: 'Permanent Account Number Card' },
                    { id: 'Voter ID', title: 'Voter ID Card', subtitle: 'Election Photo Identity Card' },
                    { id: 'Passport', title: 'Passport', subtitle: 'Front & Back identification pages' },
                  ].map((docItem) => {
                    const uploadedDoc = getDocForType(docItem.id);
                    const isUploading = uploadingDocType === docItem.id;

                    return (
                      <div
                        key={docItem.id}
                        style={{
                          borderRadius: '12px',
                          border: uploadedDoc ? '1.5px solid rgba(34, 197, 94, 0.4)' : '1.5px dashed rgba(86, 124, 141, 0.35)',
                          background: uploadedDoc ? 'rgba(34, 197, 94, 0.04)' : 'var(--surface-0)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {docItem.title}
                            </h4>
                            {uploadedDoc ? (
                              <span style={{ fontSize: '0.72rem', background: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Uploaded
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', background: 'rgba(86, 124, 141, 0.15)', color: '#567C8D', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                Pending
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {docItem.subtitle}
                          </p>

                          {uploadedDoc && (
                            <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#567C8D', fontWeight: 600 }}>
                              📄 {uploadedDoc.doc_name}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <label
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '8px',
                              background: uploadedDoc ? 'rgba(86, 124, 141, 0.12)' : 'linear-gradient(135deg, #2F4156 0%, #567C8D 100%)',
                              color: uploadedDoc ? 'var(--text-primary)' : '#FFFFFF',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: isUploading ? 'not-allowed' : 'pointer',
                              border: 'none',
                              textAlign: 'center',
                            }}
                          >
                            <Upload size={14} />
                            <span>{isUploading ? 'Uploading...' : uploadedDoc ? 'Replace File' : 'Upload File'}</span>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              disabled={isUploading}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleDocumentUpload(docItem.id, e.target.files[0]);
                                }
                              }}
                              style={{ display: 'none' }}
                            />
                          </label>

                          {uploadedDoc && (
                            <>
                              <a
                                href={resolveAssetUrl(uploadedDoc.file_url)}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(86, 124, 141, 0.25)',
                                  background: 'var(--surface-0)',
                                  color: 'var(--text-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none',
                                }}
                                title="View Document"
                              >
                                <Eye size={14} />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(uploadedDoc.id, docItem.id)}
                                style={{
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Delete Document"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 4: BANK ACCOUNT & PAYROLL DETAILS
              ══════════════════════════════════════════════════════ */}
          {activeTab === 'bank' && (
            <Card style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <CreditCard size={18} color="#567C8D" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Salary Disbursal & Bank Information
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                <FormInput
                  label="Bank Name"
                  value={form.bank_name}
                  onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))}
                  placeholder="e.g. HDFC Bank, State Bank of India"
                  icon={<Building size={16} />}
                />

                <FormInput
                  label="Branch Name"
                  value={form.branch_name}
                  onChange={e => setForm(p => ({ ...p, branch_name: e.target.value }))}
                  placeholder="e.g. Koramangala 5th Block Branch"
                />

                <FormInput
                  label="Account Number"
                  value={form.account_no}
                  onChange={e => setForm(p => ({ ...p, account_no: e.target.value }))}
                  placeholder="e.g. 501004589210"
                />

                <FormInput
                  label="IFSC Code"
                  value={form.ifsc_code}
                  onChange={e => setForm(p => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HDFC0001234"
                />
              </div>
            </Card>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 5: OFFICIAL EMPLOYMENT DETAILS (SUPER ADMIN CONTROLLED)
              ══════════════════════════════════════════════════════ */}
          {activeTab === 'employment' && (
            <Card style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="#567C8D" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Official Employment Record (Read-Only)
                  </h3>
                </div>
                <span style={{ fontSize: '0.78rem', background: 'rgba(86, 124, 141, 0.15)', color: '#2F4156', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                  🔒 Configured by Super Admin
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee ID</label>
                  <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {profile?.emp_id || 'N/A'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Position / Designation</label>
                  <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {profile?.position || 'Not Assigned'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Department</label>
                  <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {profile?.department || 'Not Assigned'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned System Role</label>
                  <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {profile?.role?.role || profile?.roleName || 'Employee'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Date of Joining</label>
                  <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {profile?.doj ? profile.doj.split('T')[0] : 'N/A'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Work Location</label>
                  <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {profile?.work_location || 'Headquarters'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 6: SECURITY & PASSWORD MANAGEMENT
              ══════════════════════════════════════════════════════ */}
          {activeTab === 'security' && (
            <Card style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <KeyRound size={18} color="#567C8D" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Change Password & Security Credentials
                </h3>
              </div>

              <div style={{ maxWidth: '580px', margin: '0 auto', padding: '1rem 0' }}>
                <div style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(86,124,141,0.08)',
                  border: '1px solid rgba(86,124,141,0.2)',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}>
                  <ShieldCheck size={20} color="#567C8D" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                      Security Notice
                    </strong>
                    Super Admins and employees can update their password anytime. Ensure your new password contains at least 8 characters with a mix of letters, numbers, and symbols.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Current Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      Current Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={pwdForm.current}
                        onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))}
                        placeholder="Enter your current password"
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface-0)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(p => !p)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#8da4b0',
                        }}
                      >
                        {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={pwdForm.newPwd}
                        onChange={e => setPwdForm(p => ({ ...p, newPwd: e.target.value }))}
                        placeholder="Enter your new password (min. 8 characters)"
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface-0)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(p => !p)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#8da4b0',
                        }}
                      >
                        {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      value={pwdForm.confirm}
                      onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="Re-type new password"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-0)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Update Button */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button
                      type="button"
                      variant="primary"
                      loading={changingPwd}
                      onClick={handleChangePassword}
                      icon={<Lock size={16} />}
                      style={{ width: '100%', padding: '0.8rem', justifyContent: 'center' }}
                    >
                      Update Password
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ══════════════════════════════════════════════════════
              BOTTOM ACTION BAR
              ══════════════════════════════════════════════════════ */}
          {activeTab !== 'security' && (
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
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Changes will be instantly updated in your official employee records.</span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    icon={<Save size={16} />}
                  >
                    Save Profile Changes
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </form>
      )}
    </div>
  );
}
