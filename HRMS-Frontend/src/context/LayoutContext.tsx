import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface LayoutConfig {
  menuMode: 'static' | 'overlay';
  darkTheme: boolean;
}

interface LayoutState {
  staticMenuDesktopInactive: boolean;
  overlayMenuActive: boolean;
  staticMenuMobileActive: boolean;
  menuHoverActive: boolean;
}

interface LayoutContextType {
  config: LayoutConfig;
  state: LayoutState;
  toggleMenu: () => void;
  toggleDarkMode: () => void;
  isDesktop: () => boolean;
  isSidebarActive: boolean;
  isDarkTheme: boolean;
  hideMenu: () => void;
}

const defaultConfig: LayoutConfig = {
  menuMode: 'static',
  darkTheme: false,
};

const defaultState: LayoutState = {
  staticMenuDesktopInactive: false,
  overlayMenuActive: false,
  staticMenuMobileActive: false,
  menuHoverActive: false,
};

const LayoutContext = createContext<LayoutContextType>({} as LayoutContextType);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LayoutConfig>(() => {
    try {
      const stored = localStorage.getItem('hrms-layout-config');
      return stored ? JSON.parse(stored) : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const [state, setState] = useState<LayoutState>(defaultState);

  useEffect(() => {
    localStorage.setItem('hrms-layout-config', JSON.stringify(config));
    if (config.darkTheme) {
      document.documentElement.classList.add('app-dark');
    } else {
      document.documentElement.classList.remove('app-dark');
    }
  }, [config]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991) {
        setState(prev => {
          if (prev.staticMenuMobileActive || prev.overlayMenuActive) {
            return { ...prev, staticMenuMobileActive: false, overlayMenuActive: false };
          }
          return prev;
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = useCallback(() => window.innerWidth > 991, []);

  const toggleMenu = useCallback(() => {
    setState(prev => {
      const isMobile = window.innerWidth <= 991 || window.matchMedia('(max-width: 991px)').matches;
      if (isMobile) {
        const nextMobileState = !prev.staticMenuMobileActive;
        return {
          ...prev,
          staticMenuMobileActive: nextMobileState,
          overlayMenuActive: nextMobileState,
        };
      }
      return {
        ...prev,
        staticMenuDesktopInactive: !prev.staticMenuDesktopInactive,
      };
    });
  }, []);

  const hideMenu = useCallback(() => {
    setState(prev => {
      if (!prev.overlayMenuActive && !prev.staticMenuMobileActive && !prev.menuHoverActive) {
        return prev;
      }
      return { ...prev, overlayMenuActive: false, staticMenuMobileActive: false, menuHoverActive: false };
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    setConfig(prev => ({ ...prev, darkTheme: !prev.darkTheme }));
  }, []);

  const isSidebarActive = state.overlayMenuActive || state.staticMenuMobileActive;
  const isDarkTheme = config.darkTheme;

  const value = useMemo(() => ({
    config,
    state,
    toggleMenu,
    toggleDarkMode,
    isDesktop,
    isSidebarActive,
    isDarkTheme,
    hideMenu,
  }), [config, state, toggleMenu, toggleDarkMode, isDesktop, isSidebarActive, isDarkTheme, hideMenu]);

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
