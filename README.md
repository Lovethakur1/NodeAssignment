# Task Management API

A comprehensive RESTful API for task management with authentication, role-based access control (RBAC), real-time notifications, and analytics features.

## 🚀 Features

### Core Features
- ✅ **User Authentication** - Registration, login, logout with JWT
- ✅ **Role-Based Access Control** - Admin, Manager, and User roles
- ✅ **Task Management** - Full CRUD operations with filtering and sorting
- ✅ **Task Assignment** - Managers can assign tasks to team members
- ✅ **Password Security** - Bcrypt hashing with strong password validation
- ✅ **Rate Limiting** - Protection against brute-force attacks
- ✅ **Email Validation** - Proper email format checking

### Advanced Features (Bonus)
- 🔄 **Real-Time Updates** - WebSocket support with Socket.io
- 📊 **Analytics** - Task completion statistics and reports
- ⚡ **Redis Caching** - Performance optimization for frequent queries
- 🔒 **Advanced Rate Limiting** - Role-based and endpoint-specific limits
- 🔍 **Search & Filtering** - Advanced task search capabilities

### Documentation
- 📚 **OpenAPI 3.0** - Complete API documentation
- 🎯 **Swagger UI** - Interactive API testing interface

## 📋 Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** >= 5.0 (local installation or MongoDB Atlas account)
- **Redis** >= 6.0 (optional, for caching features)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd task-management-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/task-management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

### 4. Start MongoDB

**Local MongoDB:**
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

**Or use MongoDB Atlas:**
Update `MONGODB_URI` in `.env` with your Atlas connection string.

### 5. Start Redis (Optional)

```bash
# Windows (using WSL or Redis Windows port)
redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot-reload enabled.

### Production Build

```bash
npm run build
npm start
```

## 📖 API Documentation

Once the server is running, access the interactive API documentation:

**Swagger UI:** `http://localhost:3000/api-docs`

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

## 📁 Project Structure

```
task-management-api/
├── src/
│   ├── config/              # Configuration files
│   │   ├── index.ts         # Environment variables
│   │   ├── database.ts      # MongoDB connection
│   │   ├── redis.ts         # Redis connection
│   │   └── swagger.ts       # OpenAPI configuration
│   ├── controllers/         # Request handlers
│   ├── models/              # Database models (Mongoose)
│   ├── middleware/          # Custom middleware
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript types
│   ├── sockets/             # WebSocket handlers
│   ├── app.ts               # Express app setup
│   └── server.ts            # Server entry point
├── tests/                   # Test files
├── .env.example             # Environment variables template
├── package.json
├── tsconfig.json            # TypeScript configuration
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile (protected)

### Tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks` - Get all tasks (with filtering)
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/assign` - Assign task to user (Manager only)

### Analytics
- `GET /api/analytics/tasks/stats` - Overall task statistics
- `GET /api/analytics/user/:userId/stats` - User-specific stats
- `GET /api/analytics/team/:teamId/stats` - Team stats (Manager/Admin)

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/role` - Update user role (Admin only)

## 🔐 Authentication

This API uses JWT (JSON Web Tokens) for authentication. To access protected endpoints:

1. Register or login to receive a JWT token
2. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 👥 User Roles

### User (Default)
- Manage their own tasks
- View their own profile
- View tasks assigned to them

### Manager
- All User permissions
- Assign tasks to team members
- View team statistics
- Manage tasks within their team

### Admin
- All Manager permissions
- Full access to all endpoints
- User management
- System-wide statistics

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/task-management |
| `JWT_SECRET` | Secret key for JWT signing | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |

## 🐛 Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

## 📝 Code Quality

### Linting

```bash
npm run lint
npm run lint:fix
```

### Formatting

```bash
npm run format
```

## 🚢 Deployment

### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-atlas-uri
heroku config:set JWT_SECRET=your-secret-key

# Deploy
git push heroku main
```

### AWS / GCP

Refer to the respective cloud provider documentation for Node.js deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙋‍♂️ Support

For support, email support@taskmanagement.com or open an issue in the repository.

## 🎯 Next Steps

Now that the project is set up, you can:

1. Install dependencies: `npm install`
2. Set up your `.env` file
3. Start MongoDB and Redis
4. Run the development server: `npm run dev`
5. Access the API documentation at `http://localhost:3000/api-docs`
6. Start implementing the authentication system (Phase 2)

---

**Built with ❤️ using Node.js, Express, MongoDB, and TypeScript**
