// src/controllers/payroll-controller.js
// Enterprise Payroll & Salary Management Controller
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const payrollRepo = require('../db/repositories/payroll.repo');
const { generatePayslipPdf } = require('../services/payslipPdf.service');

const PayrollController = express.Router();

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

function requireAdmin(req, res, next) {
  const isAdm = req.user?.isSystemAdmin || (req.user?.roleName || '').toLowerCase().includes('admin') || (req.user?.roleName || '').toLowerCase().includes('hr');
  if (!isAdm) {
    return res.status(403).json({ message: 'Admin or HR privileges required' });
  }
  next();
}

// ── 1. Salary Structures ─────────────────────────────────
PayrollController.get('/structures', requireAuth, async (req, res) => {
  try {
    const list = await payrollRepo.listStructures();
    res.json(list);
  } catch (e) {
    console.error('GET /payroll/structures error:', e);
    res.status(500).json({ message: 'Failed to fetch salary structures' });
  }
});

PayrollController.post('/structures', requireAuth, requireAdmin, async (req, res) => {
  try {
    const created = await payrollRepo.createStructure(req.body);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ── 2. Employee Salary & Dynamic Breakdown ───────────────
PayrollController.get('/my-salary', requireAuth, async (req, res) => {
  try {
    const salary = await payrollRepo.getEmployeeSalary(req.user.id);
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });
    const defStruct = await payrollRepo.getDefaultStructure();
    const breakdown = payrollRepo.calculateSalaryBreakdown(salary.annual_ctc, defStruct, 0, 30);
    res.json({
      ...salary,
      breakdown,
    });
  } catch (e) {
    console.error('GET /payroll/my-salary error:', e);
    res.status(500).json({ message: 'Error retrieving salary information' });
  }
});

PayrollController.get('/salary/:userId', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.userId;
    // Only admin or self can access
    const isSelf = req.user.id === targetId;
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    if (!isSelf && !isAdm) return res.status(403).json({ message: 'Access denied' });

    const salary = await payrollRepo.getEmployeeSalary(targetId);
    if (!salary) return res.status(404).json({ message: 'Salary not found' });
    const defStruct = await payrollRepo.getDefaultStructure();
    const breakdown = payrollRepo.calculateSalaryBreakdown(salary.annual_ctc, defStruct, 0, 30);
    res.json({ ...salary, breakdown });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

PayrollController.post('/assign-salary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, annualCtc, structureId } = req.body;
    if (!userId || !annualCtc) return res.status(400).json({ message: 'userId and annualCtc are required' });
    const assigned = await payrollRepo.assignEmployeeSalary(userId, annualCtc, structureId);
    res.json({ success: true, message: 'Salary assigned successfully', data: assigned });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ── 3. Payroll Runs (Batch Processing) ───────────────────
PayrollController.get('/runs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const runs = await payrollRepo.listPayrollRuns();
    res.json(runs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

PayrollController.post('/runs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.body;
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!m || !y) return res.status(400).json({ message: 'Valid month and year required' });
    const result = await payrollRepo.executePayrollRun(m, y, req.user.id);
    res.json({ success: true, message: `Payroll run for ${m}/${y} finalized successfully`, ...result });
  } catch (e) {
    console.error('POST /payroll/runs error:', e);
    res.status(500).json({ message: e.message });
  }
});

// ── 4. Payslips & PDF Download ───────────────────────────
PayrollController.get('/my-payslips', requireAuth, async (req, res) => {
  try {
    const payslips = await payrollRepo.getPayslipsByUser(req.user.id);
    res.json(payslips);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

PayrollController.get('/payslips/:userId', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const isSelf = req.user.id === targetId;
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    if (!isSelf && !isAdm) return res.status(403).json({ message: 'Access denied' });

    const payslips = await payrollRepo.getPayslipsByUser(targetId);
    res.json(payslips);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

PayrollController.get('/detail', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const isSelf = req.user.id === userId;
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    if (!isSelf && !isAdm) return res.status(403).json({ message: 'Access denied' });

    const detailed = await payrollRepo.getDetailedPayslip(userId, month, year);
    if (!detailed) return res.status(404).json({ message: 'No payslip record found for period' });
    res.json(detailed);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

PayrollController.get('/download-pdf', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const isSelf = req.user.id === userId;
    const isAdm = req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('admin');
    if (!isSelf && !isAdm) return res.status(403).json({ message: 'Access denied' });

    const detailed = await payrollRepo.getDetailedPayslip(userId, month, year);
    if (!detailed) return res.status(404).json({ message: 'Payslip record not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${detailed.user_name || 'Employee'}_${month}_${year}.pdf"`);

    generatePayslipPdf(detailed, res);
  } catch (e) {
    console.error('PDF download error:', e);
    res.status(500).send('Failed to generate payslip PDF');
  }
});

module.exports = PayrollController;
