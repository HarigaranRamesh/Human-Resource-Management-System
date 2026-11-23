const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const user_model = require("../models/user-model");
const deleteduser_model = require("../models/deleted-user-model");
const access_model = require("../models/access-model");
const access_service = require("../services/access-service");
const crud_service = require("./crud-service");
const leaveType_service = require("./leaveType-service");
const { getVisibleUserIdsFor } = require("./visibility.service");
const mongoose = require("mongoose");
const LeavePolicyService = require("./leavePolicy-service");
const LeaveTypeService = require("./leaveType-service");
const ensureStandardMenus = require("../seed/ensure-standard-menus");
const performance_model_import = require("../models/performance-model"); // Ensures model is registered
const user_docs_model = require("../models/user-doc-model");
require("../models/shift-model");

class UserService extends crud_service {
  constructor() {
    super(...arguments);
    this.model = user_model;
    let key;
    try {
      const fs = require('fs');
      const path = require('path');
      key = fs.readFileSync(path.join(process.cwd(), 'private.key'), 'utf8').trim();
    } catch {
      key = process.env.JWT_SECRET || "Bla@2021BOWS^!@#$)(*)";
    }
    this.privateKey = key;

    this.validateAdd = async (data) => { };
    this.validateEdit = async (data, id) => { };
    this.validateDelete = async (data) => { };

    this.preEdit = async (data, filter) => {
      if (data.password && data.password.trim() !== '') {
        this.validatePasswordStrength(data.password);
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
      } else {
        delete data.password; // Don't overwrite with empty string
      }
      return data;
    };

    this.preAdd = async (data) => {
      if (data.password && data.password.trim() !== '') {
        this.validatePasswordStrength(data.password);
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
      }
      return data;
    };

    this.init = async () => {
      try {
        const ObjectId = (v) => new mongoose.Types.ObjectId(v);

        // Helper to ensure role exists and is marked as system
        const ensureRole = async (roleName, mainPermissions, parentIds = []) => {
          let roleDoc = await this.access_model.findOne({ role: roleName });
          if (!roleDoc) {
            roleDoc = await this.access_model.create({
              role: roleName,
              isSystem: true,
              main: mainPermissions,
              access: parentIds,
              members: [],
              updatedAt: new Date()
            });
            console.log(`✅ Created system role: ${roleName}`);
          } else {
            // Ensure system flag is set
            let changed = false;
            if (!roleDoc.isSystem) {
              roleDoc.isSystem = true;
              changed = true;
            }
            // ONLY overwrite Super Admin permissions if explicitly requested via .env
            const shouldEnforce = process.env.ENFORCE_SUPER_ADMIN_PERMISSIONS === 'true';
            if (roleName === 'Super Admin' && shouldEnforce) {
              console.log("🛠️ Enforcing hardcoded permissions for Super Admin (Sync Mode: ON)");
              roleDoc.main = mainPermissions;
              changed = true;
            }

            if (changed) await roleDoc.save();
          }
          return roleDoc._id;
        };

        // 1. Super Admin Permissions
        const superAdminMain = [
          { menuName: "Dashboard", children: [{ submenuName: "Dashboard" }, { submenuName: "Feed" }] },
          { menuName: "Performance", children: [{ submenuName: "Performance" }, { submenuName: "Performance Reports" }] },
          { menuName: "Access", children: [{ submenuName: "Access" }, { submenuName: "Access Define" }] },
          { menuName: "User Management", children: [{ submenuName: "Add User" }, { submenuName: "View Users" }, { submenuName: "ViewEdit Users" }] },
          { menuName: "Reports", children: [{ submenuName: "Daily Report" }, { submenuName: "Monthly Report" }] },
          { menuName: "Employee's Approval", children: [{ submenuName: "Employee Leave Approval" }, { submenuName: "Employee Petrol Approval" }] },
          { menuName: "Certificate", children: [{ submenuName: "Letters of Appointment" }, { submenuName: "Offer Letter" }, { submenuName: "Experience Letter" }] },
          { menuName: "Payslip", children: [{ submenuName: "Payslip" }] },
          { menuName: "Shift Management", children: [{ submenuName: "Shift Management" }] },
          { menuName: "Leave Policy", children: [{ submenuName: "Yearly Leave Policy" }, { submenuName: "Users Leave Policy Edit" }] },
          { menuName: "Holiday Planning", children: [{ submenuName: "Holiday Planning" }] },
          { menuName: "Asset Management", children: [{ submenuName: "Asset Management" }] },
        ];

        // 2. Ensure Super Admin Role
        const superAdminRoleId = await ensureRole("Super Admin", superAdminMain);

        // 3. Sync Standard Menus from JSON
        await ensureStandardMenus();

        // 4. User must be created via the seed script automatically on boot
        const seedInternalRoot = require('../seed/seed-internal');
        await seedInternalRoot();

        // automatic cleanup: remove "Access2" or "Access Define" (as main menu) from ALL roles
        // This fixes any pollution from previous development steps
        const allRoles = await this.access_model.find({});
        for (const r of allRoles) {
          if (!r.main) continue;
          const originalLen = r.main.length;

          // Filter out "Access2" and "Access Define" if they appear as MAIN menus
          // "Access Define" should only be a submenu of "Access"
          r.main = r.main.filter(m => m.menuName !== 'Access2' && m.menuName !== 'Access Define');

          if (r.main.length !== originalLen) {
            console.log(`🧹 Auto-cleaning role ${r.role}: Removed invalid main menus.`);
            await r.save();
          }
        }

        console.log(
          "✅ Default roles (Super Admin, Admin, Employee, Intern) and Super Admin user ensured."
        );
      } catch (err) {
        console.error("Init error:", err);
        throw err;
      }
    };

    this.login = async (mobileNo, password) => {
      try {
        let user = await this.model
          .findOne({ mobile_no: mobileNo })
          .populate("role");
        if (!user) throw new Error("Account not found");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error("Password not matched");

        if (!user.status) throw new Error("User is inactive");

        // 🚫 Login Restriction for Candidate Roles
        if (user.role && user.role.isCandidateRole) {
          throw new Error("Access Denied: Candidates cannot login.");
        }

        const logcal = user.logcal || 0;
        user = await this.model
          .findOneAndUpdate(
            { mobile_no: mobileNo },
            { logcal: logcal + 1 },
            { new: true }
          )
          .populate("role");

        const token = this.encrypt({
          id: user._id,
          roleId: user.role._id,
          roleName: user.role.role,
          isSystemAdmin: user.role.isSystem || false,
          hasPayload: user.role.hasPayloadSection ?? true,
          requiresDocs: user.role.requiresDocuments ?? true,
          isCandidate: user.role.isCandidateRole ?? false,
          access: user.role.main,
          user_name: user.user_name,
          position: user.position,
        });

        return {
          success: true,
          message: "Logged in successfully",
          token,
          logcal: user.logcal,
          role: user.role.role,
          access: user.role.main,
          username: user.user_name,
        };
      } catch (error) {
        throw error;
      }
    };

    this.loginEmpID = async (empID, password) => {
      try {
        let user = await this.model.findOne({ empId: empID }).populate("role");

        if (!user) throw new Error("Account not found");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error("Password not matched");

        if (!user.status) throw new Error("User is inactive");

        // 🚫 Login Restriction for Candidate Roles
        if (user.role && user.role.isCandidateRole) {
          throw new Error("Access Denied: Candidates cannot login.");
        }

        const logcal = user.logcal || 0;
        user = await this.model
          .findOneAndUpdate(
            { empId: empID },
            { logcal: logcal + 1 },
            { new: true }
          )
          .populate("role");

        const token = this.encrypt({
          id: user._id,
          roleId: user.role._id,
          roleName: user.role.role,
          isSystemAdmin: user.role.isSystem || false,
          hasPayload: user.role.hasPayloadSection ?? true,
          requiresDocs: user.role.requiresDocuments ?? true,
          isCandidate: user.role.isCandidateRole ?? false,
          access: user.role.main,
          user_name: user.user_name,
          position: user.position,
        });

        return {
          success: true,
          message: "Logged in successfully",
          token,
          logcal: user.logcal,
          role: user.role.role,
          access: user.role.main,
          username: user.user_name,
        };
      } catch (error) {
        throw error;
      }
    };

    this.encrypt = (payload) => {
      return jwt.sign(payload, this.privateKey, { expiresIn: "1d" });
    };

    this.decrypt = (token) => {
      return jwt.verify(token, this.privateKey);
    };

    this.checkValidUser = async (token) => {
      try {
        const data = this.decrypt(token);

        // const user = await this.model.findById(data.id).populate("role");

        // if (!user) throw new Error("Invalid user");
        // if (user.status === false) throw new Error("User Deactivated. Contact admin");

        return data;
      } catch (err) {
        throw err;
      }
    };

    this.findAccess = async (authorization) => {
      if (!authorization) return [];
      const token = authorization.split(" ")[1];
      const decrypted = await this.checkValidUser(token); // your existing JWT verify
      const actingUserId = String(
        decrypted?.id || decrypted?._id || decrypted?.userId || ""
      );
      if (!actingUserId) return [];
      return await getVisibleUserIdsFor(actingUserId);
    };



    // Returns how many months remain in the year from the given date's month (inclusive)
    function remainingMonthsInYear(date) {
      const m = date.getMonth(); // 0–11
      return 12 - m;
    }

    // Normalize labels safely
    function normalizeLabel(label = "") {
      return String(label).trim();
    }

    // Allowed leave types
    const ALLOWED_LEAVES = [
      "Sick Leave",
      "Casual Leave",
      "Planned Leave",
      "Maternity Leave",
      "Paternity Leave",
      "Compoff Leave"
    ];

    // Get or create a year bucket
    function getYearBucket(leaveRecord, year) {
      return (leaveRecord.remaining || []).find(b => b.year === year);
    }

    function ensureYearBucket(leaveRecord, year, { accrualType, perMonth = 0, fixedAmount = 0, doj } = {}) {
      let bucket = getYearBucket(leaveRecord, year);
      if (bucket) return bucket;

      const months = Array(12).fill(0);
      if (accrualType === "monthly") {
        months.fill(perMonth);
      }
      else if (accrualType === "fixed" && doj && year === new Date(doj).getFullYear()) {
        months[new Date(doj).getMonth()] = fixedAmount;
      }

      bucket = { year, months };
      leaveRecord.remaining = leaveRecord.remaining || [];
      leaveRecord.remaining.push(bucket);
      return bucket;
    }


    /**
     * Create per-user leave balances from policies, pro-rated by DOJ.
     * @param {string|ObjectId} userId
     * @param {string} userRoleName  e.g. "Employee" | "Intern"
     * @param {Date|string} doj      user's date of joining (required for pro-rating)
     */

    // this.leaveModelCreate = async (userId, userRoleName, doj) => {
    //   console.log("Seeding leaves for:", userId, userRoleName, doj);

    //   const policySvc = new LeavePolicyService();
    //   const leaveSvc = new LeaveTypeService();

    //   // 1) fetch active policies
    //   let policies = await policySvc.listActive(userRoleName);

    //   // fallback defaults
    //   if (!policies || policies.length === 0) {
    //     const defaults = [
    //       { label: "Sick Leave", amount: 1, accrualType: "monthly", active: true },
    //       { label: "Casual Leave", amount: 1, accrualType: "monthly", active: true },
    //       { label: "Planned Leave", amount: 7, accrualType: "annual", active: true },
    //       { label: "Maternity Leave", amount: 15, accrualType: "fixed", active: true },
    //       { label: "Paternity Leave", amount: 5, accrualType: "annual", active: true },
    //       { label: "Compoff Leave", amount: 3, accrualType: "fixed", active: true },
    //     ];

    //     try {
    //       if (typeof policySvc.addMany === "function") {
    //         await policySvc.addMany(defaults);
    //       } else await Promise.all(defaults.map(p => policySvc.add(p)));
    //     } catch (_) { /* ignore duplicates */ }

    //     policies = await policySvc.listActive(userRoleName);
    //   }

    //   const from = doj ? new Date(doj) : new Date();
    //   const joinYear = from.getFullYear();
    //   const remMonths = remainingMonthsInYear(from);
    //   const currentYear = new Date().getFullYear();

    //   for (const p of policies) {
    //     if (!p.active) continue;

    //     const label = normalizeLabel(p.label);
    //     if (!ALLOWED_LEAVES.includes(label)) continue;

    //     const accrualType = String(p.accrualType || "").toLowerCase().trim();
    //     const amt = Number(p.amount ?? p.value ?? 0);

    //     let leaveDoc = await leaveSvc.retrieve({ userId, label });

    //     if (!leaveDoc) {
    //       let initial = 0;
    //       const months = Array(12).fill(0);

    //       if (accrualType === "monthly") {
    //         initial = amt;
    //         months.fill(amt);
    //       } else if (accrualType === "annual") {
    //         initial = Math.floor((amt * remMonths) / 12);
    //         const perMonth = remMonths > 0 ? Math.floor(initial / remMonths) : 0;
    //         for (let i = 12 - remMonths; i < 12; i++) months[i] = perMonth;
    //         months[11] += initial - (perMonth * remMonths);
    //       } else if (accrualType === "fixed") {
    //         initial = amt;
    //         months[from.getMonth()] = amt;
    //       }

    //       initial = Math.max(0, Math.floor(initial));
    // console.log(
    //         userId,
    //         label,
    //         initial,
    //         accrualType,
    //       );

    //       leaveDoc = await leaveSvc.add({
    //         userId,
    //         label,
    //         value: initial,
    //         accrualType,
    //         doj: from,
    //         remaining: [{
    //           year: joinYear,
    //           months,
    //           annualValue: accrualType === "annual" ? amt : undefined
    //         }]
    //       });
    //     }
    //     console.log(leaveDoc);
    //     leaveDoc =  leaveDoc.data
    //     if (!getYearBucket(leaveDoc, currentYear)) {
    //       console.log("🔁 Initializing new leave bucket for year:", currentYear);

    //       const perMonth = accrualType === "monthly" ? amt : 0;
    //       ensureYearBucket(leaveDoc, currentYear, { accrualType, perMonth, fixedAmount: amt, doj: leaveDoc.doj });

    //       if (accrualType === "annual") {
    //         const bucket = getYearBucket(leaveDoc, currentYear);
    //         bucket.annualValue = amt;
    //       }

    //       await leaveSvc.add({
    //   ...leaveDoc, // spread existing fields
    //   remaining: leaveDoc.remaining, // updated buckets
    // });
    //     }
    //   }

    //   return await leaveSvc.retrieve({ userId });
    // };
    this.leaveModelCreate = async (userId, userRoleName, doj) => {
      // console.log("Seeding leaves for:", userId, userRoleName, doj);

      const policySvc = new LeavePolicyService();
      const leaveSvc = new LeaveTypeService();

      // 1) Fetch active policies
      let policies = await policySvc.listActive(userRoleName);

      // 2) Fallback defaults if no policies
      if (!policies || policies.length === 0) {
        const defaults = [
          { label: "Sick Leave", amount: 1, accrualType: "monthly", active: true },
          { label: "Casual Leave", amount: 1, accrualType: "monthly", active: true },
          { label: "Planned Leave", amount: 7, accrualType: "annual", active: true },
          { label: "Maternity Leave", amount: 15, accrualType: "fixed", active: true },
          { label: "Paternity Leave", amount: 5, accrualType: "annual", active: true },
          { label: "Compoff Leave", amount: 3, accrualType: "fixed", active: true },
        ];

        try {
          if (typeof policySvc.addMany === "function") {
            await policySvc.addMany(defaults);
          } else {
            await Promise.all(defaults.map((p) => policySvc.add(p)));
          }
        } catch (_) {
          // ignore duplicates
        }

        policies = await policySvc.listActive(userRoleName);
      }

      const currentYear = new Date().getFullYear();
      const nowMonth = new Date().getMonth(); // 0..11
      const safeDoj = doj ? new Date(doj) : null;
      const from = safeDoj && !isNaN(safeDoj.getTime()) ? safeDoj : new Date(); // stored, but not used for year logic

      // Helper: months allocation for CURRENT YEAR ONLY
      const buildMonthsForCurrentYear = (accrualType, amt) => {
        const months = Array(12).fill(0);

        if (accrualType === "monthly") {
          // If you want to credit only from current month onwards (recommended):
          for (let m = nowMonth; m < 12; m++) months[m] = amt;

          // If you want to credit full year immediately, use:
          // months.fill(amt);
        } else if (accrualType === "annual") {
          // Full annual credit (choose where you credit it)
          months[0] = amt; // credit in Jan
          // or months[11] = amt; // credit in Dec
        } else if (accrualType === "fixed") {
          // Credit once in current month
          months[nowMonth] = amt;
        }

        return months;
      };

      for (const p of policies) {
        if (!p?.active) continue;

        const label = normalizeLabel(p.label);
        if (!ALLOWED_LEAVES.includes(label)) continue;

        const accrualType = String(p.accrualType || "").toLowerCase().trim(); // monthly|annual|fixed
        const amt = Number(p.amount ?? p.value ?? 0);

        // Retrieve existing
        const existing = await leaveSvc.retrieve({ userId, label });
        let leaveDoc = existing || null;

        const months = buildMonthsForCurrentYear(accrualType, amt);

        // Set initial value for the doc as the sum of current year months
        const initialValue = months.reduce((a, b) => a + b, 0);

        // CREATE if not exists
        if (!leaveDoc) {
          // console.log("Creating LeaveType:", { userId, label, initialValue, accrualType });

          const created = await leaveSvc.add({
            userId,
            label,
            value: initialValue,
            accrualType,
            doj: from, // store DOJ but not used for bucket decisions
            remaining: [
              {
                year: currentYear,
                months,
                annualValue: accrualType === "annual" ? amt : undefined,
              },
            ],
          });

          leaveDoc = created?.data;
          continue;
        }

        // If exists: ensure CURRENT YEAR bucket only
        leaveDoc.remaining = Array.isArray(leaveDoc.remaining) ? leaveDoc.remaining : [];

        const bucket = getYearBucket(leaveDoc, currentYear);
        if (!bucket) {
          // Add only current year bucket
          leaveDoc.remaining.push({
            year: currentYear,
            months,
            annualValue: accrualType === "annual" ? amt : undefined,
          });

          // ✅ UPDATE (DO NOT use add for update)
          await leaveSvc.update(
            {
              remaining: leaveDoc.remaining,
              updatedAt: new Date(),
            },
            { _id: leaveDoc._id } // Fixed: Pass filter as object
          );
        }
      }

      return await leaveSvc.retrieve({ userId });
    };




    this.leaveAvailable = async (id, type) => {
      let service = new leaveType_service();
      let result = await service.retrieve({ userId: id, label: type });
      return result;
    };

    this.leaveSub = async (userId, type, minus) => {
      let service = new leaveType_service();
      let result = await service.update(
        { value: minus },
        { userId: userId, label: type }
      );
      return result;
    };

    this.leaveAdd = async (userId, type, add) => {
      let service = new leaveType_service();
      let result = await service.update(
        { value: add },
        { userId: userId, label: type }
      );
      return result;
    };

    this.validatePasswordStrength = (pwd) => {
      // Allow default reset password even if weak OR if empty (which shouldn't hit here anyway)
      if (pwd === "123456" || !pwd || pwd.trim() === "") return;

      const tooShort = typeof pwd !== "string" || pwd.length < 8;
      const upper = /[A-Z]/.test(pwd);
      const lower = /[a-z]/.test(pwd);
      const number = /\d/.test(pwd);
      const special = /[^A-Za-z0-9]/.test(pwd);
      if (tooShort || !upper || !lower || !number || !special) {
        const reason = [];
        if (tooShort) reason.push("at least 8 characters");
        if (!upper) reason.push("one uppercase");
        if (!lower) reason.push("one lowercase");
        if (!number) reason.push("one digit");
        if (!special) reason.push("one special character");
        const msg = `Password must contain ${reason.join(", ")}.`;
        const err = new Error(msg);
        err.code = "WEAK_PASSWORD";
        throw err;
      }
    };

    // Compare provided password with stored hash (throws if user not found)
    this.verifyUserPassword = async (userId, plain) => {
      const user = await this.model.findById(userId).select("+password");
      if (!user) {
        const err = new Error("User not found");
        err.code = "USER_NOT_FOUND";
        throw err;
      }
      const ok = await bcrypt.compare(plain, user.password);
      return { ok, user };
    };

    // Change own password (requires current password)
    // this.changeOwnPassword = async (userId, currentPassword, newPassword) => {
    //   this.validatePasswordStrength(newPassword);
    //   const { ok, user } = await this.verifyUserPassword(userId, currentPassword);
    //   if (!ok) {
    //     const err = new Error("Current password is incorrect");
    //     err.code = "BAD_PASSWORD";
    //     throw err;
    //   }
    //   // Avoid reusing the same password
    //   const sameAsOld = await bcrypt.compare(newPassword, user.password);
    //   if (sameAsOld) {
    //     const err = new Error("New password must be different from the current password");
    //     err.code = "PASSWORD_REUSE";
    //     throw err;
    //   }
    //   const hash = await bcrypt.hash(newPassword, 10);
    //   await this.model.updateOne({ _id: userId }, { $set: { password: hash } });
    //   return true;
    // };
    // Change own password (requires current password)
    this.changeOwnPassword = async (userId, currentPassword, newPassword) => {
      this.validatePasswordStrength(newPassword);
      const { ok, user } = await this.verifyUserPassword(
        userId,
        currentPassword
      );
      if (!ok) {
        const err = new Error("Current password is incorrect");
        err.code = "BAD_PASSWORD";
        throw err;
      }
      // Avoid reusing the same password
      const sameAsOld = await bcrypt.compare(newPassword, user.password);
      if (sameAsOld) {
        const err = new Error(
          "New password must be different from the current password"
        );
        err.code = "PASSWORD_REUSE";
        throw err;
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await this.model.updateOne({ _id: userId }, { $set: { password: hash } });
      return true;
    };
    // Admin reset (no current password required)
    this.setPasswordDirect = async (userId, newPassword) => {
      this.validatePasswordStrength(newPassword);
      const user = await this.model.findById(userId).select("+password");
      if (!user) {
        const err = new Error("User not found");
        err.code = "USER_NOT_FOUND";
        throw err;
      }
      const sameAsOld = await bcrypt.compare(newPassword, user.password);
      if (sameAsOld) {
        const err = new Error(
          "New password must be different from the old password"
        );
        err.code = "PASSWORD_REUSE";
        throw err;
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await this.model.updateOne({ _id: userId }, { $set: { password: hash } });
      return true;
    };
  }

  // ✅ Move user to deleted_user collection (soft delete)

  async softDeleteUser(userId, deletedBy, reason) {
    const user = await this.model.findById(userId);
    if (!user) throw new Error("User not found");

    // Create a deleted record
    const deletedUser = new deleteduser_model({
      user_name: user.user_name,
      mobile_no: user.mobile_no,
      empId: user.empId,
      email: user.email,
      role: user.role,
      position: user.position,
      designation: user.designation,
      department: user.department,
      emergency_contact_no: user.emergency_contact_no,
      emergency_contact_name: user.emergency_contact_name,
      bankName: user.bankName,
      branchName: user.branchName,
      accountNo: user.accountNo,
      ifscCode: user.ifscCode,
      accountHolderName: user.accountHolderName,
      deletedBy: deletedBy || null,
      deletedReason: reason || "Deleted by admin",
      originalCreatedAt: user.createdAt,
      originalUpdatedAt: user.updatedAt,
      backupData: user.toObject(),
    });

    try {
      // ✅ Save deleted record
      const savedDeletedUser = await deletedUser.save();

      // 🧾 Verification step
      const verify = await deleteduser_model.findById(savedDeletedUser._id);
      if (!verify) throw new Error("Verification failed — deleted user not found after save!");

      console.log("✅ Deleted user saved & verified:", verify._id);

      // 🔥 Cleanup associated records to avoid orphans (Unknown entries)
      // 1. Performance Stats
      const PerformanceModel = mongoose.model('performance');
      const perfResult = await PerformanceModel.deleteMany({ employeeId: userId });
      console.log(`🗑️ Deleted ${perfResult.deletedCount} performance records for user: ${userId}`);

      // 2. User Documents
      const docsResult = await user_docs_model.deleteMany({ user_id: userId });
      console.log(`🗑️ Deleted document records for user: ${userId}`);

      // 🔥 Remove from main users collection
      await this.model.findByIdAndDelete(userId);
      console.log("🗑️ Original user deleted from main collection:", userId);

      return {
        success: true,
        message: "User moved to deleted_user collection successfully",
        deletedUserId: verify._id
      };
    } catch (err) {
      console.error("❌ Error saving deleted user:", err);
      // Fallback: throw the original specific mongo message if helpful
      throw new Error(err.message || "Failed to save user in deleted_user collection");
    }
  }


  // ✅ Restore deleted user from deleted_user collection
  async restoreUser(deletedUserId) {
    const deletedUser = await deleteduser_model.findById(deletedUserId);
    if (!deletedUser) throw new Error("Deleted user not found");

    // Prevent duplicates — check if email, empId, or mobile_no already re-exists
    const existing = await this.model.findOne({
      $or: [
        { email: deletedUser.email },
        { empId: deletedUser.empId },
        { mobile_no: deletedUser.mobile_no }
      ],
    });
    if (existing) throw new Error("A user with this email, empId, or mobile number already exists");

    // Recreate in main collection
    const restoredUser = new this.model({
      user_name: deletedUser.user_name,
      mobile_no: deletedUser.mobile_no,
      empId: deletedUser.empId,
      email: deletedUser.email,
      role: deletedUser.role,
      position: deletedUser.position,
      designation: deletedUser.designation,
      department: deletedUser.department,
      emergency_contact_no: deletedUser.emergency_contact_no || "N/A",
      emergency_contact_name: deletedUser.emergency_contact_name || "N/A",
      bankName: deletedUser.bankName || deletedUser.backupData?.bankName || "",
      branchName: deletedUser.branchName || deletedUser.backupData?.branchName || "",
      accountNo: deletedUser.accountNo || deletedUser.backupData?.accountNo || "",
      ifscCode: deletedUser.ifscCode || deletedUser.backupData?.ifscCode || "",
      accountHolderName: deletedUser.accountHolderName || deletedUser.backupData?.accountHolderName || "",
      createdBy: deletedUser.deletedBy || null,
      doj: deletedUser.originalCreatedAt || new Date(),
      dob: deletedUser.backupData?.dob || new Date(),
      status: true,
      password: deletedUser.backupData?.password || "$2b$10$X4S9yDavmUcG9GvAVjDLn.HhKIM7OBTcRW/jowKPctIRGAqaKqH52", // Restore old password
      createdby: deletedUser.deletedBy || deletedUser.backupData?.createdby || null

    });

    await restoredUser.save();

    // Remove from deleted_user collection
    await deleteduser_model.findByIdAndDelete(deletedUserId);

    return { success: true, message: "User restored successfully", data: restoredUser };
  }

  async assignShift(userId, shiftId) {
    if (!shiftId) {
      // Unassign shift completely
      const user = await this.model.findByIdAndUpdate(
        userId,
        { $unset: { shift: 1 } },
        { new: true }
      );
      if (!user) throw new Error("User not found");
      return user;
    }

    const Shift = require("../models/shift-model");
    const shift = await Shift.findById(shiftId);
    if (!shift) throw new Error("Shift not found");

    const user = await this.model.findByIdAndUpdate(
      userId,
      { shift: shiftId },
      { new: true }
    ).populate('shift');

    if (!user) throw new Error("User not found");
    return user;
  }

  // Override retrieveById to include dashboard stats
  async retrieveById(id) {
    try {
      const user = await this.model.findById(this.ensureObjectId(id)).populate('shift role').lean();
      if (!user) return null;

      // --- Attendance Stats (Current Month) ---
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const AttendanceModel = require('../models/attendance-model');

      const [presentDays, absentDays] = await Promise.all([
        AttendanceModel.countDocuments({
          userId: user._id,
          date: { $gte: startOfMonth, $lte: endOfMonth },
          attendanceType: 'Present'
        }),
        AttendanceModel.countDocuments({
          userId: user._id,
          date: { $gte: startOfMonth, $lte: endOfMonth },
          attendanceType: 'Absent'
        })
      ]);

      user.presentDays = presentDays;
      user.absentDays = absentDays;

      // --- Available Leaves (Approximate) ---
      try {
        const LeaveTypeModel = require("../models/leaveType-model"); // Direct model access is safer here
        const leaves = await LeaveTypeModel.find({ userId: user._id });
        if (leaves && leaves.length > 0) {
          // Sum 'value' field which typically holds current balance
          user.availableLeaves = leaves.reduce((sum, l) => sum + (l.value || 0), 0);
        } else {
          user.availableLeaves = 0;
        }
      } catch (e) {
        console.warn("Failed to calculate leaves for user profile:", e);
        user.availableLeaves = 0;
      }

      return user;
    } catch (e) {
      throw e;
    }
  }

  ensureObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) ? id : new mongoose.Types.ObjectId(id);
  }

}

module.exports = UserService;
