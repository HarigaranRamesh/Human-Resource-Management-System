
const attendance_model = require("../models/attendance-model");
const crud_service = require("./crud-service");
class AttendanceService extends crud_service {
    constructor() {
        super(...arguments);
        this.model = attendance_model;
        this.validateAdd = async (data) => {
        };
        this.validateEdit = async (data, id) => {
        };
        this.validateDelete = async (data) => {
        };
    }

    async markAsPresent(attendanceId, changedBy, remarks = "") {
        const attendance = await this.model.findById(attendanceId);
        if (!attendance) throw new Error("Attendance record not found");

        attendance.attendanceType = "Present";
        attendance.lateMark = false;
        attendance.earlyOut = false;
        attendance.lateMinutes = 0;
        attendance.approved = true;
        attendance.remarks = remarks || "Manager override to Present";
        // changedBy is not on the base attendance model, but we can save it in remarks or similar if needed.
        // For now, let's just update the fields.

        await attendance.save();

        // Sync with Snapshot if exists
        try {
            const userAttendanceReportModel = require("../models/user-attendance-report-model");
            const start = new Date(attendance.date); start.setHours(0, 0, 0, 0);
            const end = new Date(attendance.date); end.setHours(23, 59, 59, 999);
            const report = await userAttendanceReportModel.findOne({
                userId: attendance.userId,
                date: { $gte: start, $lte: end }
            });
            if (report) {
                report.attendanceType = "Present";
                report.resonforLOP = "";
                report.approved = true;
                report.changedBy = changedBy;
                report.changedRemarks = remarks || "Manager override to Present (via Attendance)";
                await report.save();
            }
        } catch (e) {
            console.error("Sync to snapshot failed in AttendanceService", e);
        }

        return await attendance.populate([
            { path: "userId", select: "empId user_name email roleId" }
        ]);
    }
}
module.exports = AttendanceService;
