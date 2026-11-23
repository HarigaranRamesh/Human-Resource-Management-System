// src/db/repositories/role.repo.js  — replaces AccessModel
const { query } = require('../pg');

async function findAll() {
  const { rows } = await query(`SELECT * FROM roles ORDER BY role`);
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM roles WHERE id=$1`, [id]);
  return rows[0] || null;
}

async function findSystemRole() {
  const { rows } = await query(`SELECT * FROM roles WHERE is_system=true LIMIT 1`);
  return rows[0] || null;
}

async function findByName(role) {
  if (!role) return null;
  const { rows } = await query(`SELECT * FROM roles WHERE LOWER(role)=LOWER($1) LIMIT 1`, [role.trim()]);
  return rows[0] || null;
}

async function createRole(data) {
  const { rows } = await query(`
    INSERT INTO roles (role, is_system, main, has_payload_section, requires_documents,
                       is_candidate_role, collects_bank_details, id_prefix)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `, [
    data.role,
    data.isSystem || false,
    JSON.stringify(data.main || []),
    data.hasPayloadSection ?? true,
    data.requiresDocuments ?? true,
    data.isCandidateRole ?? false,
    data.collectsBankDetails ?? true,
    data.idPrefix || 'HARI',
  ]);
  return rows[0];
}

async function upsertSystemRole(data) {
  const existing = await findSystemRole();
  if (!existing) return createRole({ ...data, isSystem: true });
  const { rows } = await query(`
    UPDATE roles SET role=$1, main=$2 WHERE is_system=true RETURNING *
  `, [data.role, JSON.stringify(data.main || [])]);
  return rows[0];
}

async function updateRole(id, data) {
  const fields = [];
  const params = [];
  const allowed = ['role','main','has_payload_section','requires_documents',
                   'is_candidate_role','collects_bank_details','id_prefix'];
  for (const k of allowed) {
    if (data[k] !== undefined) {
      params.push(k === 'main' ? JSON.stringify(data[k]) : data[k]);
      fields.push(`${k}=$${params.length}`);
    }
  }
  if (!fields.length) return findById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE roles SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`,
    params
  );
  return rows[0];
}

async function addMember(roleId, userId) {
  await query(
    `INSERT INTO role_members(role_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
    [roleId, userId]
  );
}

module.exports = { findAll, findById, findSystemRole, findByName, createRole, upsertSystemRole, updateRole, addMember };
