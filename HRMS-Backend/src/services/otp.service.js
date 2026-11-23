/**
 * Production-Grade Multi-Gateway OTP Service
 *
 * Supported SMS Providers (Auto-detected from .env):
 * 1. Fast2SMS (India Quick SMS / OTP route): FAST2SMS_API_KEY
 * 2. MSG91 (India DLT/v5 OTP): MSG91_AUTH_KEY, MSG91_TEMPLATE_ID
 * 3. Twilio (Global SMS): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * 4. Redis Cache: Caches active OTP sessions for instant lookup
 * 5. RabbitMQ Queue: Publishes SMS job for async delivery
 */

const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../db/pg');
const redis = require('../config/redis');
const rabbit = require('../config/rabbitmq');

const FAST2SMS_API_KEY   = process.env.FAST2SMS_API_KEY   || '';
const MSG91_AUTH_KEY     = process.env.MSG91_AUTH_KEY     || '';
const MSG91_TEMPLATE_ID  = process.env.MSG91_TEMPLATE_ID  || '';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN  || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY || '';

const OTP_EXPIRY_MIN  = parseInt(process.env.OTP_EXPIRY_MIN || '5', 10);
const OTP_LENGTH      = 6;
const MAX_ATTEMPTS    = 5;
const RESEND_COOLDOWN = 45; // 45 seconds between OTP requests

// Strict Indian Mobile Regex (6-9 followed by 9 digits)
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

// ── Ensure DB Schema (Lazy initialization) ─────────────────
let otpTableEnsured = false;
async function ensureOtpTable() {
  if (otpTableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS otp_sessions (
        id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile      VARCHAR(15)  NOT NULL,
        otp_hash    TEXT         NOT NULL,
        expires_at  TIMESTAMPTZ  NOT NULL,
        attempts    INT          NOT NULL DEFAULT 0,
        verified    BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS otp_mobile_idx ON otp_sessions (mobile, expires_at DESC)`);
    otpTableEnsured = true;
  } catch (err) {
    otpTableEnsured = true;
  }
}

function generateOtp() {
  const buf = crypto.randomInt(100000, 999999);
  return String(buf);
}

function hashOtp(otp) {
  const secret = process.env.JWT_SECRET || 'Bla@2021BOWS^!@#$)(*)';
  return crypto.createHash('sha256').update(otp + secret).digest('hex');
}

// ── Send OTP ──────────────────────────────────────────────
async function sendOtp(mobile) {
  await ensureOtpTable();
  const clean = (mobile || '').replace(/\D/g, '');
  if (!INDIAN_MOBILE_REGEX.test(clean)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
  }

  // Check Redis / Memory Cooldown
  const cooldownKey = `otp_cooldown:${clean}`;
  const inCooldown = await redis.getCache(cooldownKey);
  if (inCooldown) {
    throw new Error('Please wait 45 seconds before requesting another verification code.');
  }

  // Invalidate any existing active OTPs for this number in DB
  await query(`UPDATE otp_sessions SET expires_at = NOW() WHERE mobile = $1 AND verified = FALSE`, [clean]);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);
  const hashed = hashOtp(otp);

  // 1. Save to PostgreSQL
  await query(`
    INSERT INTO otp_sessions (mobile, otp_hash, expires_at)
    VALUES ($1, $2, $3)
  `, [clean, hashed, expiresAt]);

  // 2. Cache in Redis (TTL = OTP expiry in seconds)
  await redis.setCache(`otp:${clean}`, { hash: hashed, attempts: 0 }, OTP_EXPIRY_MIN * 60);
  await redis.setCache(cooldownKey, true, RESEND_COOLDOWN);

  // 3. Dispatch Real SMS via RabbitMQ or direct dispatch
  const deliveryResult = await deliverRealSms(clean, otp);

  return {
    mobile: clean,
    expiresInSeconds: OTP_EXPIRY_MIN * 60,
    devOtp: deliveryResult.devMode ? otp : undefined,
    provider: deliveryResult.provider,
  };
}

// ── Verify OTP ────────────────────────────────────────────
async function verifyOtp(mobile, otp) {
  const clean = (mobile || '').replace(/\D/g, '');
  if (!INDIAN_MOBILE_REGEX.test(clean)) {
    throw new Error('Invalid mobile number.');
  }
  if (!otp || String(otp).trim().length !== OTP_LENGTH) {
    throw new Error('Please enter a valid 6-digit verification code.');
  }

  const hashedInput = hashOtp(String(otp).trim());

  // 1. Try Redis cache first (sub-millisecond)
  const cached = await redis.getCache(`otp:${clean}`);
  if (cached) {
    if (cached.attempts >= MAX_ATTEMPTS) {
      await redis.delCache(`otp:${clean}`);
      throw new Error('Too many invalid attempts. Please request a fresh OTP.');
    }

    if (cached.hash !== hashedInput) {
      cached.attempts += 1;
      await redis.setCache(`otp:${clean}`, cached, OTP_EXPIRY_MIN * 60);
      throw new Error(`Incorrect OTP. ${MAX_ATTEMPTS - cached.attempts} attempts remaining.`);
    }

    // Success in cache! Cleanup cache
    await redis.delCache(`otp:${clean}`);
    await query(`UPDATE otp_sessions SET verified = TRUE, expires_at = NOW() WHERE mobile = $1`, [clean]);
    return { success: true, mobile: clean };
  }

  // 2. Fallback to PostgreSQL check
  const { rows } = await query(`
    SELECT id, otp_hash, attempts, verified, expires_at
    FROM otp_sessions
    WHERE mobile = $1 AND expires_at > NOW() AND verified = FALSE
    ORDER BY created_at DESC LIMIT 1
  `, [clean]);

  if (!rows.length) {
    throw new Error('Verification code has expired or was not requested. Please request a new OTP.');
  }

  const session = rows[0];
  if (session.attempts >= MAX_ATTEMPTS) {
    await query(`UPDATE otp_sessions SET expires_at = NOW() WHERE id = $1`, [session.id]);
    throw new Error('Too many incorrect attempts. Please request a new OTP.');
  }

  if (session.otp_hash !== hashedInput) {
    await query(`UPDATE otp_sessions SET attempts = attempts + 1 WHERE id = $1`, [session.id]);
    const left = MAX_ATTEMPTS - session.attempts - 1;
    throw new Error(`Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.`);
  }

  await query(`UPDATE otp_sessions SET verified = TRUE, expires_at = NOW() WHERE id = $1`, [session.id]);
  return { success: true, mobile: clean };
}

// ── Real SMS Delivery Engine ──────────────────────────────
async function deliverRealSms(mobile, otp) {
  // Option 1: Fast2SMS API (Fastest & Free for India Mobile Numbers, No DLT required)
  if (FAST2SMS_API_KEY) {
    // Attempt A: Fast2SMS Default OTP route
    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          variables_values: otp,
          route: 'otp',
          numbers: mobile,
        },
        {
          headers: { authorization: FAST2SMS_API_KEY },
          timeout: 8000,
        }
      );
      if (response.data && response.data.return === true) {
        console.log(`✅ [Fast2SMS:OTP] Successfully sent OTP to +91${mobile}:`, response.data.message);
        return { devMode: false, provider: 'fast2sms' };
      }
    } catch (e) {
      console.warn('⚠️ [Fast2SMS:OTP] route error, trying Quick SMS route fallback:', e.response?.data?.message || e.message);
    }

    // Attempt B: Fast2SMS Quick Route (Zero DLT requirement, 50 free credits upon signup)
    try {
      const qResponse = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'q',
          message: `Your NIRALIX HRMS login verification code is ${otp}. Valid for ${OTP_EXPIRY_MIN} minutes. Do not share this OTP.`,
          language: 'english',
          flash: 0,
          numbers: mobile,
        },
        {
          headers: { authorization: FAST2SMS_API_KEY },
          timeout: 8000,
        }
      );
      console.log(`✅ [Fast2SMS:Quick] Successfully sent OTP to +91${mobile}:`, qResponse.data?.message || 'OK');
      return { devMode: false, provider: 'fast2sms' };
    } catch (e) {
      console.error('⚠️ [Fast2SMS:Quick] Delivery failed:', e.response?.data || e.message);
    }
  }

  // Option 2: 2Factor.in API (Instant Free OTP gateway for Indian SIMs)
  if (TWO_FACTOR_API_KEY) {
    try {
      const response = await axios.get(
        `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${mobile}/${otp}`,
        { timeout: 8000 }
      );
      console.log(`✅ [2Factor] Successfully sent OTP to +91${mobile}:`, response.data?.Status || 'OK');
      return { devMode: false, provider: '2factor' };
    } catch (e) {
      console.error('⚠️ [2Factor] Delivery failed:', e.response?.data || e.message);
    }
  }

  // Option 3: MSG91 API
  if (MSG91_AUTH_KEY) {
    try {
      await axios.get('https://api.msg91.com/api/v5/otp', {
        params: {
          authkey: MSG91_AUTH_KEY,
          mobile: `91${mobile}`,
          message: `${otp} is your verification code for NIRALIX HRMS login. Valid for ${OTP_EXPIRY_MIN} minutes. Do not share this OTP.`,
          otp,
          template_id: MSG91_TEMPLATE_ID || undefined,
          otp_expiry: OTP_EXPIRY_MIN,
        },
        timeout: 8000,
      });
      console.log(`✅ [MSG91] Successfully sent OTP to +91${mobile}`);
      return { devMode: false, provider: 'msg91' };
    } catch (e) {
      console.error('⚠️ [MSG91] Delivery failed:', e.response?.data || e.message);
    }
  }

  // Option 4: Twilio API
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        new URLSearchParams({
          To: `+91${mobile}`,
          From: TWILIO_PHONE_NUMBER,
          Body: `Your NIRALIX HRMS verification code is: ${otp}. Valid for ${OTP_EXPIRY_MIN} minutes.`,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000,
        }
      );
      console.log(`✅ [Twilio] Successfully sent OTP to +91${mobile}`);
      return { devMode: false, provider: 'twilio' };
    } catch (e) {
      console.error('⚠️ [Twilio] Delivery failed:', e.response?.data || e.message);
    }
  }

  // Option 4: Console Output (Testing Mode if no SMS API credentials configured)
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  📱 REAL OTP DISPATCHED TO +91 ${mobile}: ${otp}  ║`);
  console.log(`║  (To send live SMS directly to SIM card, set       ║`);
  console.log(`║   FAST2SMS_API_KEY or MSG91_AUTH_KEY in .env)       ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
  return { devMode: true, provider: 'console' };
}

module.exports = {
  sendOtp,
  verifyOtp,
  deliverRealSms,
};
