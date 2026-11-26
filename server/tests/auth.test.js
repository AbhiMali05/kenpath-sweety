import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/database.js', () => ({
  prisma: { user: { create: vi.fn(), findUnique: vi.fn() } },
}));

const { prisma } = await import('../src/config/database.js');
const { default: app } = await import('../src/app.js');

const secret = 'test-secret-with-at-least-thirty-two-characters';
const password = 'AssessmentPass123!';
const baseUser = {
  id: 17,
  name: 'Demo User',
  email: 'demo@example.com',
  passwordHash: await bcrypt.hash(password, 4),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = secret;
  process.env.JWT_EXPIRES_IN = '1d';
});

describe('authentication API', () => {
  it('preserves the existing health endpoint', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('registers a user with normalized email and a bcrypt hash', async () => {
    prisma.user.create.mockImplementation(async ({ data, select }) => {
      expect(data.email).toBe('demo@example.com');
      expect(await bcrypt.compare(password, data.passwordHash)).toBe(true);
      expect(select.passwordHash).toBeUndefined();
      return { ...baseUser, name: data.name, email: data.email };
    });

    const response = await request(app).post('/api/auth/register').send({
      name: ' Demo User ', email: ' Demo@Example.com ', password,
    });
    expect(response.status).toBe(201);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it.each([
    [{ email: 'demo@example.com', password }, 'Name is required.'],
    [{ name: 'Demo', email: 'bad-email', password }, 'A valid email address is required.'],
    [{ name: 'Demo', email: 'demo@example.com', password: 'short' }, 'Password must be at least 8 characters long.'],
  ])('rejects invalid registration input', async (body, message) => {
    const response = await request(app).post('/api/auth/register').send(body);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(message);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 409 for a duplicate email', async () => {
    prisma.user.create.mockRejectedValue({ code: 'P2002', meta: { target: ['email'] } });
    const response = await request(app).post('/api/auth/register').send({ name: 'Demo', email: baseUser.email, password });
    expect(response.status).toBe(409);
  });

  it('logs in and returns a signed token and safe profile', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    const response = await request(app).post('/api/auth/login').send({ email: ' DEMO@example.com ', password });
    expect(response.status).toBe(200);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(jwt.verify(response.body.data.token, secret).sub).toBe(String(baseUser.id));
  });

  it.each([
    ['wrong-password', baseUser],
    [password, null],
  ])('uses the same response for bad password and unknown user', async (submittedPassword, user) => {
    prisma.user.findUnique.mockResolvedValue(user);
    const response = await request(app).post('/api/auth/login').send({ email: 'demo@example.com', password: submittedPassword });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password.');
  });

  it('rejects missing, malformed, invalid, and expired bearer tokens', async () => {
    const missing = await request(app).get('/api/auth/me');
    const malformed = await request(app).get('/api/auth/me').set('Authorization', 'Basic abc');
    const invalid = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid');
    const expiredToken = jwt.sign({ sub: String(baseUser.id), exp: Math.floor(Date.now() / 1000) - 10 }, secret);
    const expired = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`);
    for (const response of [missing, malformed, invalid, expired]) expect(response.status).toBe(401);
  });

  it('returns the authenticated profile without passwordHash', async () => {
    const { passwordHash, ...safeProfile } = baseUser;
    prisma.user.findUnique.mockResolvedValue(safeProfile);
    const token = jwt.sign({ sub: String(baseUser.id) }, secret, { expiresIn: '1d' });
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(baseUser.id);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: baseUser.id } }));
  });
});
