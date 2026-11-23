const express = require('express');
const performance_service = require('../services/performance-service');
const handle_error = require('../utils/handle-error');
const user_service = require('../services/user-service');
const mongoose = require('mongoose');

const PerformanceController = express.Router();
console.log("✅ PerformanceController loaded");

// Middleware to check authorization
const checkAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization token is required' });
        }
        const token = authHeader.split(' ')[1];
        const service = new user_service();
        const decrypted = await service.checkValidUser(token);
        req.user = decrypted;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// POST - Add new performance feedback
PerformanceController.post('/', checkAuth, async (req, res) => {
    try {
        const service = new performance_service();
        const result = await service.addPerformance({
            ...req.body,
            employeeId: req.user.id || req.user._id
        });
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

/** ------------------ TEMPLATE ROUTES ------------------ */

// GET - All templates
PerformanceController.get('/templates', checkAuth, async (req, res) => {
    try {
        const service = new performance_service();
        const result = await service.getTemplates();
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// GET - Find best matching template for an employee
PerformanceController.get('/templates/find', checkAuth, async (req, res) => {
    try {
        const service = new performance_service();
        const result = await service.getTemplateForEmployee({
            designation: req.query.designation,
            department: req.query.department,
            role: req.query.role
        });
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// POST - Create template (Super Admin only)
PerformanceController.post('/templates', checkAuth, async (req, res) => {
    try {
        console.log("📥 POST /templates hit", req.body);
        const isSA = req.user?.isSystemAdmin || req.user?.roleName?.toUpperCase() === 'SUPER ADMIN';
        const isAdmin = req.user?.roleName?.toUpperCase() === 'ADMIN';

        if (!isSA && !isAdmin) {
            return res.status(403).json({ message: 'Only Admin and Super Admin can create templates' });
        }
        const service = new performance_service();
        const result = await service.createTemplate({
            ...req.body,
            createdBy: req.user.id || req.user._id
        });
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// PUT - Update template (Super Admin only)
PerformanceController.put('/templates/:id', checkAuth, async (req, res) => {
    try {
        console.log(`📥 PUT /templates/${req.params.id} hit`, req.body);
        const isSA = req.user?.isSystemAdmin || req.user?.roleName?.toUpperCase() === 'SUPER ADMIN';
        const isAdmin = req.user?.roleName?.toUpperCase() === 'ADMIN';

        if (!isSA && !isAdmin) {
            return res.status(403).json({ message: 'Only Admin and Super Admin can update templates' });
        }
        const service = new performance_service();
        const result = await service.updateTemplate(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// DELETE - Delete template (Super Admin only)
PerformanceController.delete('/templates/:id', checkAuth, async (req, res) => {
    try {
        const isSA = req.user?.isSystemAdmin || req.user?.roleName?.toUpperCase() === 'SUPER ADMIN';
        const isAdmin = req.user?.roleName?.toUpperCase() === 'ADMIN';
        console.log(`🗑️ DELETE Template Request - ID: ${req.params.id} - User: ${req.user?.user_name} - Role: ${req.user?.roleName} - isSA: ${isSA} - isAdmin: ${isAdmin}`);

        if (!isSA && !isAdmin) {
            console.warn(`⛔ Unauthorized delete attempt by ${req.user?.user_name} (Role: ${req.user?.roleName})`);
            return res.status(403).json({ message: 'Only Admin and Super Admin can delete templates' });
        }
        const service = new performance_service();
        const result = await service.deleteTemplate(req.params.id);
        console.log(`✅ Template deleted successfully: ${req.params.id}`);
        res.json(result);
    } catch (error) {
        console.error(`❌ Error deleting template ${req.params.id}:`, error.message);
        handle_error(error, res);
    }
});

// GET - Get employee's performance feedback (Employee view)
PerformanceController.get('/my-feedback', checkAuth, async (req, res) => {
    try {
        const service = new performance_service();
        const result = await service.getEmployeePerformance(req.user.id || req.user._id, req.query);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// GET - Get performance feedback for Admin to review
PerformanceController.get('/admin/feedback', checkAuth, async (req, res) => {
    try {
        const isSuperAdmin = req.user?.isSystemAdmin;
        const isAdmin = req.user?.roleName?.toLowerCase() === 'admin';

        if (!isAdmin && !isSuperAdmin) {
            return res.status(403).json({ message: 'Only Admin and Super Admin can view this' });
        }

        const service = new performance_service();
        const result = await service.getAdminPerformanceFeedback(req.user.id || req.user._id, req.query);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// GET - Get all performance feedback (Super Admin only)
PerformanceController.get('/', checkAuth, async (req, res) => {
    try {
        // Verify user is Super Admin
        const isSuperAdmin = req.user?.isSystemAdmin;

        if (!isSuperAdmin) {
            return res.status(403).json({ message: 'Only Super Admin can view all feedback' });
        }

        const service = new performance_service();
        const result = await service.getAllPerformanceFeedback(req.query);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// GET - Get employee list (Helper for filtering)
PerformanceController.get('/employees/list', checkAuth, async (req, res) => {
    try {
        const service = new performance_service();
        const result = await service.getEmployeesForFeedback(req.user.id || req.user._id);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// GET - Get performance stats for an employee
PerformanceController.get('/stats/:employeeId', checkAuth, async (req, res) => {
    try {
        const service = new performance_service();
        const result = await service.getEmployeePerformanceStats(req.params.employeeId);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// PUT - Update performance feedback (Admin rating or Super Admin rating)
PerformanceController.put('/:id', checkAuth, async (req, res) => {
    try {
        const isAdmin = req.user?.roleName?.toLowerCase() === 'admin';
        const isSuperAdmin = req.user?.isSystemAdmin;

        const service = new performance_service();
        const existing = await service.model.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: 'Performance record not found' });
        }

        // Super Admin restriction: cannot rate before Admin
        if (isSuperAdmin && existing.status === 'pending_admin') {
            return res.status(403).json({ message: 'Super Admin can only provide a final rating after the Admin has completed their review.' });
        }

        let updateData = {};

        if (isAdmin) {
            const { adminRating, adminComments, metrics } = req.body;
            updateData = {
                adminId: req.user.id || req.user._id,
                adminRating,
                adminComments,
                metrics,
                status: 'pending_super_admin'
            };
        } else if (isSuperAdmin) {
            const { superAdminRating, superAdminComments, adminRating, adminComments, metrics } = req.body;
            updateData = {
                superAdminId: req.user.id || req.user._id,
                superAdminRating,
                superAdminComments,
                metrics,
                status: 'completed'
            };

            if (adminRating !== undefined) updateData.adminRating = adminRating;
            if (adminComments !== undefined) updateData.adminComments = adminComments;

        } else {
            // Maybe Employee editing their own before review?
            // For now return 403 if not admin/superadmin
            return res.status(403).json({ message: 'Only Admin and Super Admin can review feedback' });
        }

        const result = await service.updatePerformance(req.params.id, updateData);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// DELETE - Delete performance feedback
PerformanceController.delete('/:id', checkAuth, async (req, res) => {
    try {
        const isSuperAdmin = req.user?.isSystemAdmin;
        const isAdmin = req.user?.roleName?.toLowerCase() === 'admin';

        if (!isAdmin && !isSuperAdmin) {
            return res.status(403).json({ message: 'Only Admin and Super Admin can delete feedback' });
        }

        const service = new performance_service();
        const result = await service.deletePerformance(req.params.id);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

module.exports = PerformanceController;
