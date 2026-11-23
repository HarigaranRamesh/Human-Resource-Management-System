// src/controllers/document-controller.js
// Keka-style Document Vault Controller with file uploads
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const docRepo = require('../db/repositories/document.repo');

const DocumentController = express.Router();

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

// Configure Multer storage for documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// List documents for current user
DocumentController.get('/my-documents', requireAuth, async (req, res) => {
  try {
    const docs = await docRepo.listDocumentsByUser(req.user.id);
    res.json(docs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// List documents for target user (admin or self)
DocumentController.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const isSelf = req.user.id === targetId;
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    if (!isSelf && !isAdm) return res.status(403).json({ message: 'Access denied' });

    const docs = await docRepo.listDocumentsByUser(targetId);
    res.json(docs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Upload document
DocumentController.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const targetUserId = req.body.userId || req.user.id;
    const isSelf = req.user.id === targetUserId;
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    if (!isSelf && !isAdm) return res.status(403).json({ message: 'Permission denied' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const doc = await docRepo.addDocument({
      userId: targetUserId,
      category: req.body.category || 'Government ID',
      docType: req.body.docType || req.body.category || 'Document',
      docName: req.body.docName || req.file.originalname,
      fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    res.status(201).json({ success: true, message: 'Document uploaded successfully', data: doc });
  } catch (e) {
    console.error('Document upload error:', e);
    res.status(500).json({ message: e.message });
  }
});

// Delete document
DocumentController.delete('/:id', requireAuth, async (req, res) => {
  try {
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    const deleted = await docRepo.deleteDocument(req.params.id, req.user.id, isAdm);
    if (!deleted) return res.status(404).json({ message: 'Document not found or access denied' });
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = DocumentController;
