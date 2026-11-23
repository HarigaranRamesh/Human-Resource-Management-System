// src/controllers/organization-controller.js
// Organization hierarchy tree, departments, and designations controller
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const orgRepo = require('../db/repositories/organization.repo');

const OrganizationController = express.Router();

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

// Visual Org Chart Hierarchy Tree
// - Super Admin: views all departments across entire enterprise (can also filter by department)
// - Regular Employee: views strictly their own department's tree
OrganizationController.get('/tree', requireAuth, async (req, res) => {
  try {
    const roleName = (req.user?.roleName || '').toLowerCase();
    const isSuperAdmin = !!req.user?.isSystemAdmin || roleName.includes('super');
    const requestedDept = req.query.department;
    const userDept = req.user?.department;

    const tree = await orgRepo.getOrganizationTree({
      isSuperAdmin,
      department: isSuperAdmin ? requestedDept : userDept,
      userId: req.user?.id,
    });

    res.json({
      isSuperAdmin,
      scopedDepartment: isSuperAdmin ? (requestedDept || 'All') : (userDept || 'My Department'),
      tree,
    });
  } catch (e) {
    console.error('GET /organization/tree error:', e);
    res.status(500).json({ message: 'Failed to construct organization tree' });
  }
});

// Departments
OrganizationController.get('/departments', requireAuth, async (req, res) => {
  try {
    const list = await orgRepo.listDepartments();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

OrganizationController.post('/departments', requireAuth, async (req, res) => {
  try {
    const dept = await orgRepo.createDepartment(req.body);
    res.status(201).json(dept);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Designations
OrganizationController.get('/designations', requireAuth, async (req, res) => {
  try {
    const list = await orgRepo.listDesignations();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

OrganizationController.post('/designations', requireAuth, async (req, res) => {
  try {
    const des = await orgRepo.createDesignation(req.body);
    res.status(201).json(des);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = OrganizationController;
