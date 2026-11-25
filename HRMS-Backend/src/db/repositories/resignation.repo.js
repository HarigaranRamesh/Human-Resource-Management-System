// src/db/repositories/resignation.repo.js — Keka-style Resignation & Exit Clearance (Offboarding)
const { query } = require('../pg');

// Ensure table exists
let tableChecked = false;
async function ensureTable() {
  if (tableChecked) return;
  await query(`
    CREATE TABLE IF NOT EXISTS resignations (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resignation_date          DATE NOT NULL DEFAULT CURRENT_DATE,
      preferred_last_working_day DATE NOT NULL,
      official_last_working_day  DATE,
      reason                    TEXT NOT NULL,
      comments                  TEXT,
      status                    TEXT NOT NULL DEFAULT 'Pending',
      notice_period_days        INTEGER DEFAULT 30,
      clearance_assets_returned BOOLEAN DEFAULT FALSE,
      clearance_no_dues         BOOLEAN DEFAULT FALSE,
      clearance_kt_done         BOOLEAN DEFAULT FALSE,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  tableChecked = true;
}

async function list({ page = 1, limit = 10, userId, status, search } = {}) {
  await ensureTable();
  const params = [];
  let where = 'WHERE 1=1';

  if (userId) {
    params.push(userId);
    where += ` AND r.user_id = $${params.length}`;
  }

  if (status && status !== 'All') {
    params.push(status);
    where += ` AND r.status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (u.user_name ILIKE $${params.length} OR u.emp_id ILIKE $${params.length} OR r.reason ILIKE $${params.length})`;
  }

  const countRes = await query(`
    SELECT COUNT(*) AS total
    FROM resignations r
    JOIN users u ON u.id = r.user_id
    ${where}
  `, params);

  const total = parseInt(countRes.rows[0]?.total || '0', 10);
  const totalPages = Math.ceil(total / limit) || 1;

  params.push(limit, (page - 1) * limit);
  const { rows } = await query(`
    SELECT r.*,
           u.user_name, u.emp_id, u.department, u.position, u.email
    FROM resignations r
    JOIN users u ON u.id = r.user_id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return { resignations: rows, total, page, limit, totalPages };
}

async function findById(id) {
  await ensureTable();
  const { rows } = await query(`
    SELECT r.*,
           u.user_name, u.emp_id, u.department, u.position, u.email
    FROM resignations r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = $1
  `, [id]);
  return rows[0] || null;
}

async function apply({ userId, preferredLastWorkingDay, reason, comments, noticePeriodDays = 30 }) {
  await ensureTable();
  const { rows } = await query(`
    INSERT INTO resignations (user_id, preferred_last_working_day, reason, comments, notice_period_days, status)
    VALUES ($1, $2, $3, $4, $5, 'Pending')
    RETURNING *
  `, [userId, preferredLastWorkingDay, reason, comments || '', noticePeriodDays]);
  return rows[0];
}

async function updateStatus(id, { status, officialLastWorkingDay, comments, clearanceAssetsReturned, clearanceNoDues, clearanceKtDone }) {
  await ensureTable();
  const fields = ['updated_at = NOW()'];
  const params = [];

  if (status !== undefined) {
    params.push(status);
    fields.push(`status = $${params.length}`);
  }
  if (officialLastWorkingDay !== undefined) {
    params.push(officialLastWorkingDay);
    fields.push(`official_last_working_day = $${params.length}`);
  }
  if (comments !== undefined) {
    params.push(comments);
    fields.push(`comments = $${params.length}`);
  }
  if (clearanceAssetsReturned !== undefined) {
    params.push(clearanceAssetsReturned);
    fields.push(`clearance_assets_returned = $${params.length}`);
  }
  if (clearanceNoDues !== undefined) {
    params.push(clearanceNoDues);
    fields.push(`clearance_no_dues = $${params.length}`);
  }
  if (clearanceKtDone !== undefined) {
    params.push(clearanceKtDone);
    fields.push(`clearance_kt_done = $${params.length}`);
  }

  params.push(id);
  const { rows } = await query(`
    UPDATE resignations
    SET ${fields.join(', ')}
    WHERE id = $${params.length}
    RETURNING *
  `, params);

  return rows[0];
}

module.exports = { list, findById, apply, updateStatus };
