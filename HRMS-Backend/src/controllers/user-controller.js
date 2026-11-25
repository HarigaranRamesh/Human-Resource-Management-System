// controllers/user-controller.js
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const user_service = require("../services/user-service");
const userRepo = require("../db/repositories/user.repo");
const roleRepo = require("../db/repositories/role.repo");
const deletedUserRepo = require("../db/repositories/deletedUser.repo");
const routesUtil = require("../utils/routes");
const UserController = express.Router();
let routes = new routesUtil(user_service);
const bcrypt = require("bcryptjs");

let PRIVATE_KEY;
try {
  PRIVATE_KEY = fs.readFileSync(path.join(process.cwd(), "private.key"), "utf8").trim();
} catch (e) {
  PRIVATE_KEY = process.env.JWT_SECRET || "Bla@2021BOWS^!@#$)(*)";
}

async function requireAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: "Authorization token is required" });
    return null;
  }
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader.split(" ")[1];
  try {
    const decrypted = jwt.verify(token, PRIVATE_KEY);
    return decrypted;
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
    return null;
  }
}

// Multer storage for profile photos
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "avatars");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

UserController.get("/", async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || req.query.user_name || req.query.q || '';
    const department = req.query.department;
    const status = req.query.status;
    const role = req.query.role;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';
    const isCandidateRole = req.query.isCandidateRole !== undefined ? req.query.isCandidateRole === 'true' : undefined;
    const isSystem = req.query.isSystem !== undefined ? req.query.isSystem === 'true' : undefined;

    const data = await userRepo.listUsers({
      page,
      limit,
      search,
      department,
      status,
      role,
      sortBy,
      sortOrder,
      isCandidateRole,
      isSystem,
    });
    res.json(data);
  } catch (e) {
    console.error("GET /users error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Failed to fetch users" });
  }
})
  .get("/:id", async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const user = await userRepo.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (e) {
      console.error("GET /user/:id error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })
  // Upload Profile Photo
  .post("/upload-profile-photo", uploadAvatar.single("photo"), async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      if (!req.file) return res.status(400).json({ message: "No photo provided" });

      const targetUserId = req.body.userId || auth.id;
      const isSelf = auth.id === targetUserId;
      const isAdm = auth.isSystemAdmin || (auth.roleName || '').toLowerCase().includes('admin');
      if (!isSelf && !isAdm) return res.status(403).json({ message: "Cannot edit another user's profile photo" });

      const photoUrl = `/uploads/avatars/${req.file.filename}`;
      await userRepo.updateUser(targetUserId, { profile_image: photoUrl });

      return res.json({
        success: true,
        message: "Profile photo updated successfully",
        profileImage: photoUrl,
      });
    } catch (e) {
      console.error("POST /upload-profile-photo error:", e);
      res.status(500).json({ message: e.message || "Failed to upload photo" });
    }
  })
  .post("/", async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const incomingRole = req.body.role || req.body.role_id || req.body.roleName;
      let roleDoc = null;
      if (incomingRole) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incomingRole)) {
          roleDoc = await roleRepo.findById(incomingRole);
        } else {
          roleDoc = await roleRepo.findByName(incomingRole);
        }
      }
      if (!roleDoc && req.body.roleName) {
        roleDoc = await roleRepo.findByName(req.body.roleName);
      }
      if (!roleDoc) {
        roleDoc = await roleRepo.findByName("Employee");
      }

      const mobile = (req.body.mobile_no || req.body.mobileNo || '').trim();
      const email = (req.body.email || '').trim().toLowerCase();

      // Strict Indian Mobile Validation (10 digits starting with 6, 7, 8, or 9)
      if (mobile) {
        if (!/^[6-9]\d{9}$/.test(mobile)) {
          return res.status(400).json({
            success: false,
            message: "Invalid mobile number. Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9."
          });
        }
        const existingMobile = await userRepo.findByMobile(mobile);
        if (existingMobile) {
          return res.status(400).json({ success: false, message: "Mobile number already registered to another employee." });
        }
      }

      // Strict RFC-5322 Email Validation
      if (email) {
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
          return res.status(400).json({
            success: false,
            message: "Invalid email address format (e.g., employee@company.com)."
          });
        }
        const existingEmail = await userRepo.findByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ success: false, message: "Email address already registered." });
        }
      }

      const user = await userRepo.createUser({
        ...req.body,
        mobile_no: mobile,
        email: email || null,
        role_id: roleDoc?.id,
        isCandidateRole: roleDoc?.is_candidate_role || false,
        idPrefix: (roleDoc?.id_prefix && roleDoc?.id_prefix !== 'HARI') ? roleDoc.id_prefix : null,
        created_by: auth.id,
      });

      return res.json({ success: true, data: user, message: "User created." });
    } catch (e) {
      console.error("POST /users error:", e);
      res.status(400).json({ success: false, message: e.message || "Server error" });
    }
  })

  .post("/superad", async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      if (!auth.isSystemAdmin) {
        return res.status(403).json({ message: "Only Super Admin can use this API." });
      }

      const incomingRole = req.body.role || req.body.role_id || req.body.roleName;
      let roleDoc = null;
      if (incomingRole) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incomingRole)) {
          roleDoc = await roleRepo.findById(incomingRole);
        } else {
          roleDoc = await roleRepo.findByName(incomingRole);
        }
      }
      if (!roleDoc && req.body.roleName) {
        roleDoc = await roleRepo.findByName(req.body.roleName);
      }
      if (!roleDoc) {
        roleDoc = await roleRepo.findByName("Employee");
      }

      const mobile = (req.body.mobile_no || req.body.mobileNo || '').trim();
      const email = (req.body.email || '').trim().toLowerCase();

      // Strict Indian Mobile Validation (10 digits starting with 6, 7, 8, or 9)
      if (mobile) {
        if (!/^[6-9]\d{9}$/.test(mobile)) {
          return res.status(400).json({
            success: false,
            message: "Invalid mobile number. Must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9."
          });
        }
        const existingMobile = await userRepo.findByMobile(mobile);
        if (existingMobile) {
          return res.status(400).json({ success: false, message: "Mobile number already registered to another employee." });
        }
      }

      // Strict RFC-5322 Email Validation
      if (email) {
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
          return res.status(400).json({
            success: false,
            message: "Invalid email address format (e.g., employee@company.com)."
          });
        }
        const existingEmail = await userRepo.findByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ success: false, message: "Email address already registered." });
        }
      }

      const user = await userRepo.createUser({
        ...req.body,
        mobile_no: mobile,
        email: email || null,
        role_id: roleDoc?.id,
        isCandidateRole: roleDoc?.is_candidate_role || false,
        idPrefix: (roleDoc?.id_prefix && roleDoc?.id_prefix !== 'HARI') ? roleDoc.id_prefix : null,
        created_by: auth.id,
      });

      return res.json({ success: true, data: user, message: "User created." });
    } catch (e) {
      console.error("POST /superad error:", e);
      res.status(400).json({ success: false, message: e.message || "Server error" });
    }
  })

  .put("/:id", async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const targetId = req.params.id;
      const isSelf = auth.id === targetId;
      const isAdm = auth.isSystemAdmin || (auth.roleName || '').toLowerCase().includes('admin') || (auth.roleName || '').toLowerCase().includes('hr');

      if (!isSelf && !isAdm) {
        return res.status(403).json({ message: "You do not have permission to edit this profile" });
      }

      const updateData = { ...req.body };
      if (!isAdm) {
        // Prevent self-privilege escalation
        delete updateData.role_id;
        delete updateData.role;
        delete updateData.roleName;
        delete updateData.emp_id;
        delete updateData.annual_ctc;
      }

      const updated = await userRepo.updateUser(targetId, updateData);
      return res.json({ success: true, data: updated, message: "User updated successfully." });
    } catch (e) {
      console.error("PUT /api/user/:id error:", e);
      res.status(400).json({ success: false, message: e.message || "Server error" });
    }
  })

  .post("/change-password", async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const userId = String(auth.id || auth._id);
      const { currentPassword, newPassword } = req.body || {};

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "currentPassword and newPassword are required" });
      }

      await userRepo.changePassword(userId, currentPassword, newPassword);
      return res.json({ success: true, message: "Password changed successfully" });
    } catch (e) {
      console.error("POST /user/change-password error:", e);
      const msg = e?.message || "Server error";
      const code = msg === "Current password is incorrect" ? 400 : 500;
      res.status(code).json({ success: false, message: msg });
    }
  })

  // =============== RESET PASSWORD (ADMIN / SUPER ADMIN) ===============
  .post("/reset-password/:id", async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const actorRoleId = String(auth.roleId || "");
      const actorRoleName = String(auth.roleName || "");

      const isSuperAdmin = auth?.isSystemAdmin;

      if (!isSuperAdmin) {
        return res
          .status(403)
          .json({ message: "Only Super Admin can reset passwords." });
      }

      const targetUserId = String(req.params.id);
      const { newPassword } = req.body || {};
      if (!newPassword) {
        return res.status(400).json({ message: "newPassword is required" });
      }

      await userRepo.setPasswordDirect(targetUserId, newPassword);
      return res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (e) {
      console.error("POST /users/reset-password/:id error:", e);
      res
        .status(500)
        .json({ success: false, message: e?.message || "Server error" });
    }
  })

  // ✅ Delete user
  .delete("/:id", async (req, res) => {
    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const target = await userRepo.findById(req.params.id, true);
      if (target) {
        await deletedUserRepo.archiveUser(target, auth.id, req.body?.reason || 'Deleted by admin');
      }

      const result = await userRepo.deleteUser(req.params.id);
      res.json({ success: true, data: result, message: "User deleted successfully" });
    } catch (err) {
      console.error("DELETE /api/user/:id error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  })

  // ✅ Restore user
  .post("/restore/:id", async (req, res) => {
    try {
      const restored = await deletedUserRepo.restoreUser(req.params.id);
      res.json({ success: true, data: restored, message: "User restored successfully" });
    } catch (err) {
      console.error("POST /api/user/restore/:id error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  })

  // ✅ Assign Shift
  .put("/assign-shift/:id", async (req, res) => {
    try {
      const { shiftId } = req.body;
      if (!shiftId) return res.status(400).json({ message: "shiftId is required" });

      const user = await userRepo.assignShift(req.params.id, shiftId);
      res.json({ success: true, message: "Shift assigned successfully", data: user });
    } catch (err) {
      console.error("PUT /api/user/assign-shift/:id error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  });

module.exports = UserController;
