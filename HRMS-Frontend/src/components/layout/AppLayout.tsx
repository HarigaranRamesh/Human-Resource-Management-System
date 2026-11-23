import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLayout } from '../../context/LayoutContext';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import Footer from './Footer';

export default function AppLayout() {
  const { config, state, hideMenu } = useLayout();
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    hideMenu();
  }, [location.pathname]);

  const getContainerClass = () => {
    const classes = ['layout-wrapper'];
    if (config.menuMode === 'overlay') classes.push('layout-overlay');
    if (config.menuMode === 'static') classes.push('layout-static');
    if (state.staticMenuDesktopInactive && config.menuMode === 'static') classes.push('layout-static-inactive');
    if (state.overlayMenuActive) classes.push('layout-overlay-active');
    if (state.staticMenuMobileActive) classes.push('layout-mobile-active');
    return classes.join(' ');
  };

  return (
    <div className={getContainerClass()}>
      <Topbar />
      <Sidebar />
      <div className="layout-main-container">
        <div className="layout-main">
          <Outlet />
        </div>
        <Footer />
      </div>
      <div className="layout-mask" onClick={hideMenu} />
    </div>
  );
}
