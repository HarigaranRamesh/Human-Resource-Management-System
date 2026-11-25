// src/controllers/performance-controller.js — Keka-style PMS and OKR Goal Tracking
const express = require('express');
const performanceRepo = require('../db/repositories/performance.repo');
const user_service = require('../services/user-service');

const PerformanceController = express.Router();

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

PerformanceController.use(checkAuth);

// GET /api/performance — List performance reviews & OKRs (with debounced search, status, and pagination)
PerformanceController.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const period = req.query.period;
    const status = req.query.status;
    const search = req.query.search;

    const role = (req.user?.roleName || '').toLowerCase();
    const isAdmin = req.user?.isSystemAdmin || role.includes('admin') || role.includes('hr');
    const userId = isAdmin && !req.query.myOnly ? undefined : req.user.id;

    const result = await performanceRepo.list({
      page,
      limit,
      userId,
      period,
      status,
      search,
    });

    res.json(result);
  } catch (error) {
    console.error('GET /performance error:', error);
    res.status(500).json({ message: 'Failed to load performance reviews' });
  }
});

// GET /api/performance/:id — Get details of a single review
PerformanceController.get('/:id', async (req, res) => {
  try {
    const review = await performanceRepo.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Performance review not found' });
    res.json(review);
  } catch (error) {
    console.error('GET /performance/:id error:', error);
    res.status(500).json({ message: 'Failed to retrieve performance review' });
  }
});

// POST /api/performance — Create new goal / review cycle
PerformanceController.post('/', async (req, res) => {
  try {
    const { userId, period, rating, comments, goals, status } = req.body;
    const targetUserId = userId || req.user.id;

    const review = await performanceRepo.create({
      userId: targetUserId,
      reviewerId: req.user.id !== targetUserId ? req.user.id : null,
      period: period || 'Q1 2026',
      rating,
      comments: comments || '',
      goals: goals || [],
      status: status || 'Pending',
    });

    res.status(201).json({ message: 'Goal / Performance review created successfully', review });
  } catch (error) {
    console.error('POST /performance error:', error);
    res.status(500).json({ message: error.message || 'Failed to create performance review' });
  }
});

// PUT /api/performance/:id — Update review, rating, comments, or goal progress
PerformanceController.put('/:id', async (req, res) => {
  try {
    const existing = await performanceRepo.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Performance review not found' });

    const role = (req.user?.roleName || '').toLowerCase();
    const isAdmin = req.user?.isSystemAdmin || role.includes('admin') || role.includes('hr');

    const updatePayload = { ...req.body };
    if (isAdmin && updatePayload.rating !== undefined) {
      updatePayload.reviewerId = req.user.id;
      if (!updatePayload.status) updatePayload.status = 'Reviewed';
    }

    const updated = await performanceRepo.update(req.params.id, updatePayload);
    res.json({ message: 'Performance review updated successfully', updated });
  } catch (error) {
    console.error('PUT /performance/:id error:', error);
    res.status(500).json({ message: 'Failed to update performance review' });
  }
});

// DELETE /api/performance/:id — Remove goal / review
PerformanceController.delete('/:id', async (req, res) => {
  try {
    const role = (req.user?.roleName || '').toLowerCase();
    const isAdmin = req.user?.isSystemAdmin || role.includes('admin') || role.includes('hr');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only Admin or HR can delete performance reviews' });
    }

    await performanceRepo.remove(req.params.id);
    res.json({ message: 'Performance review deleted successfully' });
  } catch (error) {
    console.error('DELETE /performance/:id error:', error);
    res.status(500).json({ message: 'Failed to delete performance review' });
  }
});

module.exports = PerformanceController;
