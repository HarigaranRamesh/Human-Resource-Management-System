// src/controllers/asset-controller.js
// PostgreSQL Asset Management Controller
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const assetRepo = require('../db/repositories/asset.repo');

const AssetController = express.Router();

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

// List assets
AssetController.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const list = await assetRepo.list({ page, limit });
    res.json(list);
  } catch (err) {
    console.error('GET /assets error:', err);
    res.status(500).json({ message: 'Failed to fetch assets' });
  }
});

// Get asset by id
AssetController.get('/:id', requireAuth, async (req, res) => {
  try {
    const item = await assetRepo.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Asset not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create asset
AssetController.post('/', requireAuth, async (req, res) => {
  try {
    const created = await assetRepo.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update asset
AssetController.put('/:id', requireAuth, async (req, res) => {
  try {
    const updated = await assetRepo.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete asset
AssetController.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await assetRepo.remove(req.params.id);
    res.json({ success: true, data: deleted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = AssetController;
