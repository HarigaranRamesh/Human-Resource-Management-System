const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const subtaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    completedAt: { type: Date }
});

const timeLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    description: { type: String }
});

const historySchema = new mongoose.Schema({
    action: { type: String, required: true }, // Created, Status changed to X, Reassigned, etc.
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    date: { type: Date, default: Date.now },
    details: { type: String }
});

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ['HR', 'Development', 'Support', 'Documentation', 'Design', 'Other'], default: 'Other' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'], default: 'Pending' },
    
    startDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    estimatedHours: { type: Number, default: 0 },
    
    progress: { type: Number, min: 0, max: 100, default: 0 }, // Percentage 0-100

    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }], 
    department: { type: String }, // Optional, can map to role/department model later
    project: { type: String }, 

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    
    tags: [{ type: String }],
    attachments: [{
        name: { type: String },
        url: { type: String },
        uploadDate: { type: Date, default: Date.now }
    }],
    
    subtasks: [subtaskSchema],
    comments: [commentSchema],
    timeLogs: [timeLogSchema],
    history: [historySchema]

}, { timestamps: true });

// Middleware to automatically update progress based on subtasks
taskSchema.pre('save', function(next) {
    if (this.subtasks && this.subtasks.length > 0) {
        const completedCount = this.subtasks.filter(st => st.isCompleted).length;
        this.progress = Math.round((completedCount / this.subtasks.length) * 100);
        
        // Auto-update status based on progress (optional, but good for workflow)
        if (this.progress === 100 && this.status !== 'Completed' && this.status !== 'Review') {
            this.status = 'Review'; // Move to review instead of auto-completing
        } else if (this.progress > 0 && this.status === 'Pending') {
            this.status = 'In Progress';
        }
    }
    next();
});

module.exports = mongoose.model('Task', taskSchema);
