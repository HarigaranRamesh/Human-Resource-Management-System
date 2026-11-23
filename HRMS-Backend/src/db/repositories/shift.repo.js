// src/db/repositories/shift.repo.js
const { query } = require('../pg');

async function getAllShifts() {
  const { rows } = await query(`SELECT * FROM shifts ORDER BY created_at DESC`);
  return rows;
}

async function getShiftById(id) {
  const { rows } = await query(`SELECT * FROM shifts WHERE id=$1`, [id]);
  return rows[0] || null;
}

async function getDefaultShift() {
  const { rows } = await query(`SELECT * FROM shifts ORDER BY created_at ASC LIMIT 1`);
  if (rows[0]) return rows[0];
  return {
    name: 'General Shift',
    start_time: '09:30',
    end_time: '18:30',
    grace_mins: 15,
  };
}

async function createShift(data) {
  const { rows } = await query(`
    INSERT INTO shifts (name, start_time, end_time, grace_mins)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [
    data.name || data.shiftName || 'General Shift',
    data.start_time || data.startTime || '09:30',
    data.end_time || data.endTime || '18:30',
    data.grace_mins !== undefined ? data.grace_mins : (data.gracePeriodLate || 15),
  ]);
  return rows[0];
}

async function updateShift(id, data) {
  const { rows } = await query(`
    UPDATE shifts
    SET name = COALESCE($2, name),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        grace_mins = COALESCE($5, grace_mins)
    WHERE id = $1
    RETURNING *
  `, [
    id,
    data.name || data.shiftName || null,
    data.start_time || data.startTime || null,
    data.end_time || data.endTime || null,
    data.grace_mins !== undefined ? data.grace_mins : (data.gracePeriodLate !== undefined ? data.gracePeriodLate : null),
  ]);
  return rows[0];
}

async function deleteShift(id) {
  await query(`UPDATE users SET shift_id = NULL WHERE shift_id = $1`, [id]);
  const { rows } = await query(`DELETE FROM shifts WHERE id = $1 RETURNING *`, [id]);
  return rows[0];
}

module.exports = {
  getAllShifts,
  getShiftById,
  getDefaultShift,
  createShift,
  updateShift,
  deleteShift,
};

