const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const UserDocService = require("../services/user-doc-service");
const UserService = require("../services/user-service");
const routesUtil = require("../utils/routes");

const userDocService = new UserDocService();
const userService = new UserService();
const UserDocController = express.Router();

console.log("✅ UserDocController loaded");

const routes = new routesUtil(UserDocService);

// --- Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docId = req.params.id || req.body.user_id || "common";
    const uploadDir = path.join(__dirname, "../public/uploads/users", docId);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

const upload = multer({ storage });

// --- Utility to delete existing file
const deleteFileIfExists = (filePath) => {
  try {
    if (!filePath) return;
    const absPath = path.join(__dirname, "../public", filePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
      console.log("🗑️ Deleted old file:", absPath);
    }
  } catch (err) {
    console.error("⚠️ File delete failed:", err);
  }
};

// ====================== PUT ROUTES ======================

// 🪪 Update Aadhar (front & back)
UserDocController.put("/aadhar/:id", upload.fields([
  { name: "aadhar_front", maxCount: 1 },
  { name: "aadhar_back", maxCount: 1 }
]), async (req, res) => {
  const docId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(docId))
      return res.status(404).json({ success: false, message: "Invalid document id" });

    const existingDoc = await userDocService.model.findById(docId);
    if (!existingDoc)
      return res.status(404).json({ success: false, message: "Document not found" });

    const aadharFrontFile = req.files?.aadhar_front?.[0];
    const aadharBackFile = req.files?.aadhar_back?.[0];

    if (!aadharFrontFile && !aadharBackFile)
      return res.status(400).json({ success: false, message: "At least one Aadhar file required" });

    if (aadharFrontFile) {
      deleteFileIfExists(existingDoc.aadhar_front);
      existingDoc.aadhar_front = `/uploads/users/${docId}/${aadharFrontFile.filename}`;
    }

    if (aadharBackFile) {
      deleteFileIfExists(existingDoc.aadhar_back);
      existingDoc.aadhar_back = `/uploads/users/${docId}/${aadharBackFile.filename}`;
    }

    const savedDoc = await existingDoc.save();
    return res.json({ success: true, message: "Aadhar updated successfully", data: savedDoc });
  } catch (err) {
    console.error("❌ PUT /aadhar/:id error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 🪪 Update PAN (front & back)
UserDocController.put("/pan/:id", upload.fields([
  { name: "pan_front", maxCount: 1 },
  { name: "pan_back", maxCount: 1 }
]), async (req, res) => {
  const docId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(docId))
      return res.status(404).json({ success: false, message: "Invalid document id" });

    const existingDoc = await userDocService.model.findById(docId);
    if (!existingDoc)
      return res.status(404).json({ success: false, message: "Document not found" });

    const panFrontFile = req.files?.pan_front?.[0];
    const panBackFile = req.files?.pan_back?.[0];

    if (!panFrontFile && !panBackFile)
      return res.status(400).json({ success: false, message: "At least one PAN file required" });

    if (panFrontFile) {
      deleteFileIfExists(existingDoc.pan_front);
      existingDoc.pan_front = `/uploads/users/${docId}/${panFrontFile.filename}`;
    }

    if (panBackFile) {
      deleteFileIfExists(existingDoc.pan_back);
      existingDoc.pan_back = `/uploads/users/${docId}/${panBackFile.filename}`;
    }

    const savedDoc = await existingDoc.save();
    return res.json({ success: true, message: "PAN updated successfully", data: savedDoc });
  } catch (err) {
    console.error("❌ PUT /pan/:id error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// ✅ Update Certificates (UG or PG)
UserDocController.put(
  "/certificates/:id",
  upload.array("certificates"),
  async (req, res) => {
    const { type } = req.body; // e.g., "UG", "Pg", "ug"
    const docId = req.params.id;

    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(docId)) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid document id" });
      }

      const existingDoc = await userDocService.model.findById(docId);
      if (!existingDoc) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      // Normalize type input (make lowercase)
      const normalizedType = (type || "").toLowerCase();

      if (!["ug", "pg"].includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          message: "Type must be UG or PG",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Certificate files are required",
        });
      }

      // 🧹 Delete old certificate files of same type
      const oldCerts = existingDoc[normalizedType] || [];
      oldCerts.forEach((fileObj) => {
        if (fileObj.certificate) {
          const absPath = path.join(
            __dirname,
            "../public",
            fileObj.certificate
          );
          if (fs.existsSync(absPath)) {
            fs.unlinkSync(absPath);
            console.log("🗑️ Deleted old certificate:", absPath);
          }
        }
      });

      // 🆕 Prepare new certificates array
      const newCerts = req.files.map((file) => ({
        certificate: `/uploads/users/${docId}/${file.filename}`,
      }));

      // 🔄 Update document
      existingDoc[normalizedType] = newCerts;
      const savedDoc = await existingDoc.save();

      return res.json({
        success: true,
        message: `${normalizedType.toUpperCase()} certificates updated`,
        data: savedDoc,
      });
    } catch (err) {
      console.error("❌ PUT /certificates/:id error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// --- Default CRUD routes
UserDocController.get("/", routes.list)
  .get("/:id", routes.retrieve)
  .delete("/:id", routes.delete);

// --- Upload route (unchanged)
UserDocController.post("/upload", upload.any(), async (req, res) => {
  try {
    console.log("📤 /upload received body:", req.body);
    console.log("📂 /upload received files:", req.files ? req.files.map(f => f.fieldname) : "None");

    const processedPayload = await userDocService.handleMulterUploads(req);
    console.log("⚙️ Processed Payload:", processedPayload);

    const existingDoc = await userDocService.model.findOne({ user_id: processedPayload.user_id });

    let savedDoc;
    if (existingDoc) {
      console.log("🔄 Updating existing doc for user:", processedPayload.user_id);

      // 1. Update Simple Fields
      const simpleFields = ["photo", "aadhar_front", "aadhar_back", "pan_front", "pan_back", "marksheet10", "marksheet12", "transferCertificate", "resume"];
      simpleFields.forEach(field => {
        if (processedPayload[field]) {
          if (existingDoc[field]) deleteFileIfExists(existingDoc[field]);
          existingDoc[field] = processedPayload[field];
        }
      });

      // 2. Helper to Update Arrays (Prev, PG, UG, Others)
      const updateArray = (fieldName, fileKeys) => {
        if (!processedPayload[fieldName]) return;

        // Ensure array exists
        if (!existingDoc[fieldName]) existingDoc[fieldName] = [];

        processedPayload[fieldName].forEach((newItem, index) => {
          if (!newItem) return; // Sparse check

          if (index < existingDoc[fieldName].length) {
            // --- UPDATE Existing Item ---
            const existingItem = existingDoc[fieldName][index];

            // Iterate over keys in new item
            for (const key in newItem) {
              // Check if this key corresponds to a file that needs cleanup
              if (fileKeys.includes(key)) {
                // Special Case: Payslips (Array)
                if (key === 'payslips' && Array.isArray(newItem[key])) {
                  // For payslips, we might Append OR Replace. 
                  // Given this is an "Edit" form that usually sends new files, let's Append new payslips to the list.
                  // But if the user wants to remove one, they do it via specific delete API or we need complex logic.
                  // Current strategy: Append new uploaded payslips to the list.
                  existingItem.payslips = [...(existingItem.payslips || []), ...newItem.payslips];
                } else {
                  // Single File Replacement (e.g. Relieving Letter)
                  if (existingItem[key]) deleteFileIfExists(existingItem[key]);
                  existingItem[key] = newItem[key];
                }
              } else {
                // Text Fields (Company Name, etc) - just overwrite
                existingItem[key] = newItem[key];
              }
            }
          } else {
            // --- ADD New Item ---
            existingDoc[fieldName].push(newItem);
          }
        });
      };

      // Apply Updates
      updateArray('prev', ['relieving', 'experience', 'payslips']);
      updateArray('pg', ['certificate', 'marksheet']);
      updateArray('ug', ['certificate', 'marksheet']);
      updateArray('others', ['certificate', 'marksheet']);

      savedDoc = await existingDoc.save();

    } else {
      console.log("🆕 Creating new doc for user:", processedPayload.user_id);
      savedDoc = await userDocService.add(processedPayload);
    }

    console.log("✅ Saved Doc:", savedDoc._id);
    return res.json({ success: true, data: savedDoc });
  } catch (err) {
    console.error("❌ Upload error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ New route: get docs by user_id
UserDocController.get("/userId/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const userDocs = await userDocService.model.findOne({ user_id: userId });

    // ✅ If no docs found, return success with null data to prevent frontend error
    if (!userDocs) {
      return res.json({
        success: true,
        message: "No documents found for this user",
        data: null
      });
    }

    return res.json({
      success: true,
      message: "User documents retrieved successfully",
      data: userDocs,
    });
  } catch (err) {
    console.error("❌ GET /userId/:id error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = UserDocController;
