const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const userRepo = require('../db/repositories/user.repo');
const redis = require('../config/redis');

const DashboardController = express.Router();

let PRIVATE_KEY;
try {
  PRIVATE_KEY = fs.readFileSync(path.join(process.cwd(), 'private.key'), 'utf8').trim();
} catch (e) {
  PRIVATE_KEY = process.env.JWT_SECRET || 'Bla@2021BOWS^!@#$)(*)';
}

async function requireAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: 'Authorization token is required' });
    return null;
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.split(' ')[1];
  try {
    const decrypted = jwt.verify(token, PRIVATE_KEY);
    return decrypted;
  } catch (e) {
    res.status(401).json({ message: 'Invalid or expired token' });
    return null;
  }
}

DashboardController.get('/role-counts', async (req, res) => {
  try {
    const decrypted = await requireAuth(req, res);
    if (!decrypted) return;

    const cached = await redis.getCache('dashboard:role_counts');
    if (cached) return res.json(cached);

    const roleCounts = await userRepo.getRoleCounts();
    await redis.setCache('dashboard:role_counts', roleCounts, 30);
    res.json(roleCounts);
  } catch (error) {
    console.error('GET /dashboard/role-counts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

DashboardController.get('/stats', async (req, res) => {
  try {
    const decrypted = await requireAuth(req, res);
    if (!decrypted) return;

    const cached = await redis.getCache('dashboard:stats');
    if (cached) return res.json(cached);

    const stats = await userRepo.getDashboardStats();
    await redis.setCache('dashboard:stats', stats, 30);
    res.json(stats);
  } catch (error) {
    console.error('GET /dashboard/stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = DashboardController;
