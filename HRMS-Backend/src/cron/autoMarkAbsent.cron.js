// src/cron/autoMarkAbsent.cron.js — PostgreSQL version
const cron = require('node-cron');
const { query } = require('../db/pg');
require('dotenv').config();

const getShiftTimeForDate = (timeString, baseDate) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':');
  const d = new Date(baseDate);
  d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return d;
};

const markAbsentForNoLogout = async () => {
  try {
    const now = new Date();

    // Find attendance records: logged in but never logged out today, still Present
    const { rows: openRecords } = await query(`
      SELECT a.*, u.user_name, u.id AS uid,
             s.start_time AS shift_start, s.end_time AS shift_end,
             r.is_candidate_role
      FROM   attendance a
      JOIN   users u ON u.id = a.user_id
      LEFT JOIN shifts s ON s.id = u.shift_id
      LEFT JOIN roles  r ON r.id = u.role_id
      WHERE  a.geo_login_flag  = true
        AND  a.geo_logout_flag = false
        AND  a.attendance_type = 'Present'
        AND  u.status = true
    `);

    if (!openRecords.length) return;

    for (const record of openRecords) {
      // Skip candidates and system admins
      if (record.is_candidate_role) continue;

      const shiftStart = record.shift_start || '09:00';
      const shiftEnd   = record.shift_end   || '18:00';

      let exactShiftEnd = getShiftTimeForDate(shiftEnd, record.date);
      // Night shift: end is next day
      if (shiftEnd < shiftStart) exactShiftEnd.setDate(exactShiftEnd.getDate() + 1);

      const forceLogoutDeadline = new Date(exactShiftEnd.getTime() + 4 * 60 * 60000);

      if (now > forceLogoutDeadline) {
        await query(`
          UPDATE attendance
          SET attendance_type='Absent',
              remarks=$1
          WHERE id=$2
        `, [`Auto-marked Absent (No logout recorded for shift ending at ${shiftEnd})`, record.id]);

        console.log(`⚠️  Marked Absent (no logout) → ${record.user_name}`);
      }
    }
  } catch (err) {
    console.error('❌ autoMarkAbsent cron error:', err.message);
  }
};

cron.schedule('0 * * * *', markAbsentForNoLogout);
module.exports = markAbsentForNoLogout;
