const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        // Employee Sections
        selfRating: {
            type: Number,
            min: 0,
            max: 5
        },
        selfDescription: {
            type: String,
            trim: true
        },

        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PerformanceTemplate'
        },
        metrics: [{
            kra: { type: String, required: true },
            kpi: { type: String, required: true },
            weightage: { type: Number, required: true },
            targetValue: { type: String },
            achievement: { type: String },
            rating: { type: Number, min: 1, max: 5 } // 1-5 scale as per industrial standard image
        }],
        weightedScore: {
            type: Number,
            default: 0
        },
        // Admin Section
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        },
        adminRating: {
            type: Number,
            min: 1,
            max: 5
        },
        adminComments: {
            type: String,
            trim: true
        },
        // Super Admin Section
        superAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        },
        superAdminRating: {
            type: Number,
            min: 1,
            max: 5
        },
        superAdminComments: {
            type: String,
            trim: true
        },
        weekStartDate: {
            type: Date,
            required: true
        },
        weekEndDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['pending_admin', 'pending_super_admin', 'completed'],
            default: 'pending_admin'
        }
    },
    { timestamps: true }
);

// Create an index to ensure one feedback per employee per week
performanceSchema.index({ employeeId: 1, weekStartDate: 1, weekEndDate: 1 }, { unique: true });

// --- Performance Template Schema ---
const performanceTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    role: {
        type: String,
        trim: true
    },
    metrics: [{
        kra: {
            type: String,
            required: true,
            trim: true
        },
        kpi: {
            type: String,
            required: true,
            trim: true
        },
        weightage: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        targetValue: {
            type: String,
            trim: true
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }
}, { timestamps: true });

const Performance = mongoose.model('performance', performanceSchema);
const PerformanceTemplate = mongoose.model('PerformanceTemplate', performanceTemplateSchema);

module.exports = { Performance, PerformanceTemplate };
