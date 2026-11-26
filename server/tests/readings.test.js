import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/database.js', () => ({
  prisma: { glucoseReading: {
    count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(),
  } },
}));

const { prisma } = await import('../src/config/database.js');
const { default: app } = await import('../src/app.js');

const secret = 'readings-suite-secret-with-at-least-32-characters';
const userId = 9;
const token = (id = userId) => jwt.sign({ sub: String(id) }, secret, { expiresIn: '1h' });
const auth = (id = userId) => ({ Authorization: `Bearer ${token(id)}` });
const today = () => new Date().toISOString().slice(0, 10);
const payload = (overrides = {}) => ({ readingDate: today(), slot: 'MORNING_FASTING', value: 105, ...overrides });
const row = (overrides = {}) => ({ id: 5, userId, readingDate: new Date(`${today()}T00:00:00Z`), slot: 'MORNING_FASTING', value: 105, createdAt: new Date(), updatedAt: new Date(), ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = secret;
  prisma.glucoseReading.count.mockResolvedValue(0);
  prisma.glucoseReading.findFirst.mockResolvedValue(null);
});

describe('readings API', () => {
  it('creates a reading using JWT identity and serializes a calendar date', async () => {
    prisma.glucoseReading.create.mockImplementation(async ({ data }) => row(data));
    const response = await request(app).post('/api/readings').set(auth()).send(payload());
    expect(response.status).toBe(201);
    expect(response.body.data.reading.readingDate).toBe(today());
    expect(prisma.glucoseReading.create.mock.calls[0][0].data.userId).toBe(userId);
    expect(prisma.glucoseReading.create.mock.calls[0][0].data.userId).not.toBe(999);
  });

  it.each([
    [{ ...payload(), value: undefined }, 'Please enter a glucose value.'],
    [payload({ value: 39 }), 'Value must be between 40 and 600 mg/dl.'],
    [payload({ value: 601 }), 'Value must be between 40 and 600 mg/dl.'],
    [payload({ value: 40.5 }), 'Glucose value must be a whole number.'],
    [payload({ value: '105' }), 'Glucose value must be a whole number.'],
    [{ slot: 'MORNING_FASTING', value: 105 }, 'Reading date is required.'],
    [payload({ readingDate: '2026/11/20' }), 'Please enter a valid date in YYYY-MM-DD format.'],
    [payload({ readingDate: '2026-02-30' }), 'Please enter a valid date in YYYY-MM-DD format.'],
    [payload({ readingDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) }), 'Date cannot be in the future.'],
    [payload({ slot: 'BEDTIME' }), 'Please choose a valid reading slot.'],
  ])('rejects invalid create input', async (body, message) => {
    const response = await request(app).post('/api/readings').set(auth()).send(body);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(message);
    expect(prisma.glucoseReading.create).not.toHaveBeenCalled();
  });

  it('requires authentication and rejects invalid JWTs', async () => {
    expect((await request(app).get('/api/readings')).status).toBe(401);
    expect((await request(app).get('/api/readings').set('Authorization', 'Bearer nope')).status).toBe(401);
  });

  it('returns a readable duplicate conflict and handles concurrent unique conflicts', async () => {
    prisma.glucoseReading.findFirst.mockResolvedValueOnce({ id: 1 });
    const duplicate = await request(app).post('/api/readings').set(auth()).send(payload({ slot: 'AFTER_LUNCH' }));
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toContain('After lunch');

    prisma.glucoseReading.findFirst.mockResolvedValueOnce(null);
    prisma.glucoseReading.create.mockRejectedValue({ code: 'P2002' });
    const raced = await request(app).post('/api/readings').set(auth()).send(payload());
    expect(raced.status).toBe(409);
    expect(raced.body.success).toBe(false);
  });

  it('reports the four-per-day limit', async () => {
    prisma.glucoseReading.count.mockResolvedValue(4);
    const response = await request(app).post('/api/readings').set(auth()).send(payload({ slot: 'AFTER_DINNER' }));
    expect(response.status).toBe(409);
    expect(response.body.message).toBe('You can add only 4 readings per day.');
  });

  it('scopes same date and slot separately for each authenticated user', async () => {
    prisma.glucoseReading.create.mockImplementation(async ({ data }) => row(data));
    await request(app).post('/api/readings').set(auth()).send(payload());
    await request(app).post('/api/readings').set(auth(10)).send(payload());
    expect(prisma.glucoseReading.create.mock.calls[0][0].data.userId).toBe(userId);
    expect(prisma.glucoseReading.create.mock.calls[1][0].data.userId).toBe(10);
    expect(prisma.glucoseReading.findFirst.mock.calls[0][0].where.userId).toBe(userId);
    expect(prisma.glucoseReading.findFirst.mock.calls[1][0].where.userId).toBe(10);
  });

  it('lists only the authenticated user ordered by date then slot then id', async () => {
    prisma.glucoseReading.findMany.mockResolvedValue([row()]);
    const response = await request(app).get('/api/readings').set(auth());
    expect(response.status).toBe(200);
    expect(response.body.data.readings).toHaveLength(1);
    expect(prisma.glucoseReading.findMany).toHaveBeenCalledWith({
      where: { userId }, orderBy: [{ readingDate: 'desc' }, { slot: 'asc' }, { id: 'asc' }],
    });
  });

  it('returns an empty list when the user has no readings', async () => {
    prisma.glucoseReading.findMany.mockResolvedValue([]);
    const response = await request(app).get('/api/readings').set(auth());
    expect(response.body.data.readings).toEqual([]);
  });

  it('updates an owned record with scoped mutation and avoids same-record duplicate conflicts', async () => {
    prisma.glucoseReading.findFirst.mockResolvedValueOnce(row()).mockResolvedValueOnce(null).mockResolvedValueOnce(row({ value: 110 }));
    prisma.glucoseReading.updateMany.mockResolvedValue({ count: 1 });
    const response = await request(app).put('/api/readings/5').set(auth()).send({ value: 110 });
    expect(response.status).toBe(200);
    expect(prisma.glucoseReading.findFirst.mock.calls[1][0].where.id).toEqual({ not: 5 });
    expect(prisma.glucoseReading.updateMany.mock.calls[0][0].where).toEqual({ id: 5, userId });
  });

  it('rejects duplicate updates but returns 404 for inaccessible records', async () => {
    prisma.glucoseReading.findFirst.mockResolvedValueOnce(row()).mockResolvedValueOnce({ id: 88 });
    const conflict = await request(app).put('/api/readings/5').set(auth()).send({ slot: 'AFTER_LUNCH' });
    expect(conflict.status).toBe(409);
    prisma.glucoseReading.findFirst.mockResolvedValueOnce(null);
    const missing = await request(app).put('/api/readings/88').set(auth()).send({ value: 110 });
    expect(missing.status).toBe(404);
    expect(prisma.glucoseReading.updateMany).not.toHaveBeenCalled();
  });

  it('handles update conflicts from the unique database constraint', async () => {
    prisma.glucoseReading.findFirst.mockResolvedValueOnce(row()).mockResolvedValueOnce(null);
    prisma.glucoseReading.updateMany.mockRejectedValue({ code: 'P2002' });
    const response = await request(app).put('/api/readings/5').set(auth()).send({ slot: 'AFTER_DINNER' });
    expect(response.status).toBe(409);
  });

  it('validates ids and scopes deletion to the authenticated user', async () => {
    const invalid = await request(app).delete('/api/readings/abc').set(auth());
    expect(invalid.status).toBe(400);
    prisma.glucoseReading.deleteMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    const hidden = await request(app).delete('/api/readings/55').set(auth());
    const deleted = await request(app).delete('/api/readings/5').set(auth());
    expect(hidden.status).toBe(404);
    expect(deleted.status).toBe(200);
    expect(prisma.glucoseReading.deleteMany.mock.calls[1][0].where).toEqual({ id: 5, userId });
  });

  it('rejects out-of-range ids and preserves exact UTC calendar dates', async () => {
    const invalid = await request(app).put('/api/readings/9007199254740992').set(auth()).send({ value: 100 });
    expect(invalid.status).toBe(400);
    prisma.glucoseReading.create.mockImplementation(async ({ data }) => row(data));
    const response = await request(app).post('/api/readings').set(auth()).send(payload({ readingDate: '2026-01-01' }));
    expect(response.body.data.reading.readingDate).toBe('2026-01-01');
  });
});
