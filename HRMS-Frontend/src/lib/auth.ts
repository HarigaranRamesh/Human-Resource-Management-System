// src/lib/auth.ts — Auth utilities & 3-Tier Dynamic Navigation
export function decodeToken(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  localStorage.setItem('authToken', token);
  const decoded = decodeToken(token);
  if (decoded) {
    localStorage.setItem('user_name', decoded.user_name || '');
    localStorage.setItem('position', decoded.position || '');
    localStorage.setItem('department', decoded.department || '');
    localStorage.setItem('userRole', decoded.roleName || '');
    localStorage.setItem('isSystemAdmin', decoded.isSystemAdmin ? 'true' : 'false');
    localStorage.setItem('hasPayload', decoded.hasPayload ? 'true' : 'false');
    localStorage.setItem('requiresDocs', decoded.requiresDocs ? 'true' : 'false');
    localStorage.setItem('isCandidate', decoded.isCandidate ? 'true' : 'false');
    localStorage.setItem('userId', decoded.id || '');
    localStorage.setItem('userAccess', JSON.stringify(decoded.access || []));
  }
}

export function getToken(): string | null {
  return localStorage.getItem('authToken');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout() {
  localStorage.clear();
}

export function getDecodedAccess(): any[] {
  try {
    return JSON.parse(localStorage.getItem('userAccess') || '[]');
  } catch {
    return [];
  }
}

export function isSystemAdmin(): boolean {
  return localStorage.getItem('isSystemAdmin') === 'true';
}

export function isStaffOrAdmin(): boolean {
  if (isSystemAdmin()) return true;
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  return role.includes('admin') || role.includes('hr') || role.includes('manager');
}

export const ROUTE_MAP: Record<string, string> = {
  'Dashboard': '/',
  'Home': '/home/welcome',
  'Welcome': '/home/welcome',
  'Employee Welcome': '/home/welcome',
  'My Profile': '/home/profile',
  'Profile': '/home/profile',
  'Add User': '/home/adduser',
  'View Users': '/home/viewuser',
  'ViewEdit Users': '/home/viewedituser',
  'Employee Directory': '/home/viewuser',
  'Org Chart': '/home/org-chart',
  'Organization Hierarchy': '/home/org-chart',
  'Daily Report': '/home/dailyreport',
  'Monthly Report': '/home/monthlyreport',
  'Attendance': '/home/monthlyreport',
  'Leave Request': '/home/leaverequest',
  'Leave Applications': '/home/leaverequest',
  'Employee Leave Approval': '/home/leaveapproval',
  'Leave Approval': '/home/leaveapproval',
  'Yearly Leave Policy': '/home/yearlyleavyplocy',
  'Users Leave Policy Edit': '/home/userleaveedit',
  'Holiday Planning': '/home/holidayplanning',
  'Payslip': '/home/payslip',
  'My Payslips': '/home/payslip',
  'Salary Structure': '/home/salary',
  'Salary & Compensation': '/home/salary',
  'Document Vault': '/home/documents',
  'Documents': '/home/documents',
  'Feed': '/home/feed',
  'Company Feed': '/home/feed',
  'Shift Management': '/home/manage-shifts',
  'All Shifts': '/home/manage-shifts',
  'Asset Management': '/home/asset-management',
  'Access': '/home/access',
  'Access Define': '/home/access',
  'Letter of Appointment': '/home/letters?type=appointment',
  'Letters of Appointment': '/home/letters?type=appointment',
  'Appointment Letter': '/home/letters?type=appointment',
  'Offer Letter': '/home/letters?type=offer',
  'Experience Letter': '/home/letters?type=experience',
  'Certificate': '/home/letters',
  'All Templates': '/home/letters',
  // Keka Core Modules
  'Attendance Regularization': '/home/attendance-regularization',
  'Regularization': '/home/attendance-regularization',
  'Performance': '/home/performance',
  'Performance & OKRs': '/home/performance',
  'Goals & OKRs': '/home/performance',
  'Helpdesk': '/home/helpdesk',
  'HR Helpdesk': '/home/helpdesk',
  'Service Requests': '/home/helpdesk',
  'Resignation': '/home/resignation',
  'Exit Clearance': '/home/resignation',
  'Offboarding': '/home/resignation',
};

export function mapRoute(submenuName: string): string {
  const safeName = (submenuName || '').trim();
  const lowerName = safeName.toLowerCase();
  if (ROUTE_MAP[safeName]) return ROUTE_MAP[safeName];
  const foundKey = Object.keys(ROUTE_MAP).find(k => k.toLowerCase() === lowerName);
  if (foundKey) return ROUTE_MAP[foundKey];
  if (lowerName.includes('regulariz')) return '/home/attendance-regularization';
  if (lowerName.includes('perform') || lowerName.includes('okr') || lowerName.includes('goal')) return '/home/performance';
  if (lowerName.includes('helpdesk') || lowerName.includes('ticket')) return '/home/helpdesk';
  if (lowerName.includes('resign') || lowerName.includes('offboard') || lowerName.includes('exit')) return '/home/resignation';
  if (lowerName.includes('offer')) return '/home/letters?type=offer';
  if (lowerName.includes('experience')) return '/home/letters?type=experience';
  if (lowerName.includes('appoint') || lowerName.includes('loa') || lowerName.includes('certif')) return '/home/letters?type=appointment';
  if (lowerName.includes('shift')) return '/home/manage-shifts';
  if (lowerName.includes('tree') || lowerName.includes('org')) return '/home/org-chart';
  if (lowerName.includes('doc')) return '/home/documents';
  if (lowerName.includes('salary') || lowerName.includes('compensation')) return '/home/salary';
  if (lowerName.includes('leave') && lowerName.includes('app')) return '/home/leaveapproval';
  if (lowerName.includes('leave')) return '/home/leaverequest';
  if (lowerName.includes('pay')) return '/home/payslip';
  return '/';
}

export function buildMenuFromToken(): { label: string; icon: string; items: { label: string; icon: string; path: string }[] }[] {
  const token = getToken();
  if (!token) return [];
  try {
    const decoded = decodeToken(token);
    const access = decoded?.access || [];
    const isSysAdmin = decoded?.isSystemAdmin || false;
    const roleName = (decoded?.roleName || '').toLowerCase();
    const isAdmin = isSysAdmin || roleName.includes('admin') || roleName.includes('hr');

    // Top Category 1: Always Home with Welcome as the first page
    const homeCategory = {
      label: 'Home',
      icon: 'home',
      items: [
        { label: 'Welcome', icon: 'sparkles', path: '/home/welcome' },
        { label: 'Dashboard', icon: 'layout', path: '/dashboard' },
        { label: 'My Profile', icon: 'user', path: '/home/profile' },
      ],
    };

    // Filter out performance, task, petrol, assign, id-card as requested, and avoid duplicating Home/Dashboard
    const filteredAccess = access
      .filter((menu: any) => {
        const name = (menu.menuName || '').toLowerCase().trim();
        return !name.includes('performance') && !name.includes('task') && !name.includes('petrol') && !name.includes('assign') && !name.includes('id-card') && !name.includes('idcard') && !name.includes('home');
      })
      .map((menu: any) => ({
        label: menu.menuName,
        icon: 'folder',
        items: (menu.children || [])
          .filter((child: any) => {
            const sub = (child.submenuName || '').toLowerCase().trim();
            return !sub.includes('performance') && !sub.includes('task') && !sub.includes('petrol') && !sub.includes('assign') && !sub.includes('id-card') && !sub.includes('idcard') && sub !== 'dashboard';
          })
          .map((child: any) => ({
            label: child.submenuName,
            icon: 'chevron-right',
            path: mapRoute(child.submenuName),
          })),
      }))
      .filter((menu: any) => menu.items.length > 0);

    // If admin, ensure essential management hubs are always accessible
    if (isAdmin) {
      const hasOrg = filteredAccess.some((m: any) => m.label.toLowerCase().includes('organization'));
      if (!hasOrg) {
        filteredAccess.unshift({
          label: 'Organization',
          icon: 'building',
          items: [
            { label: 'Org Chart (Hierarchy)', icon: 'git-branch', path: '/home/org-chart' },
            { label: 'Company Feed', icon: 'bell', path: '/home/feed' },
            { label: 'HR Helpdesk & Tickets', icon: 'life-buoy', path: '/home/helpdesk' },
          ]
        });
      }
      const hasPayroll = filteredAccess.some((m: any) => m.label.toLowerCase().includes('payroll') || m.label.toLowerCase().includes('payslip'));
      if (!hasPayroll) {
        filteredAccess.push({
          label: 'Payroll & Compensation',
          icon: 'credit-card',
          items: [
            { label: 'Salary Structures', icon: 'file-text', path: '/home/salary' },
            { label: 'Payslip Management', icon: 'download', path: '/home/payslip' },
          ]
        });
      }

      // Add Keka-grade Performance, Regularization & Separation Hubs for Admin
      filteredAccess.push({
        label: 'Performance & Operations',
        icon: 'target',
        items: [
          { label: 'Attendance Regularization', icon: 'clock', path: '/home/attendance-regularization' },
          { label: 'Performance & OKRs', icon: 'award', path: '/home/performance' },
          { label: 'Exit Clearance & Offboarding', icon: 'log-out', path: '/home/resignation' },
        ]
      });

      return [homeCategory, ...filteredAccess];
    }

    // For regular Employees, provide complete Keka-grade self-service menu with Home on top
    return [
      homeCategory,
      {
        label: 'My Workspace',
        icon: 'layout',
        items: [
          { label: 'Org Hierarchy Tree', icon: 'git-branch', path: '/home/org-chart' },
          { label: 'Company Feed', icon: 'rss', path: '/home/feed' },
          { label: 'Performance & OKRs', icon: 'target', path: '/home/performance' },
          { label: 'HR Helpdesk & Tickets', icon: 'life-buoy', path: '/home/helpdesk' },
        ]
      },
      {
        label: 'Time & Attendance',
        icon: 'clock',
        items: [
          { label: 'Leave Application', icon: 'calendar-plus', path: '/home/leaverequest' },
          { label: 'Attendance Regularization', icon: 'clock', path: '/home/attendance-regularization' },
          { label: 'Monthly Attendance Log', icon: 'calendar', path: '/home/monthlyreport' },
          { label: 'Company Holidays', icon: 'sun', path: '/home/holidayplanning' },
          { label: 'Assigned Shifts', icon: 'clock', path: '/home/manage-shifts' },
        ]
      },
      {
        label: 'Payroll & Finances',
        icon: 'dollar-sign',
        items: [
          { label: 'Detailed Salary Breakdown', icon: 'file-text', path: '/home/salary' },
          { label: 'Download Payslips', icon: 'download', path: '/home/payslip' },
        ]
      },
      {
        label: 'Documents & Profile',
        icon: 'user-check',
        items: [
          { label: 'Document Vault', icon: 'shield', path: '/home/documents' },
          { label: 'Asset Allocation', icon: 'box', path: '/home/asset-management' },
          { label: 'Resignation & Clearance', icon: 'log-out', path: '/home/resignation' },
        ]
      }
    ];
  } catch {
    return [];
  }
}
