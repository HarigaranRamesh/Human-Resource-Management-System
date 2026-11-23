// services/access-service.js
const access_model = require("../models/access-model");
const user_Model = require("../models/user-model");
const crud_service = require("./crud-service");

class AccessService extends crud_service {
  constructor() {
    super(...arguments);
    this.model = access_model;
    this.preAdd = async (data) => {
      // 1. Default Parent Role (System Root)
      if (!data.access || data.access.length === 0) {
        const superAdmin = await this.model.findOne({ isSystem: true });
        if (superAdmin) {
          data.access = [superAdmin._id];
        } else {
          console.warn("System Root role not found for default parent assignment.");
        }
      }

      const roleName = String(data.role || "").trim().toLowerCase();

      // 2. Set dynamic UI flags based on role name (if not explicitly provided)
      if (roleName === 'shortlisted candidate') {
        data.isCandidateRole = true;
        data.requiresDocuments = false;
        data.hasPayloadSection = false;
        data.collectsBankDetails = false;
        data.idPrefix = 'OAIDSC';
      } else if (roleName === 'unpaid intern') {
        data.hasPayloadSection = false;
        data.collectsBankDetails = false;
      }

      // 3. Default Permissions Logic
      if (!data.main || data.main.length === 0) {

        // Case A: Shortlisted Candidate -> No permissions (Login blocked anyway)
        if (roleName === 'shortlisted candidate') {
          data.main = [];
          console.log(`🚫 'Shortlisted Candidate' created with NO menu access.`);
        }

        // Case B: Unpaid Intern -> Employee permissions MINUS Payslip/Reimbursement
        else if (roleName === 'unpaid intern') {
          const employeeRole = await this.model.findOne({ role: 'Employee' }).lean();
          if (employeeRole && employeeRole.main) {
            data.main = employeeRole.main.filter(m =>
              m.menuName !== 'Payslip' &&
              m.menuName !== 'Reimbursment' // Matches backend typo
            );
            console.log(`✅ 'Unpaid Intern' created with restricted Employee permissions.`);
          }
        }

        // Case C: New Custom Roles / Interns -> Full Employee Permissions
        else {
          const employeeRole = await this.model.findOne({ role: 'Employee' }).lean();
          if (employeeRole && employeeRole.main) {
            data.main = employeeRole.main;
            console.log(`✅ Auto-assigned default 'Employee' permissions to new role: ${roleName}`);
          } else {
            console.warn("⚠️ 'Employee' role template not found. New role created with NO permissions.");
          }
        }
      }
      return data;
    };
    // 🛡️ Prevent deletion of System Roles
    this.validateDelete = async (id) => {
      const role = await this.model.findById(id);
      if (!role) throw new Error("Role not found");

      if (role.isSystem) {
        throw new Error(`🚫 Cannot delete system role: ${role.role}`);
      }
      return true;
    };
  }
  roleretrieve = async (req) => {
    const data = await this.list(req.query);
    // Return all roles except system roles
    return (data || [])
      .filter((item) => !item.isSystem)
      .map((item) => ({
        _id: item._id,
        role: item.role,
        hasPayloadSection: item.hasPayloadSection,
        requiresDocuments: item.requiresDocuments,
        isCandidateRole: item.isCandidateRole,
        collectsBankDetails: item.collectsBankDetails
      }));
  };

  // ----- helpers -----
  #isRootRole(roleDoc) {
    return Array.isArray(roleDoc?.access)
      && roleDoc.access.length === 1
      && String(roleDoc.access[0]) === String(roleDoc._id);
  }

  async #visibleUserIdsFor(viewerId) {
    if (!viewerId) return null; // no filtering

    const me = await user_Model
      .findById(viewerId)
      .populate({ path: "role", model: "access", select: "role access" })
      .lean();
    if (!me || !me.role) return [];

    // Root (Super Admin) sees all
    if (this.#isRootRole(me.role)) {
      const all = await user_Model.find({}, "_id").lean();
      return all.map(u => String(u._id));
    }

    // Start with members directly under my role (Role-based visibility)
    const myRole = await access_model.findById(me.role._id).select("members").lean();
    const visible = new Set((myRole?.members || []).map(id => String(id)));

    // 1. Role-based visibility (Descendant Roles)
    const q = [String(me.role._id)];
    const seenRoles = new Set(q);
    while (q.length) {
      const pid = q.shift();
      const childrenRoles = await access_model.find({ access: pid }, "_id members").lean();
      for (const c of childrenRoles) {
        const cid = String(c._id);
        if (!seenRoles.has(cid)) {
          seenRoles.add(cid);
          q.push(cid);
        }
        (c.members || []).forEach(uid => visible.add(String(uid)));
      }
    }

    // 2. Reporting hierarchy visibility (Subordinates)
    // Always see anyone who reports to me, or reports to my subordinates
    const userQ = [String(me._id)];
    const seenUsers = new Set(userQ);
    while (userQ.length) {
      const parentUserId = userQ.shift();
      const subordinates = await user_Model.find({ createdby: parentUserId }, "_id").lean();
      for (const s of subordinates) {
        const sid = String(s._id);
        if (!seenUsers.has(sid)) {
          seenUsers.add(sid);
          userQ.push(sid);
          visible.add(sid);
        }
      }
    }

    return Array.from(visible);
  }

  // Build PrimeNG-style nodes for the User-centric hierarchy (as requested)
  // Each node represents a specific user, nested by who created/manages them.
  getHierarchyNodes = async (viewerId = null) => {
    // 1. Fetch active roles (exclude candidates)
    const activeRoles = await access_model.find({ isCandidateRole: { $ne: true } }).lean();
    const activeRoleById = new Map(activeRoles.map(r => [String(r._id), r]));
    const activeRoleIds = Array.from(activeRoleById.keys());

    // 2. Fetch visible users who have these roles
    const visibleUserIds = await this.#visibleUserIdsFor(viewerId);
    const users = await user_Model.find(
      visibleUserIds
        ? { _id: { $in: visibleUserIds }, role: { $in: activeRoleIds } }
        : { role: { $in: activeRoleIds } }
    )
      .populate('role')
      .lean();

    // 3. Create all user nodes first
    const userNodes = new Map();
    for (const u of users) {
      if (!u.role) continue;

      const userId = String(u._id);
      userNodes.set(userId, {
        label: `${u.role.role} (${u.user_name})`,
        expanded: true,
        data: {
          userId: userId,
          roleId: String(u.role._id),
          name: u.user_name,
          rolename: u.role.role,
          photo: u.photoUrl,
          isUser: true,
          isRole: false
        },
        children: [],
        draggable: !u.role.isSystem, // System users (Super Admin) shouldn't be moved
        droppable: true // You can drop other users under any user
      });
    }

    // 4. Build the tree structure using 'createdby' as the parent link
    const roots = [];
    for (const u of users) {
      const userId = String(u._id);
      const parentId = String(u.createdby || "");
      const node = userNodes.get(userId);
      if (!node) continue;

      if (parentId && userNodes.has(parentId) && parentId !== userId) {
        // Nested under creator
        userNodes.get(parentId).children.push(node);
      } else {
        // No parent or parent not in this list -> Top level
        roots.push(node);
      }
    }

    return {
      orgData: roots,
      treeData: JSON.parse(JSON.stringify(roots))
    };
  };

  // Re-implemented missing method required by AccessController
  getHierarchy = async (viewerId) => {
    return this.getHierarchyNodes(viewerId);
  };

  // Re-implemented missing method required by AccessController
  retriveAlluserwithRoles = async (viewerId) => {
    const roles = await access_model.find({ isCandidateRole: { $ne: true } }).lean();
    const roleIds = roles.map(r => r._id);
    const users = await user_Model.find({ role: { $in: roleIds } })
      .populate('role')
      .lean();

    return users.map(u => ({
      _id: u._id,
      user_name: u.user_name,
      role: u.role || { role: 'No Role' },
      roleId: u.role?._id,
      position: u.position,
      designation: u.designation,
      email: u.email
    }));
  };
}

module.exports = AccessService;
