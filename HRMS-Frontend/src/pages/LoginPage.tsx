import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Smartphone, KeyRound, ArrowLeft, ShieldCheck, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api.service';
import { saveToken } from '../lib/auth';
import { HariHrmsLogo } from '../components/common/HariHrmsLogo';

type LoginMode = 'choose' | 'otp-mobile' | 'otp-verify' | 'admin-password';

// ── OTP Input: 6 individual boxes ──────────────────────────────────────
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = ch;
    const next = arr.join('').padEnd(6, '').slice(0, 6).trimEnd();
    onChange(next.padEnd(value.length > next.length ? value.length : next.length, '').slice(0, 6));
    const filled = arr.filter(Boolean).length;
    if (ch && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(text);
    if (text.length) inputs.current[Math.min(text.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 'clamp(4px, 1.8vw, 10px)', justifyContent: 'center', width: '100%' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={i === 0}
          style={{
            width: 'clamp(38px, 11vw, 48px)',
            height: 'clamp(46px, 13vw, 56px)',
            borderRadius: '12px',
            border: value[i] ? '2px solid #567C8D' : '1.5px solid rgba(86,124,141,0.3)',
            background: value[i] ? 'rgba(86,124,141,0.08)' : 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)',
            fontWeight: 700,
            color: '#2F4156',
            outline: 'none',
            transition: 'all 0.2s ease',
            cursor: disabled ? 'not-allowed' : 'text',
            backdropFilter: 'blur(8px)',
          }}
        />
      ))}
    </div>
  );
}

// ── Countdown Timer ─────────────────────────────────────────────────────
function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const id = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(id); onExpire(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    <span style={{ color: left < 60 ? '#e53e3e' : '#567C8D', fontWeight: 700, fontSize: '1rem' }}>
      {m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`}
    </span>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('choose');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(300);
  const [otpExpired, setOtpExpired] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Admin password login state
  const [adminId, setAdminId] = useState('');
  const [adminPwd, setAdminPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // ── Step 1: Request OTP ───────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobile.replace(/\D/g, '');
    if (clean.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.sendOtp(clean);
      const data = res.data;
      setOtpExpiry(data.expiresInSeconds || 300);
      setOtpExpired(false);
      setOtp('');
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setMode('otp-verify');
      toast.success('OTP sent! Check your phone.', { icon: '📱' });

      // Dev mode: show OTP in a toast so you can test without an SMS account
      if (data.devOtp) {
        setTimeout(() => {
          toast(
            (t) => (
              <div>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>🔧 Dev Mode OTP</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.15em', color: '#2F4156' }}>
                  {data.devOtp}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#567C8D', marginTop: 4 }}>
                  Add MSG91_AUTH_KEY to .env for real SMS
                </p>
              </div>
            ),
            { duration: 30000, style: { background: '#E7EEF6', border: '2px solid #567C8D', borderRadius: '14px' } }
          );
        }, 300);
      }

      setCooldown(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.replace(/\D/g, '').length !== 6) {
      toast.error('Enter the complete 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(mobile.replace(/\D/g, ''), otp);
      const { token, message } = res.data;
      if (token) {
        saveToken(token);
        toast.success('Welcome back! 🎉');
        navigate('/', { replace: true });
      } else {
        toast.error(message || 'Verification failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Admin / Password Login ──────────────────────────────
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId.trim() || !adminPwd.trim()) {
      toast.error('Enter your Employee ID / Email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(adminId.trim(), adminPwd);
      const { token, message } = res.data;
      if (token) {
        saveToken(token);
        toast.success('Welcome back!');
        navigate('/', { replace: true });
      } else {
        toast.error(message || 'Login failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const maskedMobile = mobile
    ? mobile.slice(0, 2) + 'XXXXXXX' + mobile.slice(-2)
    : '';

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-gradient-to-br from-[#2F4156] via-[#3d546f] to-[#1e2c3b] font-sans overflow-x-hidden selection:bg-[#C8D9E6] selection:text-[#2F4156]">

      {/* ── LEFT BRANDING PANEL ── */}
      <div className="w-full lg:w-[48%] xl:w-[47%] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white min-h-[360px] lg:min-h-screen">

        {/* Animated watermark ring */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 opacity-15 pointer-events-none select-none text-[#C8D9E6]">
          <svg className="w-full h-full text-current animate-[spin_120s_linear_infinite]" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
            <circle cx="150" cy="150" r="115" fill="none" stroke="currentColor" strokeWidth="0.75" />
            <path id="watermarkArc" d="M 150, 150 m -115, 0 a 115,115 0 1,1 230,0 a 115,115 0 1,1 -230,0" fill="none" />
            <text fill="currentColor" fontSize="10.5" fontWeight="600" letterSpacing="6">
              NIRALIX HRMS · TRANSPARENCY · ETHICS · SERVICE · SUSTAINABILITY ·
            </text>
            <circle cx="150" cy="150" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6" />
          </svg>
        </div>

        {/* Official Brand Logo */}
        <div className="relative z-10">
          <p className="text-[#C8D9E6] text-sm md:text-base font-normal tracking-wide mb-3">Welcome To</p>
          <div className="flex items-center">
            <HariHrmsLogo size={52} showText={true} />
          </div>
        </div>

        {/* Enterprise HRMS Value Proposition */}
        <div className="my-10 lg:my-auto relative z-10">
          <div className="flex flex-col gap-1">
            <span className="text-[#C8D9E6] font-bold text-2xl sm:text-3xl lg:text-[34px] tracking-tight leading-snug">
              Empowering Teams
            </span>
            <span className="text-white font-bold text-2xl sm:text-3xl lg:text-[34px] tracking-tight leading-snug">
              Automating Payroll
            </span>
            <span className="text-[#E7EEF6] font-bold text-2xl sm:text-3xl lg:text-[34px] tracking-tight leading-snug">
              Accelerating Growth
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-24 my-5">
            <div className="h-[2px] bg-gradient-to-r from-[#C8D9E6] via-[#E7EEF6] to-white flex-1 rounded-full" />
            <svg className="w-4 h-4 text-white shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>

          <p className="text-[#C8D9E6]/90 text-sm sm:text-base max-w-md leading-relaxed mb-5 font-normal">
            A comprehensive, cloud-native Human Resource Management platform. Seamlessly manage workforce lifecycle, real-time attendance, automated payslips, and compliance in one unified space.
          </p>

          <div className="flex flex-wrap gap-2 max-w-md pt-1">
            {[
              'WORKFORCE ANALYTICS',
              'LEAVE & ATTENDANCE',
              'AUTOMATED PAYSLIPS',
              'DOCUMENT VAULT',
              'ENTERPRISE AES-256'
            ].map(b => (
              <span
                key={b}
                className="px-3.5 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-white text-[11px] font-semibold tracking-wider uppercase hover:bg-white/20 transition-colors"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
        <div className="hidden lg:block h-6" />
      </div>

      {/* ── RIGHT GLASS CARD (Opaque Ice-Blue Surface from Image 1) ── */}
      <div
        className="w-full lg:w-[52%] xl:w-[53%] rounded-t-[40px] lg:rounded-t-none lg:rounded-tl-[50px] lg:rounded-bl-[50px] px-8 sm:px-14 lg:px-20 py-10 lg:py-14 flex flex-col justify-between shadow-2xl relative border-l border-white/70"
        style={{
          background: '#E7EEF6',
        }}
      >

        <div className="hidden lg:block" />

        <div className="max-w-md w-full mx-auto my-auto py-4">

          {/* ══════════════ CHOOSE MODE ══════════════ */}
          {mode === 'choose' && (
            <>
              <div className="mb-8">
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#567C8D] uppercase block">SIGN IN</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2F4156] mt-1.5 tracking-tight">
                  Sign in to your account
                </h2>
                <p className="text-sm text-[#567C8D] mt-2">Choose how you'd like to sign in</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* OTP Login — primary */}
                <button
                  type="button"
                  onClick={() => setMode('otp-mobile')}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-[#567C8D]/30 bg-white/60 backdrop-blur-md hover:border-[#567C8D] hover:bg-white/80 hover:shadow-lg transition-all group cursor-pointer text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#2F4156] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <Smartphone size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[#2F4156] text-base">Mobile OTP Login</p>
                    <p className="text-[#567C8D] text-sm mt-0.5">Enter mobile number → receive OTP → done</p>
                  </div>
                  <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-[#C8D9E6]/60 text-[#2F4156]">
                    Recommended
                  </span>
                </button>

                {/* Admin Password Login — secondary */}
                <button
                  type="button"
                  onClick={() => setMode('admin-password')}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border border-[#2F4156]/20 bg-white/40 backdrop-blur-md hover:bg-white/60 hover:shadow-md transition-all group cursor-pointer text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#2F4156]/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <KeyRound size={22} className="text-[#2F4156]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#2F4156] text-base">Admin Password Login</p>
                    <p className="text-[#567C8D] text-sm mt-0.5">Employee ID / Email + password</p>
                  </div>
                </button>
              </div>

              {/* Onboarding for New Organization / Super Admin */}
              <div className="mt-5 p-4 rounded-2xl border border-[#567C8D]/25 bg-white/70 backdrop-blur-md flex items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <p className="font-bold text-[#2F4156] text-xs sm:text-sm">New Organization Setup</p>
                  <p className="text-[11px] text-[#567C8D] mt-0.5">Configure Super Admin with full access to all modules</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/onboarding')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#304358] to-[#557A8B] hover:from-[#243546] hover:to-[#466776] text-white text-xs font-bold shrink-0 shadow-md shadow-[#2F4156]/20 border border-white/20 transition-all cursor-pointer"
                >
                  Get Started →
                </button>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-[#8da4b0]">
                <ShieldCheck size={14} className="text-[#567C8D]" />
                <span>All sessions are encrypted and monitored for security.</span>
              </div>
            </>
          )}

          {/* ══════════════ OTP STEP 1: ENTER MOBILE ══════════════ */}
          {mode === 'otp-mobile' && (
            <>
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex items-center gap-1.5 text-[#567C8D] text-sm font-semibold mb-6 hover:text-[#2F4156] transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div className="mb-7">
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#567C8D] uppercase block">MOBILE OTP</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2F4156] mt-1.5 tracking-tight">Enter your mobile number</h2>
                <p className="text-sm text-[#567C8D] mt-2">We'll send a 6-digit OTP to verify your identity.</p>
              </div>

              <form onSubmit={handleSendOtp} noValidate>
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-[#567C8D] mb-2 tracking-wide">Mobile Number</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#2F4156] font-bold text-base border-b-2 border-[#2F4156] pb-1.5 pr-2">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      className="flex-1 bg-transparent border-b-2 border-[#2F4156] text-[#2F4156] font-medium py-1.5 px-0 text-base focus:outline-none focus:border-[#567C8D] transition-colors placeholder:text-[#8da4b0] tracking-widest"
                      placeholder="98765 43210"
                      value={mobile}
                      onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || mobile.replace(/\D/g, '').length !== 10}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#304358] to-[#557A8B] hover:from-[#243546] hover:to-[#466776] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#2F4156]/25 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Sending OTP...</> : <><Smartphone size={18} /> Send OTP</>}
                </button>
              </form>
            </>
          )}

          {/* ══════════════ OTP STEP 2: VERIFY OTP ══════════════ */}
          {mode === 'otp-verify' && (
            <>
              <button
                type="button"
                onClick={() => { setMode('otp-mobile'); setOtp(''); }}
                className="flex items-center gap-1.5 text-[#567C8D] text-sm font-semibold mb-6 hover:text-[#2F4156] transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} /> Change number
              </button>

              <div className="mb-7">
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#567C8D] uppercase block">VERIFY OTP</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2F4156] mt-1.5 tracking-tight">Enter the OTP</h2>
                <p className="text-sm text-[#567C8D] mt-2">
                  Sent to <strong className="text-[#2F4156]">+91 {maskedMobile}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} noValidate>
                {devOtp && (
                  <div
                    onClick={() => setOtp(devOtp)}
                    className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-900 cursor-pointer flex items-center justify-between hover:bg-purple-500/15 transition-colors"
                    title="Click to automatically fill code"
                  >
                    <span className="text-xs font-bold">Demo OTP: <strong className="text-sm tracking-widest text-purple-700">{devOtp}</strong></span>
                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-md font-bold">Auto-Fill →</span>
                  </div>
                )}

                {/* 6-box OTP input */}
                <div className="mb-6">
                  <OtpInput value={otp} onChange={setOtp} disabled={loading || otpExpired} />
                </div>

                {/* Countdown + Resend */}
                <div className="flex items-center justify-between mb-6 text-sm">
                  <span className="text-[#8da4b0]">
                    {otpExpired ? (
                      <span className="text-red-500 font-semibold">OTP expired</span>
                    ) : (
                      <span>Expires in <Countdown seconds={otpExpiry} onExpire={() => setOtpExpired(true)} /></span>
                    )}
                  </span>

                  {cooldown > 0 ? (
                    <span className="text-[#8da4b0]">Resend in {cooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp as any}
                      disabled={loading}
                      className="text-[#567C8D] font-semibold hover:text-[#2F4156] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6 || otpExpired}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#304358] to-[#557A8B] hover:from-[#243546] hover:to-[#466776] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#2F4156]/25 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : <><ShieldCheck size={18} /> Verify & Sign In</>}
                </button>
              </form>
            </>
          )}

          {/* ══════════════ ADMIN PASSWORD LOGIN ══════════════ */}
          {mode === 'admin-password' && (
            <>
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex items-center gap-1.5 text-[#567C8D] text-sm font-semibold mb-6 hover:text-[#2F4156] transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <div className="mb-8">
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#567C8D] uppercase block">ADMIN LOGIN</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2F4156] mt-1.5 tracking-tight">Sign in with password</h2>
                <p className="text-sm text-[#567C8D] mt-2">For Super Admin & programmatic access.</p>
              </div>

              <form onSubmit={handleAdminLogin} noValidate>
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-[#567C8D] mb-1 tracking-wide">Employee ID or Email</label>
                  <input
                    type="text"
                    className="w-full bg-transparent border-b-2 border-[#2F4156] text-[#2F4156] font-medium py-1.5 px-0 text-base focus:outline-none focus:border-[#567C8D] transition-colors placeholder:text-[#8da4b0]"
                    placeholder="e.g. HARI11010 or admin@company.com"
                    value={adminId}
                    onChange={e => setAdminId(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-semibold text-[#567C8D] mb-1 tracking-wide">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="w-full bg-transparent border-b border-[#C8D9E6] text-[#2F4156] font-medium py-1.5 pr-8 pl-0 text-base focus:outline-none focus:border-[#2F4156] transition-colors placeholder:text-[#8da4b0]"
                      placeholder="Enter your password"
                      value={adminPwd}
                      onChange={e => setAdminPwd(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(p => !p)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-[#567C8D] hover:text-[#2F4156] p-1 focus:outline-none cursor-pointer"
                    >
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#304358] to-[#557A8B] hover:from-[#243546] hover:to-[#466776] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#2F4156]/25 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Signing In...</> : 'Log In'}
                </button>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/onboarding')}
                    className="text-xs font-semibold text-[#567C8D] hover:text-[#2F4156] transition-colors cursor-pointer"
                  >
                    New Organization? <span className="underline font-bold text-[#2F4156]">Configure Super Admin & Workspace →</span>
                  </button>
                </div>
              </form>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="text-center text-[#8da4b0] text-[10.5px] leading-relaxed max-w-lg mx-auto pt-8">
          <p className="text-[#8da4b0] text-[10px] leading-normal">
            Authorized personnel only. All login activities are securely monitored and recorded.
          </p>
          <div className="mt-3 text-[#567C8D] text-[11px] font-medium">
            Copyright © 2026 <span className="font-semibold text-[#2F4156]">NIRALIX HRMS</span> · All Rights Reserved
          </div>
        </div>

        {/* Security badge */}
        <div
          className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-md border border-[#C8D9E6] shadow-md rounded-lg p-2.5 flex items-center justify-center text-[#567C8D] hover:shadow-lg transition-all cursor-pointer z-30"
          title="Security Protected Session"
        >
          <RotateCw size={17} className="text-[#567C8D]" />
        </div>
      </div>
    </div>
  );
}
