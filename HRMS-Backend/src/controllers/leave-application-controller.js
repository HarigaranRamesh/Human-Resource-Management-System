// src/controllers/leave-application-controller.js
// Dedicated Leave Request & Manager Approval Controller
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const leaveAppRepo = require('../db/repositories/leaveApplication.repo');

const LeaveAppController = express.Router();

let SECRET;
try {
  SECRET = fs.readFileSync(path.join(process.cwd(), 'private.key'), 'utf8').trim();
} catch (e) {
  SECRET = process.env.JWT_SECRET || 'Bla@2021BOWS^!@#$)(*)';
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Authorization required' });
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// 1. My Leave Applications
LeaveAppController.get('/my-requests', requireAuth, async (req, res) => {
  try {
    const list = await leaveAppRepo.listByUser(req.user.id);
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 2. Leave Balance Summary
LeaveAppController.get('/balance', requireAuth, async (req, res) => {
  try {
    const summary = await leaveAppRepo.getLeaveBalanceSummary(req.user.id);
    res.json(summary);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 3. Submit Leave Request
LeaveAppController.post('/apply', requireAuth, async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, totalDays, isHalfDay, halfDayPeriod, reason } = req.body;
    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'Missing required leave fields' });
    }
    const created = await leaveAppRepo.createApplication({
      userId: req.user.id,
      leaveType,
      fromDate,
      toDate,
      totalDays: parseFloat(totalDays) || 1,
      isHalfDay: !!isHalfDay,
      halfDayPeriod: halfDayPeriod || null,
      reason,
    });
    res.status(201).json({ success: true, message: 'Leave application submitted for approval', data: created });
  } catch (e) {
    console.error('Leave apply error:', e);
    res.status(500).json({ message: e.message });
  }
});

// 4. Pending Leave Applications (Admin / Manager Inbox)
LeaveAppController.get('/pending', requireAuth, async (req, res) => {
  try {
    const dept = req.query.department || null;
    const list = await leaveAppRepo.listPending(dept);
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 5. Approve Leave
LeaveAppController.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const isApprover = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin') || (req.user.roleName || '').toLowerCase().includes('hr') || (req.user.roleName || '').toLowerCase().includes('manager');
    if (!isApprover) return res.status(403).json({ message: 'Only managers or admins can approve leave' });

    const approved = await leaveAppRepo.approveApplication(req.params.id, req.user.id, req.body.comments || 'Approved');
    res.json({ success: true, message: 'Leave approved successfully', data: approved });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 6. Reject Leave
LeaveAppController.post('/:id/reject', requireAuth, async (req, res) => {
  try {
    const isApprover = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin') || (req.user.roleName || '').toLowerCase().includes('hr') || (req.user.roleName || '').toLowerCase().includes('manager');
    if (!isApprover) return res.status(403).json({ message: 'Only managers or admins can reject leave' });

    const rejected = await leaveAppRepo.rejectApplication(req.params.id, req.user.id, req.body.comments || 'Rejected');
    res.json({ success: true, message: 'Leave rejected', data: rejected });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = LeaveAppController;
