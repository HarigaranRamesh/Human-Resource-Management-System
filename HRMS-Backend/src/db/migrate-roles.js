// src/db/migrate-roles.js
const { query, getClient } = require('./pg');
const fs = require('fs');
const path = require('path');

async function migrateRoles() {
  const client = await getClient();
  try {
    console.log('🔄 Starting roles migration & deduplication...');
    await client.query('BEGIN');

    // 1. Find all Super Admin roles
    const { rows: saRows } = await client.query(
      `SELECT id, role, created_at FROM roles WHERE LOWER(role) = 'super admin' ORDER BY created_at ASC`
    );

    let canonicalSaId = null;
    if (saRows.length > 0) {
      canonicalSaId = saRows[0].id;
      console.log(`📌 Found ${saRows.length} Super Admin roles. Canonical ID: ${canonicalSaId}`);

      // Re-point any users pointing to duplicate Super Admin IDs to canonicalSaId
      const duplicateIds = saRows.slice(1).map(r => r.id);
      if (duplicateIds.length > 0) {
        await client.query(
          `UPDATE users SET role_id = $1 WHERE role_id = ANY($2::uuid[])`,
          [canonicalSaId, duplicateIds]
        );
        await client.query(
          `DELETE FROM role_members WHERE role_id = ANY($1::uuid[])`,
          [duplicateIds]
        );
        await client.query(
          `DELETE FROM roles WHERE id = ANY($1::uuid[])`,
          [duplicateIds]
        );
        console.log(`🗑️ Removed ${duplicateIds.length} duplicate Super Admin role entries.`);
      }
    }

    // 2. Add unique index on LOWER(role)
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS roles_lower_role_uidx ON roles (LOWER(role))`
    );
    console.log('✅ Unique index roles_lower_role_uidx verified.');

    // 3. Load standard-menus.json
    const menusPath = path.join(__dirname, '../seed/standard-menus.json');
    let standardRoles = [];
    if (fs.existsSync(menusPath)) {
      standardRoles = JSON.parse(fs.readFileSync(menusPath, 'utf8'));
    }

    // Ensure we have Manager & HR as well if not in standard-menus
    const hasManager = standardRoles.some(r => r.role.toLowerCase() === 'manager');
    if (!hasManager) {
      const adminRole = standardRoles.find(r => r.role === 'Admin');
      standardRoles.push({
        role: 'Manager',
        main: adminRole ? adminRole.main : [],
      });
    }

    const hasHR = standardRoles.some(r => r.role.toLowerCase() === 'hr');
    if (!hasHR) {
      const adminRole = standardRoles.find(r => r.role === 'Admin');
      standardRoles.push({
        role: 'HR',
        main: adminRole ? adminRole.main : [],
      });
    }

    // Upsert standard roles
    for (const r of standardRoles) {
      const isSystem = r.role.toLowerCase() === 'super admin';
      await client.query(`
        INSERT INTO roles (role, is_system, main, has_payload_section, requires_documents, is_candidate_role, collects_bank_details, id_prefix)
        VALUES ($1, $2, $3, true, true, false, true, 'HARI')
        ON CONFLICT ((LOWER(role))) DO UPDATE
        SET is_system = EXCLUDED.is_system,
            main = EXCLUDED.main,
            id_prefix = 'HARI',
            updated_at = NOW()
      `, [r.role, isSystem, JSON.stringify(r.main || [])]);
      console.log(`  ✓ Synced role: ${r.role}`);
    }

    // 4. Update 'OAID' prefix in roles table
    await client.query(`UPDATE roles SET id_prefix = 'HARI' WHERE id_prefix = 'OAID'`);

    // 5. Update user emp_ids with OAID to HARI
    await client.query(`UPDATE users SET emp_id = REPLACE(emp_id, 'OAID', 'HARI') WHERE emp_id LIKE 'OAID%'`);

    // 6. Get Employee role ID
    const { rows: empRoleRows } = await client.query(
      `SELECT id FROM roles WHERE LOWER(role) = 'employee' LIMIT 1`
    );
    if (empRoleRows.length > 0) {
      const empRoleId = empRoleRows[0].id;
      // Change HARIGARAN's role to Employee
      await client.query(
        `UPDATE users SET role_id = $1 WHERE mobile_no = '9843590424'`,
        [empRoleId]
      );
      console.log(`✅ Set HARIGARAN (9843590424) role to Employee (${empRoleId})`);
    }

    await client.query('COMMIT');
    console.log('🎉 Role migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateRoles().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = migrateRoles;
