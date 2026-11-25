import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutProvider } from './context/LayoutContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';
import { getToken } from './lib/auth';

// Lazy-loaded pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EmployeeWelcomePage = lazy(() => import('./pages/EmployeeWelcomePage'));
const ViewUsersPage = lazy(() => import('./pages/ViewUsersPage'));
const CreateUserPage = lazy(() => import('./pages/CreateUserPage'));
const ViewEditUserPage = lazy(() => import('./pages/ViewEditUserPage'));
const OrgChartPage = lazy(() => import('./pages/OrgChartPage'));
const SalaryPage = lazy(() => import('./pages/SalaryPage'));
const PayslipsPage = lazy(() => import('./pages/PayslipsPage'));
const DocumentVaultPage = lazy(() => import('./pages/DocumentVaultPage'));
const DailyReportPage = lazy(() => import('./pages/DailyReportPage'));
const MonthlyReportPage = lazy(() => import('./pages/MonthlyReportPage'));
const LeaveRequestPage = lazy(() => import('./pages/LeaveRequestPage'));
const LeaveApprovalPage = lazy(() => import('./pages/LeaveApprovalPage'));
const HolidayPlanningPage = lazy(() => import('./pages/HolidayPlanningPage'));
const ShiftManagementPage = lazy(() => import('./pages/ShiftManagementPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const AssetManagementPage = lazy(() => import('./pages/AssetManagementPage'));
const AccessPage = lazy(() => import('./pages/AccessPage'));
const LettersPage = lazy(() => import('./pages/LettersPage'));
const EnterpriseOnboardingPage = lazy(() => import('./pages/EnterpriseOnboardingPage'));
const AttendanceRegularizationPage = lazy(() => import('./pages/AttendanceRegularizationPage'));
const PerformancePage = lazy(() => import('./pages/PerformancePage'));
const HelpdeskPage = lazy(() => import('./pages/HelpdeskPage'));
const ResignationPage = lazy(() => import('./pages/ResignationPage'));

import { BrandLoader } from './components/common/HariHrmsLogo';

function PageLoader() {
  return <BrandLoader size={54} message="Loading NIRALIX HRMS" fullPage={true} />;
}

function NotFoundPage() {
  return (
    <div className="notfound-page">
      <div className="notfound-code">404</div>
      <h2 className="notfound-title">Page Not Found</h2>
      <p className="notfound-subtitle">The page you are looking for does not exist or has been moved.</p>
      <a href="/" className="btn-primary" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>Go to Dashboard</a>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/welcome',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <Suspense fallback={<PageLoader />}>
        <EnterpriseOnboardingPage />
      </Suspense>
    ),
  },
  {
    path: '/onboard',
    element: (
      <Suspense fallback={<PageLoader />}>
        <EnterpriseOnboardingPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute fallback={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/home/welcome" replace /> },
      {
        path: 'dashboard',
        element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>,
      },
      // Employee Welcome Hub (Birthdays, Anniversaries, Notice Board, Quick Actions)
      {
        path: 'home/welcome',
        element: <Suspense fallback={<PageLoader />}><EmployeeWelcomePage /></Suspense>,
      },
      // Organization Hierarchy Tree
      {
        path: 'home/org-chart',
        element: <Suspense fallback={<PageLoader />}><OrgChartPage /></Suspense>,
      },
      // User Management
      {
        path: 'home/adduser',
        element: <Suspense fallback={<PageLoader />}><CreateUserPage /></Suspense>,
      },
      {
        path: 'home/viewuser',
        element: <Suspense fallback={<PageLoader />}><ViewUsersPage /></Suspense>,
      },
      {
        path: 'home/viewedituser',
        element: <Suspense fallback={<PageLoader />}><ViewEditUserPage /></Suspense>,
      },
      {
        path: 'home/profile',
        element: <Suspense fallback={<PageLoader />}><ViewEditUserPage /></Suspense>,
      },
      // Attendance & Reports
      {
        path: 'home/dailyreport',
        element: <Suspense fallback={<PageLoader />}><DailyReportPage /></Suspense>,
      },
      {
        path: 'home/monthlyreport',
        element: <Suspense fallback={<PageLoader />}><MonthlyReportPage /></Suspense>,
      },
      {
        path: 'home/attendance',
        element: <Suspense fallback={<PageLoader />}><MonthlyReportPage /></Suspense>,
      },
      // Keka-Grade Attendance Regularization
      {
        path: 'home/attendance-regularization',
        element: <Suspense fallback={<PageLoader />}><AttendanceRegularizationPage /></Suspense>,
      },
      {
        path: 'home/regularization',
        element: <Suspense fallback={<PageLoader />}><AttendanceRegularizationPage /></Suspense>,
      },
      // Leave Management
      {
        path: 'home/leaverequest',
        element: <Suspense fallback={<PageLoader />}><LeaveRequestPage /></Suspense>,
      },
      {
        path: 'home/leaveapproval',
        element: <Suspense fallback={<PageLoader />}><LeaveApprovalPage /></Suspense>,
      },
      {
        path: 'home/yearlyleavyplocy',
        element: <Suspense fallback={<PageLoader />}><LeaveRequestPage /></Suspense>,
      },
      {
        path: 'home/userleaveedit',
        element: <Suspense fallback={<PageLoader />}><LeaveRequestPage /></Suspense>,
      },
      // Keka-Grade Payroll & Salary
      {
        path: 'home/salary',
        element: <Suspense fallback={<PageLoader />}><SalaryPage /></Suspense>,
      },
      {
        path: 'home/payslip',
        element: <Suspense fallback={<PageLoader />}><PayslipsPage /></Suspense>,
      },
      // Keka-Style Document Vault
      {
        path: 'home/documents',
        element: <Suspense fallback={<PageLoader />}><DocumentVaultPage /></Suspense>,
      },
      // Holidays, Shifts, Assets, Feed
      {
        path: 'home/holidayplanning',
        element: <Suspense fallback={<PageLoader />}><HolidayPlanningPage /></Suspense>,
      },
      {
        path: 'home/manage-shifts',
        element: <Suspense fallback={<PageLoader />}><ShiftManagementPage /></Suspense>,
      },
      {
        path: 'home/shiftmanagement',
        element: <Suspense fallback={<PageLoader />}><ShiftManagementPage /></Suspense>,
      },
      {
        path: 'home/feed',
        element: <Suspense fallback={<PageLoader />}><FeedPage /></Suspense>,
      },
      {
        path: 'home/asset-management',
        element: <Suspense fallback={<PageLoader />}><AssetManagementPage /></Suspense>,
      },
      // Keka-Grade Performance & OKRs
      {
        path: 'home/performance',
        element: <Suspense fallback={<PageLoader />}><PerformancePage /></Suspense>,
      },
      {
        path: 'home/okr',
        element: <Suspense fallback={<PageLoader />}><PerformancePage /></Suspense>,
      },
      // Keka-Grade HR Helpdesk & Service Tickets
      {
        path: 'home/helpdesk',
        element: <Suspense fallback={<PageLoader />}><HelpdeskPage /></Suspense>,
      },
      {
        path: 'home/tickets',
        element: <Suspense fallback={<PageLoader />}><HelpdeskPage /></Suspense>,
      },
      // Keka-Grade Resignation & Exit Clearance (Offboarding)
      {
        path: 'home/resignation',
        element: <Suspense fallback={<PageLoader />}><ResignationPage /></Suspense>,
      },
      {
        path: 'home/offboarding',
        element: <Suspense fallback={<PageLoader />}><ResignationPage /></Suspense>,
      },
      // Access Control
      {
        path: 'home/access',
        element: <Suspense fallback={<PageLoader />}><AccessPage /></Suspense>,
      },
      {
        path: 'home/accessdefine',
        element: <Suspense fallback={<PageLoader />}><AccessPage /></Suspense>,
      },
      // Certificates & Letters (Offer, Appointment, Experience)
      {
        path: 'home/letters',
        element: <Suspense fallback={<PageLoader />}><LettersPage /></Suspense>,
      },
      {
        path: 'home/certificate',
        element: <Suspense fallback={<PageLoader />}><LettersPage /></Suspense>,
      },
      {
        path: 'home/certificates',
        element: <Suspense fallback={<PageLoader />}><LettersPage /></Suspense>,
      },
      {
        path: 'home/loa',
        element: <Suspense fallback={<PageLoader />}><LettersPage /></Suspense>,
      },
      // Not Found
      { path: 'notfound', element: <NotFoundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default function App() {
  return (
    <LayoutProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
            borderRadius: '10px',
            background: 'var(--surface-0)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: 'white' },
          },
        }}
      />
    </LayoutProvider>
  );
}
