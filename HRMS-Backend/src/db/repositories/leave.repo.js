// src/db/repositories/leave.repo.js — replaces leave-policy-model + leaveType-model
const { query } = require('../pg');

// ── Leave Policies (global config per role) ──────────────
async function listPolicies() {
  const { rows } = await query(`SELECT * FROM leave_policies ORDER BY role, label`);
  return rows;
}

async function getPolicyByRoleAndLabel(role, label) {
  const { rows } = await query(
    `SELECT * FROM leave_policies WHERE role=$1 AND label=$2`, [role, label]
  );
  return rows[0] || null;
}

async function upsertPolicy({ role, label, amount, accrualType, active = true }) {
  const { rows } = await query(`
    INSERT INTO leave_policies (role, label, amount, accrual_type, active)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (role, label)
    DO UPDATE SET amount=$3, accrual_type=$4, active=$5
    RETURNING *
  `, [role, label, amount, accrualType, active]);
  return rows[0];
}

async function deletePolicy(id) {
  const { rows } = await query(`DELETE FROM leave_policies WHERE id=$1 RETURNING *`, [id]);
  return rows[0];
}

// ── Leave Types (per-user balances) ─────────────────────
async function getUserLeaveTypes(userId) {
  const { rows } = await query(
    `SELECT * FROM leave_types WHERE user_id=$1 ORDER BY label`, [userId]
  );
  return rows;
}

async function getUserLeaveByLabel(userId, label) {
  const { rows } = await query(
    `SELECT * FROM leave_types WHERE user_id=$1 AND label=$2`, [userId, label]
  );
  return rows[0] || null;
}

async function upsertUserLeave(userId, { label, value, accrualType, doj, remaining = [], validity }) {
  const { rows } = await query(`
    INSERT INTO leave_types (user_id, label, value, accrual_type, doj, remaining, validity)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (user_id, label)
    DO UPDATE SET value=$3, accrual_type=$4, remaining=$6, validity=$7
    RETURNING *
  `, [userId, label, value, accrualType, doj, JSON.stringify(remaining), validity || null]);
  return rows[0];
}

async function deductLeave(userId, label, amount, year) {
  // Find the year bucket in remaining JSONB and deduct
  const lt = await getUserLeaveByLabel(userId, label);
  if (!lt) throw new Error('Leave balance not found');
  const remaining = lt.remaining || [];
  const bucket = remaining.find(b => b.year === year);
  if (bucket) {
    const totalLeft = bucket.months.reduce((a, b) => a + b, 0) + (bucket.annualValue || 0);
    if (totalLeft < amount) throw new Error('Insufficient leave balance');
    bucket.annualValue = Math.max(0, (bucket.annualValue || 0) - amount);
  }
  const { rows } = await query(
    `UPDATE leave_types SET remaining=$1 WHERE user_id=$2 AND label=$3 RETURNING *`,
    [JSON.stringify(remaining), userId, label]
  );
  return rows[0];
}

module.exports = {
  listPolicies, getPolicyByRoleAndLabel, upsertPolicy, deletePolicy,
  getUserLeaveTypes, getUserLeaveByLabel, upsertUserLeave, deductLeave,
};
