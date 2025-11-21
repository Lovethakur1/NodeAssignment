import http from 'http';
import app from './app';
import { config } from './config';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { initializeSocket } from './services/socketService';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis (optional, will continue if fails)
    try {
      connectRedis();
    } catch (error) {
      console.warn('Redis connection failed. Caching features will be disabled.');
    }

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    initializeSocket(httpServer);

    // Start server
    const server = httpServer.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Task Management API Server                           ║
║                                                            ║
║   Environment: ${config.env.padEnd(43)} ║
║   Port:        ${config.port.toString().padEnd(43)} ║
║   API Docs:    http://localhost:${config.port}/api-docs${' '.repeat(18)}║
║   WebSocket:   ws://localhost:${config.port}${' '.repeat(24)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason: Error) => {
      console.error('Unhandled Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
