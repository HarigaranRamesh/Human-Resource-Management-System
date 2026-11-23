// src/controllers/announcements-controller.js
// Announcements & Company Feed Controller
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const announceRepo = require('../db/repositories/announcements.repo');
const rabbit = require('../config/rabbitmq');

const AnnouncementsController = express.Router();

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

AnnouncementsController.get('/', requireAuth, async (req, res) => {
  try {
    const list = await announceRepo.listAnnouncements();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

AnnouncementsController.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, priority, department } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content required' });
    const created = await announceRepo.createAnnouncement({
      title,
      content,
      priority,
      department,
      authorId: req.user.id,
    });

    // Publish to RabbitMQ / memory queue for push notification fanout
    rabbit.publishNotification({
      type: 'ANNOUNCEMENT_PUSH',
      recipient: department || 'ALL_EMPLOYEES',
      title,
      body: content.slice(0, 120),
      data: { announcementId: created.id, priority },
    });

    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

AnnouncementsController.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const updated = await announceRepo.toggleLike(req.params.id, req.user.id);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

AnnouncementsController.delete('/:id', requireAuth, async (req, res) => {
  try {
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    if (!isAdm) return res.status(403).json({ message: 'Only admins can delete announcements' });
    await announceRepo.deleteAnnouncement(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = AnnouncementsController;
