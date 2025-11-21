import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, disconnectTestDB, clearTestDB, seedTestUsers } from '../setup/testDb';
import { generateTestToken } from '../setup/testHelpers';

describe('RBAC Integration Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let userToken: string;
  let users: any[];

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    users = await seedTestUsers();

    // Generate tokens for each user
    adminToken = generateTestToken({
      userId: users[0]._id.toString(),
      email: users[0].email,
      role: 'admin',
    });

    managerToken = generateTestToken({
      userId: users[1]._id.toString(),
      email: users[1].email,
      role: 'manager',
    });

    userToken = generateTestToken({
      userId: users[2]._id.toString(),
      email: users[2].email,
      role: 'user',
    });
  });

  describe('User Management - Admin Only', () => {
    it('should allow admin to list all users', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.users.length).toBeGreaterThan(0);
    });

    it('should deny manager from listing users', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should deny regular user from listing users', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow admin to update user role', async () => {
      const res = await request(app)
        .put(`/api/auth/users/${users[2]._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'manager' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('manager');
    });

    it('should deny non-admin from updating user roles', async () => {
      const res = await request(app)
        .put(`/api/auth/users/${users[2]._id}/role`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow admin to delete users', async () => {
      const res = await request(app)
        .delete(`/api/auth/users/${users[2]._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should deny non-admin from deleting users', async () => {
      const res = await request(app)
        .delete(`/api/auth/users/${users[2]._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Task Assignment - Manager/Admin Only', () => {
    let taskId: string;

    beforeEach(async () => {
      // Create a task as admin
      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          priority: 'medium',
        });

      taskId = taskRes.body.data.task._id;
    });

    it('should allow admin to assign tasks', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: users[2]._id.toString() })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.task.assignedTo).toBeDefined();
    });

    it('should allow manager to assign tasks', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ assignedTo: users[2]._id.toString() })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should deny regular user from assigning tasks', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ assignedTo: users[2]._id.toString() })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Task Access Control', () => {
    let userTaskId: string;
    let otherUserToken: string;

    beforeEach(async () => {
      // Create a task as regular user
      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'User Task',
          description: 'Created by user',
          priority: 'low',
        });

      userTaskId = taskRes.body.data.task._id;

      // Token for user from different team
      otherUserToken = generateTestToken({
        userId: users[3]._id.toString(),
        email: users[3].email,
        role: 'user',
      });
    });

    it('should allow user to view their own task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${userTaskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.task._id).toBe(userTaskId);
    });

    it('should allow admin to view any task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${userTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should deny user from viewing tasks from other teams', async () => {
      const res = await request(app)
        .get(`/api/tasks/${userTaskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow user to update their own task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${userTaskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.task.title).toBe('Updated Title');
    });

    it('should deny user from updating tasks they do not own', async () => {
      const res = await request(app)
        .put(`/api/tasks/${userTaskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow user to delete their own task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${userTaskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should deny user from deleting tasks they do not own', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${userTaskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Analytics - Role-based Filtering', () => {
    it('should allow admin to view team analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/team/Engineering')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow manager to view team analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/team/Engineering')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should deny regular user from viewing team analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/team/Engineering')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow user to view their own stats', async () => {
      const res = await request(app)
        .get(`/api/analytics/user/${users[2]._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should deny user from viewing other users stats', async () => {
      const res = await request(app)
        .get(`/api/analytics/user/${users[0]._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow admin to view any user stats', async () => {
      const res = await request(app)
        .get(`/api/analytics/user/${users[2]._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
