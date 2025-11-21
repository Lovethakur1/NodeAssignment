import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../src/models/User.model';
import Task from '../../src/models/Task.model';

let mongoServer: MongoMemoryServer;

/**
 * Connect to in-memory MongoDB for testing
 */
export const connectTestDB = async (): Promise<void> => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }
};

/**
 * Clear all collections in the test database
 */
export const clearTestDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

/**
 * Disconnect from test database and stop MongoDB server
 */
export const disconnectTestDB = async (): Promise<void> => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Test database disconnection failed:', error);
    throw error;
  }
};

/**
 * Seed test users
 */
export const seedTestUsers = async () => {
  const users = [
    {
      username: 'admin',
      email: 'admin@example.com',
      password: 'Admin123!',
      role: 'admin',
      team: 'Engineering',
    },
    {
      username: 'manager',
      email: 'manager@example.com',
      password: 'Manager123!',
      role: 'manager',
      team: 'Engineering',
    },
    {
      username: 'user',
      email: 'user@example.com',
      password: 'User123!',
      role: 'user',
      team: 'Engineering',
    },
    {
      username: 'user2',
      email: 'user2@example.com',
      password: 'User123!',
      role: 'user',
      team: 'Sales',
    },
  ];

  const createdUsers = await User.create(users);
  return createdUsers;
};

/**
 * Seed test tasks
 */
export const seedTestTasks = async (users: any[]) => {
  const tasks = [
    {
      title: 'Task 1',
      description: 'First test task',
      status: 'todo',
      priority: 'high',
      createdBy: users[0]._id,
      assignedTo: users[2]._id,
      team: 'Engineering',
    },
    {
      title: 'Task 2',
      description: 'Second test task',
      status: 'in-progress',
      priority: 'medium',
      createdBy: users[1]._id,
      assignedTo: users[2]._id,
      team: 'Engineering',
    },
    {
      title: 'Task 3',
      description: 'Third test task',
      status: 'completed',
      priority: 'low',
      createdBy: users[0]._id,
      assignedTo: users[3]._id,
      team: 'Sales',
    },
  ];

  const createdTasks = await Task.create(tasks);
  return createdTasks;
};
