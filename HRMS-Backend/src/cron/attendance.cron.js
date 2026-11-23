// src/cron/attendance.cron.js — PostgreSQL version
const cron      = require('node-cron');
const nodemailer = require('nodemailer');
const { query } = require('../db/pg');
require('dotenv').config();

const getTodayShiftTime = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':');
  const d = new Date();
  d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return d;
};

const sendAbsentNotification = async (user, shiftStartTime) => {
  if (!process.env.EMAIL_USER || !user.email) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"HR Portal" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Absent Notification - Auto Attendance',
      text: `Dear ${user.user_name},\n\nYou have been auto-marked as Absent today (${new Date().toLocaleDateString()}) because no attendance was registered within the allowed grace period for your shift (starting at ${shiftStartTime}).\n\nIf this is incorrect, please contact HR.\n\nRegards,\nAttendance System`,
    });
  } catch (err) {
    console.error(`❌ Email failed for ${user.email}:`, err.message);
  }
};

const markAbsentAttendance = async () => {
  try {
    const now = new Date();

    // Skip Sundays
    if (now.getDay() === 0) return;

    // Skip holidays
    const { rows: holidays } = await query(
      `SELECT id FROM holidays WHERE date = CURRENT_DATE`
    );
    if (holidays.length) return;

    const today = now.toISOString().split('T')[0];
    const GRACE_MINUTES = 120;

    // Get all active non-candidate users with their shift
    const { rows: users } = await query(`
      SELECT u.id, u.user_name, u.email,
             s.start_time AS shift_start
      FROM   users u
      LEFT JOIN shifts s ON s.id = u.shift_id
      JOIN   roles  r ON r.id = u.role_id
      WHERE  u.status = true
        AND  r.is_candidate_role = false
        AND  r.is_system = false
    `);

    for (const user of users) {
      const shiftStart     = user.shift_start || '09:00';
      const exactShiftStart = getTodayShiftTime(shiftStart);
      const deadline        = new Date(exactShiftStart.getTime() + GRACE_MINUTES * 60000);

      if (now <= deadline) continue;

      // Check if already marked today
      const { rows: existing } = await query(
        `SELECT id, attendance_type, approved FROM attendance WHERE user_id=$1 AND date=$2`,
        [user.id, today]
      );

      if (!existing.length) {
        // Not marked at all → mark Absent
        await query(`
          INSERT INTO attendance (user_id, date, attendance_type, remarks)
          VALUES ($1, $2, 'Absent', $3)
          ON CONFLICT (user_id, date) DO NOTHING
        `, [user.id, today, `Auto-marked Absent (missed shift login for ${shiftStart})`]);

        await sendAbsentNotification(user, shiftStart);
        console.log(`📩 Absent → ${user.user_name} (shift: ${shiftStart})`);

      } else if (existing[0].attendance_type !== 'Present' && existing[0].approved !== true) {
        // Leave request pending/rejected and didn't clock in → LOP
        await query(`
          UPDATE attendance SET attendance_type='LOP',
            remarks='Leave was unapproved; user did not clock in.'
          WHERE user_id=$1 AND date=$2
        `, [user.id, today]);

        await sendAbsentNotification(user, shiftStart);
        console.log(`📩 LOP → ${user.user_name}`);
      }
    }
  } catch (err) {
    console.error('❌ attendance cron error:', err.message);
  }
};

cron.schedule('0 * * * *', markAbsentAttendance);
module.exports = markAbsentAttendance;
