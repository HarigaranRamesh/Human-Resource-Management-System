// src/db/repositories/performance.repo.js — Keka-style PMS and OKR Goal Tracking
const { query } = require('../pg');

async function list({ page = 1, limit = 10, userId, period, status, search } = {}) {
  const params = [];
  let where = 'WHERE 1=1';

  if (userId) {
    params.push(userId);
    where += ` AND (p.user_id = $${params.length} OR p.reviewer_id = $${params.length})`;
  }

  if (period) {
    params.push(period);
    where += ` AND p.period = $${params.length}`;
  }

  if (status) {
    params.push(status);
    where += ` AND p.status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (u.user_name ILIKE $${params.length} OR u.emp_id ILIKE $${params.length} OR p.period ILIKE $${params.length})`;
  }

  const countRes = await query(`
    SELECT COUNT(*) AS total
    FROM performance_reviews p
    JOIN users u ON u.id = p.user_id
    ${where}
  `, params);

  const total = parseInt(countRes.rows[0]?.total || '0', 10);
  const totalPages = Math.ceil(total / limit) || 1;

  params.push(limit, (page - 1) * limit);
  const { rows } = await query(`
    SELECT p.*,
           u.user_name, u.emp_id, u.department, u.position,
           r.user_name AS reviewer_name
    FROM performance_reviews p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN users r ON r.id = p.reviewer_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return { reviews: rows, total, page, limit, totalPages };
}

async function findById(id) {
  const { rows } = await query(`
    SELECT p.*,
           u.user_name, u.emp_id, u.department, u.position,
           r.user_name AS reviewer_name
    FROM performance_reviews p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN users r ON r.id = p.reviewer_id
    WHERE p.id = $1
  `, [id]);
  return rows[0] || null;
}

async function create({ userId, reviewerId, period, rating, comments, goals, status = 'Pending' }) {
  const { rows } = await query(`
    INSERT INTO performance_reviews (user_id, reviewer_id, period, rating, comments, goals, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    userId,
    reviewerId || null,
    period || 'Q1 2026',
    rating !== undefined ? rating : null,
    comments || '',
    JSON.stringify(goals || []),
    status,
  ]);
  return rows[0];
}

async function update(id, data) {
  const allowed = ['reviewer_id', 'period', 'rating', 'comments', 'goals', 'status'];
  const fields = [];
  const params = [];

  for (const k of allowed) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const val = data[k] !== undefined ? data[k] : data[camel];
    if (val !== undefined) {
      params.push(k === 'goals' && typeof val === 'object' ? JSON.stringify(val) : val);
      fields.push(`${k} = $${params.length}`);
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = NOW()');
  params.push(id);

  const { rows } = await query(`
    UPDATE performance_reviews
    SET ${fields.join(', ')}
    WHERE id = $${params.length}
    RETURNING *
  `, params);

  return rows[0];
}

async function remove(id) {
  const { rows } = await query('DELETE FROM performance_reviews WHERE id = $1 RETURNING *', [id]);
  return rows[0];
}

module.exports = { list, findById, create, update, remove };
