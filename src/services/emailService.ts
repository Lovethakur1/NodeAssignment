import nodemailer from 'nodemailer';
import { config } from '../config';
import { IUser, ITask } from '../types';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465, // true for 465, false for other ports
  auth: config.email.user && config.email.password ? {
    user: config.email.user,
    pass: config.email.password,
  } : undefined,
});

// Verify transporter on startup (optional, only if email is configured)
if (config.email.user && config.email.password) {
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️  Email service not available:', error.message);
    } else {
      console.log('✅ Email service is ready');
    }
  });
}

/**
 * Send task assignment notification email
 */
export const sendTaskAssignmentEmail = async (
  assignee: IUser,
  task: ITask,
  assignedBy: IUser
): Promise<void> => {
  // Skip if email not configured
  if (!config.email.user || !config.email.password) {
    console.log('📧 Email not configured, skipping notification');
    return;
  }

  try {
    const mailOptions = {
      from: config.email.from,
      to: assignee.email,
      subject: `New Task Assigned: ${task.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .task-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
            .detail-row { margin: 8px 0; }
            .label { font-weight: bold; color: #555; }
            .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .priority-high { background: #f44336; color: white; }
            .priority-medium { background: #ff9800; color: white; }
            .priority-low { background: #2196F3; color: white; }
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🎯 New Task Assignment</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${assignee.username}</strong>,</p>
              <p>You have been assigned a new task by <strong>${assignedBy.username}</strong>.</p>
              
              <div class="task-details">
                <h3 style="margin-top: 0;">${task.title}</h3>
                ${task.description ? `<p>${task.description}</p>` : ''}
                
                <div class="detail-row">
                  <span class="label">Priority:</span>
                  <span class="priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
                </div>
                
                <div class="detail-row">
                  <span class="label">Status:</span>
                  <span>${task.status}</span>
                </div>
                
                ${task.dueDate ? `
                <div class="detail-row">
                  <span class="label">Due Date:</span>
                  <span>${new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
                ` : ''}
                
                ${task.team ? `
                <div class="detail-row">
                  <span class="label">Team:</span>
                  <span>${task.team}</span>
                </div>
                ` : ''}
              </div>
              
              <p>Please log in to the Task Management System to view and manage this task.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message from Task Management System.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${assignee.username},

You have been assigned a new task by ${assignedBy.username}.

Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}
Priority: ${task.priority}
Status: ${task.status}
${task.dueDate ? `Due Date: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
${task.team ? `Team: ${task.team}` : ''}

Please log in to the Task Management System to view and manage this task.

Best regards,
Task Management System
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Assignment email sent to ${assignee.email}`);
  } catch (error) {
    console.error('❌ Failed to send assignment email:', error);
    // Don't throw error - email failure shouldn't break assignment
  }
};

/**
 * Send task reassignment notification email
 */
export const sendTaskReassignmentEmail = async (
  assignee: IUser,
  task: ITask,
  assignedBy: IUser,
  previousAssignee?: string
): Promise<void> => {
  // Skip if email not configured
  if (!config.email.user || !config.email.password) {
    console.log('📧 Email not configured, skipping notification');
    return;
  }

  try {
    const mailOptions = {
      from: config.email.from,
      to: assignee.email,
      subject: `Task Reassigned: ${task.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .task-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #ff9800; }
            .detail-row { margin: 8px 0; }
            .label { font-weight: bold; color: #555; }
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔄 Task Reassignment</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${assignee.username}</strong>,</p>
              <p>A task has been reassigned to you by <strong>${assignedBy.username}</strong>.</p>
              ${previousAssignee ? `<p><em>Previously assigned to: ${previousAssignee}</em></p>` : ''}
              
              <div class="task-details">
                <h3 style="margin-top: 0;">${task.title}</h3>
                ${task.description ? `<p>${task.description}</p>` : ''}
                <div class="detail-row">
                  <span class="label">Priority:</span> ${task.priority}
                </div>
                <div class="detail-row">
                  <span class="label">Status:</span> ${task.status}
                </div>
                ${task.dueDate ? `
                <div class="detail-row">
                  <span class="label">Due Date:</span> ${new Date(task.dueDate).toLocaleDateString()}
                </div>
                ` : ''}
              </div>
              
              <p>Please log in to the Task Management System to view and manage this task.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message from Task Management System.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Reassignment email sent to ${assignee.email}`);
  } catch (error) {
    console.error('❌ Failed to send reassignment email:', error);
  }
};

/**
 * Send task unassignment notification email
 */
export const sendTaskUnassignedEmail = async (
  user: IUser,
  task: ITask,
  unassignedBy: IUser
): Promise<void> => {
  // Skip if email not configured
  if (!config.email.user || !config.email.password) {
    console.log('📧 Email not configured, skipping notification');
    return;
  }

  try {
    const mailOptions = {
      from: config.email.from,
      to: user.email,
      subject: `Task Unassigned: ${task.title}`,
      text: `
Hi ${user.username},

The task "${task.title}" has been unassigned from you by ${unassignedBy.username}.

Best regards,
Task Management System
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Unassignment email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Failed to send unassignment email:', error);
  }
};

export default {
  sendTaskAssignmentEmail,
  sendTaskReassignmentEmail,
  sendTaskUnassignedEmail,
};
