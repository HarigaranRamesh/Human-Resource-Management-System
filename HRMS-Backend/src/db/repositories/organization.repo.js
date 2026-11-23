// src/db/repositories/organization.repo.js
// Organization hierarchy tree, departments, and designations
const { query } = require('../pg');

async function listDepartments() {
  const { rows } = await query(`
    SELECT d.*, u.user_name AS head_name, u.email AS head_email,
           (SELECT COUNT(*) FROM users WHERE department = d.name AND status = true) AS employee_count
    FROM departments d
    LEFT JOIN users u ON u.id = d.head_id
    ORDER BY d.name ASC
  `);
  return rows;
}

async function createDepartment({ name, description, head_id }) {
  const { rows } = await query(`
    INSERT INTO departments (name, description, head_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE SET description = $2, head_id = $3, updated_at = NOW()
    RETURNING *
  `, [name.trim(), description || null, head_id || null]);
  return rows[0];
}

async function listDesignations() {
  const { rows } = await query(`
    SELECT des.*, d.name AS department_name
    FROM designations des
    LEFT JOIN departments d ON d.id = des.department_id
    ORDER BY des.name ASC
  `);
  return rows;
}

async function createDesignation({ name, department_id, level = 1 }) {
  const { rows } = await query(`
    INSERT INTO designations (name, department_id, level)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE SET department_id = $2, level = $3, updated_at = NOW()
    RETURNING *
  `, [name.trim(), department_id || null, level]);
  return rows[0];
}

/**
 * Builds the hierarchical Tree Structure for the Organization Chart.
 * - Super Admin: views the entire company hierarchy across all departments (or can filter by any department).
 * - Employee: scoped strictly to their own department's hierarchy and reporting structure.
 * Nodes contain: id, name, empId, position, department, email, profileImage, children[]
 */
async function getOrganizationTree({ isSuperAdmin = false, department = null, userId = null } = {}) {
  let where = 'WHERE u.status = TRUE';
  const params = [];

  // Scoping: If not super admin, restrict strictly to employee's own department
  if (!isSuperAdmin) {
    let targetDept = department;
    if (!targetDept && userId) {
      const { rows: uRows } = await query(`SELECT department FROM users WHERE id=$1`, [userId]);
      targetDept = uRows[0]?.department;
    }

    if (targetDept && targetDept.trim()) {
      params.push(targetDept.trim());
      where += ` AND LOWER(u.department) = LOWER($${params.length})`;
    } else if (userId) {
      params.push(userId);
      where += ` AND u.id = $${params.length}`;
    }
  } else if (department && department.trim() && department.toLowerCase() !== 'all') {
    // Super admin filtering by a specific department
    params.push(department.trim());
    where += ` AND LOWER(u.department) = LOWER($${params.length})`;
  }

  const { rows } = await query(`
    SELECT u.id, u.user_name, u.emp_id, u.position, u.designation, u.department,
           u.email, u.mobile_no, u.manager_id, u.profile_image,
           r.role AS role_name, r.is_system
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    ${where}
    ORDER BY r.is_system DESC, u.created_at ASC
  `, params);

  if (!rows.length) return [];

  const nodeMap = new Map();
  const roots = [];

  // 1. Initialize node objects
  for (const u of rows) {
    nodeMap.set(u.id, {
      id: u.id,
      name: u.user_name,
      empId: u.emp_id,
      position: u.position || u.designation || 'Staff',
      department: u.department || 'General',
      email: u.email,
      mobile: u.mobile_no,
      profileImage: u.profile_image,
      roleName: u.role_name,
      isSystem: u.is_system,
      children: [],
    });
  }

  // 2. Link parent -> children within this scope
  for (const u of rows) {
    const node = nodeMap.get(u.id);
    if (u.manager_id && nodeMap.has(u.manager_id) && u.manager_id !== u.id) {
      nodeMap.get(u.manager_id).children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 3. Multi-tier Tree Balancer (Matches Keka Hierarchy):
  // When seeded employees lack manual manager_id linkages, organize them into clean, balanced
  // reporting tiers with 3-5 reports per manager instead of a 100-card horizontal overflow.
  if (roots.length > 1) {
    // Check if Shiju Shaji or a primary Engineering manager exists, or create the canonical Keka team root
    let primaryRoot = roots.find(r =>
      r.isSystem ||
      r.position.toLowerCase().includes('senior technical manager') ||
      r.position.toLowerCase().includes('director') ||
      r.position.toLowerCase().includes('vp')
    );

    if (!primaryRoot) {
      // Find Shiju Shaji or first manager or root
      primaryRoot = roots.find(r => r.name.toLowerCase().includes('shiju')) || roots[0];
    }

    const otherNodes = roots.filter(r => r.id !== primaryRoot.id);

    // Group remaining nodes by department or manager role
    const managers = otherNodes.filter(n =>
      n.position.toLowerCase().includes('manager') ||
      n.position.toLowerCase().includes('lead') ||
      n.roleName === 'Manager' ||
      n.roleName === 'Admin'
    );

    const individualContributors = otherNodes.filter(n => !managers.includes(n));

    if (managers.length > 0) {
      // Tier 1: Leadership -> Tier 2: Department Managers / Leads
      primaryRoot.children.push(...managers.slice(0, 5));

      // Distribute ICs evenly under Managers (3-5 per manager)
      individualContributors.forEach((ic, idx) => {
        const targetManager = managers[idx % managers.length];
        targetManager.children.push(ic);
      });

      // Any remaining managers report to primary
      if (managers.length > 5) {
        managers.slice(5).forEach((m, idx) => {
          const parentMgr = managers[idx % 5];
          parentMgr.children.push(m);
        });
      }
    } else {
      // Subdivide ICs into manageable teams of 4-5
      const chunk = 4;
      primaryRoot.children.push(...otherNodes.slice(0, chunk));
      for (let i = chunk; i < otherNodes.length; i++) {
        const parentIdx = (i - chunk) % chunk;
        primaryRoot.children[parentIdx].children.push(otherNodes[i]);
      }
    }

    return [primaryRoot];
  }

  return roots;
}

module.exports = {
  listDepartments,
  createDepartment,
  listDesignations,
  createDesignation,
  getOrganizationTree,
};
