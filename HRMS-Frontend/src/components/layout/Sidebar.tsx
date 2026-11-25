import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Users,
  Network,
  Clock,
  CalendarDays,
  CreditCard,
  FolderLock,
  Bell,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Briefcase,
  Layers,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  X,
  UserCheck,
  Award,
} from 'lucide-react';
import { buildMenuFromToken, logout } from '../../lib/auth';
import { useLayout } from '../../context/LayoutContext';
import { HariHrmsLogo } from '../common/HariHrmsLogo';

interface SubItem {
  label: string;
  icon: string;
  path: string;
}

interface MenuItem {
  label: string;
  icon: string;
  items: SubItem[];
}

// Map category labels to representative icons
function getCategoryIcon(label: string) {
  const l = (label || '').toLowerCase();
  if (l === 'home' || l.startsWith('home')) {
    return <Home size={20} />;
  }
  if (l.includes('workspace') || l.includes('dash')) {
    return <LayoutDashboard size={20} />;
  }
  if (l.includes('org') || l.includes('tree') || l.includes('hierarch')) {
    return <Network size={20} />;
  }
  if (l.includes('employee') || l.includes('user') || l.includes('member') || l.includes('staff')) {
    return <Users size={20} />;
  }
  if (l.includes('attend') || l.includes('time') || l.includes('clock') || l.includes('report')) {
    return <Clock size={20} />;
  }
  if (l.includes('leave') || l.includes('vacation') || l.includes('holiday')) {
    return <CalendarDays size={20} />;
  }
  if (l.includes('pay') || l.includes('salary') || l.includes('comp') || l.includes('finance')) {
    return <CreditCard size={20} />;
  }
  if (l.includes('doc') || l.includes('vault') || l.includes('file')) {
    return <FolderLock size={20} />;
  }
  if (l.includes('feed') || l.includes('announc') || l.includes('notice')) {
    return <Bell size={20} />;
  }
  if (l.includes('access') || l.includes('role') || l.includes('perm') || l.includes('secur')) {
    return <ShieldCheck size={20} />;
  }
  if (l.includes('asset') || l.includes('device') || l.includes('item')) {
    return <Layers size={20} />;
  }
  if (l.includes('perform') || l.includes('okr') || l.includes('goal')) {
    return <Award size={20} />;
  }
  if (l.includes('certif') || l.includes('letter') || l.includes('loa')) {
    return <Award size={20} />;
  }
  return <Briefcase size={20} />;
}

// Generate a concise 1-word micro-label for desktop dock
function getMicroLabel(label: string): string {
  const l = (label || '').trim();
  if (l.toLowerCase() === 'home' || l.toLowerCase().startsWith('home')) return 'Home';
  if (l.toLowerCase().includes('workspace')) return 'Desk';
  if (l.toLowerCase().includes('dashboard')) return 'Home';
  if (l.toLowerCase().includes('organization')) return 'Org';
  if (l.toLowerCase().includes('employee')) return 'Staff';
  if (l.toLowerCase().includes('attendance')) return 'Time';
  if (l.toLowerCase().includes('leave')) return 'Leave';
  if (l.toLowerCase().includes('payroll')) return 'Payroll';
  if (l.toLowerCase().includes('salary')) return 'Salary';
  if (l.toLowerCase().includes('document')) return 'Docs';
  if (l.toLowerCase().includes('certif') || l.toLowerCase().includes('letter')) return 'Letters';
  if (l.toLowerCase().includes('perform') || l.toLowerCase().includes('okr')) return 'Goals';
  if (l.toLowerCase().includes('helpdesk') || l.toLowerCase().includes('ticket')) return 'Help';
  if (l.toLowerCase().includes('feed')) return 'Feed';
  if (l.toLowerCase().includes('access')) return 'Access';
  if (l.toLowerCase().includes('asset')) return 'Assets';
  return l.split(' ')[0] || 'Menu';
}

function Sidebar() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [hoveredItem, setHoveredItem] = useState<MenuItem | null>(null);
  const [lockedItem, setLockedItem] = useState<MenuItem | null>(null);
  const [flyoutTop, setFlyoutTop] = useState<number>(0);
  const [isMobileView, setIsMobileView] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 991);
  const [expandedMobileCategories, setExpandedMobileCategories] = useState<Record<string, boolean>>({});

  const location = useLocation();
  const navigate = useNavigate();
  const { hideMenu, toggleDarkMode, isDarkTheme } = useLayout();
  const leaveTimeoutRef = useRef<any>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const userName = localStorage.getItem('user_name') || 'Guest User';
  const userRole = localStorage.getItem('position') || 'Staff';

  useEffect(() => {
    setMenu(buildMenuFromToken());
  }, []);

  // Track window resize to toggle between mobile drawer and desktop slim dock
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 991;
      setIsMobileView(mobile);
      if (!mobile) {
        hideMenu();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hideMenu]);

  // Close flyout on route changes
  useEffect(() => {
    setHoveredItem(null);
    setLockedItem(null);
  }, [location.pathname]);

  // Automatically expand active category in mobile view
  useEffect(() => {
    if (isMobileView && menu.length > 0) {
      const activeCat = menu.find(item =>
        item.items.some(sub => location.pathname === sub.path || (sub.path !== '/' && location.pathname.startsWith(sub.path)))
      );
      if (activeCat) {
        setExpandedMobileCategories(prev => ({ ...prev, [activeCat.label]: true }));
      }
    }
  }, [location.pathname, isMobileView, menu]);

  // Click outside to dismiss locked flyout (Desktop)
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.sidebar-icon-item')
      ) {
        setLockedItem(null);
        setHoveredItem(null);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const handleMouseEnter = useCallback((item: MenuItem, e: React.MouseEvent<HTMLElement>) => {
    if (isMobileView) return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const top = Math.min(rect.top, window.innerHeight - 340);
    setFlyoutTop(Math.max(12, top));
    setHoveredItem(item);
  }, [isMobileView]);

  const handleMouseLeave = useCallback(() => {
    if (isMobileView) return;
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 200);
  }, [isMobileView]);

  const handleFlyoutMouseEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  }, []);

  const handleFlyoutMouseLeave = useCallback(() => {
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 200);
  }, []);

  const handleCategoryClick = useCallback((item: MenuItem, e: React.MouseEvent<HTMLElement>) => {
    if (isMobileView) {
      // Toggle accordion in mobile drawer
      setExpandedMobileCategories(prev => ({
        ...prev,
        [item.label]: !prev[item.label],
      }));
      return;
    }

    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const top = Math.min(rect.top, window.innerHeight - 340);
    setFlyoutTop(Math.max(12, top));
    if (lockedItem?.label === item.label) {
      setLockedItem(null);
      setHoveredItem(null);
    } else {
      setLockedItem(item);
      setHoveredItem(item);
    }
  }, [isMobileView, lockedItem]);

  const handleSubItemClick = useCallback(() => {
    setHoveredItem(null);
    setLockedItem(null);
    hideMenu();
  }, [hideMenu]);

  const handleLogout = () => {
    hideMenu();
    logout();
    navigate('/', { replace: true });
  };

  const isGroupActive = useCallback((item: MenuItem) => {
    return item.items.some(
      (sub) => location.pathname === sub.path || (sub.path !== '/' && location.pathname.startsWith(sub.path))
    );
  }, [location.pathname]);

  const activeFlyoutItem = hoveredItem || lockedItem;

  // ═════════════════════════════════════════════════════════════
  // MOBILE DRAWER VIEW (when window <= 991px)
  // Full 280px drawer with accordion categories and smooth touch navigation
  // ═════════════════════════════════════════════════════════════
  if (isMobileView) {
    return (
      <aside
        className="layout-sidebar mobile-drawer"
        role="navigation"
        aria-label="Mobile Navigation Drawer"
      >
        {/* Drawer Header: Logo + Close Button */}
        <div className="mobile-drawer-header">
          <Link to="/" className="mobile-drawer-brand" onClick={hideMenu}>
            <HariHrmsLogo size={34} showText={true} />
          </Link>
          <button
            type="button"
            className="mobile-drawer-close-btn"
            onClick={hideMenu}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="mobile-drawer-user">
          <div className="mobile-drawer-avatar">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="mobile-drawer-user-info">
            <span className="mobile-drawer-user-name">{userName}</span>
            <span className="mobile-drawer-user-role">{userRole}</span>
          </div>
        </div>

        {/* Accordion Navigation Menu */}
        <div className="mobile-drawer-scroll">
          <div className="mobile-drawer-menu">
            {menu.map((item) => {
              const active = isGroupActive(item);
              const isExpanded = !!expandedMobileCategories[item.label];

              return (
                <div key={item.label} className="mobile-nav-group">
                  <button
                    type="button"
                    className={`mobile-nav-category-btn ${active ? 'active' : ''}`}
                    onClick={(e) => handleCategoryClick(item, e)}
                  >
                    <div className="mobile-nav-cat-left">
                      <span className="mobile-nav-icon">{getCategoryIcon(item.label)}</span>
                      <span className="mobile-nav-title">{item.label}</span>
                    </div>
                    {item.items.length > 0 && (
                      <ChevronDown
                        size={16}
                        className={`mobile-nav-chevron ${isExpanded ? 'expanded' : ''}`}
                      />
                    )}
                  </button>

                  {/* Sub-items accordion */}
                  {isExpanded && item.items.length > 0 && (
                    <div className="mobile-nav-subitems">
                      {item.items.map((sub) => {
                        const isSubActive =
                          location.pathname === sub.path ||
                          (sub.path !== '/' && location.pathname.startsWith(sub.path));

                        return (
                          <NavLink
                            key={sub.path + sub.label}
                            to={sub.path}
                            className={`mobile-nav-sublink ${isSubActive ? 'active' : ''}`}
                            onClick={handleSubItemClick}
                            end={sub.path === '/'}
                          >
                            <ChevronRight size={14} className="mobile-sublink-chevron" />
                            <span className="mobile-sublink-text">{sub.label}</span>
                            {isSubActive && <span className="mobile-sublink-dot" />}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer: Theme & Logout */}
        <div className="mobile-drawer-footer">
          <button
            type="button"
            className="mobile-footer-btn"
            onClick={toggleDarkMode}
          >
            {isDarkTheme ? <Sun size={17} /> : <Moon size={17} />}
            <span>{isDarkTheme ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            type="button"
            className="mobile-footer-btn logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // DESKTOP VIEW (> 991px)
  // Slim 72px dock on left with high-speed glassmorphism hover flyout
  // ═════════════════════════════════════════════════════════════
  return (
    <>
      <aside
        className="layout-sidebar"
        role="navigation"
        aria-label="Desktop Pro Navigation"
      >
        {/* Top Brand Emblem */}
        <div className="sidebar-brand-container">
          <Link to="/" className="sidebar-brand-badge" title="NIRALIX HRMS" onClick={hideMenu}>
            <HariHrmsLogo size={40} />
          </Link>
        </div>

        {/* Center: Slim Category Icons */}
        <div className="sidebar-nav-scroll">
          <ul className="sidebar-icon-menu">
            {menu.map((item) => {
              const active = isGroupActive(item);
              const isSelected = activeFlyoutItem?.label === item.label;

              return (
                <li
                  key={item.label}
                  className={`sidebar-icon-item ${active ? 'sidebar-icon-item-active' : ''} ${isSelected ? 'sidebar-icon-item-hovered' : ''}`}
                  onMouseEnter={(e) => handleMouseEnter(item, e)}
                  onMouseLeave={handleMouseLeave}
                  onClick={(e) => handleCategoryClick(item, e)}
                >
                  <button
                    type="button"
                    className="sidebar-icon-button"
                    aria-label={item.label}
                    title={item.label}
                  >
                    <div className="sidebar-icon-glyph">
                      {getCategoryIcon(item.label)}
                    </div>
                    <span className="sidebar-micro-label">
                      {getMicroLabel(item.label)}
                    </span>
                    {active && <span className="sidebar-active-indicator" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bottom Actions: Theme Toggle */}
        <div className="sidebar-bottom-actions">
          <button
            type="button"
            className="sidebar-bottom-button"
            onClick={toggleDarkMode}
            title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </aside>

      {/* Desktop Hover / Click Submenu Flyout Panel */}
      {activeFlyoutItem && activeFlyoutItem.items.length > 0 && (
        <div
          ref={flyoutRef}
          className="sidebar-hover-flyout"
          style={{ top: `${flyoutTop}px`, left: '74px' }}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
        >
          {/* Header */}
          <div className="flyout-header">
            <div className="flyout-header-title-row">
              <span className="flyout-category-icon">
                {getCategoryIcon(activeFlyoutItem.label)}
              </span>
              <span className="flyout-category-title">
                {activeFlyoutItem.label}
              </span>
            </div>
            <span className="flyout-badge">
              {activeFlyoutItem.items.length} {activeFlyoutItem.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flyout-divider" />

          {/* Sub-categories List */}
          <ul className="flyout-list">
            {activeFlyoutItem.items.map((sub) => {
              const isSubActive =
                location.pathname === sub.path ||
                (sub.path !== '/' && location.pathname.startsWith(sub.path));

              return (
                <li key={sub.path + sub.label} className="flyout-list-item">
                  <NavLink
                    to={sub.path}
                    className={`flyout-link ${isSubActive ? 'flyout-link-active' : ''}`}
                    onClick={handleSubItemClick}
                    end={sub.path === '/'}
                  >
                    <ChevronRight size={14} className="flyout-link-chevron" />
                    <span className="flyout-link-text">{sub.label}</span>
                    {isSubActive && <span className="flyout-active-dot" />}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

export default React.memo(Sidebar);
