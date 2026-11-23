import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Clock, CreditCard, Shield, BarChart3, FileText, Calendar,
  Building2, ChevronRight, ArrowRight, Menu, X, Smartphone, Zap,
  Globe, Lock, Award, TrendingUp, CheckCircle2, Star, Sparkles,
  Layers, Network, FolderLock, Bell, UserCheck, HeartHandshake,
  MapPin, Mail, Phone,
} from 'lucide-react';
import { HariHrmsLogo } from '../components/common/HariHrmsLogo';

/* ═══════════════════════════════════════════════════════════
   HARI HRMS — Product Landing Page
   Navy #2F4156 · Teal #567C8D · Ice-Blue #E7EEF6 · White #FFF · Sky Blue #C8D9E6
   ═══════════════════════════════════════════════════════════ */

// ── Scroll-reveal hook ────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────
const FEATURES = [
  { icon: <Users size={28} />, title: 'Employee Management', desc: 'Complete employee lifecycle from onboarding to offboarding with digital profiles, documents, and organizational hierarchy.' },
  { icon: <Clock size={28} />, title: 'Attendance & Time', desc: 'Real-time attendance tracking with geo-fencing, shift management, and automated daily & monthly reports.' },
  { icon: <CreditCard size={28} />, title: 'Payroll & Compensation', desc: 'Full salary structure with PF, ESI, PT, TDS deductions. One-click payroll processing and PDF payslip generation.' },
  { icon: <Calendar size={28} />, title: 'Leave Management', desc: 'Apply, approve, and track leaves with configurable policies, holiday calendars, and real-time balance updates.' },
  { icon: <FolderLock size={28} />, title: 'Document Vault', desc: 'Secure employee document storage — Aadhaar, PAN, certificates, offer letters — all encrypted and role-restricted.' },
  { icon: <Network size={28} />, title: 'Organization Chart', desc: 'Interactive hierarchical org tree showing reporting structure, departments, and team composition at a glance.' },
  { icon: <Shield size={28} />, title: 'Role-Based Access', desc: 'Three-level RBAC (Super Admin, Admin, Employee) with granular permission control and audit logging.' },
  { icon: <Smartphone size={28} />, title: 'Mobile OTP Login', desc: 'Passwordless authentication via mobile OTP. No manual credential setup — employees just log in with their phone.' },
  { icon: <BarChart3 size={28} />, title: 'Analytics & Reports', desc: 'Live dashboards with KPI tiles, attendance trends, department distribution, and payroll burn analytics.' },
];

const STATS = [
  { value: '10,000+', label: 'Employees Managed' },
  { value: '99.9%', label: 'System Uptime' },
  { value: '50+', label: 'HR Modules' },
  { value: '< 2s', label: 'Payroll Processing' },
];

const STEPS = [
  { step: '01', title: 'Add Your Organization', desc: 'Configure company details, departments, designations, and policies in minutes.' },
  { step: '02', title: 'Onboard Employees', desc: 'Bulk import or individually add employees with all their details and documents.' },
  { step: '03', title: 'Go Live', desc: 'Employees log in via mobile OTP, mark attendance, apply for leaves, and view payslips instantly.' },
];

const MODULES = [
  { icon: <UserCheck size={22} />, name: 'Onboarding' },
  { icon: <Clock size={22} />, name: 'Attendance' },
  { icon: <Calendar size={22} />, name: 'Leave' },
  { icon: <CreditCard size={22} />, name: 'Payroll' },
  { icon: <FileText size={22} />, name: 'Payslips' },
  { icon: <FolderLock size={22} />, name: 'Documents' },
  { icon: <Layers size={22} />, name: 'Assets' },
  { icon: <Network size={22} />, name: 'Org Chart' },
  { icon: <Bell size={22} />, name: 'Announcements' },
  { icon: <Shield size={22} />, name: 'Access Control' },
  { icon: <BarChart3 size={22} />, name: 'Reports' },
  { icon: <Globe size={22} />, name: 'Multi-Tenant' },
];

const WHY_US = [
  { icon: <Zap size={24} />, title: 'Lightning Fast', desc: 'Optimized PostgreSQL queries and modern React frontend deliver sub-second response times.' },
  { icon: <Lock size={24} />, title: 'Enterprise Security', desc: 'JWT authentication, bcrypt hashing, RBAC, input sanitization, and complete audit trails.' },
  { icon: <Globe size={24} />, title: 'White-Label Ready', desc: 'Deploy for any company without touching code. Universal login, dynamic branding, multi-tenant architecture.' },
  { icon: <HeartHandshake size={24} />, title: 'Employee Self-Service', desc: 'Employees manage their own profiles, download payslips, apply for leaves, and upload documents.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: '#2F4156', background: '#E7EEF6', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════
          NAVBAR
          ══════════════════════════════════════════════════════ */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          height: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(1.5rem, 5vw, 4rem)',
          background: scrolled ? 'rgba(231,238,246,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(86,124,141,0.15)' : 'none',
          transition: 'all 0.35s ease',
        }}
      >
        {/* Brand Logo in Top Corner */}
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <HariHrmsLogo size={40} showText={true} />
        </div>

        {/* Desktop Nav Links */}
        <div className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {['Features', 'Modules', 'How It Works', 'Why Us'].map(item => (
            <button
              key={item}
              onClick={() => scrollTo(item.toLowerCase().replace(/\s+/g, '-'))}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#567C8D', fontWeight: 600, fontSize: '0.9rem',
                transition: 'color 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#2F4156')}
              onMouseOut={e => (e.currentTarget.style.color = '#567C8D')}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '9px 20px', borderRadius: 12, border: '1.5px solid rgba(86,124,141,0.3)',
              background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)',
              color: '#2F4156', fontWeight: 600, fontSize: '0.88rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#567C8D'; e.currentTarget.style.background = '#fff'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(86,124,141,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/onboarding')}
            style={{
              padding: '9px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.25)',
              background: 'linear-gradient(135deg, #304358 0%, #557A8B 100%)',
              color: '#fff', fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(47,65,86,0.3)',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #243546 0%, #466776 100%)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(47,65,86,0.4)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #304358 0%, #557A8B 100%)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(47,65,86,0.3)'; }}
          >
            Get Started →
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="landing-mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none', background: 'none', border: 'none',
            cursor: 'pointer', color: '#2F4156',
          }}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 72, left: 0, right: 0, bottom: 0, zIndex: 999,
          background: 'rgba(231,238,246,0.97)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', padding: '2rem',
          gap: '1.5rem', animation: 'fadeIn 0.3s ease',
        }}>
          {['Features', 'Modules', 'How It Works', 'Why Us'].map(item => (
            <button
              key={item}
              onClick={() => scrollTo(item.toLowerCase().replace(/\s+/g, '-'))}
              style={{
                background: 'none', border: 'none', textAlign: 'left',
                fontSize: '1.2rem', fontWeight: 700, color: '#2F4156',
                cursor: 'pointer', padding: '0.75rem 0',
                borderBottom: '1px solid rgba(86,124,141,0.15)',
              }}
            >
              {item}
            </button>
          ))}
          <button
            onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
            style={{
              marginTop: '1rem', padding: '12px', borderRadius: 14,
              background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(86,124,141,0.3)',
              color: '#2F4156', fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMobileMenuOpen(false); navigate('/onboarding'); }}
            style={{
              padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg, #304358 0%, #557A8B 100%)',
              color: '#fff', fontWeight: 700, fontSize: '1rem',
              border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
            }}
          >
            Get Started (Setup Super Admin) →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HERO SECTION
          ══════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        padding: 'clamp(6rem, 12vh, 10rem) clamp(1.5rem, 5vw, 4rem) clamp(3rem, 8vh, 6rem)',
      }}>
        {/* Continuous Drifting Ambient Orbs */}
        <div className="landing-ambient-orb landing-orb-1" />
        <div className="landing-ambient-orb landing-orb-2" />
        <div className="landing-ambient-orb landing-orb-3" />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap' }}>
          {/* Left: Text Content */}
          <div style={{ flex: '1 1 500px', position: 'relative', zIndex: 2 }}>
            <RevealSection>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 16px', borderRadius: 50,
                background: 'rgba(86,124,141,0.12)', border: '1px solid rgba(86,124,141,0.25)',
                marginBottom: 24,
              }}>
                <Zap size={14} color="#567C8D" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#567C8D', letterSpacing: '0.04em' }}>
                  ENTERPRISE-GRADE HRMS PLATFORM
                </span>
              </div>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900,
                lineHeight: 1.1, letterSpacing: '-0.03em',
                marginBottom: 20,
              }}>
                Streamline Your{' '}
                <span className="landing-shimmer-text" style={{ display: 'inline-block' }}>
                  Entire HR
                </span>
                <br />Operations in{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #2F4156, #567C8D)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  One Platform
                </span>
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p style={{
                fontSize: 'clamp(1rem, 1.5vw, 1.2rem)', color: '#567C8D',
                lineHeight: 1.7, maxWidth: 560, marginBottom: 36,
              }}>
                From employee onboarding to payroll processing, attendance tracking to document management — manage your entire workforce with a modern, secure, and beautifully crafted HRMS.
              </p>
            </RevealSection>

            <RevealSection delay={300}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
                <button
                  onClick={() => navigate('/onboarding')}
                  style={{
                    padding: '16px 36px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.25)',
                    background: 'linear-gradient(135deg, #304358 0%, #557A8B 100%)',
                    color: '#fff', fontWeight: 700, fontSize: '1rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 8px 30px rgba(47,65,86,0.35)',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #243546 0%, #466776 100%)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #304358 0%, #557A8B 100%)'; }}
                >
                  Get Started <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => scrollTo('features')}
                  style={{
                    padding: '16px 36px', borderRadius: 14,
                    border: '2px solid rgba(86,124,141,0.3)',
                    background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)',
                    color: '#2F4156', fontWeight: 700, fontSize: '1rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#567C8D'; e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(86,124,141,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
                >
                  Explore Features <ChevronRight size={18} />
                </button>
              </div>
            </RevealSection>

            <RevealSection delay={400}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex' }}>
                  {['#567C8D', '#2F4156', '#C8D9E6', '#8da4b0'].map((c, i) => (
                    <div key={i} style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: c, border: '3px solid #E7EEF6',
                      marginLeft: i > 0 ? -10 : 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 800, color: '#fff',
                    }}>
                      {['HR', 'IT', 'FN', 'MK'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2F4156' }}>
                    Trusted by growing teams
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#567C8D" color="#567C8D" />)}
                    <span style={{ fontSize: '0.8rem', color: '#567C8D', fontWeight: 600, marginLeft: 4 }}>4.9/5</span>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>

          {/* Right: Hero Graphic with Live Continuous Animations */}
          <div style={{ flex: '1 1 400px', position: 'relative', zIndex: 2 }}>
            <RevealSection delay={300}>
              <div style={{ position: 'relative' }}>
                {/* Floating Micro-Activity Pills (Always Animated) */}
                <div className="landing-floating-pill pill-top-right">
                  <span style={{ color: '#22c55e', fontSize: '0.85rem' }}>●</span>
                  <span>Live Clock-in: <strong style={{ color: '#567C8D' }}>Sneha Iyer</strong> (HR)</span>
                </div>
                <div className="landing-floating-pill pill-bottom-left">
                  <span>💳</span>
                  <span>February Payroll: <strong style={{ color: '#22c55e' }}>100% Processed</strong></span>
                </div>
                <div className="landing-floating-pill pill-mid-right">
                  <span>🌴</span>
                  <span>Leave Approved: <strong style={{ color: '#567C8D' }}>Rahul S. (2d)</strong></span>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(30px) saturate(180%)',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  borderRadius: 28, padding: '2.5rem',
                  boxShadow: '0 24px 60px -12px rgba(47,65,86,0.15), inset 0 1px 2px rgba(255,255,255,0.8)',
                }}>
                  {/* Mini dashboard mockup with Live Radar Beacon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="landing-live-beacon" />
                      <span style={{ fontSize: '0.75rem', color: '#567C8D', fontWeight: 700, letterSpacing: '0.04em' }}>LIVE HRMS PULSE</span>
                    </div>
                  </div>

                  {/* Stat cards row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
                    {[
                      { label: 'Total Employees', value: '2,847', color: '#567C8D', icon: <Users size={18} /> },
                      { label: 'Present Today', value: '2,634', color: '#22c55e', icon: <CheckCircle2 size={18} /> },
                      { label: 'On Leave', value: '142', color: '#f59e0b', icon: <Calendar size={18} /> },
                      { label: 'Payroll Due', value: '₹48.2L', color: '#2F4156', icon: <CreditCard size={18} /> },
                    ].map((s, i) => (
                      <div key={i} style={{
                        padding: '14px 16px', borderRadius: 16,
                        background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(86,124,141,0.15)',
                        transition: 'transform 0.2s ease',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: s.color }}>{s.icon}<span style={{ fontSize: '0.7rem', color: '#8da4b0', fontWeight: 600 }}>{s.label}</span></div>
                        <p style={{ fontSize: '1.35rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mini chart bars with continuous gentle breathing animation */}
                  <div style={{ background: 'rgba(200,217,230,0.2)', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#567C8D', margin: 0 }}>7-DAY ATTENDANCE</p>
                      <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 700, background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 10 }}>● 94.6% Live Avg</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 60 }}>
                      {[85, 92, 78, 95, 88, 90, 94].map((h, i) => (
                        <div
                          key={i}
                          className={`landing-chart-bar bar-delay-${i + 1}`}
                          style={{
                            height: `${h}%`,
                            background: i === 6
                              ? 'linear-gradient(180deg, #567C8D, #2F4156)'
                              : 'rgba(200,217,230,0.6)',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                        <span key={d} style={{ fontSize: '0.6rem', color: '#8da4b0', fontWeight: 600 }}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS BAR
          ══════════════════════════════════════════════════════ */}
      <section style={{
        padding: '3rem clamp(1.5rem, 5vw, 4rem)',
        background: 'linear-gradient(135deg, #2F4156, #3d546f)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem', textAlign: 'center',
        }}>
          {STATS.map((s, i) => (
            <RevealSection key={i} delay={i * 100}>
              <div>
                <p style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#C8D9E6' }}>{s.value}</p>
                <p style={{ fontSize: '0.9rem', color: 'rgba(200,217,230,0.7)', fontWeight: 600, marginTop: 4 }}>{s.label}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CONTINUOUS CAPABILITY MARQUEE RIBBON (Always Running)
          ══════════════════════════════════════════════════════ */}
      <div className="landing-marquee-wrapper" aria-hidden="true">
        <div className="landing-marquee-track">
          {[
            'Real-Time Attendance & Geo-Fencing',
            'Mobile OTP Passwordless Login',
            'Statutory Payroll & Instant Payslips',
            'Employee Self-Service Leaves',
            'Encrypted Document Vault',
            'Interactive Organization Hierarchy',
            '3-Tier Granular RBAC Security',
            'Fast2SMS / MSG91 SMS Gateway',
            'Redis Caching & Session Engine',
            'RabbitMQ Notification Pipeline',
            'Enterprise Audit Trails',
            'Shift Rostering & Geo-Punch',
          ].concat([
            'Real-Time Attendance & Geo-Fencing',
            'Mobile OTP Passwordless Login',
            'Statutory Payroll & Instant Payslips',
            'Employee Self-Service Leaves',
            'Encrypted Document Vault',
            'Interactive Organization Hierarchy',
            '3-Tier Granular RBAC Security',
            'Fast2SMS / MSG91 SMS Gateway',
            'Redis Caching & Session Engine',
            'RabbitMQ Notification Pipeline',
            'Enterprise Audit Trails',
            'Shift Rostering & Geo-Punch',
          ]).map((text, idx) => (
            <span key={idx} className="landing-marquee-item">
              <span className="landing-marquee-dot">◆</span>
              <span>{text}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          FEATURES GRID
          ══════════════════════════════════════════════════════ */}
      <section id="features" style={{
        padding: 'clamp(4rem, 8vh, 7rem) clamp(1.5rem, 5vw, 4rem)',
        background: '#E7EEF6',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <RevealSection>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{
                display: 'inline-block', padding: '6px 18px', borderRadius: 50,
                background: 'rgba(86,124,141,0.12)', color: '#567C8D',
                fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em',
                marginBottom: 16,
              }}>
                CORE FEATURES
              </span>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>
                Everything You Need to Manage{' '}
                <span style={{ color: '#567C8D' }}>Your Workforce</span>
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#567C8D', maxWidth: 600, margin: '12px auto 0' }}>
                A comprehensive suite of HR modules designed to automate every aspect of human resource management.
              </p>
            </div>
          </RevealSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map((f, i) => (
              <RevealSection key={i} delay={i * 80}>
                <div style={{
                  padding: '2rem', borderRadius: 20,
                  background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px) saturate(150%)',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 8px 30px -8px rgba(47,65,86,0.08), inset 0 1px 2px rgba(255,255,255,0.8)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'default',
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px -8px rgba(47,65,86,0.15), inset 0 1px 2px rgba(255,255,255,0.9)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px -8px rgba(47,65,86,0.08), inset 0 1px 2px rgba(255,255,255,0.8)'; }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(86,124,141,0.15), rgba(200,217,230,0.3))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#567C8D', marginBottom: 16,
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#567C8D', lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          MODULES SHOWCASE
          ══════════════════════════════════════════════════════ */}
      <section id="modules" style={{
        padding: 'clamp(4rem, 8vh, 7rem) clamp(1.5rem, 5vw, 4rem)',
        background: 'linear-gradient(180deg, #E7EEF6 0%, rgba(200,217,230,0.3) 100%)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <RevealSection>
            <span style={{
              display: 'inline-block', padding: '6px 18px', borderRadius: 50,
              background: 'rgba(86,124,141,0.12)', color: '#567C8D',
              fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em', marginBottom: 16,
            }}>
              ALL-IN-ONE PLATFORM
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.02em' }}>
              Every Module Your <span style={{ color: '#567C8D' }}>HR Team</span> Needs
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#567C8D', maxWidth: 550, margin: '0 auto 3rem' }}>
              From hire to retire — one platform that does it all.
            </p>
          </RevealSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
            {MODULES.map((m, i) => (
              <RevealSection key={i} delay={i * 50}>
                <div style={{
                  padding: '1.5rem 1rem', borderRadius: 18, textAlign: 'center',
                  background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 4px 16px -4px rgba(47,65,86,0.06)',
                  transition: 'transform 0.2s ease, background 0.2s',
                  cursor: 'default',
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'; e.currentTarget.style.background = 'rgba(255,255,255,0.85)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, margin: '0 auto 10px',
                    background: 'linear-gradient(135deg, #567C8D, #2F4156)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}>
                    {m.icon}
                  </div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2F4156' }}>{m.name}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{
        padding: 'clamp(4rem, 8vh, 7rem) clamp(1.5rem, 5vw, 4rem)',
        background: '#E7EEF6',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <RevealSection>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{
                display: 'inline-block', padding: '6px 18px', borderRadius: 50,
                background: 'rgba(86,124,141,0.12)', color: '#567C8D',
                fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em', marginBottom: 16,
              }}>
                SIMPLE SETUP
              </span>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>
                Up and Running in{' '}
                <span style={{ color: '#567C8D' }}>Three Steps</span>
              </h2>
            </div>
          </RevealSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {STEPS.map((s, i) => (
              <RevealSection key={i} delay={i * 150}>
                <div style={{
                  position: 'relative', padding: '2.5rem 2rem', borderRadius: 24,
                  background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 12px 36px -8px rgba(47,65,86,0.08), inset 0 1px 2px rgba(255,255,255,0.8)',
                  textAlign: 'center',
                }}>
                  <div style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    width: 44, height: 44, borderRadius: 14,
                    background: 'linear-gradient(135deg, #567C8D, #2F4156)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#C8D9E6', fontWeight: 900, fontSize: '0.95rem',
                    boxShadow: '0 6px 16px rgba(47,65,86,0.3)',
                  }}>
                    {s.step}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 12, marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#567C8D', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          WHY CHOOSE US
          ══════════════════════════════════════════════════════ */}
      <section id="why-us" style={{
        padding: 'clamp(4rem, 8vh, 7rem) clamp(1.5rem, 5vw, 4rem)',
        background: 'linear-gradient(135deg, #2F4156 0%, #3d546f 50%, #2F4156 100%)',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <RevealSection>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{
                display: 'inline-block', padding: '6px 18px', borderRadius: 50,
                background: 'rgba(200,217,230,0.15)', color: '#C8D9E6',
                fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em', marginBottom: 16,
              }}>
                WHY NIRALIX HRMS
              </span>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                Built for Modern{' '}
                <span style={{ color: '#C8D9E6' }}>HR Teams</span>
              </h2>
            </div>
          </RevealSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {WHY_US.map((w, i) => (
              <RevealSection key={i} delay={i * 100}>
                <div style={{
                  padding: '2rem', borderRadius: 20,
                  background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(200,217,230,0.15)',
                  transition: 'transform 0.3s ease, background 0.3s',
                  cursor: 'default',
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'rgba(200,217,230,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#C8D9E6', marginBottom: 16,
                  }}>
                    {w.icon}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>{w.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(200,217,230,0.75)', lineHeight: 1.65 }}>{w.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA SECTION
          ══════════════════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(4rem, 8vh, 6rem) clamp(1.5rem, 5vw, 4rem)',
        background: '#E7EEF6', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <RevealSection>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 16 }}>
              Ready to Transform Your{' '}
              <span style={{ color: '#567C8D' }}>HR Operations</span>?
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#567C8D', marginBottom: 32 }}>
              Join organizations that have modernized their HR with NIRALIX HRMS. Get started in minutes.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/onboarding')}
                style={{
                  padding: '16px 36px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.25)',
                  background: 'linear-gradient(135deg, #304358 0%, #557A8B 100%)',
                  color: '#fff', fontWeight: 700, fontSize: '1rem',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 8px 30px rgba(47,65,86,0.35)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #243546 0%, #466776 100%)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #304358 0%, #557A8B 100%)'; }}
              >
                <Building2 size={18} /> Get Started (New Organization) <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '16px 36px', borderRadius: 14,
                  border: '2px solid rgba(86,124,141,0.3)',
                  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                  color: '#2F4156', fontWeight: 700, fontSize: '1rem',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#567C8D'; e.currentTarget.style.background = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(86,124,141,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
              >
                <Smartphone size={18} /> Existing User Sign In
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════════════════ */}
      <footer style={{
        padding: 'clamp(3rem, 6vh, 5rem) clamp(1.5rem, 5vw, 4rem) 2rem',
        background: '#2F4156', color: 'rgba(200,217,230,0.7)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #567C8D, #C8D9E6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={18} color="#fff" />
                </div>
                <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#FFFFFF' }}>NIRALIX HRMS</span>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 260 }}>
                Enterprise-grade human resource management platform built for modern Indian businesses.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 style={{ fontWeight: 800, color: '#C8D9E6', marginBottom: 16, fontSize: '0.85rem', letterSpacing: '0.05em' }}>PRODUCT</h4>
              {['Employee Management', 'Payroll Processing', 'Leave Tracking', 'Attendance System', 'Document Vault'].map(l => (
                <p key={l} style={{ fontSize: '0.85rem', marginBottom: 8, cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={e => (e.currentTarget.style.color = 'rgba(200,217,230,0.7)')}
                >{l}</p>
              ))}
            </div>

            {/* Company */}
            <div>
              <h4 style={{ fontWeight: 800, color: '#C8D9E6', marginBottom: 16, fontSize: '0.85rem', letterSpacing: '0.05em' }}>COMPANY</h4>
              {['About Us', 'Contact', 'Careers', 'Privacy Policy', 'Terms of Service'].map(l => (
                <p key={l} style={{ fontSize: '0.85rem', marginBottom: 8, cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={e => (e.currentTarget.style.color = 'rgba(200,217,230,0.7)')}
                >{l}</p>
              ))}
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ fontWeight: 800, color: '#C8D9E6', marginBottom: 16, fontSize: '0.85rem', letterSpacing: '0.05em' }}>GET IN TOUCH</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Mail size={16} color="#567C8D" /> <span style={{ fontSize: '0.85rem' }}>harigaran925@gmail.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Phone size={16} color="#567C8D" /> <span style={{ fontSize: '0.85rem' }}>+91 97862 60723</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="#567C8D" /> <span style={{ fontSize: '0.85rem' }}>Nilgiris, Tamil Nadu, India</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(200,217,230,0.15)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,217,230,0.5)' }}>
              © {new Date().getFullYear()} <span style={{ color: '#C8D9E6', fontWeight: 700 }}>NIRALIX HRMS</span> · All Rights Reserved · Built with ❤️ in India
            </p>
          </div>
        </div>
      </footer>

      {/* ── Responsive styles via injected <style> ── */}
      <style>{`
        @media (max-width: 768px) {
          .landing-nav-links { display: none !important; }
          .landing-mobile-menu-btn { display: flex !important; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
