import api from '../lib/api';

const BASE = '/api/user';

export const userApi = {
  getUsers: (
    pageOrParams: number | { page?: number; limit?: number; search?: string; department?: string; status?: string | boolean; role?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' },
    limit?: number,
    filterField?: string,
    searchText?: string,
    isCandidateRole?: boolean,
    isSystem?: boolean
  ) => {
    if (typeof pageOrParams === 'object') {
      return api.get(BASE, { params: pageOrParams });
    }
    const params: any = { page: pageOrParams, limit };
    if (filterField && searchText) params[filterField] = searchText;
    if (isCandidateRole !== undefined) params.isCandidateRole = String(isCandidateRole);
    if (isSystem !== undefined) params.isSystem = String(isSystem);
    return api.get(BASE, { params });
  },
  searchUsers: (query: string, page = 1, limit = 10, isCandidateRole?: boolean, isSystem?: boolean) =>
    api.get(BASE, { params: { page, limit, user_name: query, ...(isCandidateRole !== undefined && { isCandidateRole }), ...(isSystem !== undefined && { isSystem }) } }),
  getUserById: (id: string) => api.get(`${BASE}/${id}`),
  createUser: (data: any) => {
    const isAdmin = localStorage.getItem('isSystemAdmin') === 'true';
    return isAdmin ? api.post(`${BASE}/superad`, data) : api.post(BASE, data);
  },
  updateUser: (id: string, data: any) => api.put(`${BASE}/${id}`, data),
  deleteUser: (id: string, reason = 'Deleted from Staff Management') =>
    api.delete(`${BASE}/${id}`, { data: { deletedBy: localStorage.getItem('userId'), reason } }),
  getDeletedUsers: () => api.get('/api/deleted-users'),
  restoreUser: (id: string) => api.post(`/api/user/restore/${id}`, {}),
  uploadProfilePhoto: (formData: FormData) =>
    api.post(`${BASE}/upload-profile-photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/user/change-password', { currentPassword, newPassword }),
};

export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
  getRoleCounts: () => api.get('/api/dashboard/role-counts'),
};

export const attendanceApi = {
  check: () => api.get('/api/attendance/present/check'),
  login: (payload: { lat: number; lon: number }) => api.post('/api/attendance/present/login', payload),
  logout: (payload: { lat: number; lon: number }) => api.post('/api/attendance/present/logout', payload),
  getSummary: (id: string) => api.get(`/api/attendance/summary/${id}`),
  getAttendanceReport: (params?: any) => api.get('/api/attendance/report', { params }),
  getDailyReport: (params?: any) => api.get('/api/attendance/daily-report', { params }),
  getMonthlyReport: (params?: any) => api.get('/api/attendance/monthly-report', { params }),
  // Keka-Grade Attendance Regularization
  applyRegularization: (data: { date: string; checkInTime?: string; checkOutTime?: string; reason: string }) =>
    api.post('/api/attendance/regularize', data),
  getRegularizations: (params?: any) => api.get('/api/attendance/regularizations', { params }),
  reviewRegularization: (id: string, data: { approved: boolean; remarks?: string }) =>
    api.put(`/api/attendance/regularize/${id}`, data),
};

// ── Keka-Grade Payroll & Salary Engine API ────────────────
export const payrollApi = {
  getMySalary: () => api.get('/api/payroll/my-salary'),
  getSalaryByUser: (userId: string) => api.get(`/api/payroll/salary/${userId}`),
  assignSalary: (data: { userId: string; annualCtc: number; structureId?: string }) =>
    api.post('/api/payroll/assign-salary', data),
  getStructures: () => api.get('/api/payroll/structures'),
  createStructure: (data: any) => api.post('/api/payroll/structures', data),
  getRuns: () => api.get('/api/payroll/runs'),
  executeRun: (month: number, year: number) => api.post('/api/payroll/runs', { month, year }),
  getMyPayslips: () => api.get('/api/payroll/my-payslips'),
  getPayslipsByUser: (userId: string) => api.get(`/api/payroll/payslips/${userId}`),
  getPayslipDetail: (userId: string, month: number, year: number) =>
    api.get('/api/payroll/detail', { params: { userId, month, year } }),
  downloadPdfUrl: (userId: string, month: number, year: number) =>
    `${api.defaults.baseURL || ''}/api/payroll/download-pdf?userId=${userId}&month=${month}&year=${year}`,
};

// ── Organization Hierarchy & Master Data API ──────────────
export const organizationApi = {
  getTree: (params?: { department?: string }) => api.get('/api/organization/tree', { params }),
  getDepartments: () => api.get('/api/organization/departments'),
  createDepartment: (data: { name: string; description?: string; head_id?: string }) =>
    api.post('/api/organization/departments', data),
  getDesignations: () => api.get('/api/organization/designations'),
  createDesignation: (data: { name: string; department_id?: string; level?: number }) =>
    api.post('/api/organization/designations', data),
};

// ── Keka-Style Document Vault API ─────────────────────────
export const documentApi = {
  getMyDocuments: () => api.get('/api/documents/my-documents'),
  getUserDocuments: (userId: string) => api.get(`/api/documents/user/${userId}`),
  uploadDocument: (formData: FormData) =>
    api.post('/api/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDocument: (id: string) => api.delete(`/api/documents/${id}`),
};

// ── Leave Management API ─────────────────────────────────
export const leaveApplicationApi = {
  getMyRequests: () => api.get('/api/leaves/my-requests'),
  getBalance: () => api.get('/api/leaves/balance'),
  apply: (data: {
    leaveType: string;
    fromDate: string;
    toDate: string;
    totalDays: number;
    isHalfDay?: boolean;
    halfDayPeriod?: string;
    reason: string;
  }) => api.post('/api/leaves/apply', data),
  getPending: (params?: string | { department?: string; page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) => {
    if (typeof params === 'string') {
      return api.get('/api/leaves/pending', { params: params && params !== 'All' ? { department: params } : {} });
    }
    return api.get('/api/leaves/pending', { params });
  },
  approve: (id: string, comments?: string) =>
    api.post(`/api/leaves/${id}/approve`, { comments }),
  reject: (id: string, comments?: string) =>
    api.post(`/api/leaves/${id}/reject`, { comments }),
};

export const leavePolicyApi = {
  getPolicies: () => api.get('/api/leave-policies'),
  updatePolicy: (data: any) => api.post('/api/leave-policies', data),
};

export const holidayApi = {
  getHolidays: () => api.get('/api/holidays'),
  createHoliday: (data: any) => api.post('/api/holidays', data),
  deleteHoliday: (id: string) => api.delete(`/api/holidays/${id}`),
};

export const accessApi = {
  getRoles: () => api.get('/api/roles'),
  getAccess: () => api.get('/api/access'),
  updateAccess: (data: any) => api.put('/api/access', data),
};

export const shiftApi = {
  getShifts: () => api.get('/api/shifts'),
  createShift: (data: any) => api.post('/api/shifts', data),
  updateShift: (id: string, data: any) => api.put(`/api/shifts/${id}`, data),
  deleteShift: (id: string) => api.delete(`/api/shifts/${id}`),
};

export const assetApi = {
  getAssets: (params?: any) => api.get('/api/assets', { params }),
  createAsset: (data: any) => api.post('/api/assets', data),
  updateAsset: (id: string, data: any) => api.put(`/api/assets/${id}`, data),
  deleteAsset: (id: string) => api.delete(`/api/assets/${id}`),
};

export const announcementApi = {
  getAll: () => api.get('/api/announcements'),
  create: (data: { title: string; content: string; priority?: string; department?: string }) =>
    api.post('/api/announcements', data),
  like: (id: string) => api.post(`/api/announcements/${id}/like`, {}),
  delete: (id: string) => api.delete(`/api/announcements/${id}`),
};

export const letterApi = {
  getTemplates: () => api.get('/api/letters/templates'),
  getTemplate: (type: string) => api.get(`/api/letters/template/${type}`),
  updateTemplate: (type: string, data: { title?: string; subject?: string; content?: string }) =>
    api.put(`/api/letters/template/${type}`, data),
  renderLetter: (type: string, userId?: string) =>
    api.get(`/api/letters/render/${type}`, { params: { userId } }),
};

export const onboardingApi = {
  getStatus: () => api.get('/api/onboard/status'),
  setup: (data: any) => api.post('/api/onboard/setup', data),
};

// ── Keka PMS: Performance & OKR Goal Tracking API ──────────
export const performanceApi = {
  getReviews: (params?: any) => api.get('/api/performance', { params }),
  getReviewById: (id: string) => api.get(`/api/performance/${id}`),
  createReview: (data: any) => api.post('/api/performance', data),
  updateReview: (id: string, data: any) => api.put(`/api/performance/${id}`, data),
  deleteReview: (id: string) => api.delete(`/api/performance/${id}`),
};

// ── Keka Helpdesk: Support & Service Requests API ─────────
export const helpdeskApi = {
  getTickets: (params?: any) => api.get('/api/helpdesk', { params }),
  getTicketById: (id: string) => api.get(`/api/helpdesk/${id}`),
  createTicket: (data: any) => api.post('/api/helpdesk', data),
  updateTicket: (id: string, data: any) => api.put(`/api/helpdesk/${id}`, data),
  getAnalytics: () => api.get('/api/helpdesk/analytics'),
};

// ── Keka Offboarding: Resignation & Exit Clearance API ─────
export const resignationApi = {
  getResignations: (params?: any) => api.get('/api/resignation', { params }),
  getResignationById: (id: string) => api.get(`/api/resignation/${id}`),
  apply: (data: { preferredLastWorkingDay: string; reason: string; comments?: string; noticePeriodDays?: number }) =>
    api.post('/api/resignation', data),
  updateStatus: (id: string, data: any) => api.put(`/api/resignation/${id}`, data),
};

export const authApi = {
  // OTP-based login (primary — for all employees)
  sendOtp:   (mobile: string)            => api.post('/login/send-otp',   { mobile }),
  verifyOtp: (mobile: string, otp: string) => api.post('/login/verify-otp', { mobile, otp }),

  // Password-based login (secondary — for Super Admin / fallback)
  login: (identifier: string, password: string) =>
    api.post('/login', { identifier, mobileNo: identifier, password }),
};
