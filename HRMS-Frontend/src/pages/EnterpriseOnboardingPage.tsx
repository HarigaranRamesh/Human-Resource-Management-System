import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, User, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft,
  Eye, EyeOff, Loader2, Globe, Phone, Mail,
  Calendar, Check, Award, MapPin, Hash, Users2, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { onboardingApi } from '../services/api.service';
import { saveToken } from '../lib/auth';

interface FormData {
  // Step 1: Admin Account
  firstName: string;
  lastName: string;
  workEmail: string;
  personalEmail: string;
  mobileNo: string;
  dob: string;
  gender: string;
  dateOfJoining: string;
  roleCategory: string;
  roleName: string;
  password: string;

  // Step 2: Organization Details
  organizationName: string;
  idPrefix: string;
  officialEmail: string;
  website: string;
  phone: string;
  industry: string;
  companySize: string;
  locationCity: string;
  locationAddress: string;
}

const INITIAL_FORM: FormData = {
  firstName: '',
  lastName: '',
  workEmail: '',
  personalEmail: '',
  mobileNo: '',
  dob: '1992-05-15',
  gender: 'Male',
  dateOfJoining: new Date().toISOString().split('T')[0],
  roleCategory: 'CEO / Organizational Head',
  roleName: 'CEO',
  password: '',

  organizationName: '',
  idPrefix: 'OA',
  officialEmail: '',
  website: '',
  phone: '',
  industry: 'Information Technology & Software',
  companySize: '51-200 Employees',
  locationCity: '',
  locationAddress: '',
};

export default function EnterpriseOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onboardingApi.getStatus()
      .then(res => {
        if (res.data?.success && res.data.details?.organization) {
          const org = res.data.details.organization;
          setFormData(prev => ({
            ...prev,
            organizationName: org.org_name || prev.organizationName,
            idPrefix: org.id_prefix || prev.idPrefix,
            officialEmail: org.official_email || prev.officialEmail,
            website: org.website || prev.website,
            phone: org.official_contact || prev.phone,
            industry: org.industry || prev.industry,
            companySize: org.company_size || prev.companySize,
            locationCity: org.location_city || prev.locationCity,
            locationAddress: org.location_address || org.address || prev.locationAddress,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'organizationName' && (!prev.idPrefix || prev.idPrefix === 'OA')) {
        const letters = value.trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        if (letters) next.idPrefix = letters;
      }
      return next;
    });
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First and Last name are required.');
      return false;
    }
    if (!formData.workEmail.trim() || !formData.workEmail.includes('@')) {
      toast.error('Please enter a valid work email.');
      return false;
    }
    const cleanMobile = formData.mobileNo.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!formData.organizationName.trim()) {
      toast.error('Organization Name is required.');
      return false;
    }
    if (!formData.idPrefix.trim()) {
      toast.error('Employee ID Prefix is required (e.g. OA, NIR).');
      return false;
    }
    if (!formData.officialEmail.trim() || !formData.officialEmail.includes('@')) {
      toast.error('A valid Official Email is required.');
      return false;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('A valid Official Phone number is required.');
      return false;
    }
    if (!formData.companySize.trim()) {
      toast.error('Company Size is required.');
      return false;
    }
    if (!formData.locationCity.trim()) {
      toast.error('Headquarters City & State is required.');
      return false;
    }
    if (!formData.locationAddress.trim()) {
      toast.error('Registered Office Address is required.');
      return false;
    }
    return true;
  };

  const handleNextFrom1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleNextFrom2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return;
    setLoading(true);
    try {
      const cleanPrefix = formData.idPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'NIR';
      const res = await onboardingApi.setup({
        ...formData,
        idPrefix: cleanPrefix,
        address: `${formData.locationCity.trim()} - ${formData.locationAddress.trim()}`,
      });

      if (res.data?.success && res.data?.token) {
        saveToken(res.data.token);
        toast.success(`🎉 Workspace provisioned! Welcome, ${formData.firstName}!`);
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } else {
        toast.error(res.data?.message || 'Provisioning failed. Please retry.');
      }
    } catch (err: any) {
      console.error('Onboarding submit error:', err);
      toast.error(err.response?.data?.message || 'Failed to complete onboarding. Please verify details.');
    } finally {
      setLoading(false);
    }
  };

  const cleanPrefix = formData.idPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'OA';

  // ══════════════════════════════════════════════════════════════
  // STYLES MATCHING THE FROSTY ICE-BLUE SYSTEM PALETTE & PATTERN:
  // Background: #E7EEF6 (Cool Frosty Ice-Blue Sky)
  // Cards: #FFFFFF (Crisp White with subtle frosted glass)
  // Accent/Pills: #C8D9E6 & #567C8D
  // Primary Buttons: #304358 to #557A8B Master Gradient
  // ══════════════════════════════════════════════════════════════
  const whiteCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: '1.5px solid rgba(255, 255, 255, 0.75)',
    boxShadow: '0 12px 32px -6px rgba(47, 65, 86, 0.08), inset 0 1px 2px 0 rgba(255, 255, 255, 0.9)',
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.75)',
    border: '1.5px solid rgba(86, 124, 141, 0.28)',
    color: '#2F4156',
    boxShadow: 'inset 0 1px 2px rgba(47, 65, 86, 0.03)',
  };

  const primaryBtnStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #304358 0%, #557A8B 100%)',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    boxShadow: '0 4px 14px rgba(47, 65, 86, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
  };

  const secondaryBtnStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.65)',
    border: '1.5px solid rgba(86, 124, 141, 0.3)',
    color: '#2F4156',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div
      className="min-h-screen text-[#2F4156] font-sans antialiased flex flex-col relative overflow-hidden"
      style={{
        background: '#E7EEF6', // Solid Ice-Blue Canvas matching LoginPage & App
      }}
    >
      {/* ── AMBIENT GLASSMORPHIC BACKGROUND ORBS & GRID ──────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200, 217, 230, 0.55) 0%, rgba(231, 238, 246, 0) 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '-10%',
            width: '650px',
            height: '650px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(86, 124, 141, 0.16) 0%, rgba(231, 238, 246, 0) 70%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            right: '25%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200, 217, 230, 0.35) 0%, rgba(231, 238, 246, 0) 70%)',
            filter: 'blur(45px)',
          }}
        />
        {/* Subtle geometric ring */}
        <svg
          className="absolute top-16 right-10 w-96 h-96 text-[#567C8D]/10"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 400 400"
        >
          <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
          <circle cx="200" cy="200" r="100" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
      </div>
      {/* ── TOP HEADER (Clean Frosted Glass) ────────────────────── */}
      <header
        className="sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between"
        style={{
          background: 'rgba(231, 238, 246, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1.5px solid rgba(86, 124, 141, 0.18)',
          boxShadow: '0 2px 12px rgba(47, 65, 86, 0.03)',
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#2F4156] flex items-center justify-center text-white shadow-md shadow-[#2F4156]/20">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#2F4156] tracking-tight leading-tight">
              NIRALIX HRMS Onboarding
            </h1>
            <p className="text-[10.5px] font-bold tracking-wider text-[#567C8D] uppercase">
              New Organization • Super Admin Setup
            </p>
          </div>
        </div>

        {/* Step Numbers Top Right */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(num => (
            <div
              key={num}
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                step === num
                  ? 'bg-[#2F4156] text-white shadow-sm'
                  : step > num
                  ? 'bg-[#567C8D] text-white'
                  : 'border border-[#8da4b0]/40 text-[#567C8D] bg-white/70'
              }`}
            >
              {step > num ? <Check size={14} /> : num}
            </div>
          ))}
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── LEFT DOCK (Steps Navigation + Security Card) ─────────── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Step 1 Button */}
            <div
              onClick={() => setStep(1)}
              style={
                step === 1
                  ? {
                      background: 'rgba(255, 255, 255, 0.88)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '2px solid #567C8D',
                      boxShadow: '0 10px 24px -4px rgba(47, 65, 86, 0.12)',
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.55)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.7)',
                    }
              }
              className="p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 relative hover:bg-white/80"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                step === 1 ? 'bg-[#2F4156] text-white shadow-md' : 'bg-[#567C8D]/15 text-[#567C8D]'
              }`}>
                <User size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-bold tracking-wider text-[#567C8D] uppercase">
                  Module 01
                </div>
                <div className="text-sm font-extrabold text-[#2F4156] truncate">
                  Admin Account
                </div>
              </div>
              {step === 1 && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#567C8D] absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Step 2 Button */}
            <div
              onClick={() => { if (validateStep1()) setStep(2); }}
              style={
                step === 2
                  ? {
                      background: 'rgba(255, 255, 255, 0.88)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '2px solid #567C8D',
                      boxShadow: '0 10px 24px -4px rgba(47, 65, 86, 0.12)',
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.55)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.7)',
                    }
              }
              className="p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 relative hover:bg-white/80"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                step === 2 ? 'bg-[#2F4156] text-white shadow-md' : 'bg-[#567C8D]/15 text-[#567C8D]'
              }`}>
                <Building2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-bold tracking-wider text-[#567C8D] uppercase">
                  Module 02
                </div>
                <div className="text-sm font-extrabold text-[#2F4156] truncate">
                  Organization Details
                </div>
              </div>
              {step === 2 && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#567C8D] absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Step 3 Button */}
            <div
              onClick={() => { if (validateStep1() && validateStep2()) setStep(3); }}
              style={
                step === 3
                  ? {
                      background: 'rgba(255, 255, 255, 0.88)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '2px solid #567C8D',
                      boxShadow: '0 10px 24px -4px rgba(47, 65, 86, 0.12)',
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.55)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.7)',
                    }
              }
              className="p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 relative hover:bg-white/80"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                step === 3 ? 'bg-[#2F4156] text-white shadow-md' : 'bg-[#567C8D]/15 text-[#567C8D]'
              }`}>
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-bold tracking-wider text-[#567C8D] uppercase">
                  Module 03
                </div>
                <div className="text-sm font-extrabold text-[#2F4156] truncate">
                  Review & Submit
                </div>
              </div>
              {step === 3 && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#567C8D] absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Secure Setup Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1.5px solid rgba(86, 124, 141, 0.22)',
                boxShadow: '0 8px 24px -6px rgba(47, 65, 86, 0.05)',
              }}
              className="p-5 rounded-2xl relative overflow-hidden mt-6"
            >
              <ShieldCheck size={90} className="absolute -right-4 -bottom-4 text-[#567C8D]/15 pointer-events-none" />
              <div className="relative z-10">
                <h4 className="text-sm font-extrabold text-[#2F4156] mb-1">
                  Secure Setup
                </h4>
                <p className="text-xs text-[#567C8D] leading-relaxed">
                  Your organization data is protected with enterprise AES-256 encryption.
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT MAIN CANVAS ────────────────────────────────────── */}
          <div className="lg:col-span-9 space-y-6">

            {/* Top Sign-in Card (Exact Pattern of Login Card 3) */}
            <div
              style={whiteCardStyle}
              className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-sm font-extrabold text-[#2F4156]">
                  Already have an account?
                </h3>
                <p className="text-xs text-[#567C8D] mt-0.5">
                  Sign in to access your existing NIRALIX HRMS organization workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={primaryBtnStyle}
                className="px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all self-start sm:self-auto cursor-pointer hover:opacity-95"
              >
                Sign In
              </button>
            </div>

            {/* ── STEP 1: CREATE ADMINISTRATOR ACCOUNT ─────────────────── */}
            {step === 1 && (
              <form onSubmit={handleNextFrom1} className="space-y-6">
                <div>
                  {/* Subtle Pill matching the Login "Recommended" badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8D9E6]/60 border border-[#567C8D]/25 text-[#2F4156] text-[11px] font-bold uppercase tracking-wider mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#567C8D]" />
                    Admin Setup
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2F4156] tracking-tight">
                    Create Administrator Account
                  </h2>
                  <p className="text-xs sm:text-sm text-[#567C8D] mt-1">
                    Configure the primary workspace owner and secure administrator credentials.
                  </p>
                </div>

                {/* Form Card (Crisp White Card on #E7EEF6) */}
                <div style={whiteCardStyle} className="rounded-2xl p-6 sm:p-8 space-y-6">
                  {/* Card Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#8da4b0]/25 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#567C8D]/15 text-[#2F4156] flex items-center justify-center border border-[#567C8D]/25">
                        <User size={18} />
                      </div>
                      <span className="text-sm font-bold text-[#2F4156]">
                        Administrator Details
                      </span>
                    </div>
                    <span className="text-[11px] text-[#567C8D]">
                      Primary administrator information and access configuration.
                    </span>
                  </div>

                  {/* 3-Column Responsive Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* First Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John"
                        value={formData.firstName}
                        onChange={e => handleChange('firstName', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all placeholder:text-[#8da4b0] focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={e => handleChange('lastName', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all placeholder:text-[#8da4b0] focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Work Email */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Work Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="john@company.com"
                        value={formData.workEmail}
                        onChange={e => handleChange('workEmail', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all placeholder:text-[#8da4b0] focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Personal Email */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Personal Email
                      </label>
                      <input
                        type="email"
                        placeholder="john.personal@example.com"
                        value={formData.personalEmail}
                        onChange={e => handleChange('personalEmail', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all placeholder:text-[#8da4b0] focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 XXXXX XXXXX"
                        value={formData.mobileNo}
                        onChange={e => handleChange('mobileNo', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all placeholder:text-[#8da4b0] focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.dob}
                        onChange={e => handleChange('dob', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.gender}
                        onChange={e => handleChange('gender', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    {/* Date of Joining */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Date of Joining <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.dateOfJoining}
                        onChange={e => handleChange('dateOfJoining', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Role Category */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Role Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.roleCategory}
                        onChange={e => handleChange('roleCategory', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      >
                        <option value="CEO / Organizational Head">CEO / Organizational Head</option>
                        <option value="Managing Director / Founder">Managing Director / Founder</option>
                        <option value="Chief Technology Officer (CTO)">Chief Technology Officer (CTO)</option>
                        <option value="Chief Operating Officer (COO)">Chief Operating Officer (COO)</option>
                        <option value="HR Director / Head of People">HR Director / Head of People</option>
                        <option value="IT System Administrator">IT System Administrator</option>
                      </select>
                    </div>

                    {/* Role Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Role Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="CEO"
                        value={formData.roleName}
                        onChange={e => handleChange('roleName', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Password */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={e => handleChange('password', e.target.value)}
                          style={inputStyle}
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#567C8D] hover:text-[#2F4156] transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#567C8D] italic mt-1.5">
                        Must be at least 8 characters, and include one uppercase letter, one number, and one symbol.
                      </p>
                    </div>
                  </div>

                  {/* Form Footer / Solid Main Theme Button */}
                  <div className="flex justify-end pt-4 border-t border-[#8da4b0]/25">
                    <button
                      type="submit"
                      style={primaryBtnStyle}
                      className="px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer hover:opacity-95"
                    >
                      Continue to Organization Details <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ── STEP 2: ORGANIZATION DETAILS ─────────────────────────── */}
            {step === 2 && (
              <form onSubmit={handleNextFrom2} className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8D9E6]/60 border border-[#567C8D]/25 text-[#2F4156] text-[11px] font-bold uppercase tracking-wider mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#567C8D]" />
                    Workspace Configuration
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2F4156] tracking-tight">
                    Organization Details
                  </h2>
                  <p className="text-xs sm:text-sm text-[#567C8D] mt-1">
                    Provide company parameters, employee numbering prefix, and location details.
                  </p>
                </div>

                {/* Form Card */}
                <div style={whiteCardStyle} className="rounded-2xl p-6 sm:p-8 space-y-6">
                  {/* Card Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#8da4b0]/25 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#567C8D]/15 text-[#2F4156] flex items-center justify-center border border-[#567C8D]/25">
                        <Building2 size={18} />
                      </div>
                      <span className="text-sm font-bold text-[#2F4156]">
                        Corporate Identity & Headquarters
                      </span>
                    </div>
                    <span className="text-[11px] text-[#567C8D]">
                      Required corporate data for employee numbering, letters, and workspace setup.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Organization Name * */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Organization Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acme Technologies Solutions Pvt Ltd"
                        value={formData.organizationName}
                        onChange={e => handleChange('organizationName', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Employee ID Prefix * */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Employee ID Prefix <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="OA"
                        value={formData.idPrefix}
                        onChange={e => handleChange('idPrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                      <span className="text-[10.5px] text-[#567C8D] font-bold mt-1 block">
                        Super Admin: {cleanPrefix}1101 · Employees: {cleanPrefix}1102, {cleanPrefix}1103...
                      </span>
                    </div>

                    {/* Official Email * */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Official Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="harigaran925@gmail.com"
                        value={formData.officialEmail}
                        onChange={e => handleChange('officialEmail', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Website
                      </label>
                      <input
                        type="url"
                        placeholder="https://company.com"
                        value={formData.website}
                        onChange={e => handleChange('website', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Phone * */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={e => handleChange('phone', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Industry */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Industry
                      </label>
                      <select
                        value={formData.industry}
                        onChange={e => handleChange('industry', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      >
                        <option value="Information Technology & Software">Information Technology & Software</option>
                        <option value="Financial Services & FinTech">Financial Services & FinTech</option>
                        <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                        <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                        <option value="Retail & E-commerce">Retail & E-commerce</option>
                        <option value="Consulting & Professional Services">Consulting & Professional Services</option>
                        <option value="Education & EdTech">Education & EdTech</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Company Size * */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Company Size <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.companySize}
                        onChange={e => handleChange('companySize', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      >
                        <option value="1-10 Employees">1-10 Employees</option>
                        <option value="11-50 Employees">11-50 Employees</option>
                        <option value="51-200 Employees">51-200 Employees</option>
                        <option value="201-500 Employees">201-500 Employees</option>
                        <option value="500+ Employees">500+ Employees</option>
                      </select>
                    </div>

                    {/* Location Category 1: City & State * */}
                    <div>
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Headquarters City & State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Nilgiris, Tamil Nadu"
                        value={formData.locationCity}
                        onChange={e => handleChange('locationCity', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>

                    {/* Location Category 2: Registered Office Address * */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-[#2F4156] mb-1.5">
                        Registered Office Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Nilgiris, Tamil Nadu, India"
                        value={formData.locationAddress}
                        onChange={e => handleChange('locationAddress', e.target.value)}
                        style={inputStyle}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#2F4156]"
                      />
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#8da4b0]/25">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={secondaryBtnStyle}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:bg-[#E7EEF6]"
                    >
                      <ArrowLeft size={16} /> Back to Admin Account
                    </button>
                    <button
                      type="submit"
                      style={primaryBtnStyle}
                      className="px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer hover:opacity-95"
                    >
                      Continue to Review & Submit <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ── STEP 3: REVIEW & SUBMIT ──────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8D9E6]/60 border border-[#567C8D]/25 text-[#2F4156] text-[11px] font-bold uppercase tracking-wider mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#567C8D]" />
                    Review & Confirmation
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2F4156] tracking-tight">
                    Review Your Details
                  </h2>
                  <p className="text-xs sm:text-sm text-[#567C8D] mt-1">
                    Review all entered administrator and organization details below. Once confirmed, your Super Admin and NIRALIX HRMS workspace will be activated.
                  </p>
                </div>

                {/* 2 Detailed Cards Showing All Entered Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* 1. Admin Account Card */}
                  <div style={whiteCardStyle} className="rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#8da4b0]/25">
                      <div className="flex items-center gap-2">
                        <User size={18} className="text-[#567C8D]" />
                        <h4 className="text-sm font-bold text-[#2F4156]">Primary Administrator</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs font-bold text-[#567C8D] hover:text-[#2F4156] hover:underline cursor-pointer"
                      >
                        Edit Step 1
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Administrator Name:</span>
                        <span className="font-bold text-[#2F4156]">{formData.firstName} {formData.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Work Email:</span>
                        <span className="font-semibold text-[#2F4156]">{formData.workEmail}</span>
                      </div>
                      {formData.personalEmail && (
                        <div className="flex justify-between">
                          <span className="text-[#567C8D]">Personal Email:</span>
                          <span className="text-[#2F4156]">{formData.personalEmail}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Phone Number:</span>
                        <span className="font-semibold text-[#2F4156]">{formData.mobileNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Role Title:</span>
                        <span className="font-bold text-[#2F4156]">{formData.roleName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Role Category:</span>
                        <span className="text-[#2F4156]">{formData.roleCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Date of Birth:</span>
                        <span className="text-[#2F4156]">{formData.dob}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Gender:</span>
                        <span className="text-[#2F4156]">{formData.gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Date of Joining:</span>
                        <span className="text-[#2F4156]">{formData.dateOfJoining}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Initial Employee ID:</span>
                        <span className="font-mono font-bold text-[#2F4156] bg-[#C8D9E6]/60 border border-[#567C8D]/30 px-2 py-0.5 rounded">
                          {cleanPrefix}1101 (Super Admin)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Organization Details Card */}
                  <div style={whiteCardStyle} className="rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#8da4b0]/25">
                      <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-[#567C8D]" />
                        <h4 className="text-sm font-bold text-[#2F4156]">Organization Profile</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-xs font-bold text-[#567C8D] hover:text-[#2F4156] hover:underline cursor-pointer"
                      >
                        Edit Step 2
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Organization Name:</span>
                        <span className="font-bold text-[#2F4156]">{formData.organizationName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Employee ID Prefix:</span>
                        <span className="font-mono font-bold text-[#2F4156] bg-[#C8D9E6]/60 border border-[#567C8D]/30 px-2 py-0.5 rounded">
                          {cleanPrefix}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Numbering Sequence:</span>
                        <span className="font-mono font-medium text-[#2F4156]">
                          {cleanPrefix}1102, {cleanPrefix}1103, {cleanPrefix}1104...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Official Email:</span>
                        <span className="font-semibold text-[#2F4156]">{formData.officialEmail}</span>
                      </div>
                      {formData.website && (
                        <div className="flex justify-between">
                          <span className="text-[#567C8D]">Website:</span>
                          <span className="text-[#2F4156] font-medium truncate max-w-[200px]">{formData.website}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Phone:</span>
                        <span className="font-semibold text-[#2F4156]">{formData.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Industry:</span>
                        <span className="text-[#2F4156]">{formData.industry}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Company Size:</span>
                        <span className="font-semibold text-[#2F4156]">{formData.companySize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">City & State:</span>
                        <span className="text-[#2F4156] font-medium">{formData.locationCity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567C8D]">Registered Address:</span>
                        <span className="text-[#2F4156] text-right truncate max-w-[190px]">{formData.locationAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 11 Enterprise Modules Guarantee Card */}
                <div style={whiteCardStyle} className="rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Award size={20} className="text-[#567C8D]" />
                    <h4 className="text-sm font-bold text-[#2F4156]">
                      Full Super Admin Access: All 11 NIRALIX HRMS Modules Included
                    </h4>
                  </div>
                  <p className="text-xs text-[#567C8D]">
                    Your account is configured with unrestricted master access across every organizational module:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
                    {[
                      'Executive Dashboard',
                      'Access Control & RBAC',
                      'User Management',
                      'Daily & Monthly Reports',
                      'Employee Leave Approvals',
                      'Official Letters & Certificates',
                      'Payroll & Payslips',
                      'Shift Management',
                      'Yearly Leave Policies',
                      'Holiday Planning',
                      'Asset Management',
                      'Government Document Vault',
                    ].map(mod => (
                      <div
                        key={mod}
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid rgba(86, 124, 141, 0.22)',
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#2F4156] shadow-sm"
                      >
                        <Check size={14} className="text-[#567C8D] shrink-0" />
                        <span className="truncate">{mod}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Confirmation and Submit (Solid Main Theme Primary Button) */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={secondaryBtnStyle}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:bg-[#E7EEF6]"
                  >
                    <ArrowLeft size={16} /> Back to Organization Details
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSubmit}
                    style={primaryBtnStyle}
                    className="px-8 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-75 cursor-pointer hover:opacity-95"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Provisioning Setup & Super Admin...
                      </>
                    ) : (
                      <>
                        Confirm & Launch Workspace <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center py-6 text-xs text-[#567C8D] border-t border-[#8da4b0]/25">
        Enterprise Onboarding System · NIRALIX HRMS Enterprise · All Rights Reserved
      </footer>
    </div>
  );
}
