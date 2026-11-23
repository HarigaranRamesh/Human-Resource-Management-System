// src/db/repositories/deletedUser.repo.js
const { query, getClient } = require('../pg');
const bcrypt = require('bcryptjs');

async function listDeletedUsers() {
  const { rows } = await query(`
    SELECT d.id, d.user_data, d.reason, d.deleted_at,
           u.user_name AS deleted_by_name
    FROM deleted_users d
    LEFT JOIN users u ON u.id = d.deleted_by
    ORDER BY d.deleted_at DESC
  `);
  return rows.map(r => ({
    id: r.id,
    user_name: r.user_data?.user_name,
    email: r.user_data?.email,
    mobile_no: r.user_data?.mobile_no,
    emp_id: r.user_data?.emp_id,
    department: r.user_data?.department,
    position: r.user_data?.position,
    deleted_at: r.deleted_at,
    deleted_by: r.deleted_by_name,
    reason: r.reason,
    user_data: r.user_data,
  }));
}

async function getDeletedUserById(id) {
  const { rows } = await query(`SELECT * FROM deleted_users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function archiveUser(userData, deletedBy, reason) {
  const { rows } = await query(`
    INSERT INTO deleted_users (user_data, deleted_by, reason)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [JSON.stringify(userData), deletedBy || null, reason || 'User deleted']);
  return rows[0];
}

async function restoreUser(deletedId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: dRows } = await client.query(`SELECT * FROM deleted_users WHERE id = $1`, [deletedId]);
    if (!dRows[0]) throw new Error('Deleted user record not found');

    const u = dRows[0].user_data;
    const defaultPwd = await bcrypt.hash('Employee@123', 10);
    const pwdToUse = u.password || defaultPwd;

    const { rows: restored } = await client.query(`
      INSERT INTO users (
        id, user_name, mobile_no, emp_id, password, email, official_email,
        blood_group, marital_status, gender, current_address, permanent_address,
        aadhar_no, pan_no, role_id, shift_id, position, designation, department,
        probation_period, probation_status, work_location, direct_report,
        emergency_contact_no, emergency_contact_name, doj, dob,
        education, family_details, status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,true
      )
      ON CONFLICT (id) DO UPDATE SET status = true
      RETURNING *
    `, [
      u.id, u.user_name, u.mobile_no, u.emp_id, pwdToUse, u.email, u.official_email,
      u.blood_group, u.marital_status, u.gender, u.current_address, u.permanent_address,
      u.aadhar_no, u.pan_no, u.role_id, u.shift_id, u.position, u.designation, u.department,
      u.probation_period, u.probation_status, u.work_location, u.direct_report,
      u.emergency_contact_no, u.emergency_contact_name, u.doj || new Date(), u.dob || new Date(),
      JSON.stringify(u.education || []), JSON.stringify(u.family_details || [])
    ]);

    // Delete from deleted_users
    await client.query(`DELETE FROM deleted_users WHERE id = $1`, [deletedId]);

    await client.query('COMMIT');
    return restored[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  listDeletedUsers,
  getDeletedUserById,
  archiveUser,
  restoreUser,
};
