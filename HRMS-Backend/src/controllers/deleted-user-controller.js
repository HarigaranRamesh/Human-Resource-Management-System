const express = require("express");
const deletedUserRepo = require("../db/repositories/deletedUser.repo");

const DeletedUserController = express.Router();

DeletedUserController.get("/", async (_req, res) => {
  try {
    const list = await deletedUserRepo.listDeletedUsers();
    res.json(list);
  } catch (err) {
    console.error("GET /api/deleted-users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
})
  .get("/:id", async (req, res) => {
    try {
      const record = await deletedUserRepo.getDeletedUserById(req.params.id);
      if (!record) return res.status(404).json({ message: "Record not found" });
      res.json(record);
    } catch (err) {
      console.error("GET /api/deleted-users/:id error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

module.exports = DeletedUserController;
