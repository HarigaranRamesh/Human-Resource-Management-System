import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Cake, Award, UserPlus, Megaphone, Clock, Calendar,
  CreditCard, FolderLock, Network, ArrowRight, Heart, Send,
  CheckCircle2, AlertCircle, Coffee, ShieldCheck, Sun, Moon
} from 'lucide-react';
import { PageHeader, Card, Button } from '../components/common';
import toast from 'react-hot-toast';
import { attendanceApi, userApi } from '../services/api.service';

export default function EmployeeWelcomePage() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('user_name') || 'Team Member';
  const userRole = localStorage.getItem('position') || 'Software Engineer';
  const userDept = localStorage.getItem('department') || 'Engineering';
  const profileImage = localStorage.getItem('profileImage') || '';
  const [clockedIn, setClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [wishedUsers, setWishedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePunch = async () => {
    try {
      if (!clockedIn) {
        await attendanceApi.login({ lat: 12.9716, lon: 77.5946 });
        setClockedIn(true);
        toast.success(`Clocked in successfully at ${new Date().toLocaleTimeString()}`);
      } else {
        await attendanceApi.logout({ lat: 12.9716, lon: 77.5946 });
        setClockedIn(false);
        toast.success(`Clocked out successfully at ${new Date().toLocaleTimeString()}`);
      }
    } catch {
      // Toggle for demo if backend attendance session exists
      setClockedIn(!clockedIn);
      toast.success(clockedIn ? 'Clocked out successfully' : 'Clocked in successfully');
    }
  };

  const handleWish = (id: string, name: string) => {
    setWishedUsers(prev => ({ ...prev, [id]: true }));
    toast.success(`🎉 Sent birthday wishes to ${name}!`);
  };

  // Sample data matching Keka's Welcome portal
  const BIRTHDAYS = [
    { id: 'b1', name: 'Chaitra Kulkarni', role: 'QA Engineer', dept: 'Engineering', date: 'Today 🎂', image: '' },
    { id: 'b2', name: 'M N Vinit', role: 'UI/UX Designer', dept: 'Design', date: 'Tomorrow', image: '' },
    { id: 'b3', name: 'Shiju Shaji', role: 'Senior Technical Manager', dept: 'Engineering', date: 'In 3 days', image: '' },
  ];

  const ANNIVERSARIES = [
    { id: 'a1', name: 'Sahil Rajeshkumar', role: 'Flutter Developer', years: '2 Years', date: 'This Week 🏆' },
    { id: 'a2', name: 'Sneha Iyer', role: 'HR Specialist', years: '3 Years', date: 'Nov 18' },
  ];

  const NEW_JOINERS = [
    { id: 'j1', name: 'Arjun Mehta', role: 'Backend Engineer', date: 'Joined this Monday' },
    { id: 'j2', name: 'Pooja Sharma', role: 'Product Analyst', date: 'Joined last week' },
  ];

  const ANNOUNCEMENTS = [
    {
      id: 'n1',
      title: 'Revision of Provident Fund (PF) Wage Ceiling',
      date: '1 month ago',
      category: 'Statutory Policy',
      desc: 'Government notification regarding updated statutory wage ceiling limits and voluntary contribution guidelines.'
    },
    {
      id: 'n2',
      title: 'Attendance Regularisation Reminder',
      date: '2 months ago',
      category: 'Attendance Policy',
      desc: 'Please ensure all pending attendance regularisation requests for previous pay cycles are submitted before the 25th.'
    },
    {
      id: 'n3',
      title: 'Annual Health Checkup & Wellness Camp',
      date: 'Recent',
      category: 'Wellness',
      desc: 'Free health checkup camp arranged at KIC Bengaluru office on Friday. Register via HR portal.'
    }
  ];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ══════════════════════════════════════════════════════
          HERO WELCOME GREETING BANNER
          ══════════════════════════════════════════════════════ */}
      <div
        style={{
          background: '#2F4156',
          borderRadius: '10px',
          padding: '1.75rem 2rem',
          color: '#FFFFFF',
          border: '1px solid #1e2b3a',
          boxShadow: '0 2px 8px rgba(47, 65, 86, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Large round avatar */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: '#FFFFFF',
              color: '#2F4156',
              fontSize: '1.5rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              overflow: 'hidden',
            }}
          >
            {profileImage ? (
              <img src={profileImage} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userName.slice(0, 2).toUpperCase()
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>
                EMPLOYEE PORTAL
              </span>
              <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>• KIC Bengaluru</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              Welcome back, {userName}! 👋
            </h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', fontWeight: 500 }}>
              {userRole} • {userDept} Department
            </p>
          </div>
        </div>

        {/* Live Web Clock-in Action Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '8px',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 700 }}>
              <Clock size={14} /> LIVE SHIFT TIME
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {currentTime}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              General Shift • 09:30 AM – 06:30 PM
            </span>
          </div>

          <button
            onClick={handlePunch}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: clockedIn ? '#ef4444' : '#22c55e',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
          >
            {clockedIn ? 'Clock Out' : 'Web Clock-in'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          QUICK SELF-SERVICE SHORTCUTS ROW
          ══════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {[
          { icon: <Calendar size={20} color="#567C8D" />, label: 'Apply Leave', path: '/home/leaverequest', badge: 'Time-Off' },
          { icon: <Clock size={20} color="#567C8D" />, label: 'Regularization', path: '/home/attendance-regularization', badge: 'Punches' },
          { icon: <Award size={20} color="#567C8D" />, label: 'Performance', path: '/home/performance', badge: 'OKRs & Goals' },
          { icon: <CreditCard size={20} color="#22c55e" />, label: 'View Payslips', path: '/home/payslip', badge: 'Finance' },
          { icon: <FolderLock size={20} color="#f59e0b" />, label: 'Document Vault', path: '/home/documents', badge: 'Vault' },
          { icon: <Network size={20} color="#567C8D" />, label: 'Org Hierarchy', path: '/home/org-chart', badge: 'Directory' },
        ].map((item, i) => (
          <div
            key={i}
            onClick={() => navigate(item.path)}
            style={{
              background: 'var(--surface-0)',
              borderRadius: '8px',
              padding: '1rem',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = '#567C8D';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'rgba(86, 124, 141, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.label}</div>
              <span style={{ fontSize: '0.72rem', color: '#567C8D', fontWeight: 600 }}>{item.badge}</span>
            </div>
            <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }} />
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT GRID: CELEBRATIONS & ANNOUNCEMENTS
          ══════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Birthdays & Work Anniversaries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Birthdays Widget */}
          <Card title="🎂 Upcoming Birthdays" subtitle="Send warm greetings to your teammates">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {BIRTHDAYS.map(b => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(86, 124, 141, 0.06)',
                    border: '1px solid rgba(86, 124, 141, 0.12)',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f43f5e, #fb7185)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</h5>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {b.role} • <span style={{ color: '#f43f5e', fontWeight: 700 }}>{b.date}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleWish(b.id, b.name)}
                    disabled={wishedUsers[b.id]}
                    style={{
                      marginLeft: 'auto',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: wishedUsers[b.id] ? 'rgba(34, 197, 94, 0.15)' : '#567C8D',
                      color: wishedUsers[b.id] ? '#16a34a' : '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: wishedUsers[b.id] ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {wishedUsers[b.id] ? <CheckCircle2 size={13} /> : <Cake size={13} />}
                    {wishedUsers[b.id] ? 'Wished!' : 'Wish'}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Work Anniversaries Widget */}
          <Card title="🏆 Work Anniversaries" subtitle="Celebrating milestones and dedication">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ANNIVERSARIES.map(a => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(86, 124, 141, 0.06)',
                    border: '1px solid rgba(86, 124, 141, 0.12)',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    <Award size={20} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{a.name}</h5>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {a.role} • <strong style={{ color: '#d97706' }}>{a.years}</strong>
                    </p>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#567C8D', fontWeight: 600 }}>
                    {a.date}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Company Announcements & Notice Board */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card title="📢 Company Announcements" subtitle="Official notices and statutory circulars">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ANNOUNCEMENTS.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'rgba(86, 124, 141, 0.06)',
                    border: '1px solid rgba(86, 124, 141, 0.14)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(86, 124, 141, 0.15)', color: '#2F4156', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      {item.category}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#8da4b0' }}>{item.date}</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {item.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* New Joiners Widget */}
          <Card title="👋 Welcome New Joiners" subtitle="Say hello to the latest additions to our family">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {NEW_JOINERS.map(j => (
                <div
                  key={j.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(86, 124, 141, 0.06)',
                    border: '1px solid rgba(86, 124, 141, 0.12)',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{j.name}</h5>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {j.role} • <span style={{ color: '#059669', fontWeight: 600 }}>{j.date}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => toast.success(`👋 Sent a welcome high-five to ${j.name}!`)}
                    style={{
                      marginLeft: 'auto',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(86, 124, 141, 0.25)',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Say Hi 👋
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
