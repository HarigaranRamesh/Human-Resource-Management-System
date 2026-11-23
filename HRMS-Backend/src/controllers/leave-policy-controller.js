const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const leaveRepo = require("../db/repositories/leave.repo");
const { query } = require("../db/pg");

let PRIVATE_KEY;
try {
  PRIVATE_KEY = fs.readFileSync(path.join(process.cwd(), "private.key"), "utf8").trim();
} catch {
  PRIVATE_KEY = process.env.JWT_SECRET || "Bla@2021BOWS^!@#$)(*)";
}

function requireAuth(req, res) {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ message: "Authorization token is required" });
    return null;
  }
  try {
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth.split(" ")[1];
    return jwt.verify(token, PRIVATE_KEY);
  } catch {
    res.status(401).json({ message: "Invalid/expired token" });
    return null;
  }
}

// GET /api/leave-policies
router.get("/", async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { role } = req.query;
    let items;
    if (role) {
      const { rows } = await query(`SELECT * FROM leave_policies WHERE role = $1 ORDER BY label`, [role]);
      items = rows;
    } else {
      items = await leaveRepo.listPolicies();
    }
    res.json(items);
  } catch (e) {
    console.error("GET /leave-policies error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/leave-policies/roles
router.get("/roles", async (_req, res) => {
  try {
    const { rows } = await query(`SELECT DISTINCT role FROM leave_policies ORDER BY role`);
    res.json(rows.map(r => r.role));
  } catch (e) {
    console.error("GET /leave-policies/roles error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/role", async (req, res) => {
  try {
    const { rows } = await query(`SELECT DISTINCT role FROM leave_policies ORDER BY role`);
    res.json(rows.map(r => r.role));
  } catch (e) {
    console.error("GET /leave-policies/role error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/leave-policies
router.post("/", async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { role, label, amount, accrualType, accrual_type, active } = req.body || {};
    if (!role || !label || amount == null) {
      return res.status(400).json({ message: "role, label, amount are required" });
    }
    const doc = await leaveRepo.upsertPolicy({
      role,
      label,
      amount: parseFloat(amount),
      accrualType: accrualType || accrual_type || 'annual',
      active: active !== false,
    });
    res.json({ success: true, data: doc });
  } catch (e) {
    console.error("POST /leave-policies error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/leave-policies/:id
router.put("/:id", async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { id } = req.params;
    const { amount, accrualType, accrual_type, active, role, label } = req.body || {};
    const { rows } = await query(`
      UPDATE leave_policies
      SET amount = COALESCE($2, amount),
          accrual_type = COALESCE($3, accrual_type),
          active = COALESCE($4, active),
          role = COALESCE($5, role),
          label = COALESCE($6, label)
      WHERE id = $1
      RETURNING *
    `, [
      id,
      amount != null ? parseFloat(amount) : null,
      accrualType || accrual_type || null,
      typeof active === 'boolean' ? active : null,
      role || null,
      label || null,
    ]);

    if (!rows[0]) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error("PUT /leave-policies/:id error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/leave-policies/:id
router.delete("/:id", async (req, res) => {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const out = await leaveRepo.deletePolicy(req.params.id);
    if (!out) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, message: "Policy deleted successfully" });
  } catch (e) {
    console.error("DELETE /leave-policies/:id error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
