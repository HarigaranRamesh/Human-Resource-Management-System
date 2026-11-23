const mongoose = require('mongoose');
const Task = require('../models/task-model');

class TaskService {

    async createTask(data, userId) {
        data.createdBy = userId;
        
        const task = new Task(data);
        
        // Add initial history
        task.history.push({
            action: 'Task Created',
            performedBy: userId,
            details: `Task created with status ${task.status}`
        });

        return await task.save();
    }

    async getTasks(filters, page = 1, limit = 10) {
        const query = {};

        // Build query based on filters
        if (filters.status) query.status = filters.status;
        if (filters.priority) query.priority = filters.priority;
        if (filters.type) query.type = filters.type;
        if (filters.department) query.department = filters.department;
        if (filters.search) {
            query.title = { $regex: filters.search, $options: 'i' };
        }
        
        // If employee, only show their tasks or tasks they created
        if (filters.userId && !filters.isSuperAdmin) {
             const userObjectId = new mongoose.Types.ObjectId(filters.userId);
             query.$or = [
                 { assignedTo: userObjectId },
                 { createdBy: userObjectId }
             ];
        }

        const skip = (page - 1) * limit;

        const [tasks, total] = await Promise.all([
            Task.find(query)
                .populate('assignedTo', 'user_name empId email')
                .populate('createdBy', 'user_name empId')
                .sort({ dueDate: 1, priority: -1 })
                .skip(skip)
                .limit(limit),
            Task.countDocuments(query)
        ]);

        return { tasks, total, page, limit };
    }

    async getTaskById(taskId) {
        const task = await Task.findById(taskId)
            .populate('assignedTo', 'user_name empId email')
            .populate('createdBy', 'user_name empId')
            .populate('comments.userId', 'user_name')
            .populate('subtasks.completedBy', 'user_name')
            .populate('timeLogs.userId', 'user_name')
            .populate('history.performedBy', 'user_name');
        
        if (!task) throw new Error("Task not found");
        return task;
    }

    async updateTask(taskId, updates, userId) {
        const task = await Task.findById(taskId);
        if (!task) throw new Error("Task not found");

        let actionDetails = [];

        // Track changes for history
        if (updates.status && updates.status !== task.status) {
            actionDetails.push(`Status changed from ${task.status} to ${updates.status}`);
        }
        if (updates.priority && updates.priority !== task.priority) {
            actionDetails.push(`Priority changed to ${updates.priority}`);
        }
        if (updates.progress !== undefined && updates.progress !== task.progress) {
             actionDetails.push(`Progress updated to ${updates.progress}%`);
        }

        // Apply updates
        Object.assign(task, updates);

        if (actionDetails.length > 0) {
            task.history.push({
                action: 'Task Updated',
                performedBy: userId,
                details: actionDetails.join(', ')
            });
        }

        return await task.save();
    }

    async deleteTask(taskId) {
        return await Task.findByIdAndDelete(taskId);
    }

    // --- Subtasks ---
    async addSubtask(taskId, subtaskData, userId) {
        const task = await Task.findById(taskId);
        if(!task) throw new Error("Task not found");

        task.subtasks.push(subtaskData);
        task.history.push({
            action: 'Subtask Added',
            performedBy: userId,
            details: `Added subtask: ${subtaskData.title}`
        });

        return await task.save();
    }

    async toggleSubtask(taskId, subtaskId, isCompleted, userId) {
        const task = await Task.findById(taskId);
        if(!task) throw new Error("Task not found");

        const subtask = task.subtasks.id(subtaskId);
        if(!subtask) throw new Error("Subtask not found");

        subtask.isCompleted = isCompleted;
        subtask.completedBy = isCompleted ? userId : null;
        subtask.completedAt = isCompleted ? new Date() : null;

        task.history.push({
            action: 'Subtask Updated',
            performedBy: userId,
            details: `Subtask '${subtask.title}' marked as ${isCompleted ? 'Complete' : 'Pending'}`
        });

        return await task.save();
    }

    // --- Comments ---
    async addComment(taskId, content, userId) {
        const task = await Task.findById(taskId);
        if(!task) throw new Error("Task not found");

        task.comments.push({ userId, content });
        return await task.save();
    }

    async addAttachment(taskId, attachment, userId) {
        const task = await Task.findById(taskId);
        if(!task) throw new Error("Task not found");

        task.attachments.push(attachment);
        task.history.push({
            action: 'Attachment Added',
            performedBy: userId,
            details: `Added attachment: ${attachment.name}`
        });

        return await task.save();
    }

    // --- Time Tracking ---
    async startTimeTracking(taskId, userId) {
        const task = await Task.findById(taskId);
        if (!task) throw new Error("Task not found");

        // Ensure no active timer for this user on this task
        const activeLog = task.timeLogs.find(log => log.userId.toString() === userId && !log.endTime);
        if (activeLog) return task; // Already tracking

        task.timeLogs.push({
            userId,
            startTime: new Date()
        });

        task.history.push({
            action: 'Time Tracking Started',
            performedBy: userId,
            details: `User started the timer`
        });

        return await task.save();
    }

    async stopTimeTracking(taskId, userId, description) {
        const task = await Task.findById(taskId);
        if (!task) throw new Error("Task not found");

        const activeLog = task.timeLogs.find(log => log.userId.toString() === userId && !log.endTime);
        if (!activeLog) throw new Error("No active timer found");

        activeLog.endTime = new Date();
        activeLog.description = description || "";
        
        const diffMs = activeLog.endTime - activeLog.startTime;
        activeLog.durationMinutes = Math.round(diffMs / 60000);

        task.history.push({
            action: 'Time Tracking Stopped',
            performedBy: userId,
            details: `Worked for ${activeLog.durationMinutes} minutes: ${description || 'No description'}`
        });

        return await task.save();
    }

    // --- Analytics ---
    async getAnalytics(filters) {
       const matchStage = {};
       if(filters.userId && !filters.isSuperAdmin) {
           const userObjectId = new mongoose.Types.ObjectId(filters.userId);
           matchStage.$or = [
               { assignedTo: userObjectId },
               { createdBy: userObjectId }
           ];
       }

       const now = new Date();

       const stats = await Task.aggregate([
           { $match: matchStage },
           {
               $facet: {
                   statusCounts: [
                       { $group: { _id: "$status", count: { $sum: 1 } } }
                   ],
                   overdueCount: [
                       { $match: { status: { $ne: 'Completed' }, dueDate: { $lt: now } } },
                       { $count: "count" }
                   ],
                   departmentWorkload: [
                       { $group: { _id: "$type", count: { $sum: 1 } } }
                   ]
               }
           }
       ]);

       const result = stats[0];
       const formatOutput = {
           total: 0,
           Pending: 0,
           'In Progress': 0,
           Review: 0,
           Completed: 0,
           'On Hold': 0,
           Cancelled: 0,
           overdue: result.overdueCount[0]?.count || 0,
           departmentWorkload: result.departmentWorkload.map(d => ({ label: d._id, value: d.count })),
           completionRate: 0
       };

       result.statusCounts.forEach(s => {
           formatOutput[s._id] = s.count;
           formatOutput.total += s.count;
       });

       if (formatOutput.total > 0) {
           formatOutput.completionRate = Math.round((formatOutput.Completed / formatOutput.total) * 100);
       }

       return formatOutput;
    }
}

module.exports = TaskService;
