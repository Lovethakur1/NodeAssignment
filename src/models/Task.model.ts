import mongoose, { Schema, Document, Model } from 'mongoose';
import { ITask } from '../types';

interface ITaskDocument extends Omit<ITask, '_id'>, Document {}

const TaskSchema: Schema<ITaskDocument> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title must be less than 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must be less than 2000 characters'],
    },
    dueDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in-progress', 'completed', 'overdue'],
        message: 'Status must be todo, in-progress, completed, or overdue',
      },
      default: 'todo',
    },
    createdBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: [true, 'Task creator is required'],
    },
    assignedTo: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
    },
    team: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes for efficient queries
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ status: 1, dueDate: 1 });
TaskSchema.index({ team: 1 });
TaskSchema.index({ createdAt: -1 });

// Virtual populate for user details (optional, can be used with .populate())
TaskSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true,
});

TaskSchema.virtual('assignee', {
  ref: 'User',
  localField: 'assignedTo',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to set status to overdue if past due date
TaskSchema.pre<ITaskDocument>('save', function (next) {
  if (this.dueDate && this.dueDate < new Date() && this.status !== 'completed') {
    this.status = 'overdue';
  }
  next();
});

const Task: Model<ITaskDocument> = mongoose.model<ITaskDocument>('Task', TaskSchema);

export default Task;
export { ITaskDocument };
