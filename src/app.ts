import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { config } from './config';
import { swaggerSpec } from './config/swagger';

const app: Application = express();

// Disable trust proxy completely to prevent HTTPS detection
app.set('trust proxy', false);
app.disable('x-powered-by');

// Security Middleware - Minimal helmet config for HTTP
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: false,
  })
);
app.use(cors(config.cors));

// Logging Middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Force HTTP for all Swagger-related requests
app.use('/api-docs', (req: Request, res: Response, next: NextFunction) => {
  // Override any HTTPS-related headers
  req.headers['x-forwarded-proto'] = 'http';
  req.headers['x-forwarded-ssl'] = 'off';
  delete req.headers['x-forwarded-port'];
  
  // Set response headers to prevent HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=0');
  
  next();
});

// API Documentation with custom options
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  swaggerOptions: {
    url: '/api-docs/swagger.json',
  },
  customSiteTitle: 'Task Management API',
  customCss: '.swagger-ui .topbar { display: none }',
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Serve the swagger spec as JSON
app.get('/api-docs/swagger.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve alternative API documentation page
app.get('/apidocPage', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'api-docs.html'));
});

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Task Management API',
    version: '1.0.0',
    documentation: '/api-docs',
  });
});

// Import routes
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import analyticsRoutes from './routes/analytics.routes';

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);


// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
});

// Global Error Handler (will be replaced with proper middleware)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
});

export default app;
