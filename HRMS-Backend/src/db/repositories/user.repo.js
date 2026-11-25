// src/db/repositories/user.repo.js
// Replaces: Mongoose UserModel + user-service CRUD
const { query, getClient } = require('../pg');
const bcrypt = require('bcryptjs');

// ── helpers ──────────────────────────────────────────────
const SELECT_USER = `
  SELECT u.*,
         row_to_json(r) AS role
  FROM   users u
  LEFT JOIN roles r ON r.id = u.role_id
`;

function mapRow(row, includePassword = false) {
  if (!row) return null;
  const { role_id, ...rest } = row;
  if (!includePassword) {
    delete rest.password;
  }
  return { ...rest, role: row.role };
}

// ── CRUD ─────────────────────────────────────────────────
async function findById(id, includePassword = false) {
  const { rows } = await query(`${SELECT_USER} WHERE u.id=$1`, [id]);
  return mapRow(rows[0], includePassword);
}

async function findByMobile(mobileNo, includePassword = false) {
  const { rows } = await query(`${SELECT_USER} WHERE u.mobile_no=$1`, [mobileNo]);
  return mapRow(rows[0], includePassword);
}

async function findByEmail(email, includePassword = false) {
  const { rows } = await query(`${SELECT_USER} WHERE u.email=$1`, [email]);
  return mapRow(rows[0], includePassword);
}

async function findByEmpId(empId, includePassword = false) {
  const { rows } = await query(`${SELECT_USER} WHERE u.emp_id=$1`, [empId]);
  return mapRow(rows[0], includePassword);
}

/**
 * Universal User Finder for White-Label multi-tenant HRMS:
 * Matches case-insensitively against:
 * 1. Employee ID (e.g. HARI11001, EMP001, ACME-10, etc.)
 * 2. Official Email (e.g. employee@company.com)
 * 3. Personal Email (e.g. employee@gmail.com)
 * 4. Mobile Number (e.g. 9876543210)
 * 5. Username (e.g. john.doe, hari)
 */
async function findUniversal(identifier, includePassword = false) {
  const clean = (identifier || '').trim();
  if (!clean) return null;
  const { rows } = await query(`
    ${SELECT_USER}
    WHERE LOWER(u.emp_id) = LOWER($1)
       OR LOWER(u.official_email) = LOWER($1)
       OR LOWER(u.email) = LOWER($1)
       OR u.mobile_no = $1
       OR LOWER(u.user_name) = LOWER($1)
    ORDER BY u.status DESC, u.id ASC
    LIMIT 1
  `, [clean]);
  return mapRow(rows[0], includePassword);
}

async function listUsers({ page = 1, limit = 20, search, department, status, role, sortBy = 'created_at', sortOrder = 'DESC', isCandidateRole, isSystem } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;
  let where = 'WHERE 1=1';
  const params = [];

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    where += ` AND (u.user_name ILIKE $${params.length} OR u.mobile_no ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.emp_id ILIKE $${params.length} OR u.department ILIKE $${params.length} OR r.role ILIKE $${params.length})`;
  }

  if (department && department !== 'All') {
    params.push(String(department).trim());
    where += ` AND u.department = $${params.length}`;
  }

  if (status !== undefined && status !== null && status !== '') {
    if (status === 'true' || status === true || status === 'active' || status === 1 || status === '1') {
      where += ` AND (u.status IS TRUE OR u.status = 1)`;
    } else if (status === 'false' || status === false || status === 'inactive' || status === 0 || status === '0') {
      where += ` AND (u.status IS FALSE OR u.status = 0 OR u.status IS NULL)`;
    }
  }

  if (role && role !== 'All') {
    params.push(String(role).trim());
    where += ` AND r.role ILIKE $${params.length}`;
  }

  if (typeof isCandidateRole === 'boolean') {
    params.push(isCandidateRole);
    where += ` AND r.is_candidate_role=$${params.length}`;
  }

  if (typeof isSystem === 'boolean') {
    params.push(isSystem);
    where += ` AND r.is_system=$${params.length}`;
  }

  // Safe whitelisted column sorting
  const ALLOWED_SORTS = {
    user_name: 'u.user_name',
    name: 'u.user_name',
    emp_id: 'u.emp_id',
    department: 'u.department',
    created_at: 'u.created_at',
    status: 'u.status',
    role: 'r.role',
  };
  const sortCol = ALLOWED_SORTS[sortBy] || 'u.created_at';
  const sortDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  params.push(limit, offset);
  const { rows } = await query(`
    SELECT u.id, u.user_name, u.mobile_no, u.email, u.emp_id,
           u.position, u.department, u.status, u.created_at,
           r.role AS role_name, r.is_candidate_role, r.is_system
    FROM   users u
    LEFT JOIN roles r ON r.id = u.role_id
    ${where}
    ORDER BY ${sortCol} ${sortDir}, u.id ${sortDir}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const { rows: countRows } = await query(`
    SELECT COUNT(*) FROM users u LEFT JOIN roles r ON r.id=u.role_id ${where}
  `, params.slice(0, -2));

  const total = parseInt(countRows[0]?.count || 0, 10);

  return {
    users: rows,
    total,
    page: Math.max(1, page),
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async function createUser(data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Hash password (safe fallback if omitted)
    const rawPwd = data.password && String(data.password).trim() ? String(data.password).trim() : 'HariHrms@1234';
    const hashedPwd = await bcrypt.hash(rawPwd, 10);

    // Auto-increment empId
    const counterCol = data.isCandidateRole ? 'candidateId' : 'empId';
    const { rows: cRows } = await client.query(
      `UPDATE counters SET seq=seq+1 WHERE id=$1 RETURNING seq`, [counterCol]
    );
    const seq = cRows[0].seq;
    
    // Resolve prefix from role or organization_settings
    let prefix = data.idPrefix;
    if (!prefix || prefix === 'HARI') {
      try {
        const { rows: orgRows } = await client.query(`SELECT id_prefix FROM organization_settings ORDER BY updated_at DESC LIMIT 1`);
        if (orgRows[0]?.id_prefix) prefix = orgRows[0].id_prefix;
        else prefix = 'NIR';
      } catch {
        prefix = 'NIR';
      }
    }
    prefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'NIR';

    const empId = data.isCandidateRole
      ? `${prefix}${seq}`
      : `${prefix}${1101 + seq}`;

    const { rows } = await client.query(`
      INSERT INTO users (
        user_name, mobile_no, emp_id, password, email, official_email,
        blood_group, marital_status, gender, current_address, permanent_address,
        aadhar_no, pan_no, role_id, shift_id, position, designation, department,
        probation_period, probation_status, work_location, direct_report,
        emergency_contact_no, emergency_contact_name, doj, dob,
        education, family_details, created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
      ) RETURNING *
    `, [
      (data.user_name || '').toUpperCase().trim(),
      data.mobile_no || data.mobileNo || null,
      empId,
      hashedPwd,
      data.email || null,
      data.officialEmail || null,
      data.bloodGroup || null,
      data.maritalStatus || null,
      data.gender || null,
      data.currentAddress || null,
      data.permanentAddress || null,
      data.aadharNo || '',
      (data.panNo || '').toUpperCase(),
      data.role || data.role_id || null,
      data.shift || data.shift_id || null,
      data.position || null,
      data.designation || null,
      data.department || null,
      data.probationPeriod || null,
      data.probationStatus || null,
      data.workLocation || null,
      data.directReport || null,
      data.emergency_contact_no || data.emergencyContactNo || '',
      data.emergency_contact_name || data.emergencyContactName || '',
      data.doj || data.joiningDate || new Date(),
      data.dob || new Date(),
      JSON.stringify(data.education || []),
      JSON.stringify(data.familyDetails || data.family_details || []),
      data.createdby || data.created_by || null,
    ]);

    // Link to role members
    if (data.role || data.role_id) {
      await client.query(
        `INSERT INTO role_members(role_id, user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [data.role || data.role_id, rows[0].id]
      );
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function updateUser(id, data) {
  const fields = [];
  const params = [];

  const allowed = [
    'user_name','mobile_no','email','official_email','blood_group',
    'marital_status','gender','current_address','permanent_address',
    'aadhar_no','pan_no','role_id','shift_id','position','designation',
    'department','probation_period','probation_status','work_location',
    'direct_report','status','emergency_contact_no','emergency_contact_name',
    'bank_name','branch_name','account_no','ifsc_code','account_holder_name',
    'education','family_details','doj','dob','profile_image','manager_id','annual_ctc',
    'voter_id','passport_no','father_name','mother_name','emergency_contact_relation',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      fields.push(`${key}=$${params.length}`);
    }
  }

  if (data.password) {
    params.push(await bcrypt.hash(data.password, 10));
    fields.push(`password=$${params.length}`);
  }

  if (!fields.length) return findById(id);

  params.push(id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`,
    params
  );
  return rows[0];
}

async function deleteUser(id) {
  const { rows } = await query(`DELETE FROM users WHERE id=$1 RETURNING *`, [id]);
  return rows[0];
}

async function changePassword(id, currentPassword, newPassword) {
  const { rows } = await query(`SELECT password FROM users WHERE id=$1`, [id]);
  if (!rows[0]) throw new Error('User not found');
  const match = await bcrypt.compare(currentPassword, rows[0].password);
  if (!match) throw new Error('Current password is incorrect');
  const hashed = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE users SET password=$1 WHERE id=$2`, [hashed, id]);
  return { success: true };
}

// ── Auth ─────────────────────────────────────────────────
async function loginByMobile(mobileNo, password) {
  const user = await findByMobile(mobileNo, true);
  if (!user) throw new Error('Account not found');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('Password not matched');
  if (!user.status) throw new Error('User is inactive');
  if (user.role?.is_candidate_role) throw new Error('Access Denied: Candidates cannot login.');
  await query(`UPDATE users SET logcal=logcal+1 WHERE id=$1`, [user.id]);
  delete user.password;
  return user;
}

async function loginByEmpId(empId, password) {
  const user = await findByEmpId(empId.toUpperCase(), true);
  if (!user) throw new Error('Account not found');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('Password not matched');
  if (!user.status) throw new Error('User is inactive');
  if (user.role?.is_candidate_role) throw new Error('Access Denied: Candidates cannot login.');
  await query(`UPDATE users SET logcal=logcal+1 WHERE id=$1`, [user.id]);
  delete user.password;
  return user;
}

/**
 * Universal White-Label Authentication:
 * Works seamlessly across any company format without code modifications.
 */
async function loginUniversal(identifier, password) {
  const user = await findUniversal(identifier, true);
  if (!user) throw new Error('Account not found. Please check your Employee ID, Email, or Mobile Number.');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('Password does not match.');
  if (!user.status) throw new Error('This account is currently deactivated. Please contact your HR administrator.');
  if (user.role?.is_candidate_role) throw new Error('Access Denied: Candidate roles cannot log in.');
  await query(`UPDATE users SET logcal = COALESCE(logcal, 0) + 1 WHERE id=$1`, [user.id]);
  delete user.password;
  return user;
}

async function setPasswordDirect(userId, newPassword) {
  const hashed = await bcrypt.hash(newPassword, 10);
  const { rows } = await query(`UPDATE users SET password=$1 WHERE id=$2 RETURNING id, user_name, email`, [hashed, userId]);
  if (!rows[0]) throw new Error('User not found');
  return rows[0];
}

async function assignShift(userId, shiftId) {
  const { rows } = await query(`UPDATE users SET shift_id=$1 WHERE id=$2 RETURNING *`, [shiftId, userId]);
  if (!rows[0]) throw new Error('User not found');
  return mapRow(rows[0], false);
}

// ── Dashboard ────────────────────────────────────────────
async function getDashboardStats() {
  const { rows } = await query(`
    SELECT
      COUNT(*)                                              AS "totalEmployees",
      COUNT(*) FILTER (WHERE status=true)                  AS "activeEmployees",
      COUNT(*) FILTER (WHERE status=false)                 AS "inactiveEmployees",
      COALESCE((
        SELECT COUNT(DISTINCT user_id)
        FROM attendance
        WHERE date = CURRENT_DATE
          AND attendance_type = 'Present'
      ), 0)                                                AS "presentToday",
      COALESCE((
        SELECT COUNT(DISTINCT user_id)
        FROM attendance
        WHERE date = CURRENT_DATE
          AND attendance_type NOT IN ('Present', 'Absent', 'Holiday')
      ), 0)                                                AS "onLeaveToday",
      (
        COUNT(*) FILTER (WHERE status=true) -
        COALESCE((
          SELECT COUNT(DISTINCT user_id)
          FROM attendance
          WHERE date = CURRENT_DATE
            AND attendance_type = 'Present'
        ), 0)
      )                                                    AS "absentToday"
    FROM users
  `);

  // Department counts
  const { rows: deptRows } = await query(`
    SELECT COALESCE(NULLIF(department, ''), 'General') AS name, COUNT(*) AS count
    FROM users
    WHERE status = TRUE
    GROUP BY COALESCE(NULLIF(department, ''), 'General')
    ORDER BY count DESC
  `);

  // Last 7 days attendance trends
  const { rows: trendRows } = await query(`
    SELECT
      d::date AS date,
      COALESCE(COUNT(a.id) FILTER (WHERE a.attendance_type = 'Present'), 0) AS present,
      COALESCE(COUNT(a.id) FILTER (WHERE a.attendance_type = 'Absent'), 0) AS absent,
      COALESCE(COUNT(a.id) FILTER (WHERE a.attendance_type NOT IN ('Present', 'Absent', 'Holiday')), 0) AS on_leave
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d
    LEFT JOIN attendance a ON a.date = d::date
    GROUP BY d::date
    ORDER BY d::date ASC
  `);

  // Payroll summary
  const { rows: payRows } = await query(`
    SELECT
      COALESCE(SUM(COALESCE(annual_ctc, 600000)), 0) AS total_ctc,
      COALESCE(AVG(COALESCE(annual_ctc, 600000)), 0) AS avg_ctc,
      COALESCE(SUM(COALESCE(annual_ctc, 600000)) / 12, 0) AS monthly_burn
    FROM users
    WHERE status = TRUE
  `);

  return {
    totalEmployees:   parseInt(rows[0].totalEmployees),
    activeEmployees:  parseInt(rows[0].activeEmployees),
    inactiveEmployees: parseInt(rows[0].inactiveEmployees),
    presentToday:     parseInt(rows[0].presentToday),
    onLeaveToday:     parseInt(rows[0].onLeaveToday),
    absentToday:      Math.max(0, parseInt(rows[0].absentToday)),
    departmentDistribution: deptRows.map(r => ({ name: r.name, count: parseInt(r.count) })),
    attendanceTrends: trendRows.map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      present: parseInt(r.present),
      absent: parseInt(r.absent),
      onLeave: parseInt(r.on_leave)
    })),
    payrollSummary: {
      totalAnnualCtc: parseFloat(payRows[0].total_ctc),
      avgAnnualCtc: Math.round(parseFloat(payRows[0].avg_ctc)),
      monthlyBurn: Math.round(parseFloat(payRows[0].monthly_burn)),
    }
  };
}

async function getRoleCounts() {
  const { rows } = await query(`
    SELECT r.role AS "_id", COUNT(u.id) AS count
    FROM   roles r
    LEFT JOIN users u ON u.role_id = r.id
    GROUP BY r.role
    ORDER BY count DESC
  `);
  return rows.map(r => ({ _id: r._id, count: parseInt(r.count) }));
}

module.exports = {
  findById, findByMobile, findByEmail, findByEmpId, findUniversal,
  listUsers, createUser, updateUser, deleteUser, changePassword,
  setPasswordDirect, assignShift,
  loginByMobile, loginByEmpId, loginUniversal,
  getDashboardStats, getRoleCounts,
};
