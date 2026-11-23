const path = require("path");
const shiftService = require("./shift-service");
const attendanceModel = require("../models/attendance-model");
const userAttendanceReportModel = require("../models/user-attendance-report-model");
const { getVisibleUserIdsFor, getExcludedFilterUserIds } = require("../services/visibility.service");
const HolidayService = require('../services/holiday-service'); // ✅ import HolidayService

class UserAttendanceReportService {
  constructor() {
    // No longer using hardcoded JSON configurations. 
    // Shift timings are fetched dynamically from the user's shift document.
  }

  getShiftRules(user, defaultShift) {
    const s = (user && user.shift) ? user.shift : defaultShift;

    const safeParse = (timeStr, defaultVal) => {
      if (!timeStr || !timeStr.includes(':')) return defaultVal;
      const parts = timeStr.split(':');
      return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1], 10) };
    };

    const start = safeParse(s.startTime, { hour: 9, minute: 30 });
    const end = safeParse(s.endTime, { hour: 18, minute: 30 });

    return {
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
      graceLate: s.gracePeriodLate || 0,
      graceEarly: s.gracePeriodEarly || 0,
      maxLate: s.maxLateOccurrences || 0,
      autoLopMissing: s.autoLopForMissingLog !== false
    };
  }

  async getLateCountForMonth(userId, date) {
    const d = new Date(date);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    // Only check late marks up to the day BEFORE the current record to see if we apply penalty now
    const endOfRange = new Date(date);
    endOfRange.setSeconds(-1);

    const count = await attendanceModel.countDocuments({
      userId: userId,
      date: { $gte: startOfMonth, $lte: endOfRange },
      lateMark: true
    });
    return count;
  }

  async applyVisibilityAndExclusions(filter, viewerId) {
    const visibleIds = await getVisibleUserIdsFor(viewerId);
    if (visibleIds === null) {
      // Super Admin: Sees EVERYTHING. No filter needed.
      return;
    }
    const excludedIds = await getExcludedFilterUserIds();
    if (visibleIds?.length) {
      filter.userId = { $in: visibleIds.filter(id => !excludedIds.includes(String(id))) };
    } else {
      filter.userId = { $nin: excludedIds };
    }
  }

  async buildReportRow(r, defaultShift) {
    let calculatedType = r.attendanceType;
    let reason = null;
    let resonforLOP = "";

    const leaveTypes = ["Sick Leave", "Casual Leave", "Maternity Leave", "Planned Leave", "Comp OFF"];
    if (leaveTypes.includes(r.attendanceType)) {
      reason = r.reasonForApplying || "-";
    }

    if (r.attendanceType === "Present" && r.geoTaglogin?.date && r.geoTaglogout?.date) {
      const loginTime = new Date(r.geoTaglogin.date);
      const logoutTime = new Date(r.geoTaglogout.date);
      const shift = this.getShiftRules(r.userId, defaultShift);

      const shiftStart = new Date(r.date);
      shiftStart.setHours(shift.startHour, shift.startMinute, 0, 0);

      const shiftEnd = new Date(r.date);
      shiftEnd.setHours(shift.endHour, shift.endMinute, 0, 0);

      // 🕒 Dynamic Calculation with Grace Periods
      const loginDiff = Math.floor((loginTime - shiftStart) / (1000 * 60));
      const logoutDiff = Math.floor((shiftEnd - logoutTime) / (1000 * 60));

      const isLate = loginDiff > shift.graceLate;
      const isEarly = logoutDiff > shift.graceEarly;

      if (!isLate && !isEarly) {
        calculatedType = "Present";
      } else {
        // Decide if we mark LOP or just "Present with Late/Early"
        // Check occurrences if it's a late mark
        let penaltyKicksIn = false;
        if (isLate) {
          const pastLateCount = await this.getLateCountForMonth(r.userId?._id, r.date);
          if (pastLateCount >= shift.maxLate) penaltyKicksIn = true;
        }
        if (isEarly) penaltyKicksIn = true; // Early out usually immediate LOP in rules

        calculatedType = penaltyKicksIn ? "LOP" : "Present";

        if (isLate) {
          const lateText = loginDiff > 60
            ? `${Math.floor(loginDiff / 60)} hr ${loginDiff % 60} min`
            : `${loginDiff} min`;
          resonforLOP = `Late login by ${lateText} (Allowed: ${shift.graceLate} min)`;
        }

        if (isEarly) {
          const earlyText = logoutDiff > 60
            ? `${Math.floor(logoutDiff / 60)} hr ${logoutDiff % 60} min`
            : `${logoutDiff} min`;
          resonforLOP += (resonforLOP ? "; " : "") + `Early logout by ${earlyText}`;
        }
      }
    } else if (r.attendanceType === "Present" && (!r.geoTaglogin?.date || !r.geoTaglogout?.date)) {
      const shift = this.getShiftRules(r.userId, defaultShift);
      if (shift.autoLopMissing) {
        calculatedType = "LOP";
        resonforLOP = "Missing login or logout record";
      }
    }

    return {
      _id: r._id,
      userId: r.userId
        ? {
          _id: r.userId._id,
          user_name: r.userId.user_name,
          email: r.userId.email,
          empId: r.userId.empId,
          roleId: r.userId.roleId
        }
        : null,
      date: r.date,
      attendanceType: calculatedType,
      approved: r.approved,
      isHoliday: r.isHoliday,
      remarks: r.remarks,
      reasonForApplying: reason,
      resonforLOP,
      geoTaglogin: r.geoTaglogin,
      geoTaglogout: r.geoTaglogout,
      changedBy: r.changedBy
        ? {
          _id: r.changedBy._id,
          user_name: r.changedBy.user_name,
          email: r.changedBy.email,
          empId: r.changedBy.empId
        }
        : null
    };
  }

  /** ------------------ DAILY LIVE ------------------ */
  /** ------------------ DAILY LIVE ------------------ */
  async dayReport(date, page = 1, limit = 10, viewerId) {
    const day = new Date(date);
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end = new Date(day); end.setHours(23, 59, 59, 999);

    const filter = { date: { $gte: start, $lte: end } };
    await this.applyVisibilityAndExclusions(filter, viewerId);

    const defaultShift = await shiftService.getDefaultShift();

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      attendanceModel.find(filter)
        .populate({
          path: "userId",
          select: "empId user_name email roleId shift",
          populate: { path: "shift" }
        })
        .sort({ date: 1 }),
      attendanceModel.countDocuments(filter)
    ]);

    // 🛡️ Filter out orphans (records where user was deleted)
    const validRecords = records.filter(r => r && r.userId);
    const paginated = validRecords.slice(skip, skip + limit);

    return {
      data: await Promise.all(paginated.map(r => this.buildReportRow(r, defaultShift))),
      total: validRecords.length,
      page,
      limit
    };
  }


  /** ------------------ DAILY APPEND SNAPSHOT ------------------ */
  // async appendDayReport(date, generatedBy, page = 1, limit = 10, viewerId) {
  //   const visibleIds = await getVisibleUserIdsFor(viewerId);

  //   const day = new Date(date);
  //   const start = new Date(day); start.setHours(0, 0, 0, 0);
  //   const end = new Date(day); end.setHours(23, 59, 59, 999);

  //   const filter = { date: { $gte: start, $lte: end } };
  //   if (visibleIds?.length) filter.userId = { $in: visibleIds };
  //   const existing = await userAttendanceReportModel.findOne(filter);
  //   if (existing) {
  //     const skip = (page - 1) * limit;
  //     const [data, total] = await Promise.all([
  //       userAttendanceReportModel.find(filter)
  //         .populate("userId", "empId user_name email roleId")
  //         .populate("generatedBy", "user_name email empId")
  //         .populate("changedBy", "empId user_name email") // ✅ include changedBy
  //         .skip(skip).limit(limit).sort({ date: 1 }),
  //       userAttendanceReportModel.countDocuments(filter)
  //     ]);
  //     return { data, total, page, limit, mode: "already-exists" };
  //   }

  //   const rows = (await this.dayReport(date, page, limit, viewerId)).data;

  //   for (const row of rows) {
  //     const existsForUser = await userAttendanceReportModel.findOne({
  //       userId: row.userId?._id,
  //       date: row.date,
  //       generatedBy: { $ne: null }
  //     });

  //     if (existsForUser) continue;

  //     await new userAttendanceReportModel({
  //       ...row,
  //       generatedBy
  //     }).save();
  //   }

  //   return { data: rows, total: rows.length, page, limit, mode: "created" };
  // }


  async appendDayReport(date, generatedBy, page = 1, limit = 10, viewerId) {
    const day = new Date(date);
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end = new Date(day); end.setHours(23, 59, 59, 999);

    const dateFilter = { date: { $gte: start, $lte: end } };
    await this.applyVisibilityAndExclusions(dateFilter, viewerId);

    // 🧾 Step 1: Get all existing users who already have a report for that date
    const existingUserIds = await userAttendanceReportModel.distinct("userId", dateFilter);

    const defaultShift = await shiftService.getDefaultShift();

    // 🧮 Step 2: Generate full report for the day (all visible users)
    const allRowsRes = await this.dayReport(date, page, limit, viewerId);
    const allRows = allRowsRes.data;

    // 🆕 Step 3: Filter rows for users who don’t have existing reports
    const newRows = allRows.filter(row =>
      !existingUserIds.some(id => id.toString() === row.userId?._id?.toString())
    );

    // 🧩 Step 4: Append only missing users
    for (const row of newRows) {
      await new userAttendanceReportModel({
        ...row,
        generatedBy
      }).save();
    }

    // 🗂️ Step 5: Always return the latest paginated list for that day
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      userAttendanceReportModel.find(dateFilter)
        .populate("userId", "user_name empId email roleId shift")
        .populate("generatedBy", "user_name email empId")
        .populate("changedBy", "empId user_name email")
        .sort({ date: -1 }),
      userAttendanceReportModel.countDocuments(dateFilter)
    ]);

    const validData = data.filter(r => r && r.userId);
    const paginated = validData.slice(skip, skip + limit);

    // 🏁 Return with mode based on new insertions
    return {
      data: await Promise.all(paginated.map(r => this.buildReportRow(r, defaultShift))),
      total: validData.length,
      page,
      limit,
      mode: newRows.length > 0 ? "appended" : "already-up-to-date",
      appendedCount: newRows.length
    };
  }

  /** ------------------ PERSISTED MONTHLY ------------------ */
  async getPersistedMonthlyReport(year, month, page = 1, limit = 10, viewerId) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const filter = { date: { $gte: start, $lte: end } };
    await this.applyVisibilityAndExclusions(filter, viewerId);

    const defaultShift = await shiftService.getDefaultShift();

    const [data, total] = await Promise.all([
      userAttendanceReportModel.find(filter)
        .populate("userId", "user_name empId email roleId shift")
        .populate("generatedBy", "user_name email empId")
        .populate("changedBy", "empId user_name email")
        .sort({ date: 1 }),
      userAttendanceReportModel.countDocuments(filter)
    ]);

    const validData = data.filter(r => r && r.userId);
    const skip = (page - 1) * limit;
    const paginated = validData.slice(skip, skip + limit);

    return {
      data: await Promise.all(paginated.map(r => this.buildReportRow(r, defaultShift))),
      total: validData.length,
      page,
      limit
    };
  }

  /** ------------------ MANAGER OVERRIDE ------------------ */
  async markAsPresent(reportId, changedBy, remarks = "") {
    console.log(`[DEBUG] markAsPresent called with reportId: ${reportId}`);
    let report = await userAttendanceReportModel.findById(reportId);

    if (!report) {
      console.warn(`[WARN] Report snapshot not found for ID: ${reportId}. Checking Attendance collection...`);
      // Try to find if this is actually an Attendance ID
      const attendance = await attendanceModel.findById(reportId);
      if (attendance) {
        console.log(`[DEBUG] Found Attendance record with ID: ${reportId}. Synchronizing to snapshot...`);

        // Update the live attendance record
        attendance.attendanceType = "Present";
        attendance.lateMark = false;
        attendance.earlyOut = false;
        attendance.lateMinutes = 0;
        attendance.approved = true;
        attendance.remarks = remarks || "Manager override to Present";
        await attendance.save();

        // Now see if we have a snapshot for this date+user to update as well
        const start = new Date(attendance.date); start.setHours(0, 0, 0, 0);
        const end = new Date(attendance.date); end.setHours(23, 59, 59, 999);
        report = await userAttendanceReportModel.findOne({
          userId: attendance.userId,
          date: { $gte: start, $lte: end }
        });

        if (report) {
          console.log(`[DEBUG] Found existing snapshot to update.`);
        } else {
          console.log(`[DEBUG] No existing snapshot found. Overriding only attendance.`);
          return await attendance.populate({ path: "userId", select: "empId user_name email roleId" });
        }
      } else {
        console.error(`[ERROR] ID ${reportId} not found in either Snapshots or Attendance.`);
        throw new Error("Attendance report not found");
      }
    }

    // Update the snapshot record (this part runs if we found a report directly or via sync)
    report.changedItem = `attendanceType:${report.attendanceType}`;
    report.changedRemarks = remarks || "Manager override to Present";
    report.changedBy = changedBy;
    report.attendanceType = "Present";
    report.resonforLOP = "";
    report.approved = true;

    await report.save();

    // Also try to find the original attendance and update it if it exists
    try {
      const start = new Date(report.date); start.setHours(0, 0, 0, 0);
      const end = new Date(report.date); end.setHours(23, 59, 59, 999);
      const attendance = await attendanceModel.findOne({
        userId: report.userId,
        date: { $gte: start, $lte: end }
      });
      if (attendance) {
        attendance.attendanceType = "Present";
        attendance.lateMark = false;
        attendance.earlyOut = false;
        attendance.lateMinutes = 0;
        attendance.approved = true;
        attendance.remarks = remarks || "Manager override to Present";
        await attendance.save();
      }
    } catch (e) {
      console.error("Secondary sync to attendance failed", e);
    }

    return await report.populate([
      { path: "userId", select: "empId user_name email roleId" },
      { path: "changedBy", select: "empId user_name email" }
    ]);
  }

  async updateApproval(reportId, approved, changedRemarks, changedBy) {
    const report = await userAttendanceReportModel.findById(reportId);
    if (!report) throw new Error("Attendance report not found");

    report.approved = approved;
    report.changedRemarks = changedRemarks;
    report.changedBy = changedBy;

    await report.save();

    return await report.populate([
      { path: "userId", select: "empId user_name email roleId" },
      { path: "changedBy", select: "empId user_name email" }
    ]);
  }



  /** ------------------ MONTHLY PIVOT WITH TOTAL PRESENT/DAYS ------------------ */
  async getPersistedMonthlyPivot2(year, month, viewerId) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const filter = { date: { $gte: start, $lte: end } };
    await this.applyVisibilityAndExclusions(filter, viewerId);

    const tz = "Asia/Kolkata";
    const fmtIST = (d) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(d));

    const allRecords = await userAttendanceReportModel
      .find(filter)
      .populate("userId", "user_name empId")
      .sort({ date: 1 });

    const records = allRecords.filter(r => r && r.userId);

    // Collect all dates for the month
    const allDatesSet = new Set();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDatesSet.add(fmtIST(d));
    }
    for (const rec of records) {
      allDatesSet.add(fmtIST(rec.date));
    }
    const dates = Array.from(allDatesSet).sort();

    // --- Build Pivot ---
    const pivot = {};
    for (const rec of records) {
      const uname = rec.userId?.user_name || "Unknown";
      const empId = rec.userId?.empId || "Unknown";
      const d = fmtIST(rec.date);

      if (!pivot[empId]) {
        pivot[empId] = {
          empId,
          user_name: uname,
          _totals: { present: 0, totalDays: dates.length },
        };
        dates.forEach((dt) => (pivot[empId][dt] = null));
      }

      if (rec.isHoliday) {
        pivot[empId][d] = "holiday";
      } else if (rec.attendanceType?.toLowerCase() === "present") {
        pivot[empId][d] = "present";
        pivot[empId]._totals.present++;
      } else if (rec.attendanceType) {
        pivot[empId][d] = rec.attendanceType.toLowerCase();
      }
    }

    // Format totals like "present/totalDays"
    for (const eid in pivot) {
      const { present, totalDays } = pivot[eid]._totals;
      pivot[eid]._totals = `${present}/${totalDays}`;
    }

    // ✅ Return empId and name explicitly
    return { dates, users: pivot };
  }

  async getPersistedMonthlyPivot(year, month, viewerId) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const filter = { date: { $gte: start, $lte: end } };
    await this.applyVisibilityAndExclusions(filter, viewerId);

    const tz = "Asia/Kolkata";
    const fmtIST = (d) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(d));

    const allRecords = await userAttendanceReportModel
      .find(filter)
      .populate("userId", "user_name empId")
      .sort({ date: 1 });

    const records = allRecords.filter(r => r && r.userId);

    // Build date list
    const allDatesSet = new Set();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDatesSet.add(fmtIST(d));
    }
    records.forEach(r => allDatesSet.add(fmtIST(r.date)));
    const dates = Array.from(allDatesSet).sort();

    // Fetch Holidays
    const holiday_Service = new HolidayService();
    const holidayInfo = await holiday_Service.monthOccurrences(
      Number(year),
      Number(month) - 1
    );
    const holidayDates = new Set(holidayInfo.items.map(h => h.date));

    // Build pivot
    const pivot = {};

    for (const rec of records) {
      const uname = rec.userId?.user_name || "Unknown";
      const empId = rec.userId?.empId || "Unknown";
      const d = fmtIST(rec.date);

      if (!pivot[empId]) {
        pivot[empId] = {
          empId,
          user_name: uname,
          _totals: { present: 0, totalDays: dates.length },
        };
        dates.forEach(dt => (pivot[empId][dt] = null));
      }

      if (rec.attendanceType?.toLowerCase() === "present") {
        pivot[empId][d] = "present";
        pivot[empId]._totals.present++;
      } else if (rec.attendanceType) {
        pivot[empId][d] = rec.attendanceType.toLowerCase();
      }
    }

    // ------------------------------------------------------
    // 🔥 Inject Holidays for ALL users & ALL dates
    // ------------------------------------------------------
    dates.forEach(date => {
      if (holidayDates.has(date)) {
        for (const empId in pivot) {
          pivot[empId][date] = "holiday";
        }
      }
    });

    // Format totals
    for (const id in pivot) {
      const { present, totalDays } = pivot[id]._totals;
      pivot[id]._totals = `${present}/${totalDays}`;
    }

    return { dates, users: pivot, holidays: holidayInfo.items };
  }

  async getPersistedMonthlyPivotHourly(year, month, viewerId) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const filter = { date: { $gte: start, $lte: end } };
    await this.applyVisibilityAndExclusions(filter, viewerId);

    const tz = "Asia/Kolkata";
    const fmtIST = (d) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(d));

    const allRecords = await userAttendanceReportModel
      .find(filter)
      .populate("userId", "user_name empId")
      .sort({ date: 1 });

    const records = allRecords.filter(r => r && r.userId);

    // Build date list
    const allDatesSet = new Set();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDatesSet.add(fmtIST(d));
    }
    records.forEach(r => allDatesSet.add(fmtIST(r.date)));
    const dates = Array.from(allDatesSet).sort();

    // Fetch Holidays
    const holiday_Service = new HolidayService();
    const holidayInfo = await holiday_Service.monthOccurrences(
      Number(year),
      Number(month) - 1
    );
    const holidayDates = new Set(holidayInfo.items.map(h => h.date));

    // Build pivot
    const pivot = {};

    for (const rec of records) {
      const uname = rec.userId?.user_name || "Unknown";
      const empId = rec.userId?.empId || "Unknown";
      const d = fmtIST(rec.date);

      if (!pivot[empId]) {
        pivot[empId] = {
          empId,
          user_name: uname,
          _totals: { present: 0, totalDays: dates.length },
        };
        dates.forEach(dt => (pivot[empId][dt] = null));
      }

      const typeLower = rec.attendanceType?.toLowerCase();
      if (typeLower === "present") {
        pivot[empId][d] = "present";
        pivot[empId]._totals.present++;
      } else if (rec.attendanceType) {
        pivot[empId][d] = typeLower;
        // If it's an approved leave, count it as a paid day for salary ratio
        if (rec.approved === true) {
          pivot[empId]._totals.present++;
        }
      }
    }

    // ------------------------------------------------------
    // 🔥 Inject Holidays for ALL users & ALL dates
    // ------------------------------------------------------
    dates.forEach(date => {
      if (holidayDates.has(date)) {
        for (const empId in pivot) {
          // If the day doesn't have an attendance record (or it's not present/leave), mark as holiday
          // If they were already present/on leave, we keep that status but holiday is also a paid day.
          if (!pivot[empId][date] || pivot[empId][date] === 'absent' || pivot[empId][date] === 'lop') {
            pivot[empId][date] = "holiday";
            pivot[empId]._totals.present++;
          }
        }
      }
    });

    // Format totals
    for (const id in pivot) {
      const { present, totalDays } = pivot[id]._totals;
      pivot[id]._totals = `${present}/${totalDays}`;
    }

    return { dates, users: pivot, holidays: holidayInfo.items };
  }


  async getPersistedMonthlyPivotHoliday(year, month, viewerId) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const filter = { date: { $gte: start, $lte: end } };
    await this.applyVisibilityAndExclusions(filter, viewerId);

    const tz = 'Asia/Kolkata';
    const fmtIST = (d) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(d));

    // ✅ Fetch attendance records
    const allRecords = await userAttendanceReportModel.find(filter)
      .populate('userId', 'user_name')
      .sort({ date: 1 });

    const records = allRecords.filter(r => r && r.userId);

    // ✅ Fetch holidays from holiday-service (using its list() method)
    const holidayService = new HolidayService();
    const holidaysResponse = await holidayService.list(); // matches .get('/rules', routes.list)
    const holidays = holidaysResponse?.data || holidaysResponse || [];

    // ✅ Collect all dates of the month
    const allDatesSet = new Set();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDatesSet.add(fmtIST(d));
    }

    // Add attendance & holiday dates
    for (const rec of records) allDatesSet.add(fmtIST(rec.date));
    for (const h of holidays) {
      const hDate = h.date ? fmtIST(h.date) : null;
      if (hDate) allDatesSet.add(hDate);
    }

    const dates = Array.from(allDatesSet).sort();

    // ✅ Build pivot data
    const pivot = {};

    // Fill attendance data
    for (const rec of records) {
      const uname = rec.userId?.user_name || 'Unknown';
      const d = fmtIST(rec.date);

      if (!pivot[uname]) {
        pivot[uname] = { _totals: { present: 0, totalDays: dates.length } };
        dates.forEach(dt => (pivot[uname][dt] = null));
      }

      if (rec.isHoliday) {
        pivot[uname][d] = 'holiday';
      } else if (rec.attendanceType?.toLowerCase() === 'present') {
        pivot[uname][d] = 'present';
        pivot[uname]._totals.present++;
      } else if (rec.attendanceType) {
        pivot[uname][d] = rec.attendanceType.toLowerCase();
      }
    }

    // ✅ Fill holiday-only days (even if no attendance record exists)
    for (const h of holidays) {
      const hDate = h.date ? fmtIST(h.date) : null;
      if (!hDate) continue;

      for (const uname in pivot) {
        if (!pivot[uname][hDate]) {
          pivot[uname][hDate] = 'holiday';
        }
      }
    }

    // ✅ Format totals as "present/totalDays"
    for (const uname in pivot) {
      const { present, totalDays } = pivot[uname]._totals;
      pivot[uname]._totals = `${present}/${totalDays}`;
    }

    return { dates, users: pivot, holidays };
  }



}
module.exports = UserAttendanceReportService;
