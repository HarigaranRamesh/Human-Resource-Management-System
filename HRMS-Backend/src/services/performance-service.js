const { Performance, PerformanceTemplate } = require('../models/performance-model');
const user_model = require('../models/user-model');
const crud_service = require('./crud-service');
const mongoose = require('mongoose');
const { getExcludedFilterUserIds } = require('./visibility.service');
const EmailService = require('./email-service');

class PerformanceService extends crud_service {
    constructor() {
        super(...arguments);
        this.model = Performance;

        this.validateAdd = async (data) => {
            if (!data.employeeId) {
                throw new Error('Employee ID is required');
            }
            if (!data.weekStartDate || !data.weekEndDate) {
                throw new Error('Week dates are required');
            }
        };

        this.validateEdit = async (data, id) => {
            // General validation can go here if needed
        };

        this.emailService = new EmailService();
    }

    // Add new performance feedback
    async addPerformance(data) {
        try {
            await this.validateAdd(data);

            // If templateId is provided, we might want to fetch it
            if (data.templateId) {
                const template = await PerformanceTemplate.findById(data.templateId);
                if (template) {
                    // Pre-fill metrics if they aren't provided
                    if (!data.metrics || data.metrics.length === 0) {
                        data.metrics = template.metrics.map(m => ({
                            kra: m.kra,
                            kpi: m.kpi,
                            weightage: m.weightage,
                            targetValue: m.targetValue
                        }));
                    }
                }
            }

            const performance = new this.model({
                ...data,
                status: 'pending_admin'
            });
            await performance.save();

            // 📧 Notify Admin that self-assessment is submitted
            try {
                const employee = await user_model.findById(data.employeeId);
                const admins = await user_model.find({ status: true }).populate('role');
                const adminEmails = admins
                    .filter(a => a.role?.role?.toUpperCase() === 'ADMIN')
                    .map(a => a.email);

                if (adminEmails.length > 0) {
                    await this.emailService.sendTemplateEmail('SELF_ASSESSMENT_SUBMITTED', adminEmails, {
                        employeeName: employee.user_name,
                        roleName: employee.designation || 'Employee',
                        companyName: process.env.COMPANY_NAME || 'HRMS'
                    });
                }
            } catch (err) {
                console.error("Email notification failed:", err.message);
            }

            return {
                success: true,
                data: performance,
                message: 'Performance evaluation created successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    /** ------------------ TEMPLATE MANAGEMENT ------------------ */

    async createTemplate(data) {
        const template = new PerformanceTemplate(data);
        await template.save();

        // 📧 Notify employees of the assigned role
        try {
            const fs = require('fs');
            const logMsg = (msg) => {
                const timestamp = new Date().toISOString();
                fs.appendFileSync('debug_email.log', `[${timestamp}] ${msg}\n`);
            };

            logMsg(`Starting email notification for role: ${data.role}`);

            // Find role by name (e.g., "INTERN") instead of ID
            const roleDoc = await mongoose.model('access').findOne({
                role: { $regex: new RegExp(`^${data.role}$`, 'i') }
            });

            if (roleDoc) {
                logMsg(`✅ Found role document: ${roleDoc.role} (ID: ${roleDoc._id})`);

                // Now find users who have this role's ObjectId
                const employees = await user_model.find({ role: roleDoc._id, status: true });
                logMsg(`👥 Found ${employees.length} active employees with this role.`);

                const emails = employees.map(e => e.email).filter(e => !!e);
                logMsg(`✉️ Sending emails to: ${emails.join(', ')}`);

                if (emails.length > 0) {
                    const result = await this.emailService.sendTemplateEmail('PERFORMANCE_ASSIGNED', emails, {
                        name: "Team Member",
                        roleName: roleDoc.role,
                        companyName: process.env.COMPANY_NAME || 'HRMS'
                    });
                    logMsg(`🚀 Email service response: ${JSON.stringify(result)}`);
                } else {
                    logMsg("⚠️ No valid email addresses found for these employees.");
                }
            } else {
                logMsg(`❌ Could not find role document for role name: ${data.role}`);
            }
        } catch (err) {
            const fs = require('fs');
            const timestamp = new Date().toISOString();
            fs.appendFileSync('debug_email.log', `[${timestamp}] 🔥 ERROR: ${err.message}\n`);
        }

        return { success: true, data: template };
    }

    async getTemplates() {
        const data = await PerformanceTemplate.find().sort({ createdAt: -1 });
        return { success: true, data };
    }

    async updateTemplate(id, data) {
        const template = await PerformanceTemplate.findByIdAndUpdate(id, data, { new: true });
        if (!template) throw new Error('Template not found');

        // 📧 Notify employees of the assigned role
        try {
            const fs = require('fs');
            const logMsg = (msg) => {
                const timestamp = new Date().toISOString();
                fs.appendFileSync('debug_email.log', `[${timestamp}] (UPDATE) ${msg}\n`);
            }; 

            logMsg(`Starting email notification for role: ${template.role}`);

            // Find role by name (e.g., "INTERN") instead of ID
            const roleDoc = await mongoose.model('access').findOne({
                role: { $regex: new RegExp(`^${template.role}$`, 'i') }
            });

            if (roleDoc) {
                logMsg(`✅ Found role document: ${roleDoc.role} (ID: ${roleDoc._id})`);

                // Now find users who have this role's ObjectId
                const employees = await user_model.find({ role: roleDoc._id, status: true });
                logMsg(`👥 Found ${employees.length} active employees with this role.`);

                const emails = employees.map(e => e.email).filter(e => !!e);
                logMsg(`✉️ Sending emails to: ${emails.join(', ')}`);

                if (emails.length > 0) {
                    const result = await this.emailService.sendTemplateEmail('PERFORMANCE_ASSIGNED', emails, {
                        name: "Team Member",
                        roleName: roleDoc.role,
                        companyName: process.env.COMPANY_NAME || 'HRMS'
                    });
                    logMsg(`🚀 Email service response: ${JSON.stringify(result)}`);
                } else {
                    logMsg("⚠️ No valid email addresses found for these employees.");
                }
            } else {
                logMsg(`❌ Could not find role document for role name: ${template.role}`);
            }
        } catch (err) {
            const fs = require('fs');
            const timestamp = new Date().toISOString();
            fs.appendFileSync('debug_email.log', `[${timestamp}] 🔥 UPDATE ERROR: ${err.message}\n`);
        }

        return { success: true, data: template };
    }

    async getTemplateForEmployee(params) {
        const { role } = params;

        // Find by Role only
        const template = await PerformanceTemplate.findOne({
            role: role,
            isActive: true
        });

        return { success: true, data: template };
    }

    async deleteTemplate(id) {
        const template = await PerformanceTemplate.findByIdAndDelete(id);
        if (!template) throw new Error('Template not found');
        return { success: true, message: 'Template deleted successfully' };
    }

    /** ------------------ CALCULATIONS ------------------ */

    calculateWeightedScore(metrics) {
        if (!metrics || metrics.length === 0) return 0;

        // Σ (Rating * Weightage / 100)
        let total = 0;
        metrics.forEach(m => {
            if (m.rating) {
                total += (m.rating * m.weightage) / 100;
            }
        });
        return parseFloat(total.toFixed(2));
    }

    // Get performance feedback for a specific employee
    async getEmployeePerformance(employeeId, query = {}) {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const skip = (page - 1) * limit;

            const filters = { employeeId: new mongoose.Types.ObjectId(employeeId) };

            // Add date range filter if provided
            if (query.startDate || query.endDate) {
                filters.weekStartDate = {};
                if (query.startDate) {
                    filters.weekStartDate.$gte = new Date(query.startDate);
                }
                if (query.endDate) {
                    filters.weekStartDate.$lte = new Date(query.endDate);
                }
            }

            const data = await this.model.find(filters)
                .populate('adminId', 'user_name position designation email')
                .populate('superAdminId', 'user_name position designation email')
                .sort({ weekStartDate: -1 })
                .skip(skip)
                .limit(limit);

            const total = await this.model.countDocuments(filters);

            return {
                success: true,
                data,
                total,
                page,
                limit,
                message: 'Performance feedback retrieved successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    // Get all performance feedback for Admin (Review Pending & History)
    async getAdminPerformanceFeedback(adminId, query = {}) {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const skip = (page - 1) * limit;

            // Admin can see all records to review or that they have reviewed
            // In a small org, maybe they see ALL records not created by them? 
            // Usually Admins review all employees.
            const filters = {};

            if (query.employeeId) {
                filters.employeeId = new mongoose.Types.ObjectId(query.employeeId);
            }

            if (query.startDate || query.endDate) {
                filters.weekStartDate = {};
                if (query.startDate) {
                    filters.weekStartDate.$gte = new Date(query.startDate);
                }
                if (query.endDate) {
                    filters.weekStartDate.$lte = new Date(query.endDate);
                }
            }

            const data = await this.model.find(filters)
                .populate('employeeId', 'user_name position designation email empId')
                .populate('adminId', 'user_name position designation email')
                .sort({ weekStartDate: -1 })
                .skip(skip)
                .limit(limit);

            const total = await this.model.countDocuments(filters);

            return {
                success: true,
                data,
                total,
                page,
                limit,
                message: 'Admin feedback retrieved successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    // Get all performance feedback (Super Admin view)
    async getAllPerformanceFeedback(query = {}) {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const skip = (page - 1) * limit;

            const filters = {};

            if (query.employeeId) {
                filters.employeeId = new mongoose.Types.ObjectId(query.employeeId);
            }

            if (query.adminId) {
                filters.adminId = new mongoose.Types.ObjectId(query.adminId);
            }

            if (query.startDate || query.endDate) {
                filters.weekStartDate = {};
                if (query.startDate) {
                    filters.weekStartDate.$gte = new Date(query.startDate);
                }
                if (query.endDate) {
                    filters.weekStartDate.$lte = new Date(query.endDate);
                }
            }

            const data = await this.model.find(filters)
                .populate('employeeId', 'user_name position designation email empId')
                .populate('adminId', 'user_name position designation email')
                .populate('superAdminId', 'user_name position designation email')
                .sort({ weekStartDate: -1 })
                .skip(skip)
                .limit(limit);

            const total = await this.model.countDocuments(filters);

            return {
                success: true,
                data,
                total,
                page,
                limit,
                message: 'All feedback retrieved successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    // Update performance feedback
    async updatePerformance(id, data) {
        try {
            await this.validateEdit(data, id);

            if (data.metrics) {
                data.weightedScore = this.calculateWeightedScore(data.metrics);

                // If rating is based on 1-5 scale, we can also derive an average 
                // for the existing adminRating/superAdminRating fields if needed.
                const ratedMetrics = data.metrics.filter(m => m.rating);
                if (ratedMetrics.length > 0) {
                    const avg = ratedMetrics.reduce((acc, m) => acc + m.rating, 0) / ratedMetrics.length;
                    // Auto-fill rating fields if not explicitly provided
                    if (data.adminRating === undefined) data.adminRating = parseFloat(avg.toFixed(1));
                    if (data.superAdminRating === undefined) data.superAdminRating = parseFloat(avg.toFixed(1));
                }
            }

            const performance = await this.model.findByIdAndUpdate(id, data, {
                new: true
            }).populate('employeeId adminId superAdminId templateId');

            if (!performance) {
                throw new Error('Performance feedback not found');
            }

            // 📧 Notify Super Admin or Employee about the update
            try {
                const employee = await user_model.findById(performance.employeeId);
                let recipientEmails = [];
                let reviewerName = 'HR System';

                if (data.status === 'pending_super_admin') {
                    // Notify Super Admin that Admin has reviewed
                    const superAdmins = await user_model.find({ status: true }).populate('role');
                    recipientEmails = superAdmins
                        .filter(sa => sa.role?.role?.toUpperCase() === 'SUPER ADMIN')
                        .map(sa => sa.email);

                    const adminUser = await user_model.findById(data.adminId);
                    reviewerName = adminUser?.user_name || 'Admin';
                } else if (data.status === 'completed') {
                    // Notify Employee that Super Admin has finalized
                    recipientEmails = [employee.email];
                    const saUser = await user_model.findById(data.superAdminId);
                    reviewerName = saUser?.user_name || 'Super Admin';
                }

                if (recipientEmails.length > 0) {
                    await this.emailService.sendTemplateEmail('PERFORMANCE_REVIEW_COMPLETED', recipientEmails, {
                        employeeName: employee.user_name,
                        reviewerName: reviewerName,
                        status: data.status.replace('_', ' ').toUpperCase(),
                        companyName: process.env.COMPANY_NAME || 'HRMS'
                    });
                }
            } catch (err) {
                console.error("Update notification email failed:", err.message);
            }

            return {
                success: true,
                data: performance,
                message: 'Performance feedback updated successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    // Delete performance feedback
    async deletePerformance(id) {
        try {
            const performance = await this.model.findByIdAndDelete(id);
            if (!performance) {
                throw new Error('Performance feedback not found');
            }
            return {
                success: true,
                message: 'Performance feedback deleted successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    // Get performance stats for an employee
    async getEmployeePerformanceStats(employeeId) {
        try {
            // Using superAdminRating as priority, then adminRating
            // We'll just calculate based on existing fields. 
            // If superAdminRating exists, use it. Else if adminRating exists, use it.
            // Aggregation might be complex, so let's fetch valid records and calc in JS for simplicity or simple aggregation

            const stats = await this.model.find({
                employeeId: new mongoose.Types.ObjectId(employeeId),
                status: 'completed' // Only count completed ones? Or maybe all rated ones? 
                // Let's assume stats are based on FINAL approved ratings (so 'completed' or having superAdminRating)
                // However, user flow implies Admin rates, then visible. Super Admin rates, then visible.
                // We'll use the 'rating' field logic:
            }).select('superAdminRating adminRating');

            let totalRating = 0;
            let count = 0;
            let max = 0;
            let min = 10;

            if (stats.length === 0) {
                min = 0;
            }

            stats.forEach(rec => {
                const r = rec.superAdminRating !== undefined ? rec.superAdminRating : rec.adminRating;
                if (r !== undefined && r !== null) {
                    totalRating += r;
                    count++;
                    if (r > max) max = r;
                    if (r < min) min = r;
                }
            });

            const avg = count > 0 ? (totalRating / count).toFixed(1) : 0;

            return {
                success: true,
                data: {
                    averageRating: avg,
                    totalFeedback: count,
                    highestRating: max,
                    lowestRating: min === 10 && count === 0 ? 0 : min
                },
                message: 'Performance stats retrieved successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    async getEmployeesForFeedback(adminId) {
        try {
            const excludedIds = await getExcludedFilterUserIds();

            // Get all active employees EXCEPT System Roles and Shortlisted Candidates
            const employees = await user_model.find({
                status: true,
                _id: { $nin: excludedIds }
            }).select('_id user_name email position designation department empId').sort({ user_name: 1 });

            return {
                success: true,
                data: employees,
                message: 'Employees list retrieved successfully'
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = PerformanceService;
