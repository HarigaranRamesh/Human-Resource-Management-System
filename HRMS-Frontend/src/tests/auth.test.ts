import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide standard in-memory localStorage for Node testing environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
  configurable: true,
});

import {
  decodeToken,
  saveToken,
  getToken,
  isLoggedIn,
  logout,
  isSystemAdmin,
  isStaffOrAdmin,
  ROUTE_MAP,
} from '../lib/auth';

describe('Frontend Authentication Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should return null for malformed token', () => {
    expect(decodeToken('invalid-token')).toBeNull();
    expect(decodeToken('')).toBeNull();
  });

  it('should correctly decode valid base64 token payload', () => {
    const payload = {
      id: 'usr_123',
      user_name: 'Harigaran',
      roleName: 'Super Admin',
      isSystemAdmin: true,
      access: ['dashboard', 'payroll']
    };
    const encoded = btoa(JSON.stringify(payload));
    const token = `header.${encoded}.signature`;

    const decoded = decodeToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded.user_name).toBe('Harigaran');
    expect(decoded.roleName).toBe('Super Admin');
    expect(decoded.isSystemAdmin).toBe(true);
  });

  it('saveToken should persist token and user details to localStorage', () => {
    const payload = {
      id: 'usr_456',
      user_name: 'Enterprise Admin',
      roleName: 'HR Manager',
      position: 'HR Head',
      department: 'Human Resources',
      isSystemAdmin: false,
      access: ['payroll', 'attendance']
    };
    const encoded = btoa(JSON.stringify(payload));
    const token = `header.${encoded}.signature`;

    saveToken(token);

    expect(getToken()).toBe(token);
    expect(isLoggedIn()).toBe(true);
    expect(localStorage.getItem('user_name')).toBe('Enterprise Admin');
    expect(localStorage.getItem('userRole')).toBe('HR Manager');
    expect(isSystemAdmin()).toBe(false);
    expect(isStaffOrAdmin()).toBe(true);
  });

  it('logout should clear localStorage', () => {
    localStorage.setItem('authToken', 'sample-token');
    localStorage.setItem('user_name', 'Admin');

    expect(isLoggedIn()).toBe(true);
    logout();
    expect(getToken()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it('ROUTE_MAP should define valid routes for core HRMS modules', () => {
    expect(ROUTE_MAP['Dashboard']).toBe('/');
    expect(ROUTE_MAP['Welcome']).toBe('/home/welcome');
    expect(ROUTE_MAP['Access Control']).toBe('/home/access');
    expect(ROUTE_MAP['User Management']).toBe('/home/view-user');
    expect(ROUTE_MAP['Payroll & Payslip']).toBe('/home/payroll');
  });
});
