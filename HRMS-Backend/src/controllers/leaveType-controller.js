const express = require("express");
const leaveRepo = require("../db/repositories/leave.repo");
const { query } = require("../db/pg");

const LeavetypeController = express.Router();

// List all leave types
LeavetypeController.get('/', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT lt.*, u.user_name, u.emp_id
      FROM leave_types lt
      JOIN users u ON u.id = lt.user_id
      ORDER BY u.user_name, lt.label
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/leave-type error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
})

// Retrieve leave types by user id
.get('/:userId', async (req, res) => {
  try {
    const records = await leaveRepo.getUserLeaveTypes(req.params.userId);
    res.json(records);
  } catch (err) {
    console.error("GET /api/leave-type/:userId error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
})

// Upsert leave type for a user
.post('/', async (req, res) => {
  try {
    const { userId, user_id, label, value, accrualType, doj, remaining, validity } = req.body;
    const targetUserId = userId || user_id;
    if (!targetUserId || !label || value === undefined) {
      return res.status(400).json({ message: "userId, label, and value are required" });
    }
    const record = await leaveRepo.upsertUserLeave(targetUserId, {
      label,
      value: parseFloat(value),
      accrualType: accrualType || 'annual',
      doj: doj || new Date(),
      remaining: remaining || [],
      validity: validity || null,
    });
    res.json({ success: true, data: record });
  } catch (err) {
    console.error("POST /api/leave-type error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
})

// Update leave type
.put('/:id', async (req, res) => {
  try {
    const { value, accrualType, remaining } = req.body;
    const { rows } = await query(`
      UPDATE leave_types
      SET value = COALESCE($2, value),
          accrual_type = COALESCE($3, accrual_type),
          remaining = COALESCE($4, remaining)
      WHERE id = $1
      RETURNING *
    `, [
      req.params.id,
      value !== undefined ? parseFloat(value) : null,
      accrualType || null,
      remaining ? JSON.stringify(remaining) : null,
    ]);
    if (!rows[0]) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("PUT /api/leave-type/:id error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
})

// Delete leave type
.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(`DELETE FROM leave_types WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, message: "Leave type deleted" });
  } catch (err) {
    console.error("DELETE /api/leave-type/:id error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = LeavetypeController;
