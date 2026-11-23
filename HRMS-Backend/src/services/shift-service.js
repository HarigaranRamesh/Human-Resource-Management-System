const Shift = require('../models/shift-model');

class ShiftService {
    async createShift(data) {
        if (data.isDefault) {
            await Shift.updateMany({}, { isDefault: false });
        }
        const shift = new Shift(data);
        return await shift.save();
    }

    async getAllShifts() {
        return await Shift.find({}).sort({ createdAt: -1 });
    }

    async getShiftById(id) {
        return await Shift.findById(id);
    }

    async updateShift(id, data) {
        if (data.isDefault) {
            await Shift.updateMany({ _id: { $ne: id } }, { isDefault: false });
        }
        return await Shift.findByIdAndUpdate(id, data, { new: true });
    }

    async getDefaultShift() {
        return await Shift.findOne({ isDefault: true, isActive: true }) ||
            await Shift.findOne({ isActive: true }) ||
            { startTime: "09:30", endTime: "18:30", gracePeriodLate: 15, maxLateOccurrences: 3 };
    }

    async deleteShift(id) {
        const User = require('../models/user-model');
        await User.updateMany({ shift: id }, { $unset: { shift: 1 } });
        return await Shift.findByIdAndDelete(id);
    }
}

module.exports = new ShiftService();
