const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { query } = require('../db/pg');

const LetterController = express.Router();

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

// Helper to format currency
function formatCurrency(val) {
  if (!val) return '6,00,000';
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toLocaleString('en-IN');
}

// ── GET all letter templates ──────────────────────────────
LetterController.get('/templates', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM letter_templates ORDER BY id ASC`);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('GET /api/letters/templates error:', e);
    res.status(500).json({ message: 'Failed to fetch letter templates' });
  }
});

// ── GET single letter template by type ────────────────────
LetterController.get('/template/:type', requireAuth, async (req, res) => {
  try {
    const type = req.params.type.toLowerCase().trim();
    const { rows } = await query(
      `SELECT * FROM letter_templates WHERE id = $1 OR letter_type = $1 LIMIT 1`,
      [type]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Template not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error('GET /api/letters/template/:type error:', e);
    res.status(500).json({ message: 'Failed to fetch letter template' });
  }
});

// ── PUT update template (Super Admin only) ───────────────
LetterController.put('/template/:type', requireAuth, async (req, res) => {
  try {
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    if (!isAdm) {
      return res.status(403).json({ message: 'Only Super Admin can edit letter templates' });
    }

    const type = req.params.type.toLowerCase().trim();
    const { subject, content, title } = req.body;

    const { rows } = await query(
      `UPDATE letter_templates
       SET subject = COALESCE($1, subject),
           content = COALESCE($2, content),
           title = COALESCE($3, title),
           updated_at = NOW()
       WHERE id = $4 OR letter_type = $4
       RETURNING *`,
      [subject, content, title, type]
    );

    if (!rows[0]) return res.status(404).json({ message: 'Template not found' });
    res.json({ success: true, message: 'Template updated successfully', data: rows[0] });
  } catch (e) {
    console.error('PUT /api/letters/template/:type error:', e);
    res.status(500).json({ message: 'Failed to update letter template' });
  }
});

// ── GET render letter with real employee data ─────────────
LetterController.get('/render/:type', requireAuth, async (req, res) => {
  try {
    const type = req.params.type.toLowerCase().trim();
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    const targetUserId = (isAdm && req.query.userId) ? req.query.userId : req.user.id;

    // Fetch user details
    const { rows: userRows } = await query(
      `SELECT id, user_name, emp_id, email, mobile_no, position, designation, department,
              doj, dob, current_address, permanent_address, work_location, annual_ctc
       FROM users WHERE id = $1 LIMIT 1`,
      [targetUserId]
    );

    if (!userRows[0]) return res.status(404).json({ message: 'Target employee not found' });
    const user = userRows[0];

    // Fetch template
    const { rows: tmplRows } = await query(
      `SELECT * FROM letter_templates WHERE id = $1 OR letter_type = $1 LIMIT 1`,
      [type]
    );

    if (!tmplRows[0]) return res.status(404).json({ message: 'Letter template not found' });
    const tmpl = tmplRows[0];

    // Format fields
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const dojFormatted = user.doj
      ? new Date(user.doj).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : today;

    const replacements = {
      '{{employee_name}}': user.user_name || 'Employee',
      '{{emp_id}}': user.emp_id || 'N/A',
      '{{position}}': user.position || user.designation || 'Staff',
      '{{department}}': user.department || 'Operations',
      '{{doj}}': dojFormatted,
      '{{date}}': today,
      '{{ctc}}': formatCurrency(user.annual_ctc),
      '{{work_location}}': user.work_location || 'Bengaluru Office',
      '{{current_address}}': user.current_address || 'India',
      '{{company_name}}': 'NIRALIX HRMS Enterprise Technologies Pvt. Ltd.',
    };

    let renderedSubject = tmpl.subject;
    let renderedContent = tmpl.content;

    for (const [placeholder, val] of Object.entries(replacements)) {
      const reg = new RegExp(placeholder, 'g');
      renderedSubject = renderedSubject.replace(reg, val);
      renderedContent = renderedContent.replace(reg, val);
    }

    res.json({
      success: true,
      data: {
        templateId: tmpl.id,
        title: tmpl.title,
        letterType: tmpl.letter_type,
        subject: renderedSubject,
        content: renderedContent,
        employee: {
          id: user.id,
          name: user.user_name,
          empId: user.emp_id,
          position: user.position || user.designation,
          department: user.department,
          doj: dojFormatted,
        },
        generatedAt: today,
      }
    });
  } catch (e) {
    console.error('GET /api/letters/render/:type error:', e);
    res.status(500).json({ message: 'Failed to generate letter' });
  }
});

module.exports = LetterController;
