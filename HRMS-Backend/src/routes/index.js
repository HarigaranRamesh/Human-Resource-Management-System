const express    = require('express');
const jwt        = require('jsonwebtoken');
const fs         = require('fs');
const path       = require('path');
const master_router = require('./master-router');
const userRepo   = require('../db/repositories/user.repo');
const otpService = require('../services/otp.service');
const handle_error = require('../utils/handle-error');

const PRIVATE_KEY = fs.readFileSync(path.join(process.cwd(), 'private.key'), 'utf8').trim();

function makeToken(user) {
  const role = user.role || {};
  return jwt.sign({
    id:            user.id,
    emp_id:        user.emp_id,
    roleId:        role.id,
    roleName:      role.role,
    isSystemAdmin: role.is_system || false,
    hasPayload:    role.has_payload_section ?? true,
    requiresDocs:  role.requires_documents  ?? true,
    isCandidate:   role.is_candidate_role   ?? false,
    access:        role.main || [],
    user_name:     user.user_name,
    position:      user.position,
    designation:   user.designation,
    department:    user.department,
  }, PRIVATE_KEY, { expiresIn: '1d' });
}

// ── Auth middleware ──────────────────────────────────────
const userCheck = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error('Unauthorized Access');
    const token = authHeader.split(' ')[1];
    if (!token)  throw new Error('Unauthorized Access');
    const decoded = jwt.verify(token, PRIVATE_KEY);
    req.user = decoded;
    req.body.createdby = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized Access' });
  }
};

const routes = express.Router();

routes
  .use('/api', master_router)
  .use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

  // ── STEP 1: Send OTP to mobile number ───────────────────
  .post('/login/send-otp', async (req, res) => {
    try {
      const mobile = (req.body.mobile || '').replace(/\D/g, '');
      if (!mobile) {
        return res.status(400).json({ success: false, message: 'Mobile number is required.' });
      }

      // Check employee exists with this mobile before sending OTP (no account = no OTP)
      const user = await userRepo.findByMobile(mobile, false);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No employee account found with this mobile number. Contact your HR administrator.',
        });
      }
      if (!user.status) {
        return res.status(403).json({
          success: false,
          message: 'This account is deactivated. Please contact HR.',
        });
      }

      const result = await otpService.sendOtp(mobile);

      return res.json({
        success: true,
        message: `OTP sent to ${mobile.slice(0, 2)}XXXXXXX${mobile.slice(-2)}`,
        expiresInSeconds: result.expiresInSeconds,
        // devOtp only present in dev mode (no MSG91 key) — remove before production
        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
      });
    } catch (error) {
      handle_error(error, res);
    }
  })

  // ── STEP 2: Verify OTP → issue JWT ──────────────────────
  .post('/login/verify-otp', async (req, res) => {
    try {
      const mobile = (req.body.mobile || '').replace(/\D/g, '');
      const otp    = String(req.body.otp || '').trim();

      if (!mobile || !otp) {
        return res.status(400).json({ success: false, message: 'Mobile number and OTP are required.' });
      }

      // Verify OTP (throws on failure)
      await otpService.verifyOtp(mobile, otp);

      // Load full user record to build JWT
      const user = await userRepo.findByMobile(mobile, false);
      if (!user) throw new Error('Account not found after OTP verification.');
      if (!user.status) throw new Error('This account is deactivated. Please contact HR.');

      // Update login counter
      const { query } = require('../db/pg');
      await query(`UPDATE users SET logcal = COALESCE(logcal, 0) + 1 WHERE id = $1`, [user.id]);

      const token = makeToken(user);
      return res.json({
        success:     true,
        message:     'Logged in successfully',
        token,
        role:        user.role?.role,
        access:      user.role?.main || [],
        username:    user.user_name,
        empId:       user.emp_id,
        department:  user.department,
        designation: user.designation,
      });
    } catch (error) {
      handle_error(error, res);
    }
  })

  // ── LEGACY / ADMIN Password Login (for Super Admin & programmatic access) ──
  .post('/login', async (req, res) => {
    try {
      const input    = (req.body.identifier || req.body.mobileNo || req.body.empId || req.body.email || req.body.username || '').trim();
      const password = req.body.password;

      if (!input || !password) {
        return res.status(400).json({
          success: false,
          message: 'Provide Employee ID / Email / Mobile and password.',
        });
      }

      const user  = await userRepo.loginUniversal(input, password);
      const token = makeToken(user);

      return res.json({
        success:     true,
        message:     'Logged in successfully',
        token,
        role:        user.role?.role,
        access:      user.role?.main || [],
        username:    user.user_name,
        empId:       user.emp_id,
        department:  user.department,
        designation: user.designation,
      });
    } catch (error) {
      handle_error(error, res);
    }
  });

module.exports = routes;
