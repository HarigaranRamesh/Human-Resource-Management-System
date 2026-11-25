// src/controllers/resignation-controller.js — Keka-style Resignation & Exit Clearance (Offboarding)
const express = require('express');
const resignationRepo = require('../db/repositories/resignation.repo');
const user_service = require('../services/user-service');

const ResignationController = express.Router();

const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization token is required' });
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.split(' ')[1];
    const service = new user_service();
    const decrypted = await service.checkValidUser(token);
    req.user = decrypted;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized or invalid token' });
  }
};

ResignationController.use(checkAuth);

// GET /api/resignation — List resignations (employee sees their own, admin/HR sees all)
ResignationController.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const status = req.query.status;
    const search = req.query.search;

    const role = (req.user?.roleName || '').toLowerCase();
    const isAdmin = req.user?.isSystemAdmin || role.includes('admin') || role.includes('hr');
    const userId = isAdmin && !req.query.myOnly ? undefined : req.user.id;

    const result = await resignationRepo.list({
      page,
      limit,
      userId,
      status,
      search,
    });

    res.json(result);
  } catch (error) {
    console.error('GET /resignation error:', error);
    res.status(500).json({ message: 'Failed to load resignation requests' });
  }
});

// GET /api/resignation/:id — Get details of a single resignation
ResignationController.get('/:id', async (req, res) => {
  try {
    const item = await resignationRepo.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Resignation record not found' });
    res.json(item);
  } catch (error) {
    console.error('GET /resignation/:id error:', error);
    res.status(500).json({ message: 'Failed to retrieve resignation details' });
  }
});

// POST /api/resignation — Employee submits resignation
ResignationController.post('/', async (req, res) => {
  try {
    const { preferredLastWorkingDay, reason, comments, noticePeriodDays } = req.body;
    if (!preferredLastWorkingDay || !reason) {
      return res.status(400).json({ message: 'Preferred last working day and reason are required' });
    }

    const item = await resignationRepo.apply({
      userId: req.user.id,
      preferredLastWorkingDay,
      reason,
      comments: comments || '',
      noticePeriodDays: noticePeriodDays || 30,
    });

    res.status(201).json({ message: 'Resignation application submitted successfully', item });
  } catch (error) {
    console.error('POST /resignation error:', error);
    res.status(500).json({ message: error.message || 'Failed to submit resignation' });
  }
});

// PUT /api/resignation/:id — HR/Admin updates status and clearance items
ResignationController.put('/:id', async (req, res) => {
  try {
    const role = (req.user?.roleName || '').toLowerCase();
    const isAdmin = req.user?.isSystemAdmin || role.includes('admin') || role.includes('hr');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only HR or Admins can review resignation and exit clearance' });
    }

    const item = await resignationRepo.updateStatus(req.params.id, req.body);
    res.json({ message: 'Resignation & exit clearance updated successfully', item });
  } catch (error) {
    console.error('PUT /resignation/:id error:', error);
    res.status(500).json({ message: 'Failed to update resignation status' });
  }
});

module.exports = ResignationController;
