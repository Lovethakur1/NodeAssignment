import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import User from '../models/User.model';

interface AuthenticatedSocket extends Socket {
  user?: any;
}

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow all origins (including file://)
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    console.log(`✅ WebSocket connected: ${socket.user.username} (${socket.user.role})`);

    // Join user-specific room
    socket.join(`user:${socket.user._id}`);

    // Join team room if manager/admin
    if (socket.user.team) {
      socket.join(`team:${socket.user.team}`);
    }

    // Join admin room if admin
    if (socket.user.role === 'admin') {
      socket.join('admins');
    }

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ WebSocket disconnected: ${socket.user?.username}`);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'WebSocket connection established',
      user: {
        id: socket.user._id,
        username: socket.user.username,
        role: socket.user.role,
      },
    });
  });

  console.log('🔌 Socket.io initialized');
  return io;
};

/**
 * Get Socket.io instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit event to specific user
 */
export const emitToUser = (userId: string, event: string, data: any): void => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emit event to team
 */
export const emitToTeam = (teamName: string, event: string, data: any): void => {
  if (!io) return;
  io.to(`team:${teamName}`).emit(event, data);
};

/**
 * Emit event to all admins
 */
export const emitToAdmins = (event: string, data: any): void => {
  if (!io) return;
  io.to('admins').emit(event, data);
};

/**
 * Emit event to all connected clients
 */
export const emitToAll = (event: string, data: any): void => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Notify about task creation
 */
export const notifyTaskCreated = (task: any): void => {
  if (!io) return;

  // Notify assignee if assigned to someone
  if (task.assignedTo && task.assignedTo._id) {
    emitToUser(task.assignedTo._id.toString(), 'task:created', {
      message: 'New task assigned to you',
      task,
    });
  }

  // Notify team
  if (task.team) {
    emitToTeam(task.team, 'task:created', {
      message: 'New task created',
      task,
    });
  }

  // Notify admins
  emitToAdmins('task:created', {
    message: 'New task created',
    task,
  });
};

/**
 * Notify about task assignment
 */
export const notifyTaskAssigned = (task: any, assigneeId: string): void => {
  if (!io) return;

  // Notify the assignee
  emitToUser(assigneeId, 'task:assigned', {
    message: 'Task assigned to you',
    task,
  });

  // Notify team
  if (task.team) {
    emitToTeam(task.team, 'task:assigned', {
      message: 'Task reassigned',
      task,
    });
  }
};

/**
 * Notify about task update
 */
export const notifyTaskUpdated = (task: any): void => {
  if (!io) return;

  // Notify assignee
  if (task.assignedTo && task.assignedTo._id) {
    emitToUser(task.assignedTo._id.toString(), 'task:updated', {
      message: 'Task updated',
      task,
    });
  }

  // Notify creator
  if (task.createdBy && task.createdBy._id) {
    emitToUser(task.createdBy._id.toString(), 'task:updated', {
      message: 'Task updated',
      task,
    });
  }

  // Notify team
  if (task.team) {
    emitToTeam(task.team, 'task:updated', {
      message: 'Task updated',
      task,
    });
  }
};

/**
 * Notify about task completion
 */
export const notifyTaskCompleted = (task: any): void => {
  if (!io) return;

  // Notify creator
  if (task.createdBy && task.createdBy._id) {
    emitToUser(task.createdBy._id.toString(), 'task:completed', {
      message: 'Task marked as completed',
      task,
    });
  }

  // Notify team
  if (task.team) {
    emitToTeam(task.team, 'task:completed', {
      message: 'Task completed',
      task,
    });
  }

  // Notify admins
  emitToAdmins('task:completed', {
    message: 'Task completed',
    task,
  });
};

/**
 * Notify about task deletion
 */
export const notifyTaskDeleted = (taskId: string, team?: string): void => {
  if (!io) return;

  const data = {
    message: 'Task deleted',
    taskId,
  };

  // Notify team
  if (team) {
    emitToTeam(team, 'task:deleted', data);
  }

  // Notify admins
  emitToAdmins('task:deleted', data);
};
