// src/db/repositories/leaveApplication.repo.js
// Dedicated Leave Application & Multi-level Approval Repository
const { query, getClient } = require('../pg');

async function listByUser(userId) {
  const { rows } = await query(`
    SELECT la.*, u.user_name AS approver_name
    FROM leave_applications la
    LEFT JOIN users u ON u.id = la.approver_id
    WHERE la.user_id = $1
    ORDER BY la.created_at DESC
  `, [userId]);
  return rows;
}

async function listPending(options = null) {
  // Support both listPending('Engineering') and listPending({ department, page, limit, search, sortBy, sortOrder })
  let department = typeof options === 'string' ? options : options?.department;
  const isPaginated = typeof options === 'object' && options !== null && (options.page !== undefined || options.limit !== undefined || options.search !== undefined);
  const page = isPaginated ? (parseInt(options.page, 10) || 1) : 1;
  const limit = isPaginated ? (parseInt(options.limit, 10) || 20) : 500;
  const offset = (Math.max(1, page) - 1) * limit;
  const search = typeof options === 'object' ? options?.search : null;
  const sortBy = (typeof options === 'object' && options?.sortBy) || 'created_at';
  const sortOrder = (typeof options === 'object' && options?.sortOrder) || 'DESC';

  let where = "WHERE la.status = 'Pending'";
  const params = [];

  if (department && department !== 'All') {
    params.push(department.trim());
    where += ` AND u.department = $${params.length}`;
  }

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    where += ` AND (u.user_name ILIKE $${params.length} OR u.emp_id ILIKE $${params.length} OR la.leave_type ILIKE $${params.length} OR la.reason ILIKE $${params.length})`;
  }

  const ALLOWED_SORTS = {
    created_at: 'la.created_at',
    from_date: 'la.from_date',
    total_days: 'la.total_days',
    user_name: 'u.user_name',
  };
  const sortCol = ALLOWED_SORTS[sortBy] || 'la.created_at';
  const sortDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  params.push(limit, offset);
  const { rows } = await query(`
    SELECT la.*, u.user_name, u.emp_id, u.department, u.position, u.profile_image
    FROM leave_applications la
    JOIN users u ON u.id = la.user_id
    ${where}
    ORDER BY ${sortCol} ${sortDir}, la.id ${sortDir}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  if (!isPaginated) {
    return rows;
  }

  const { rows: countRows } = await query(`
    SELECT COUNT(*) FROM leave_applications la JOIN users u ON u.id = la.user_id ${where}
  `, params.slice(0, -2));

  const total = parseInt(countRows[0]?.count || 0, 10);

  return {
    requests: rows,
    total,
    page: Math.max(1, page),
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async function createApplication({ userId, leaveType, fromDate, toDate, totalDays, isHalfDay = false, halfDayPeriod = null, reason, documentUrl = null }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Insert leave application
    const { rows } = await client.query(`
      INSERT INTO leave_applications (
        user_id, leave_type, from_date, to_date, total_days,
        is_half_day, half_day_period, reason, document_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending')
      RETURNING *
    `, [
      userId, leaveType, fromDate, toDate, totalDays || 1,
      isHalfDay, halfDayPeriod, reason, documentUrl
    ]);
    const app = rows[0];

    // 2. Also register placeholder in attendance table for transparency
    const start = new Date(fromDate);
    const end = new Date(toDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      await client.query(`
        INSERT INTO attendance (user_id, date, attendance_type, reason_for_applying, approved)
        VALUES ($1, $2, $3, $4, NULL)
        ON CONFLICT (user_id, date) DO UPDATE SET
          attendance_type = EXCLUDED.attendance_type,
          reason_for_applying = EXCLUDED.reason_for_applying,
          approved = NULL
      `, [userId, dateStr, leaveType, reason]);
    }

    await client.query('COMMIT');
    return app;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function approveApplication(id, approverId, decisionReason = 'Approved') {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: appRows } = await client.query(`
      UPDATE leave_applications
      SET status = 'Approved', approver_id = $2, decision_reason = $3, decided_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, approverId, decisionReason]);
    if (!appRows[0]) throw new Error('Leave application not found');
    const app = appRows[0];

    // Update attendance records to approved=true
    const start = new Date(app.from_date);
    const end = new Date(app.to_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      await client.query(`
        UPDATE attendance SET approved = TRUE
        WHERE user_id = $1 AND date = $2
      `, [app.user_id, dateStr]);
    }

    await client.query('COMMIT');
    return app;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function rejectApplication(id, approverId, decisionReason = 'Rejected') {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: appRows } = await client.query(`
      UPDATE leave_applications
      SET status = 'Rejected', approver_id = $2, decision_reason = $3, decided_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, approverId, decisionReason]);
    if (!appRows[0]) throw new Error('Leave application not found');
    const app = appRows[0];

    // Remove or reset pending attendance records for those dates
    const start = new Date(app.from_date);
    const end = new Date(app.to_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      await client.query(`
        UPDATE attendance SET approved = FALSE, attendance_type = 'Absent'
        WHERE user_id = $1 AND date = $2 AND approved IS NULL
      `, [app.user_id, dateStr]);
    }

    await client.query('COMMIT');
    return app;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getLeaveBalanceSummary(userId) {
  // Aggregate balance: default allocation (12 Casual, 10 Sick, 15 Planned) minus approved days
  const { rows: usedRows } = await query(`
    SELECT leave_type, SUM(total_days) as used_days
    FROM leave_applications
    WHERE user_id = $1 AND status = 'Approved'
    GROUP BY leave_type
  `, [userId]);

  const usedMap = {};
  for (const r of usedRows) {
    usedMap[r.leave_type] = parseFloat(r.used_days || 0);
  }

  const standardAllocations = [
    { label: 'Casual Leave', allocated: 12, used: usedMap['Casual Leave'] || 0 },
    { label: 'Sick Leave', allocated: 10, used: usedMap['Sick Leave'] || 0 },
    { label: 'Planned Leave', allocated: 15, used: usedMap['Planned Leave'] || 0 },
    { label: 'Comp OFF', allocated: 4, used: usedMap['Comp OFF'] || 0 },
  ];

  return standardAllocations.map(a => ({
    ...a,
    available: Math.max(0, a.allocated - a.used),
  }));
}

module.exports = {
  listByUser,
  listPending,
  createApplication,
  approveApplication,
  rejectApplication,
  getLeaveBalanceSummary,
};
