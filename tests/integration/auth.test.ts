import request from 'supertest';
import app from '../../src/app';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../setup/testDb';
import User from '../../src/models/User.model';

describe('Authentication API', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.username).toBe(validUser.username);
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.role).toBe('user'); // Default role
      expect(res.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should return 400 for duplicate email', async () => {
      // Create first user
      await User.create(validUser);

      // Try to register with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_EXISTS');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should not allow public registration of admin role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          role: 'admin',
        })
        .expect(201);

      // Should create user but role should be 'user', not 'admin'
      expect(res.body.data.user.role).toBe('user');
    });
  });

  describe('POST /api/auth/login', () => {
    const userCredentials = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    beforeEach(async () => {
      // Create a test user
      await User.create(userCredentials);
    });

    it('should login with valid credentials (email)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(userCredentials.email);
    });

    it('should login with valid credentials (username)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: userCredentials.username,
          password: userCredentials.password,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.username).toBe(userCredentials.username);
    });

    it('should return 401 for invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: userCredentials.email,
          password: 'WrongPassword',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: userCredentials.password,
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and get token
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      authToken = res.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and get token
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      authToken = res.body.data.token;
    });

    it('should logout successfully with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Logout successful');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });
});
