// src/db/seed-pg.js  — replaces seed/seed-internal.js for PostgreSQL
const bcrypt = require('bcryptjs');
const { query } = require('./pg');
const migrateRoles = require('./migrate-roles');

async function seedInternalRoot() {
  try {
    console.log('🌱 Ensuring System Root exists in PostgreSQL...');
    await migrateRoles();

    const adminName     = process.env.ADMIN_NAME     || 'Super Admin';
    const email         = process.env.ADMIN_EMAIL    || 'admin@harihrms.com';
    const password      = process.env.ADMIN_PASSWORD || 'Admin@1234';
    const mobile        = process.env.ADMIN_MOBILE   || '9999999999';
    const position      = process.env.ADMIN_POSITION || 'System Administrator';
    const department    = process.env.ADMIN_DEPARTMENT || 'IT';

    if (!email || !password) throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');

    const superAdminMenu = [
      { menuName:'Dashboard',        children:[{submenuName:'Dashboard'},{submenuName:'Feed'}] },
      { menuName:'Access',           children:[{submenuName:'Access'},{submenuName:'Access Define'}] },
      { menuName:'User Management',  children:[{submenuName:'Add User'},{submenuName:'View Users'},{submenuName:'ViewEdit Users'}] },
      { menuName:'Reports',          children:[{submenuName:'Daily Report'},{submenuName:'Monthly Report'}] },
      { menuName:"Employee's Approval", children:[{submenuName:'Employee Leave Approval'}] },
      { menuName:'Certificate',      children:[{submenuName:'Letters of Appointment'},{submenuName:'Offer Letter'},{submenuName:'Experience Letter'}] },
      { menuName:'Payslip',          children:[{submenuName:'Payslip'}] },
      { menuName:'Shift Management', children:[{submenuName:'All Shifts'}] },
      { menuName:'Leave Policy',     children:[{submenuName:'Yearly Leave Policy'},{submenuName:'Users Leave Policy Edit'}] },
      { menuName:'Holiday Planning', children:[{submenuName:'Holiday Planning'}] },
      { menuName:'Asset Management', children:[{submenuName:'Asset Management'}] },
    ];

    // 1. Upsert system role
    const { rows: roleRows } = await query(`
      INSERT INTO roles (role, is_system, main, has_payload_section, requires_documents, id_prefix)
      VALUES ($1, true, $2, true, true, 'HARI')
      ON CONFLICT ((LOWER(role))) DO UPDATE
      SET is_system = true, main = EXCLUDED.main, id_prefix = 'HARI'
      RETURNING *
    `, [adminName, JSON.stringify(superAdminMenu)]);

    let role;
    if (roleRows.length) {
      role = roleRows[0];
    } else {
      const { rows } = await query(`SELECT * FROM roles WHERE is_system=true LIMIT 1`);
      role = rows[0];
      await query(`UPDATE roles SET role=$1 WHERE id=$2`, [adminName, role.id]);
    }
    console.log(`✅ System Root Role '${adminName}' confirmed: ${role.id}`);

    // 2. Hash password
    const hashedPwd = await bcrypt.hash(password, 10);

    // 3. Upsert admin user (do not overwrite existing password so admin can change their password freely)
    const { rows: userRows } = await query(`
      INSERT INTO users (user_name, email, password, mobile_no, role_id, status, position, department, emp_id,
        emergency_contact_no, emergency_contact_name)
      VALUES ($1,$2,$3,$4,$5,true,$6,$7,'HARI11010','0000000000','Emergency Contact')
      ON CONFLICT (email)
      DO UPDATE SET role_id=$5, position=$6, department=$7
      RETURNING *
    `, [adminName.toUpperCase(), email, hashedPwd, mobile, role.id, position, department]);

    const adminUser = userRows[0];
    console.log(`✅ Admin User '${adminName}' confirmed: ${adminUser.id}`);

    // 4. Link admin to role members
    await query(
      `INSERT INTO role_members(role_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
      [role.id, adminUser.id]
    );

    // 5. Ensure Keka Organization Tree reference team (Shiju Shaji + direct reports)
    await ensureKekaOrgTreeTeam(hashedPwd, role.id);

    console.log('\n🎉 PostgreSQL seed complete!');
    console.log(`   Login → Mobile: ${mobile}  |  Password: ${password}\n`);

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  }
}

async function ensureKekaOrgTreeTeam(hashedPassword, adminRoleId) {
  try {
    // 1. Shiju Shaji (Senior Technical Manager)
    const { rows: mgrRows } = await query(`
      INSERT INTO users (
        user_name, email, password, mobile_no, role_id, status,
        position, designation, department, emp_id, work_location,
        emergency_contact_no, emergency_contact_name
      ) VALUES (
        'Shiju Shaji', 'shiju.shaji@harihrms.com', $1, '9840199001', $2, true,
        'Senior Technical Manager', 'Senior Technical Manager', 'Engineering', 'HARI10001', 'KIC Bengaluru',
        '9840000001', 'Emergency Contact'
      )
      ON CONFLICT (email) DO UPDATE SET
        user_name = 'Shiju Shaji',
        position = 'Senior Technical Manager',
        designation = 'Senior Technical Manager',
        work_location = 'KIC Bengaluru',
        status = true
      RETURNING id
    `, [hashedPassword, adminRoleId]);

    const shijuId = mgrRows[0]?.id;
    if (!shijuId) return;

    // 2. Direct reports under Shiju Shaji
    const team = [
      {
        name: 'Rahil Rajeshkumar Chandaliya',
        email: 'rahil.c@harihrms.com',
        mobile: '9840199002',
        position: 'Flutter Developer',
        department: 'Engineering',
        empId: 'HARI10002',
      },
      {
        name: 'M N Vinit',
        email: 'vinit.mn@harihrms.com',
        mobile: '9840199003',
        position: 'UI/ UX Designer',
        department: 'Product & Design',
        empId: 'HARI10003',
      },
      {
        name: 'Chaitra Kulkarni',
        email: 'chaitra.k@harihrms.com',
        mobile: '9840199004',
        position: 'Quality Assurance Engineer',
        department: 'Quality Assurance',
        empId: 'HARI10004',
      },
      {
        name: 'Harigaran Ramesh',
        email: 'harigaran.ramesh@harihrms.com',
        mobile: '9840199005',
        position: 'Junior Full Stack Developer',
        department: 'Engineering',
        empId: 'HARI10005',
      },
    ];

    for (const member of team) {
      await query(`
        INSERT INTO users (
          user_name, email, password, mobile_no, role_id, status,
          position, designation, department, emp_id, work_location,
          manager_id, emergency_contact_no, emergency_contact_name
        ) VALUES (
          $1, $2, $3, $4, $5, true,
          $6, $6, $7, $8, 'KIC Bengaluru',
          $9, '9840000000', 'Family Contact'
        )
        ON CONFLICT (email) DO UPDATE SET
          user_name = $1,
          position = $6,
          designation = $6,
          work_location = 'KIC Bengaluru',
          manager_id = $9,
          status = true
      `, [
        member.name, member.email, hashedPassword, member.mobile, adminRoleId,
        member.position, member.department, member.empId, shijuId
      ]);
    }

    // Also link any existing Harigaran user to Shiju Shaji
    await query(`
      UPDATE users SET manager_id = $1, work_location = 'KIC Bengaluru'
      WHERE LOWER(user_name) LIKE '%harigaran%' AND id != $1
    `, [shijuId]);

    console.log('✅ Keka reference hierarchy confirmed: Shiju Shaji + Direct Reports.');
  } catch (err) {
    console.error('⚠️ Could not seed Keka reference team:', err.message);
  }
}

module.exports = seedInternalRoot;
