import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Management API',
      version: '1.0.0',
      description:
        'A comprehensive RESTful API for task management with authentication, RBAC, and real-time features.\n\n' +
        '## Features\n' +
        '- **Authentication**: JWT-based authentication with role-based access control\n' +
        '- **Task Management**: Full CRUD operations with advanced filtering and search\n' +
        '- **Real-Time Updates**: WebSocket support via Socket.io for live notifications\n' +
        '- **Analytics**: Comprehensive task statistics and team performance metrics\n' +
        '- **Caching**: Redis-powered caching for improved performance\n\n' +
        '## WebSocket Events\n' +
        '**URL**: `ws://localhost:4000`\n' +
        '**Authentication**: JWT token via `auth.token` in handshake\n\n' +
        '**Events**:\n' +
        '- `connected` - Connection established\n' +
        '- `task:created` - New task created\n' +
        '- `task:assigned` - Task assigned to user\n' +
        '- `task:updated` - Task updated\n' +
        '- `task:completed` - Task marked complete\n' +
        '- `task:deleted` - Task deleted\n\n' +
        '## Caching\n' +
        'Responses from analytics endpoints include a `cached` boolean field indicating if data was served from Redis cache.\n' +
        '**TTLs**: Analytics (10min), Tasks (1min), Users (5min)',
      contact: {
        name: 'API Support',
        email: 'support@taskmanagement.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'http://210.79.128.186:4000',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                },
                code: {
                  type: 'string',
                },
                details: {
                  type: 'object',
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '60d5ecb8b392f045c8d67392',
            },
            username: {
              type: 'string',
              example: 'johndoe',
            },
            email: {
              type: 'string',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'user'],
              example: 'user',
            },
            team: {
              type: 'string',
              example: 'Engineering',
            },
            isEmailVerified: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Task: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '60d5ecb8b392f045c8d67393',
            },
            title: {
              type: 'string',
              example: 'Complete project documentation',
            },
            description: {
              type: 'string',
              example: 'Write comprehensive API documentation',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              example: 'high',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'completed', 'overdue'],
              example: 'todo',
            },
            createdBy: {
              type: 'string',
              example: '60d5ecb8b392f045c8d67392',
            },
            assignedTo: {
              type: 'string',
              example: '60d5ecb8b392f045c8d67394',
            },
            team: {
              type: 'string',
              example: 'Engineering',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 10,
            },
            total: {
              type: 'integer',
              example: 50,
            },
            pages: {
              type: 'integer',
              example: 5,
            },
          },
        },
        AnalyticsOverview: {
          type: 'object',
          properties: {
            totalTasks: {
              type: 'integer',
              example: 150,
            },
            completedTasks: {
              type: 'integer',
              example: 75,
            },
            completionRate: {
              type: 'number',
              format: 'float',
              example: 50.0,
            },
            tasksByStatus: {
              type: 'object',
              properties: {
                todo: { type: 'integer', example: 40 },
                'in-progress': { type: 'integer', example: 35 },
                completed: { type: 'integer', example: 75 },
                overdue: { type: 'integer', example: 0 },
              },
            },
            tasksByPriority: {
              type: 'object',
              properties: {
                low: { type: 'integer', example: 30 },
                medium: { type: 'integer', example: 70 },
                high: { type: 'integer', example: 50 },
              },
            },
            averageCompletionTime: {
              type: 'number',
              format: 'float',
              example: 5.2,
              description: 'Average days to complete a task',
            },
            cached: {
              type: 'boolean',
              example: false,
              description: 'Indicates if response was served from Redis cache',
            },
          },
        },
        TasksByStatus: {
          type: 'object',
          properties: {
            todo: {
              type: 'integer',
              example: 40,
            },
            'in-progress': {
              type: 'integer',
              example: 35,
            },
            completed: {
              type: 'integer',
              example: 75,
            },
            overdue: {
              type: 'integer',
              example: 5,
            },
          },
        },
        TeamStats: {
          type: 'object',
          properties: {
            team: {
              type: 'string',
              example: 'Engineering',
            },
            totalTasks: {
              type: 'integer',
              example: 85,
            },
            completedTasks: {
              type: 'integer',
              example: 42,
            },
            completionRate: {
              type: 'number',
              format: 'float',
              example: 49.4,
            },
            tasksByStatus: {
              $ref: '#/components/schemas/TasksByStatus',
            },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string', example: '60d5ecb8b392f045c8d67392' },
                  username: { type: 'string', example: 'johndoe' },
                  tasksAssigned: { type: 'integer', example: 15 },
                  tasksCompleted: { type: 'integer', example: 8 },
                },
              },
            },
          },
        },
        UserStats: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              example: '60d5ecb8b392f045c8d67392',
            },
            username: {
              type: 'string',
              example: 'johndoe',
            },
            totalTasksAssigned: {
              type: 'integer',
              example: 25,
            },
            completedTasks: {
              type: 'integer',
              example: 15,
            },
            completionRate: {
              type: 'number',
              format: 'float',
              example: 60.0,
            },
            tasksByStatus: {
              $ref: '#/components/schemas/TasksByStatus',
            },
            averageCompletionTime: {
              type: 'number',
              format: 'float',
              example: 4.5,
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'User Management',
        description: 'User management endpoints',
      },
      {
        name: 'Tasks',
        description: 'Task management endpoints',
      },
      {
        name: 'Analytics',
        description: 'Analytics and statistics endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
