// src/db/repositories/asset.repo.js
const { query } = require('../pg');

async function list({ page = 1, limit = 20, search, assetType, condition, assignedTo, sortBy = 'created_at', sortOrder = 'DESC' } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;
  let where = 'WHERE 1=1';
  const params = [];

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    where += ` AND (a.name ILIKE $${params.length} OR a.serial_no ILIKE $${params.length} OR a.asset_type ILIKE $${params.length} OR u.user_name ILIKE $${params.length})`;
  }

  if (assetType && assetType !== 'All') {
    params.push(String(assetType).trim());
    where += ` AND a.asset_type = $${params.length}`;
  }

  if (condition && condition !== 'All') {
    params.push(String(condition).trim());
    where += ` AND a.condition = $${params.length}`;
  }

  if (assignedTo) {
    params.push(assignedTo);
    where += ` AND a.assigned_to = $${params.length}`;
  }

  const ALLOWED_SORTS = {
    created_at: 'a.created_at',
    name: 'a.name',
    asset_type: 'a.asset_type',
    serial_no: 'a.serial_no',
    condition: 'a.condition',
  };
  const sortCol = ALLOWED_SORTS[sortBy] || 'a.created_at';
  const sortDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  params.push(limit, offset);
  const { rows } = await query(`
    SELECT a.*, u.user_name, u.emp_id, u.department
    FROM assets a
    LEFT JOIN users u ON u.id = a.assigned_to
    ${where}
    ORDER BY ${sortCol} ${sortDir}, a.id ${sortDir}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const { rows: countRows } = await query(`
    SELECT COUNT(*) FROM assets a LEFT JOIN users u ON u.id = a.assigned_to ${where}
  `, params.slice(0, -2));

  const total = parseInt(countRows[0]?.count || 0, 10);

  return {
    assets: rows,
    total,
    page: Math.max(1, page),
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async function findById(id) {
  const { rows } = await query(`
    SELECT a.*, u.user_name, u.emp_id, u.department
    FROM assets a
    LEFT JOIN users u ON u.id = a.assigned_to
    WHERE a.id = $1
  `, [id]);
  return rows[0] || null;
}

async function create(data) {
  const { rows } = await query(`
    INSERT INTO assets (name, asset_type, serial_no, assigned_to, condition, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    data.name,
    data.assetType || data.asset_type || null,
    data.serialNo || data.serial_no || null,
    data.assignedTo || data.assigned_to || null,
    data.condition || 'Excellent',
    data.notes || null
  ]);
  return rows[0];
}

async function update(id, data) {
  const { rows } = await query(`
    UPDATE assets
    SET name = COALESCE($1, name),
        asset_type = COALESCE($2, asset_type),
        serial_no = COALESCE($3, serial_no),
        assigned_to = $4,
        condition = COALESCE($5, condition),
        notes = COALESCE($6, notes)
    WHERE id = $7
    RETURNING *
  `, [
    data.name,
    data.assetType || data.asset_type || null,
    data.serialNo || data.serial_no || null,
    data.assignedTo !== undefined ? data.assignedTo : (data.assigned_to !== undefined ? data.assigned_to : null),
    data.condition || null,
    data.notes || null,
    id
  ]);
  return rows[0];
}

async function remove(id) {
  const { rows } = await query(`DELETE FROM assets WHERE id = $1 RETURNING *`, [id]);
  return rows[0];
}

module.exports = { list, findById, create, update, remove };
