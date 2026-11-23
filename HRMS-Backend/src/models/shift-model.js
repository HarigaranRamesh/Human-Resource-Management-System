const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    startTime: {
        type: String, // Format: "HH:mm"
        required: true
    },
    endTime: {
        type: String, // Format: "HH:mm"
        required: true
    },
    gracePeriodLate: {
        type: Number, // Minutes allowed after start time
        default: 15
    },
    gracePeriodEarly: {
        type: Number, // Minutes allowed before end time
        default: 0
    },
    maxLateOccurrences: {
        type: Number, // Number of late marks allowed per month before LOP
        default: 3
    },
    autoLopForMissingLog: {
        type: Boolean, // Whether missing login/logout should trigger LOP
        default: true
    },
    isDefault: {
        type: Boolean, // Is this the system-wide default fallback shift?
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);
