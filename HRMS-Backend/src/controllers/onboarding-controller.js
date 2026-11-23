// src/controllers/onboarding-controller.js
// Enterprise Onboarding & Super Admin Manual Setup Controller
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { query } = require('../db/pg');

const OnboardingController = express.Router();

let PRIVATE_KEY;
try {
  PRIVATE_KEY = fs.readFileSync(path.join(process.cwd(), 'private.key'), 'utf8').trim();
} catch (e) {
  PRIVATE_KEY = process.env.JWT_SECRET || 'Bla@2021BOWS^!@#$)(*)';
}

const SUPER_ADMIN_MENU = [
  { menuName: 'Dashboard', children: [{ submenuName: 'Dashboard' }, { submenuName: 'Feed' }] },
  { menuName: 'Access', children: [{ submenuName: 'Access' }, { submenuName: 'Access Define' }] },
  { menuName: 'User Management', children: [{ submenuName: 'Add User' }, { submenuName: 'View Users' }, { submenuName: 'ViewEdit Users' }] },
  { menuName: 'Reports', children: [{ submenuName: 'Daily Report' }, { submenuName: 'Monthly Report' }] },
  { menuName: "Employee's Approval", children: [{ submenuName: 'Employee Leave Approval' }] },
  { menuName: 'Certificate', children: [{ submenuName: 'Letters of Appointment' }, { submenuName: 'Offer Letter' }, { submenuName: 'Experience Letter' }] },
  { menuName: 'Payslip', children: [{ submenuName: 'Payslip' }] },
  { menuName: 'Shift Management', children: [{ submenuName: 'All Shifts' }] },
  { menuName: 'Leave Policy', children: [{ submenuName: 'Yearly Leave Policy' }, { submenuName: 'Users Leave Policy Edit' }] },
  { menuName: 'Holiday Planning', children: [{ submenuName: 'Holiday Planning' }] },
  { menuName: 'Asset Management', children: [{ submenuName: 'Asset Management' }] },
];

function makeToken(user, role) {
  return jwt.sign(
    {
      id: user.id,
      emp_id: user.emp_id,
      roleId: role.id,
      roleName: role.role,
      isSystemAdmin: true,
      hasPayload: true,
      requiresDocs: true,
      isCandidate: false,
      access: role.main || SUPER_ADMIN_MENU,
      user_name: user.user_name,
      position: user.position,
      designation: user.designation,
      department: user.department,
    },
    PRIVATE_KEY,
    { expiresIn: '1d' }
  );
}

// Ensure organization_settings table and extended columns exist
async function ensureOrgTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS organization_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_name TEXT NOT NULL,
      industry TEXT DEFAULT '',
      cin_number TEXT DEFAULT '',
      company_size TEXT DEFAULT '',
      address TEXT DEFAULT '',
      location_city TEXT DEFAULT '',
      location_address TEXT DEFAULT '',
      website TEXT DEFAULT '',
      official_email TEXT DEFAULT '',
      official_contact TEXT DEFAULT '',
      id_prefix TEXT DEFAULT 'NIR',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Migrate columns in case table previously existed with fewer columns
  await query(`
    ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS official_email TEXT DEFAULT '';
    ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS company_size TEXT DEFAULT '';
    ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS location_city TEXT DEFAULT '';
    ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS location_address TEXT DEFAULT '';
  `);
}

// ── GET /api/onboard/status ──────────────────────────────────
// Checks if organization & super admin are configured
OnboardingController.get('/status', async (_req, res) => {
  try {
    await ensureOrgTable();

    // Check if any Super Admin user exists
    const { rows: adminRows } = await query(`
      SELECT u.id, u.user_name, u.email, u.mobile_no, r.role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.is_system = true AND u.status = true
      LIMIT 1
    `);

    // Check organization settings
    const { rows: orgRows } = await query(`
      SELECT * FROM organization_settings ORDER BY updated_at DESC LIMIT 1
    `);

    const hasAdmin = adminRows.length > 0;
    const org = orgRows[0] || null;

    res.json({
      success: true,
      isConfigured: hasAdmin,
      organizationName: org ? org.org_name : 'NIRALIX HRMS Enterprise',
      superAdminEmail: hasAdmin ? adminRows[0].email : null,
      details: {
        admin: hasAdmin ? { name: adminRows[0].user_name, email: adminRows[0].email } : null,
        organization: org,
      },
    });
  } catch (err) {
    console.error('GET /api/onboard/status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/onboard/setup ──────────────────────────────────
// Primary Enterprise Onboarding: Creates Super Admin & Configures Workspace
OnboardingController.post('/setup', async (req, res) => {
  try {
    await ensureOrgTable();

    const {
      firstName,
      lastName,
      workEmail,
      personalEmail,
      mobileNo,
      dob,
      gender,
      dateOfJoining,
      roleCategory,
      roleName,
      password,
      // Organization fields requested:
      organizationName,
      idPrefix,
      officialEmail,
      website,
      phone,
      officialContact,
      industry,
      companySize,
      locationCity,
      locationAddress,
      address,
    } = req.body || {};

    // Validate Admin Details
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ success: false, message: 'First name and Last name are required.' });
    }
    if (!workEmail?.trim() || !workEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid Work Email is required.' });
    }
    const cleanMobile = String(mobileNo || '').replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      return res.status(400).json({ success: false, message: 'A valid 10-digit Phone Number is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    // Validate Organization Details
    if (!organizationName?.trim()) {
      return res.status(400).json({ success: false, message: 'Organization Name is required.' });
    }
    if (!idPrefix?.trim()) {
      return res.status(400).json({ success: false, message: 'Employee ID Prefix is required (e.g. OA, NIR).' });
    }
    if (!officialEmail?.trim() || !officialEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Official Email is required.' });
    }
    const contactPhone = String(phone || officialContact || cleanMobile).trim();
    if (!contactPhone) {
      return res.status(400).json({ success: false, message: 'Official Phone number is required.' });
    }
    if (!companySize?.trim()) {
      return res.status(400).json({ success: false, message: 'Company Size is required.' });
    }
    const city = (locationCity || '').trim();
    const locAddress = (locationAddress || address || '').trim();
    if (!city) {
      return res.status(400).json({ success: false, message: 'Headquarters City & State is required.' });
    }
    if (!locAddress) {
      return res.status(400).json({ success: false, message: 'Registered Office Address is required.' });
    }

    const cleanPrefix = idPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'NIR';
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const normalizedEmail = workEmail.trim().toLowerCase();
    const adminRoleTitle = roleName?.trim() || 'Super Admin';
    const adminDepartment = roleCategory?.trim() || 'CEO / Organizational Head';

    // 1. Save or update organization settings
    const fullLocAddress = `${city} - ${locAddress}`;
    const { rows: existingOrg } = await query(`SELECT id FROM organization_settings LIMIT 1`);
    if (existingOrg.length > 0) {
      await query(`
        UPDATE organization_settings
        SET org_name = $1,
            industry = $2,
            company_size = $3,
            location_city = $4,
            location_address = $5,
            address = $6,
            website = $7,
            official_email = $8,
            official_contact = $9,
            id_prefix = $10,
            updated_at = NOW()
        WHERE id = $11
      `, [
        organizationName.trim(),
        industry || 'Information Technology',
        companySize.trim(),
        city,
        locAddress,
        fullLocAddress,
        website?.trim() || '',
        officialEmail.trim().toLowerCase(),
        contactPhone,
        cleanPrefix,
        existingOrg[0].id,
      ]);
    } else {
      await query(`
        INSERT INTO organization_settings (
          org_name, industry, company_size, location_city, location_address,
          address, website, official_email, official_contact, id_prefix
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        organizationName.trim(),
        industry || 'Information Technology',
        companySize.trim(),
        city,
        locAddress,
        fullLocAddress,
        website?.trim() || '',
        officialEmail.trim().toLowerCase(),
        contactPhone,
        cleanPrefix,
      ]);
    }

    // 2. Ensure Super Admin role exists with full permissions to all 11 modules and correct prefix
    let role;
    const { rows: roleRows } = await query(`
      INSERT INTO roles (role, is_system, main, has_payload_section, requires_documents, id_prefix)
      VALUES ('Super Admin', true, $1, true, true, $2)
      ON CONFLICT ((LOWER(role))) DO UPDATE
      SET is_system = true, main = EXCLUDED.main, id_prefix = EXCLUDED.id_prefix
      RETURNING *
    `, [JSON.stringify(SUPER_ADMIN_MENU), cleanPrefix]);

    if (roleRows.length > 0) {
      role = roleRows[0];
    } else {
      const { rows: fetched } = await query(`SELECT * FROM roles WHERE is_system = true LIMIT 1`);
      role = fetched[0];
      await query(`UPDATE roles SET main = $1, id_prefix = $2 WHERE id = $3`, [
        JSON.stringify(SUPER_ADMIN_MENU),
        cleanPrefix,
        role.id,
      ]);
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Check if user with workEmail or cleanMobile already exists
    const adminEmpId = `${cleanPrefix}1101`;
    const { rows: existingUsers } = await query(`
      SELECT * FROM users WHERE LOWER(email) = $1 OR mobile_no = $2
    `, [normalizedEmail, cleanMobile]);

    let user;
    if (existingUsers.length > 0) {
      // Update existing user to be the Super Admin with new prefix empId
      const existingId = existingUsers[0].id;
      const { rows: updated } = await query(`
        UPDATE users
        SET user_name = $1,
            email = $2,
            official_email = $2,
            mobile_no = $3,
            password = $4,
            role_id = $5,
            status = true,
            position = $6,
            designation = $6,
            department = $7,
            emp_id = $8,
            gender = COALESCE($9, gender),
            dob = COALESCE($10::timestamptz, dob),
            doj = COALESCE($11::timestamptz, doj),
            updated_at = NOW()
        WHERE id = $12
        RETURNING *
      `, [
        fullName,
        normalizedEmail,
        cleanMobile,
        hashedPassword,
        role.id,
        adminRoleTitle,
        adminDepartment,
        adminEmpId,
        gender || null,
        dob || null,
        dateOfJoining || null,
        existingId,
      ]);
      user = updated[0];
    } else {
      // Create fresh Super Admin user with prefix empId (e.g. OA1101)
      const { rows: created } = await query(`
        INSERT INTO users (
          user_name, email, official_email, mobile_no, password,
          role_id, status, position, designation, department,
          emp_id, gender, dob, doj, emergency_contact_no, emergency_contact_name
        ) VALUES (
          $1, $2, $2, $3, $4,
          $5, true, $6, $6, $7,
          $8, $9, $10, $11, '0000000000', 'Emergency Contact'
        )
        RETURNING *
      `, [
        fullName,
        normalizedEmail,
        cleanMobile,
        hashedPassword,
        role.id,
        adminRoleTitle,
        adminDepartment,
        adminEmpId,
        gender || null,
        dob ? new Date(dob) : new Date('1990-01-01'),
        dateOfJoining ? new Date(dateOfJoining) : new Date(),
      ]);
      user = created[0];
    }

    // 5. Ensure member is linked in role_members
    await query(`
      INSERT INTO role_members (role_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [role.id, user.id]);

    // 6. Generate authenticated JWT
    const token = makeToken(user, role);

    console.log(`🚀 [NIRALIX Onboarding] Super Admin created: ${fullName} (${adminEmpId}) for ${organizationName} (Prefix: ${cleanPrefix})`);

    return res.json({
      success: true,
      message: 'Super Administrator account created and NIRALIX workspace provisioned successfully!',
      token,
      user: {
        id: user.id,
        userName: user.user_name,
        empId: user.emp_id,
        email: user.email,
        mobile: user.mobile_no,
        role: role.role,
        isSystemAdmin: true,
        access: SUPER_ADMIN_MENU,
      },
    });
  } catch (err) {
    console.error('POST /api/onboard/setup error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Setup failed' });
  }
});

module.exports = OnboardingController;
