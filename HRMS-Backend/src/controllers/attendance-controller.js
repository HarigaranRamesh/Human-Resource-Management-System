const express = require("express");
const atd_service = require("../services/attendance-service");
const atd_org_service = require("../services/attendance-orginal-service");

const user_service = require("../services/user-service");
const { getVisibleUserIdsFor, getExcludedFilterUserIds } = require("../services/visibility.service");
const routesUtil = require("../utils/routes");
const holiday_service = require("../services/holiday-service");
const LeaveTypeService = require("../services/leaveType-service");

const AttendanceController = express.Router();
let routes = new routesUtil(atd_service);

// helper: normalize label safely
function normalizeLabel(label) {
  return (label || "").trim();
}

const user_Model = require("../models/user-model");

// Helper: Convert HH:mm to today's Date
const getTodayShiftTime = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(":");
  const targetDate = new Date();
  targetDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return targetDate;
};

async function applyVisibilityAndExclusions(filter, viewerId) {
  const visibleIds = await getVisibleUserIdsFor(viewerId);
  const excludedIds = await getExcludedFilterUserIds();
  if (visibleIds?.length) {
    filter.userId = { $in: visibleIds.filter(id => !excludedIds.includes(String(id))) };
  } else {
    filter.userId = { $nin: excludedIds };
  }
}

const attendanceRepo = require("../db/repositories/attendance.repo");

async function requireAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: "Authorization token is required" });
    return null;
  }
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader.split(" ")[1];
  try {
    const userservice = new user_service();
    const decrypted = await userservice.checkValidUser(token);
    return decrypted;
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
    return null;
  }
}
const EmailService = require("../services/email-service");

const formatDateIN = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

AttendanceController.get("/", routes.listForTable)

  .get("/one/:id", routes.retrieve)

  // ✅ LOGIN
  .post("/present/login", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const record = await attendanceRepo.clockIn(decrypted.id, {
        lat: req.body.lat,
        lon: req.body.lon,
        address: req.body.address,
      });
      return res.json(record);
    } catch (err) {
      console.error("present/login error:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  // ✅ LOGOUT
  .post("/present/logout", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const record = await attendanceRepo.clockOut(decrypted.id, {
        lat: req.body.lat,
        lon: req.body.lon,
        address: req.body.address,
      });
      return res.json(record);
    } catch (err) {
      console.error("present/logout error:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  .get("/present/check", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const record = await attendanceRepo.getTodayRecord(decrypted.id);
      return res.json({
        message: !!(record && record.attendance_type === "Present"),
        isHoliday: false,
        holidays: [],
      });
    } catch (err) {
      console.error("present/check error:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  .get("/daily-report", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;
      const targetDate = req.query.date || new Date().toISOString().split('T')[0];
      const report = await attendanceRepo.getDailyReport(targetDate);
      res.json(report);
    } catch (err) {
      console.error("GET /daily-report error:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  .get("/monthly-report", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;
      const userId = req.query.userId || decrypted.id;
      const now = new Date();
      const month = parseInt(req.query.month) || (now.getMonth() + 1);
      const year = parseInt(req.query.year) || now.getFullYear();
      const report = await attendanceRepo.getMonthlyReport(userId, month, year);
      res.json(report);
    } catch (err) {
      console.error("GET /monthly-report error:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  .get("/summary/:id", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;
      const targetId = req.params.id === "me" ? decrypted.id : req.params.id;
      const records = await attendanceRepo.listByUser(targetId, { limit: 30 });
      res.json(records);
    } catch (err) {
      console.error("GET /summary/:id error:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  .get("/report", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;
      const targetDate = req.query.date || new Date().toISOString().split('T')[0];
      const report = await attendanceRepo.getDailyReport(targetDate);
      res.json(report);
    } catch (err) {
      console.error("GET /report error:", err);
      res.status(500).json({ message: "Server error" });
    }
  })

  .post("/leaverequest", async (req, res) => {
    try {
      // AUTH
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      // Parse dates
      const [fd, fm, fy] = req.body.fromDate.split("/");
      const fromDate = new Date(`${fy}-${fm}-${fd}T00:00:00Z`);

      const toDate = req.body.toDate
        ? (() => {
          const [td, tm, ty] = req.body.toDate.split("/");
          return new Date(`${ty}-${tm}-${td}T00:00:00Z`);
        })()
        : fromDate;

      const requestedAttendanceType = normalizeLabel(req.body.attendanceType);

      const hsvc = new holiday_service();
      let requestedDays = 0;
      let checkDate = new Date(fromDate);
      while (checkDate <= toDate) {
        const hInfo = await hsvc.isHolidayOn(checkDate);
        // Only count if it's NOT a holiday and NOT a Sunday
        if (!hInfo.isHoliday && checkDate.getDay() !== 0) {
          requestedDays++;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }

      if (requestedDays === 0) {
        return res.json({
          success: false,
          message: "Selected dates are all holidays or weekends",
        });
      }

      const requestYear = fromDate.getUTCFullYear();
      const requestMonth = fromDate.getMonth();

      // Fetch leave record using service
      const leaveSvc = new LeaveTypeService();
      const leaveRecord = await leaveSvc.retrieve({
        userId: decrypted.id,
        label: requestedAttendanceType,
      });

      if (!leaveRecord) {
        return res.json({
          success: false,
          message: "Leave record not found for this type",
        });
      }

      const accrualType = (leaveRecord.accrualType || "").toLowerCase().trim();
      const joiningMonth = leaveRecord.doj
        ? new Date(leaveRecord.doj).getMonth()
        : requestMonth;

      // Find bucket for the year
      let yearBucket = (leaveRecord.remaining || []).find(
        (b) => b.year === requestYear
      );

      if (!yearBucket) {
        return res.json({
          success: false,
          message: `No leave bucket found for year ${requestYear}`,
        });
      }

      // BALANCE CHECK
      if (accrualType === "monthly") {
        const bal = yearBucket.months[requestMonth] ?? 0;
        if (requestedDays > bal) {
          return res.json({
            success: false,
            message: "Insufficient monthly leave balance",
          });
        }
      } else if (accrualType === "fixed") {
        const fixedBal = yearBucket.months[joiningMonth] ?? 0;
        if (requestedDays > fixedBal) {
          return res.json({
            success: false,
            message: "Insufficient fixed leave balance",
          });
        }
      } else if (accrualType === "annual") {
        const avail = yearBucket.annualValue ?? leaveRecord.value ?? 0;
        if (requestedDays > avail) {
          return res.json({
            success: false,
            message: "Insufficient annual leave balance",
          });
        }
      }

      // ADD ATTENDANCE ENTRIES
      const atdService = new atd_service();
      const orgAtdService = new atd_org_service();
      const leaveEntries = [];

      let d = new Date(fromDate);
      while (d <= toDate) {
        const ds = new Date(d);
        const start = new Date(ds.setUTCHours(0, 0, 0, 0));
        const end = new Date(ds.setUTCHours(23, 59, 59, 999));

        // Skip adding entries for Holidays/Sundays if you want, 
        // OR add them but they are already covered by "isHoliday".
        // Usually, we only add leave entries for WORKING days.
        const hInfo = await hsvc.isHolidayOn(d);
        if (!hInfo.isHoliday && d.getDay() !== 0) {
          const exists = await atdService.retrieve({
            userId: decrypted.id,
            date: { $gte: start, $lte: end },
          });

          if (!exists) {
            const payload = {
              userId: decrypted.id,
              date: new Date(d),
              attendanceType: requestedAttendanceType,
              reasonForApplying: req.body.reasonForApplying,
            };

            const rec = await atdService.add(payload);
            await orgAtdService.add(payload);
            leaveEntries.push(rec);
          }
        }
        d.setDate(d.getDate() + 1);
      }

      if (leaveEntries.length === 0) {
        return res.json({
          success: false,
          message: "Leave already applied earlier",
        });
      }

      // DEDUCT BALANCE
      if (accrualType === "monthly") {
        yearBucket.months[requestMonth] -= requestedDays;
        leaveRecord.value -= requestedDays;
      } else if (accrualType === "fixed") {
        yearBucket.months[joiningMonth] -= requestedDays;
        leaveRecord.value -= requestedDays;
      } else if (accrualType === "annual") {
        yearBucket.annualValue -= requestedDays;
        leaveRecord.value -= requestedDays;
      }

      // REPLACE UPDATED BUCKET
      leaveRecord.remaining = leaveRecord.remaining.map((b) =>
        b.year === requestYear ? yearBucket : b
      );
      console.log(leaveRecord._id, leaveRecord.remaining[0].months[10]);

      // SAVE CHANGES using service update
      let rss = await leaveSvc.update(leaveRecord, leaveRecord._id);
      console.log(rss);

      // SUCCESS
      return res.json({
        success: true,
        message: "Leave applied successfully",
        data: leaveEntries,
        updatedBalance: {
          year: requestYear,
          remaining: yearBucket.months,
          annualValue: yearBucket.annualValue,
          totalValue: leaveRecord.value,
        },
      });
    } catch (err) {
      console.error("leaverequest error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  })

  .get("/all", async (_req, res) => {
    try {
      const service = new atd_service();
      const records = await service.listForTable({
        attendanceType: {
          $in: [
            "Sick Leave",
            "Casual Leave",
            "Planned Leave",
            "Maternity Leave",
          ],
        },
        approved: null,
      });
      res.json(records);
    } catch (e) {
      console.error("GET /all error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  .get("/all/:id", async (req, res) => {
    try {
      const service = new atd_service();

      const currentYear = new Date().getFullYear();
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59); // Dec 31, 23:59:59

      const query = {
        userId: req.params.id,
        attendanceType: {
          $in: [
            "Sick Leave",
            "Casual Leave",
            "Planned Leave",
            "Maternity Leave",
          ],
        },
        date: { $lte: endOfYear },
        ...req.query, // in case you send pagination (page, limit)
      };

      const records = await service.listForTableleave(query, {
        sort: { date: -1 },
      });
      res.json(records);
    } catch (e) {
      console.error("GET /all/:id error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  // .put("/approval/:id", async (req, res) => {
  //   try {
  //     const decrypted = await requireAuth(req, res);
  //     if (!decrypted) return;

  //     const userservice = new user_service();
  //     const approver = await userservice.retrieve({ _id: decrypted.id });

  //     const atdService = new atd_service();
  //     const orgService = new atd_org_service();

  //     // get attendance entry
  //     const details = await atdService.retrieve({ _id: req.params.id });
  //     if (!details) {
  //       return res.status(404).json({ message: "Attendance record not found" });
  //     }

  //     const isApprove = req.body.approved === true;

  //     // COMMON update body
  //     const body = {
  //       approved: isApprove,
  //       remarks: `By ${approver.user_name}`,
  //     };

  //     // ----------------------------------------
  //     //  IF REJECTED → RETURN LEAVE BACK
  //     // ----------------------------------------
  //     if (!isApprove) {
  //       const leaveType = normalizeLabel(details.attendanceType);
  //       const leaveSvc = new LeaveTypeService();

  //       // find leave record for user + type
  //       const leaveRecord = await leaveSvc.retrieve({
  //         userId: details.userId,
  //         label: leaveType,
  //       });

  //       if (leaveRecord) {
  //         const requestDate = new Date(details.date);
  //         const requestYear = requestDate.getFullYear();
  //         const requestMonth = requestDate.getMonth();

  //         // locate bucket
  //         let yearBucket = (leaveRecord.remaining || []).find(
  //           (b) => b.year === requestYear
  //         );
  //         if (!yearBucket) {
  //           return res.json({
  //             success: false,
  //             message: `Year bucket not found for ${requestYear}`,
  //           });
  //         }

  //         const accrualType = (leaveRecord.accrualType || "")
  //           .toLowerCase()
  //           .trim();

  //         // 1 DAY must be returned
  //         const returnDays = 1;

  //         // Restore based on accrualType
  //         if (accrualType === "monthly") {
  //           yearBucket.months[requestMonth] += returnDays;
  //           leaveRecord.value += returnDays;
  //         } else if (accrualType === "fixed") {
  //           const dojMonth = leaveRecord.doj
  //             ? new Date(leaveRecord.doj).getMonth()
  //             : requestMonth;
  //           yearBucket.months[dojMonth] += returnDays;
  //           leaveRecord.value += returnDays;
  //         } else if (accrualType === "annual") {
  //           yearBucket.annualValue += returnDays;
  //           leaveRecord.value += returnDays;
  //         }

  //         // update buckets
  //         leaveRecord.remaining = leaveRecord.remaining.map((b) =>
  //           b.year === requestYear ? yearBucket : b
  //         );

  //         // save updated leave record
  //         await leaveSvc.update(leaveRecord, leaveRecord._id);
  //       }
  //     }

  //     // ----------------------------------------
  //     // UPDATE ATTENDANCE RECORD
  //     // ----------------------------------------
  //     await atdService.update(body, { _id: req.params.id });
  //     await orgService.update(body, { _id: req.params.id });

  //     return res.json({
  //       success: true,
  //       status: isApprove ? "approved" : "rejected",
  //       restored: !isApprove ? 1 : 0,
  //       data: details,
  //     });
  //   } catch (e) {
  //     console.error("PUT /approval/:id error:", e);
  //     res.status(500).json({ message: "Server error" });
  //   }
  // })
  .put("/approval/:id", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const userservice = new user_service();
      const approver = await userservice.retrieve({ _id: decrypted.id });

      const atdService = new atd_service();
      const orgService = new atd_org_service();

      // get attendance entry
      const details = await atdService.retrieve({ _id: req.params.id });
      if (!details) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      const isApprove = req.body.approved === true;

      // COMMON update body
      const body = {
        approved: isApprove,
        remarks: `By ${approver.user_name}`,
      };

      // ----------------------------------------
      //  IF REJECTED → RETURN LEAVE BACK
      // ----------------------------------------
      if (!isApprove) {
        const leaveType = normalizeLabel(details.attendanceType);
        const leaveSvc = new LeaveTypeService();

        const leaveRecordResp = await leaveSvc.retrieve({
          userId: details.userId,
          label: leaveType,
        });

        const leaveRecord = leaveRecordResp?.data || leaveRecordResp;

        if (leaveRecord) {
          const requestDate = new Date(details.date);
          const requestYear = requestDate.getFullYear();
          const requestMonth = requestDate.getMonth();

          let yearBucket = (leaveRecord.remaining || []).find((b) => b.year === requestYear);
          if (!yearBucket) {
            return res.json({
              success: false,
              message: `Year bucket not found for ${requestYear}`,
            });
          }

          const accrualType = String(leaveRecord.accrualType || "").toLowerCase().trim();
          const returnDays = 1;

          if (accrualType === "monthly") {
            yearBucket.months[requestMonth] += returnDays;
            leaveRecord.value += returnDays;
          } else if (accrualType === "fixed") {
            const dojMonth = leaveRecord.doj
              ? new Date(leaveRecord.doj).getMonth()
              : requestMonth;
            yearBucket.months[dojMonth] += returnDays;
            leaveRecord.value += returnDays;
          } else if (accrualType === "annual") {
            yearBucket.annualValue = Number(yearBucket.annualValue || 0) + returnDays;
            leaveRecord.value += returnDays;
          }

          leaveRecord.remaining = leaveRecord.remaining.map((b) =>
            b.year === requestYear ? yearBucket : b
          );

          // ✅ your service expects update(payload, id)
          await leaveSvc.update(
            {
              remaining: leaveRecord.remaining,
              value: leaveRecord.value,
              updatedAt: new Date(),
            },
            leaveRecord._id
          );
        }
      }

      // ----------------------------------------
      // UPDATE ATTENDANCE RECORD
      // ----------------------------------------
      await atdService.update(body, { _id: req.params.id });
      await orgService.update(body, { _id: req.params.id });

      // ----------------------------------------
      // SEND EMAIL (TEMPLATE SELECT)
      // ----------------------------------------
      try {
        // get employee user record to get email
        const employee = await userservice.retrieve({ _id: details.userId });

        if (employee?.email) {
          const emailSvc = new EmailService();

          const vars = {
            companyName: process.env.MAIL_FROM_NAME || "HR Portal",
            name: employee.user_name || "Employee",
            leaveType: normalizeLabel(details.attendanceType),
            date: formatDateIN(details.date),
            approvedBy: approver.user_name || "Manager",
            remarks: body.remarks,
            rejectionReason: req.body.rejectionReason || req.body.reason || "Not mentioned",
          };

          if (isApprove) {
            await emailSvc.sendTemplateEmail("LEAVE_APPROVED", employee.email, vars);
          } else {
            await emailSvc.sendTemplateEmail("LEAVE_REJECTED", employee.email, vars);
          }
        }
      } catch (mailErr) {
        console.error("❌ Email send failed:", mailErr.message);
        // Don't break approval flow if email fails
      }

      return res.json({
        success: true,
        status: isApprove ? "approved" : "rejected",
        restored: !isApprove ? 1 : 0,
        data: details,
      });
    } catch (e) {
      console.error("PUT /approval/:id error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  .get("/allmyattendance", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const mongoose = require("mongoose");
      const service = new atd_service();
      const query = {
        ...req.query,
        userId: new mongoose.Types.ObjectId(decrypted.id),
        attendanceType: { $in: ["Present", "Absent", "LOP", "Comp OFF", "Holiday", "Sick Leave", "Casual Leave", "Maternity Leave", "Planned Leave"] }
      };

      const records = await service.listForTableleave(query, {
        sort: { date: -1 }
      });
      res.json(records);
    } catch (e) {
      console.error("GET /allmyattendance error:", e);
      res.status(500).json({ message: "Server error" });
    }
  })

  // ===== Lists that must respect visibility (Option-B) =====

  .get("/pendinglist", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const baseFilter = {
        attendanceType: {
          $in: [
            "Sick Leave",
            "Casual Leave",
            "Planned Leave",
            "Maternity Leave",
          ],
        },
        approved: null,
      };

      await applyVisibilityAndExclusions(baseFilter, String(decrypted.id));

      const sort = { date: -1 };
      const service = new atd_service();
      const records = await service.listForTableWithRole(
        baseFilter,
        sort,
        req.query,
        null
      ); // roleId no longer used
      res.json(records);
    } catch (error) {
      console.error("GET /pendinglist error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  })

  .get("/dailyReports", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const baseFilter = {
        attendanceType: { $in: ["Present", "Absent", "LOP", "Comp OFF", "Holiday", "Sick Leave", "Casual Leave", "Maternity Leave", "Planned Leave"] },
        date: { $gte: todayStart, $lte: todayEnd },
      };

      await applyVisibilityAndExclusions(baseFilter, String(decrypted.id));

      const sort = { date: -1 };
      const service = new atd_service();
      const records = await service.listForTableWithRole(
        baseFilter,
        sort,
        req.query,
        null
      );
      res.json(records);
    } catch (error) {
      console.error("GET /dailyReports error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  })

  .get("/monthlyReports", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const baseFilter = {
        attendanceType: { $in: ["Present", "Absent", "LOP", "Comp OFF", "Holiday", "Sick Leave", "Casual Leave", "Maternity Leave", "Planned Leave"] },
        date: { $gte: startOfMonth, $lte: endOfMonth },
      };

      await applyVisibilityAndExclusions(baseFilter, String(decrypted.id));

      const sort = { date: -1 };
      const service = new atd_service();
      const records = await service.listForTableWithRole(
        baseFilter,
        sort,
        req.query,
        null
      );
      res.json(records);
    } catch (error) {
      console.error("GET /monthlyReports error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  })

  .put("one/:id", routes.update)

  .get("/summary/:userId", async (req, res) => {
    try {
      const decrypted = await requireAuth(req, res);
      if (!decrypted) return;

      const userId = req.params.userId;
      const service = new atd_service();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // We only want THIS MONTH's data
      const records = await service.model.find({
        userId: userId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });

      let presentDays = 0;
      let absentDays = 0;
      let lateMarks = 0;

      records.forEach(r => {
        const type = (r.attendanceType || "").toLowerCase();
        if (type.includes("present")) presentDays++;
        if (type.includes("absent")) absentDays++;
        if (r.lateMark) lateMarks++;
      });

      let isHoliday = false;
      try {
        const hsvc = new holiday_service();
        const holidayInfo = await hsvc.isHolidayOn(now);
        isHoliday = !!holidayInfo?.isHoliday;
      } catch (err) {
        // Safe fallback
      }

      res.json({
        presentDays,
        absentDays,
        lateMarks,
        isHoliday
      });
    } catch (e) {
      console.error("GET /summary/:userId error:", e);
      res.status(500).json({ message: "Server error", error: e.message, stack: e.stack });
    }
  })
  .delete("/:id", routes.delete);

module.exports = AttendanceController;
