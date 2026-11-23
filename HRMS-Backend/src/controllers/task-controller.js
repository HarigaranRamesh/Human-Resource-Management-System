const express = require('express');
const TaskService = require('../services/task-service');
const handle_error = require('../utils/handle-error');
const user_service = require('../services/user-service');

const TaskController = express.Router();

// Middleware to authenticate
const checkAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'Authorization required' });

        const token = authHeader.split(' ')[1];
        const service = new user_service();
        const decoded = await service.checkValidUser(token);
        
        req.user = decoded;
        req.user.isSuperAdmin = req.user.isSystemAdmin || req.user.roleName === 'SUPER ADMIN';
        
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// Ensure authentication
TaskController.use(checkAuth);

// Create Task
TaskController.post('/', async (req, res) => {
    try {
        const service = new TaskService();
        const result = await service.createTask(req.body, req.user.id);
        res.status(201).json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// Get Analytics
TaskController.get('/analytics', async (req, res) => {
    try {
        const service = new TaskService();
        const filters = {
            userId: req.user.id,
            isSuperAdmin: req.user.isSuperAdmin
        };
        const stats = await service.getAnalytics(filters);
        res.json(stats);
    } catch (error) {
        handle_error(error, res);
    }
});

// Get Task List
TaskController.get('/', async (req, res) => {
    try {
        const service = new TaskService();
        const { page, limit, status, priority, type, department, search } = req.query;
        
        const filters = {
             status, priority, type, department, search,
             userId: req.user.id,
             isSuperAdmin: req.user.isSuperAdmin
        };
        
        const result = await service.getTasks(filters, parseInt(page) || 1, parseInt(limit) || 10);
        res.json(result);
    } catch (error) {
        handle_error(error, res);
    }
});

// Get Task By Id
TaskController.get('/:id', async (req, res) => {
    try {
        const service = new TaskService();
        const result = await service.getTaskById(req.params.id);
        res.json(result);
    } catch (error) {
         handle_error(error, res);
    }
});

// Update Task
TaskController.put('/:id', async (req, res) => {
     try {
        const service = new TaskService();
        const result = await service.updateTask(req.params.id, req.body, req.user.id);
        res.json(result);
     } catch (error) {
          handle_error(error, res);
     }
});

// Delete Task (Super Admin Only typically, but handled in controller logic if needed)
TaskController.delete('/:id', async (req, res) => {
     try {
          if (!req.user.isSuperAdmin) {
              return res.status(403).json({ message: "Only administrators can delete tasks." });
          }
          const service = new TaskService();
          await service.deleteTask(req.params.id);
          res.json({ message: "Task deleted successfully" });
     } catch(error) {
          handle_error(error, res);
     }
});

// --- Subtasks ---
TaskController.post('/:id/subtasks', async(req, res) => {
     try {
         const service = new TaskService();
         const result = await service.addSubtask(req.params.id, req.body, req.user.id);
         res.json(result);
     } catch (error) {
         handle_error(error, res);
     }
});

TaskController.put('/:id/subtasks/:subtaskId', async(req, res) => {
     try {
         const service = new TaskService();
         const result = await service.toggleSubtask(req.params.id, req.params.subtaskId, req.body.isCompleted, req.user.id);
         res.json(result);
     } catch(error) {
         handle_error(error, res);
     }
});

// --- Comments ---
TaskController.post('/:id/comments', async(req, res) => {
    try {
        const service = new TaskService();
        const result = await service.addComment(req.params.id, req.body.content, req.user.id);
        res.json(result);
    } catch(error) {
        handle_error(error, res);
    }
});

TaskController.post('/:id/attachments', async(req, res) => {
    try {
        const service = new TaskService();
        const result = await service.addAttachment(req.params.id, req.body, req.user.id);
        res.json(result);
    } catch(error) {
        handle_error(error, res);
    }
});

// --- Time Tracking ---
TaskController.post('/:id/timer/start', async(req, res) => {
    try {
        const service = new TaskService();
        const result = await service.startTimeTracking(req.params.id, req.user.id);
        res.json(result);
    } catch(error) {
        handle_error(error, res);
    }
});

TaskController.post('/:id/timer/stop', async(req, res) => {
    try {
        const service = new TaskService();
        const result = await service.stopTimeTracking(req.params.id, req.user.id, req.body.description);
        res.json(result);
    } catch(error) {
        handle_error(error, res);
    }
});

module.exports = TaskController;
