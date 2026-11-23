import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sun, Moon, Menu, User, Settings, LogOut, ChevronDown, Bell,
  Megaphone, CheckCircle2, Clock, Calendar, Sparkles, ExternalLink,
  Network, CreditCard, FolderLock, FileText, Shield
} from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import { logout } from '../../lib/auth';
import { HariHrmsLogo } from '../common/HariHrmsLogo';
import { userApi } from '../../services/api.service';
import { resolveAssetUrl } from '../../lib/api';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  read: boolean;
  type: 'announcement' | 'attendance' | 'payroll' | 'leave';
  link?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Announcement: Revision of Provident Fund (PF) Wage Ceiling',
    time: '1mo',
    read: false,
    type: 'announcement',
    link: '/home/feed',
  },
  {
    id: 'notif-2',
    title: 'New Announcement: Attendance Regularisation Reminder',
    time: '2mo',
    read: false,
    type: 'announcement',
    link: '/home/feed',
  },
  {
    id: 'notif-3',
    title: 'System Notice: February Salary Slips Ready for Download',
    time: '2d',
    read: false,
    type: 'payroll',
    link: '/home/payslip',
  },
  {
    id: 'notif-4',
    title: 'Leave Request Approved: Casual Leave (2 Days)',
    time: '3d',
    read: true,
    type: 'leave',
    link: '/home/leaverequest',
  },
];

function Topbar() {
  const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [profilePhoto, setProfilePhoto] = useState<string>(localStorage.getItem('profileImage') || '');

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const userName = localStorage.getItem('user_name') || 'Guest';
  const userRole = localStorage.getItem('position') || 'User';
  const userId = localStorage.getItem('userId') || '';

  // Close dropdowns on location changes
  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  // Fetch latest profile photo on mount
  useEffect(() => {
    if (userId) {
      userApi.getUserById(userId)
        .then(res => {
          if (res.data?.profile_image) {
            setProfilePhoto(res.data.profile_image);
            localStorage.setItem('profileImage', res.data.profile_image);
          }
        })
        .catch(() => {});
    }

    const handleProfileUpdate = () => {
      const stored = localStorage.getItem('profileImage');
      if (stored) setProfilePhoto(stored);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [userId]);

  // Handle outside clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/', { replace: true });
  }, [navigate]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('Marked all notifications as read');
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    setNotifOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div className="layout-topbar">
      <div className="layout-topbar-logo-container">
        {/* Mobile-only hamburger */}
        <button
          type="button"
          className="layout-menu-button layout-topbar-action mobile-menu-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
          }}
          aria-label="Toggle menu"
          title="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="layout-topbar-logo" style={{ textDecoration: 'none' }}>
          <HariHrmsLogo size={34} showText={true} />
        </Link>
      </div>

      <div className="layout-topbar-actions">
        {/* User Info & Theme Toggle */}
        <div className="layout-config-menu">
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <small className="user-role">{userRole}</small>
          </div>
          <button
            type="button"
            className="layout-topbar-action"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            NOTIFICATIONS BELL & KEKA-STYLE DROPDOWN
            ══════════════════════════════════════════════════════ */}
        <div className="notif-menu-container" ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="layout-topbar-action"
            onClick={() => setNotifOpen(prev => !prev)}
            aria-label="Notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 0 2px var(--surface-0)',
                }}
              />
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              {/* Notifications Header */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(86, 124, 141, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Notifications
                </h4>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#567C8D',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No notifications right now
                  </div>
                ) : (
                  notifications.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      style={{
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(86, 124, 141, 0.08)',
                        background: item.read ? 'transparent' : 'rgba(124, 58, 237, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(86, 124, 141, 0.08)')}
                      onMouseOut={e => (e.currentTarget.style.background = item.read ? 'transparent' : 'rgba(124, 58, 237, 0.04)')}
                    >
                      {/* Megaphone icon in soft cyan/teal circle */}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(200, 217, 230, 0.4)',
                          color: '#567C8D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        <Megaphone size={16} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.82rem',
                            fontWeight: item.read ? 500 : 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.title}
                        </p>
                        <span style={{ fontSize: '0.72rem', color: '#8da4b0', marginTop: '4px', display: 'inline-block' }}>
                          {item.time}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '10px 18px',
                  background: 'rgba(86, 124, 141, 0.05)',
                  borderTop: '1px solid rgba(86, 124, 141, 0.12)',
                  textAlign: 'center',
                }}
              >
                <Link
                  to="/home/feed"
                  onClick={() => setNotifOpen(false)}
                  style={{ fontSize: '0.78rem', color: '#567C8D', fontWeight: 700, textDecoration: 'none' }}
                >
                  View all announcements in Company Feed →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            PROFILE AVATAR WITH REAL PHOTO & DROPDOWN MENU
            ══════════════════════════════════════════════════════ */}
        <div className="profile-menu-container" ref={profileRef}>
          <button
            type="button"
            className="layout-topbar-action profile-btn"
            onClick={() => setProfileOpen(prev => !prev)}
            aria-label="Profile menu"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px' }}
          >
            {/* Real Profile Image Avatar */}
            <div
              className="profile-avatar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #2F4156, #567C8D)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                border: '1.5px solid rgba(86, 124, 141, 0.3)',
              }}
            >
              {profilePhoto ? (
                <img
                  src={resolveAssetUrl(profilePhoto)}
                  alt={userName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                userName.slice(0, 2).toUpperCase()
              )}
            </div>
            <ChevronDown size={14} className={`profile-chevron ${profileOpen ? 'open' : ''}`} />
          </button>

          {profileOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <p className="profile-dropdown-name">{userName}</p>
                <p className="profile-dropdown-role">{userRole}</p>
              </div>
              <div className="profile-dropdown-divider" />
              <button
                className="profile-dropdown-item primary-profile-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/home/profile');
                }}
              >
                <User size={18} color="#567C8D" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>My Profile</span>
                  <small style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Personal, IDs, Documents, Family</small>
                </div>
              </button>
              <div className="profile-dropdown-divider" />
              <button
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/home/welcome');
                }}
              >
                <Sparkles size={16} />
                <span>Employee Welcome Hub</span>
              </button>
              <button
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/home/salary');
                }}
              >
                <CreditCard size={16} />
                <span>Salary & Compensation</span>
              </button>
              <button
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/home/documents');
                }}
              >
                <FolderLock size={16} />
                <span>Document Vault</span>
              </button>
              <button
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/home/org-chart');
                }}
              >
                <Network size={16} />
                <span>Org Hierarchy</span>
              </button>
              <div className="profile-dropdown-divider" />
              <button
                className="profile-dropdown-item danger"
                onClick={() => {
                  setProfileOpen(false);
                  handleLogout();
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Topbar);
