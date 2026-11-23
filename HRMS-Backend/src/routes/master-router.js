// src/routes/master-router.js
const express = require('express');

const UserController = require('../controllers/user-controller');
const AttendanceController = require('../controllers/attendance-controller');
const AccessController = require('../controllers/access-controller');
const LeavePolicyController = require('../controllers/leave-policy-controller');
const LeaveTypeController = require('../controllers/leaveType-controller');
const LeaveAppController = require('../controllers/leave-application-controller');
const HolidaysController = require('../controllers/holidays-controller');
const DeletedUserController = require('../controllers/deleted-user-controller');
const DashboardController = require('../controllers/dashboard-controller');
const ShiftController = require('../controllers/shift-controller');
const AssetController = require('../controllers/asset-controller');
const PayrollController = require('../controllers/payroll-controller');
const OrganizationController = require('../controllers/organization-controller');
const DocumentController = require('../controllers/document-controller');
const AnnouncementsController = require('../controllers/announcements-controller');
const LetterController = require('../controllers/letter-controller');
const OnboardingController = require('../controllers/onboarding-controller');

const masterRouter = express.Router();

masterRouter
  .use('/onboard', OnboardingController)
  .use('/onboarding', OnboardingController)
  .use('/dashboard', DashboardController)
  .use('/user', UserController)
  .use('/users', UserController)
  .use('/access', AccessController)
  .use('/roles', AccessController)
  .use('/attendance', AttendanceController)
  .use('/letters', LetterController)
  .use('/certificates', LetterController)
  .use('/certificate', LetterController)
  // Leave management
  .use('/leaves', LeaveAppController)
  .use('/leave', LeaveAppController)
  .use('/leave-policies', LeavePolicyController)
  .use('/leave-policy', LeavePolicyController)
  .use('/leave-type', LeaveTypeController)
  // Payroll & Payslips
  .use('/payroll', PayrollController)
  .use('/payslip', PayrollController)
  .use('/payloads', PayrollController)
  // Organization & Org Tree Hierarchy
  .use('/organization', OrganizationController)
  // Documents Vault
  .use('/documents', DocumentController)
  .use('/user/upload-docs', DocumentController)
  // Announcements & Feed
  .use('/announcements', AnnouncementsController)
  .use('/feed', AnnouncementsController)
  // Shifts, Holidays, Assets
  .use('/shifts', ShiftController)
  .use('/holidays', HolidaysController)
  .use('/holiday', HolidaysController)
  .use('/assets', AssetController)
  .use('/asset', AssetController)
  // Deleted users archive
  .use('/deleted-users', DeletedUserController);

module.exports = masterRouter;
