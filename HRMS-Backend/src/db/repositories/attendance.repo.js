// src/db/repositories/attendance.repo.js — replaces attendance-model + attendance-service
const { query, getClient } = require('../pg');

async function findByUserAndDate(userId, date) {
  const { rows } = await query(
    `SELECT * FROM attendance WHERE user_id=$1 AND date=$2`, [userId, date]
  );
  return rows[0] || null;
}

async function getTodayRecord(userId) {
  return findByUserAndDate(userId, new Date().toISOString().split('T')[0]);
}

async function clockIn(userId, { lat, lon, address } = {}) {
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await query(`
    INSERT INTO attendance (user_id, date, attendance_type, geo_login_flag, geo_login_lat,
      geo_login_lon, geo_login_time, geo_login_address)
    VALUES ($1,$2,'Present',$3,$4,$5,NOW(),$6)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      geo_login_flag=EXCLUDED.geo_login_flag,
      geo_login_lat=EXCLUDED.geo_login_lat,
      geo_login_lon=EXCLUDED.geo_login_lon,
      geo_login_time=EXCLUDED.geo_login_time,
      geo_login_address=EXCLUDED.geo_login_address
    RETURNING *
  `, [userId, today, !!lat, lat || 0, lon || 0, address || null]);
  return rows[0];
}

async function clockOut(userId, { lat, lon, address } = {}) {
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await query(`
    UPDATE attendance SET
      geo_logout_flag=true,
      geo_logout_lat=$3,
      geo_logout_lon=$4,
      geo_logout_time=NOW(),
      geo_logout_address=$5
    WHERE user_id=$1 AND date=$2
    RETURNING *
  `, [userId, today, lat || 0, lon || 0, address || null]);
  return rows[0];
}

async function listByUser(userId, { from, to, page = 1, limit = 30 } = {}) {
  const params = [userId];
  let where = 'WHERE user_id=$1';
  if (from) { params.push(from); where += ` AND date>=$${params.length}`; }
  if (to)   { params.push(to);   where += ` AND date<=$${params.length}`; }
  params.push(limit, (page - 1) * limit);
  const { rows } = await query(
    `SELECT * FROM attendance ${where} ORDER BY date DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function listPendingLeaves({ page = 1, limit = 20 } = {}) {
  const { rows } = await query(`
    SELECT a.*, u.user_name, u.emp_id, u.department
    FROM attendance a
    JOIN users u ON u.id=a.user_id
    WHERE a.attendance_type NOT IN ('Present','Absent','Holiday')
      AND a.approved IS NULL
    ORDER BY a.date DESC
    LIMIT $1 OFFSET $2
  `, [limit, (page - 1) * limit]);
  return rows;
}

async function approveLeave(id, approved, approverId) {
  const { rows } = await query(`
    UPDATE attendance SET approved=$1 WHERE id=$2 RETURNING *
  `, [approved, id]);
  return rows[0];
}

async function getDailyReport(date) {
  const { rows } = await query(`
    SELECT u.user_name, u.emp_id, u.department,
           COALESCE(a.attendance_type,'Absent') AS attendance_type,
           a.geo_login_time, a.geo_logout_time, a.late_mark, a.late_minutes
    FROM users u
    LEFT JOIN attendance a ON a.user_id=u.id AND a.date=$1
    WHERE u.status=true
    ORDER BY u.user_name
  `, [date]);
  return rows;
}

async function getMonthlyReport(userId, month, year) {
  const { rows } = await query(`
    SELECT * FROM attendance
    WHERE user_id=$1
      AND EXTRACT(MONTH FROM date)=$2
      AND EXTRACT(YEAR  FROM date)=$3
    ORDER BY date
  `, [userId, month, year]);
  return rows;
}

async function bulkMarkAbsent(date, excludeUserIds = []) {
  const { rowCount } = await query(`
    INSERT INTO attendance (user_id, date, attendance_type)
    SELECT u.id, $1, 'Absent'
    FROM users u
    WHERE u.status=true
      AND u.id != ALL($2::uuid[])
      AND NOT EXISTS (
        SELECT 1 FROM attendance a WHERE a.user_id=u.id AND a.date=$1
      )
    ON CONFLICT DO NOTHING
  `, [date, excludeUserIds]);
  return rowCount;
}

module.exports = {
  findByUserAndDate, getTodayRecord,
  clockIn, clockOut,
  listByUser, listPendingLeaves, approveLeave,
  getDailyReport, getMonthlyReport, bulkMarkAbsent,
};
