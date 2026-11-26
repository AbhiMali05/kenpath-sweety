import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/database.js', () => ({
  prisma: { glucoseReading: { aggregate: vi.fn(), findMany: vi.fn() } },
}));

const { prisma } = await import('../src/config/database.js');
const { default: app } = await import('../src/app.js');

const secret = 'reports-test-secret-longer-than-thirty-two-characters';
const userId = 41;
const auth = (id = userId) => ({
  Authorization: `Bearer ${jwt.sign({ sub: String(id) }, secret, { expiresIn: '1h' })}`,
});
const emptyAggregate = { _max: { value: null }, _min: { value: null }, _avg: { value: null }, _count: { _all: 0 } };
const populatedAggregate = { _max: { value: 140 }, _min: { value: 95 }, _avg: { value: 118.75 }, _count: { _all: 4 } };
const utc = (date) => new Date(`${date}T00:00:00.000Z`);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = secret;
  prisma.glucoseReading.aggregate.mockResolvedValue(populatedAggregate);
  prisma.glucoseReading.findMany.mockResolvedValue([
    { id: 1, readingDate: utc('2026-10-15'), slot: 'MORNING_FASTING', value: 95 },
    { id: 2, readingDate: utc('2026-10-15'), slot: 'AFTER_BREAKFAST', value: 140 },
    { id: 3, readingDate: utc('2026-10-15'), slot: 'AFTER_LUNCH', value: 125 },
    { id: 4, readingDate: utc('2026-10-15'), slot: 'AFTER_DINNER', value: 115 },
  ]);
});

describe('reporting API', () => {
  it('returns daily statistics, readings and calendar date serialization', async () => {
    const response = await request(app).get('/api/reports/daily?date=2026-10-15').set(auth());
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      reportType: 'daily', selectedDate: '2026-10-15',
      dateRange: { start: '2026-10-15', end: '2026-10-15' },
      statistics: { highest: 140, lowest: 95, average: 118.8, count: 4 },
    });
    expect(response.body.data.readings).toHaveLength(4);
    expect(response.body.data.readings[0].readingDate).toBe('2026-10-15');
  });

  it('uses the authenticated user and deterministic slot ordering in daily queries', async () => {
    await request(app).get('/api/reports/daily?date=2026-10-15').set(auth(82));
    const range = { gte: utc('2026-10-15'), lt: utc('2026-10-16') };
    expect(prisma.glucoseReading.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 82, readingDate: range } }));
    expect(prisma.glucoseReading.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 82, readingDate: range }, orderBy: [{ slot: 'asc' }, { id: 'asc' }],
    }));
  });

  it('returns accurate month-to-date boundaries and includes the selected date', async () => {
    const response = await request(app).get('/api/reports/month-to-date?date=2026-10-15').set(auth());
    expect(response.body.data.dateRange).toEqual({ start: '2026-10-01', end: '2026-10-15' });
    expect(prisma.glucoseReading.aggregate.mock.calls[0][0].where).toEqual({
      userId, readingDate: { gte: utc('2026-10-01'), lt: utc('2026-10-16') },
    });
    expect(prisma.glucoseReading.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['2026-01-15', '2025-12-01', '2025-12-31', '2026-01-01'],
    ['2026-03-15', '2026-02-01', '2026-02-28', '2026-03-01'],
    ['2024-03-15', '2024-02-01', '2024-02-29', '2024-03-01'],
    ['2026-05-01', '2026-04-01', '2026-04-30', '2026-05-01'],
    ['2026-10-15', '2026-09-01', '2026-09-30', '2026-10-01'],
  ])('calculates previous calendar month for %s', async (selected, start, end, nextMonth) => {
    const response = await request(app).get(`/api/reports/previous-month?date=${selected}`).set(auth());
    expect(response.status).toBe(200);
    expect(response.body.data.dateRange).toEqual({ start, end });
    expect(prisma.glucoseReading.aggregate.mock.calls[0][0].where).toEqual({
      userId, readingDate: { gte: utc(start), lt: utc(nextMonth) },
    });
  });

  it('reports empty daily and monthly periods with null statistics and friendly message', async () => {
    prisma.glucoseReading.aggregate.mockResolvedValue(emptyAggregate);
    prisma.glucoseReading.findMany.mockResolvedValue([]);
    for (const endpoint of ['daily', 'month-to-date', 'previous-month']) {
      const response = await request(app).get(`/api/reports/${endpoint}?date=2026-10-15`).set(auth());
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('No glucose readings found for this period.');
      expect(response.body.data.statistics).toEqual({ highest: null, lowest: null, average: null, count: 0 });
      if (endpoint === 'daily') expect(response.body.data.readings).toEqual([]);
    }
  });

  it.each([
    ['/api/reports/daily', ''],
    ['/api/reports/month-to-date', '?date='],
  ])('rejects missing report date', async (path, query) => {
    const response = await request(app).get(`${path}${query}`).set(auth());
    expect(response.status).toBe(400);
  });

  it.each(['2026/10/15', '2026-02-30', '2025-02-29', '2024-02-30', '2026-1-01'])('rejects invalid report calendar date %s', async (date) => {
    const response = await request(app).get(`/api/reports/daily?date=${date}`).set(auth());
    expect(response.status).toBe(400);
    expect(prisma.glucoseReading.aggregate).not.toHaveBeenCalled();
  });

  it('rejects repeated query date values and does not invent a future-date restriction', async () => {
    const repeated = await request(app).get('/api/reports/daily?date=2026-10-15&date=2026-10-16').set(auth());
    expect(repeated.status).toBe(400);
    const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const allowed = await request(app).get(`/api/reports/daily?date=${future}`).set(auth());
    expect(allowed.status).toBe(200);
  });

  it('requires valid JWT authentication on all reports', async () => {
    expect((await request(app).get('/api/reports/daily?date=2026-10-15')).status).toBe(401);
    expect((await request(app).get('/api/reports/month-to-date?date=2026-10-15').set('Authorization', 'Bearer bad')).status).toBe(401);
    expect((await request(app).get('/api/reports/previous-month?date=2026-10-15').set(auth())).status).toBe(200);
  });

  it.each([
    [{ _max: { value: 130 }, _min: { value: 100 }, _avg: { value: 116.6666667 }, _count: { _all: 3 } }, 116.7],
    [{ _max: { value: 101 }, _min: { value: 100 }, _avg: { value: 100.05 }, _count: { _all: 2 } }, 100.1],
    [{ _max: { value: 105 }, _min: { value: 105 }, _avg: { value: 105 }, _count: { _all: 1 } }, 105],
  ])('returns numeric averages rounded to one decimal', async (aggregate, expected) => {
    prisma.glucoseReading.aggregate.mockResolvedValue(aggregate);
    const response = await request(app).get('/api/reports/month-to-date?date=2026-10-15').set(auth());
    expect(response.body.data.statistics.average).toBe(expected);
    expect(typeof response.body.data.statistics.average).toBe('number');
  });

  it('returns a safe generic error when Prisma query fails', async () => {
    prisma.glucoseReading.aggregate.mockRejectedValue(new Error('private SQL connection detail'));
    const response = await request(app).get('/api/reports/daily?date=2026-10-15').set(auth());
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'An unexpected server error occurred.' });
    expect(JSON.stringify(response.body)).not.toContain('private SQL');
  });
});
