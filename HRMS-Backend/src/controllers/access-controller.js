const express = require("express");
const mongoose = require("mongoose");
const AccessController = express.Router();
const roleRepo = require("../db/repositories/role.repo");

const AccessService = require("../services/access-service");
const RoutesUtil = require("../utils/routes");
const AccessModel = require("../models/access-model");
const user_Model = require("../models/user-model");

// 🔐 SA guard deps
const UserService = require("../services/user-service");
const userService = new UserService();
// constant SUPER_ADMIN_ROLE_ID removed as part of dynamic refactor

const routes = new RoutesUtil(AccessService);

// NOTE: Your AccessModel schema should be:
// access:  [{ type: mongoose.Schema.Types.ObjectId, ref: "access", required: true }],
// members: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }]

// --- helper: Super Admin gate ---
async function assertSuperAdmin(req, res) {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ message: "Authorization token is required" });
    return false;
  }
  try {
    const token = auth.split(" ")[1];
    const decoded = await userService.checkValidUser(token);
    const roleId = String(decoded?.roleId || "");
    const roleName = String(decoded?.roleName || "");


    const ok =
      decoded?.isSystemAdmin ||
      roleName.toLowerCase() === "admin";

    if (!ok) {
      res.status(403).json({ message: "Only System Admin or Admin can perform this action" });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ message: "Invalid/expired token" });
    return false;
  }
}

AccessController
  // Roles for dropdown etc.
  .get("/", async (req, res) => {
    try {
      const roles = await roleRepo.findAll();
      res.json(roles);
    } catch (e) {
      console.error("GET /access error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  // FE payload: users with effective access (uses service logic)
  .get("/access", async (req, res) => {
    try {
      const { format = "list", viewerId } = req.query;
      const service = new AccessService();

      if (format === "tree") {
        const tree = await service.getHierarchy(viewerId || null);
        return res.json(tree);
      } else {
        const list = await service.retriveAlluserwithRoles(viewerId || null);
        return res.json(list);
      }
    } catch (e) {
      console.error("GET /access/access error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  .get("/hierarchy", async (req, res) => {
    try {
      const viewerId = req.query.viewerId || null;
      const service = new AccessService();
      const data = await service.getHierarchyNodes(viewerId);
      res.json(data);
    } catch (e) {
      console.error("GET /access/hierarchy error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  // Move a ROLE under a new parent ROLE (e.g., Admin under Lead) – keeps Super Admin
  .post("/updateRoleAccess", async (req, res) => {
    try {
      const { roleId, newParentRoleId } = req.body || {};
      if (!roleId || !newParentRoleId) {
        return res.status(400).json({ message: "Missing roleId or newParentRoleId" });
      }
      if (!mongoose.isValidObjectId(roleId) || !mongoose.isValidObjectId(newParentRoleId)) {
        return res.status(400).json({ message: "Invalid roleId or newParentRoleId" });
      }

      const superAdminRole = await AccessModel.findOne({ isSystem: true }).select("_id");
      if (!superAdminRole) return res.status(404).json({ message: "System root role not found" });

      const role = await AccessModel.findById(roleId);
      if (!role) return res.status(404).json({ message: "Role not found" });

      // Always include SA + new parent
      const saId = String(superAdminRole._id);
      const parentId = String(newParentRoleId);
      role.access = Array.from(new Set([saId, parentId]));

      await role.save();
      return res.json({ success: true, message: "Role access updated", data: role });
    } catch (err) {
      console.error("❌ Error updating role access:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  // Assign an EMPLOYEE to a parent ROLE and optionally a parent USER (writes to user.role, user.createdby, and access.members)
  .post("/assignMember", async (req, res) => {
    try {
      const { userId, parentRoleId, parentUserId } = req.body || {};
      if (!userId || !parentRoleId) {
        return res.status(400).json({ message: "Missing userId or parentRoleId" });
      }
      if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(parentRoleId)) {
        return res.status(400).json({ message: "Invalid userId or parentRoleId" });
      }

      // 1. Update User Record (Role and CreatedBy/Manager)
      const userUpdate = { role: parentRoleId };

      // If parentUserId is provided, set as manager. If it's explicitly null/empty, clear manager.
      if (parentUserId && mongoose.isValidObjectId(parentUserId)) {
        userUpdate.createdby = parentUserId;
      } else {
        userUpdate.createdby = null;
      }

      await user_Model.findByIdAndUpdate(userId, userUpdate);

      // 2. Synchronize Access Members list (Optional but good for consistency if used elsewhere)
      await AccessModel.updateMany(
        { members: userId }, // Remove from all roles
        { $pull: { members: userId } }
      );

      const updatedParent = await AccessModel.findByIdAndUpdate(
        parentRoleId,
        { $addToSet: { members: userId } },
        { new: true }
      );

      return res.json({
        success: true,
        message: "Member assignment and hierarchy updated",
        data: updatedParent,
      });
    } catch (err) {
      console.error("assignMember error:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  // ===== Super Admin only: GET/POST main for a role =====

  // GET /access/main?roleId=<id>  OR  /access/main?role=Admin
  .get("/main", async (req, res) => {
    try {
      if (!(await assertSuperAdmin(req, res))) return;

      const { roleId, role } = req.query;
      if (!roleId && !role) {
        return res.status(400).json({ message: "Provide roleId or role (name)" });
      }

      const filter = roleId ? { _id: roleId } : { role: String(role) };
      const doc = await AccessModel.findOne(filter).select("role main updatedAt");
      if (!doc) return res.status(404).json({ message: "Role not found" });

      return res.json(doc);
    } catch (e) {
      console.error("GET /access/main error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  // POST /access/main  { roleId?:string, role?:string, main:[{menuName,children:[{submenuName}]}] }
  .post("/main", async (req, res) => {
    try {
      if (!(await assertSuperAdmin(req, res))) return;

      const { roleId, role, main } = req.body || {};
      if (!Array.isArray(main)) {
        return res.status(400).json({ message: "`main` must be an array" });
      }
      if (!roleId && !role) {
        return res.status(400).json({ message: "Provide roleId or role (name)" });
      }

      // sanitize: filter out empty menuName and submenuName
      const cleanMain = main
        .map(m => {
          const mName = String(m?.menuName || "").trim();
          const children = Array.isArray(m?.children)
            ? m.children
              .map(c => ({ submenuName: String(c?.submenuName || "").trim() }))
              .filter(c => c.submenuName.length > 0)
            : [];
          return { menuName: mName, children };
        })
        .filter(m => m.menuName.length > 0);

      const filter = roleId ? { _id: roleId } : { role: String(role) };

      const updated = await AccessModel.findOneAndUpdate(
        filter,
        { $set: { main: cleanMain, updatedAt: new Date() } },
        { new: true }
      ).select("role main updatedAt");

      if (!updated) return res.status(404).json({ message: "Role not found" });

      return res.json({ success: true, message: "Main updated", data: updated });
    } catch (e) {
      console.error("POST /access/main error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  // Generic CRUD passthroughs
  // Explicit POST handler for debugging/clarity
  .post("/", async (req, res) => {
    try {
      console.log("POST /access body:", req.body);

      const service = new AccessService();
      // Use service.add (inherited from CrudService)
      // Validate payload manually if needed, or rely on service validation
      if (!req.body || !req.body.role) {
        return res.status(400).json({ message: "Role is required" });
      }

      // Normalize common role names to Title Case standard
      let r = req.body.role.trim();
      const lower = r.toLowerCase();
      if (lower === 'admin') r = 'Admin';
      else if (lower === 'super admin') r = 'Super Admin';
      else if (lower === 'employee') r = 'Employee';
      else if (lower === 'intern') r = 'Intern';
      else if (lower === 'unpaid intern') r = 'Unpaid Intern';
      else if (lower === 'shortlisted candidate') r = 'Shortlisted Candidate';

      req.body.role = r;

      const result = await service.add(req.body);
      console.log("POST /access result:", result);

      res.json(result);
    } catch (e) {
      console.error("POST /access error:", e);
      res.status(500).json({ message: e.message || "Server error" });
    }
  })
  .put("/:id", routes.update)
  .delete("/:id", async (req, res) => {
    try {
      // 1. Auth Check
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: "Token required" });

      const token = authHeader.split(" ")[1];
      const decoded = await userService.checkValidUser(token);
      if (!decoded) return res.status(401).json({ message: "Invalid token" });

      const roleId = req.params.id;
      if (!mongoose.isValidObjectId(roleId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const roleDoc = await AccessModel.findById(roleId);
      if (!roleDoc) return res.status(404).json({ message: "Role not found" });

      // 2. Protect System Roles
      if (roleDoc.isSystem) {
        return res.status(403).json({ message: `Cannot delete system role: ${roleDoc.role}` });
      }

      // 3. Perform Delete
      await AccessModel.findByIdAndDelete(roleId);
      return res.json({ success: true, message: "Designation deleted" });

    } catch (e) {
      console.error("DELETE /access error:", e);
      res.status(500).json({ message: "Server error" });
    }
  });

module.exports = AccessController;
