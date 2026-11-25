import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sun, Moon, Menu, User, Settings, LogOut, ChevronDown, Bell,
  Megaphone, CheckCircle2, Clock, Calendar, Sparkles, ExternalLink,
  Network, CreditCard, FolderLock, FileText, Shield, Search
} from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import { logout, buildMenuFromToken } from '../../lib/auth';
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

interface QuickAction {
  id: string;
  label: string;
  category: string;
  path: string;
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

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'act-1', label: 'Apply Leave', category: 'Leave & Attendance', path: '/home/leaverequest' },
  { id: 'act-2', label: 'Attendance Regularization', category: 'Leave & Attendance', path: '/home/attendance-regularization' },
  { id: 'act-3', label: 'View Salary Payslip', category: 'Finances & Payroll', path: '/home/payslip' },
  { id: 'act-4', label: 'Performance Goals & Reviews', category: 'Performance', path: '/home/performance' },
  { id: 'act-5', label: 'Helpdesk & Support Tickets', category: 'Organization', path: '/home/helpdesk' },
  { id: 'act-6', label: 'Resignation & Exit Clearance', category: 'Organization', path: '/home/resignation' },
  { id: 'act-7', label: 'Organization Chart', category: 'Organization', path: '/home/org-chart' },
  { id: 'act-8', label: 'Employee Directory', category: 'Organization', path: '/home/users' },
  { id: 'act-9', label: 'My Profile & Documents', category: 'Me', path: '/home/profile' },
  { id: 'act-10', label: 'Employee Welcome Hub', category: 'Home', path: '/home/welcome' },
];

function Topbar() {
  const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [profilePhoto, setProfilePhoto] = useState<string>(localStorage.getItem('profileImage') || '');

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userName = localStorage.getItem('user_name') || 'Harigaran Ramesh';
  const userRole = localStorage.getItem('position') || 'Staff';
  const userId = localStorage.getItem('userId') || '';
  const companyName = localStorage.getItem('company_name') || 'Prestige Holiday Resorts LLP.';

  // Close dropdowns on location changes
  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
    setSearchOpen(false);
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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut listener: Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Filter actions for quick search
  const filteredActions = QUICK_ACTIONS.filter(act =>
    act.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    act.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keka-Style: Subcategories for the current active section
  const menu = buildMenuFromToken();
  const currentPath = location.pathname;

  const activeCategory = menu.find(cat =>
    cat.items.some(item => {
      const cleanItemPath = item.path.split('?')[0];
      const cleanCurrentPath = currentPath.split('?')[0];
      return (
        cleanItemPath === cleanCurrentPath ||
        (cleanItemPath !== '/' && cleanItemPath !== '/dashboard' && cleanCurrentPath.startsWith(cleanItemPath))
      );
    })
  ) || menu[0];

  const subcategories = activeCategory?.items || [];

  return (
    <header className="layout-topbar" role="banner">
      {/* ══════════════════════════════════════════════════════
          TIER 1: MAIN HEADER BAR (54px)
          Logo, Company Name, Global Pill Search, Actions
          ══════════════════════════════════════════════════════ */}
      <div className="layout-topbar-primary">
        <div className="layout-topbar-logo-container">
          {/* Mobile hamburger button */}
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
            style={{ color: '#FFFFFF' }}
          >
            <Menu size={20} />
          </button>

          <Link to="/" className="layout-topbar-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HariHrmsLogo size={28} showText={false} />
            <span className="topbar-company-name">{companyName}</span>
          </Link>
        </div>

        {/* Center: Search employees or actions (Ex: Apply Leave)  ⌘ + K */}
        <div className="topbar-search-wrapper" ref={searchRef}>
          <Search size={15} className="topbar-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="topbar-search-input"
            placeholder="Search employees or actions (Ex: Apply Leave)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            aria-label="Search employees or actions"
          />
          <span className="topbar-search-kbd">⌘ + K</span>

          {searchOpen && (
            <div className="topbar-search-dropdown" role="listbox">
              {filteredActions.length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#64748B' }}>
                  No matching actions found
                </div>
              ) : (
                filteredActions.map(action => (
                  <div
                    key={action.id}
                    className="topbar-search-item"
                    role="option"
                    aria-selected="false"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      navigate(action.path);
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{action.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{action.category}</div>
                    </div>
                    <ExternalLink size={13} color="#94A3B8" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Actions: User info, Theme switch, Notifications, Profile avatar */}
        <div className="layout-topbar-actions">
          <div className="layout-config-menu">
            <div className="user-info">
              <span className="user-name" style={{ color: '#FFFFFF' }}>{userName}</span>
              <small className="user-role" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{userRole}</small>
            </div>
            <button
              type="button"
              className="layout-topbar-action"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{ color: '#FFFFFF' }}
            >
              {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Notifications Bell */}
          <div className="notif-menu-container" ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="layout-topbar-action"
              onClick={() => setNotifOpen(prev => !prev)}
              aria-label="Notifications"
              style={{ position: 'relative', color: '#FFFFFF' }}
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
                    boxShadow: '0 0 0 2px #2F4156',
                  }}
                />
              )}
            </button>

            {notifOpen && (
              <div className="notif-dropdown">
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

          {/* Profile Avatar & Menu */}
          <div className="profile-menu-container" ref={profileRef}>
            <button
              type="button"
              className="layout-topbar-action profile-btn"
              onClick={() => setProfileOpen(prev => !prev)}
              aria-label="Profile menu"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', color: '#FFFFFF' }}
            >
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
                  border: '1.5px solid rgba(255, 255, 255, 0.4)',
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

      {/* ══════════════════════════════════════════════════════
          TIER 2: SECONDARY SUB-BAR (42px)
          Horizontal sideways subcategory navigation with Keka active indicator
          ══════════════════════════════════════════════════════ */}
      {subcategories.length > 0 && (
        <div className="layout-topbar-subbar">
          <nav className="topbar-subbar-nav" aria-label="Sub-navigation">
            {subcategories.map((sub, idx) => {
              const cleanSubPath = sub.path.split('?')[0];
              const cleanCurPath = currentPath.split('?')[0];
              const isActive =
                cleanSubPath === cleanCurPath ||
                (cleanSubPath !== '/' && cleanSubPath !== '/dashboard' && cleanCurPath.startsWith(cleanSubPath));
              const isWelcome = sub.label.toLowerCase() === 'welcome';

              return (
                <Link
                  key={sub.path || idx}
                  to={sub.path}
                  className={`topbar-subbar-tab ${isActive ? 'active' : ''}`}
                  title={sub.label}
                >
                  <span>{sub.label.toUpperCase()}</span>
                  {isWelcome && <span className="topbar-tab-dot" title="New feature update" />}
                  {isActive && <span className="topbar-tab-triangle" />}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

export default React.memo(Topbar);
