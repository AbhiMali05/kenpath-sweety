import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/database.js';

const database = new URL(process.env.DATABASE_URL || '');
const apiBase = new URL(process.env.SWEETY_API_BASE_URL || 'http://127.0.0.1:5000/api');
const userEmail = `stage9-${randomUUID()}@example.invalid`;
const password = 'Stage9-Disposable-Only!2026';
const createdReadingIds = [];
let createdUserId;

function verifySafeTarget() {
  if (process.env.SWEETY_INTEGRATION_TESTS !== '1') {
    throw new Error('Set SWEETY_INTEGRATION_TESTS=1 to opt in to the live database integration test.');
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(database.hostname) || database.port !== '5432' || database.pathname !== '/sweety_db') {
    throw new Error('Integration tests are restricted to localhost:5432/sweety_db.');
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(apiBase.hostname) || apiBase.port !== '5000' || apiBase.pathname !== '/api') {
    throw new Error('Integration tests are restricted to the local Sweety API on port 5000.');
  }
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const requestUrl = `${apiBase.href.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const response = await fetch(requestUrl, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}

describe('opt-in PostgreSQL HTTP integration', () => {
  it('registers, authenticates, persists, reports, mutates and safely cleans one synthetic account', async () => {
    verifySafeTarget();

    const registration = await request('/auth/register', {
      method: 'POST',
      body: { name: 'Stage 9 Disposable Integration', email: userEmail, password },
    });
    expect(registration.status).toBe(201);
    createdUserId = registration.data.data.user.id;
    expect(registration.data.data.user).not.toHaveProperty('passwordHash');

    const login = await request('/auth/login', {
      method: 'POST',
      body: { email: userEmail, password },
    });
    expect(login.status).toBe(200);
    const token = login.data.data.token;
    const readingDate = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const readings = [];

    for (const [slot, value] of [
      ['MORNING_FASTING', 90],
      ['AFTER_BREAKFAST', 110],
      ['AFTER_LUNCH', 130],
      ['AFTER_DINNER', 150],
    ]) {
      const created = await request('/readings', {
        method: 'POST', token,
        body: { readingDate, slot, value },
      });
      expect(created.status).toBe(201);
      expect(created.data.data.reading.readingDate).toBe(readingDate);
      readings.push(created.data.data.reading);
      createdReadingIds.push(created.data.data.reading.id);
    }

    const duplicate = await request('/readings', {
      method: 'POST', token,
      body: { readingDate, slot: 'MORNING_FASTING', value: 99 },
    });
    expect(duplicate.status).toBe(409);

    const list = await request('/readings', { token });
    expect(list.status).toBe(200);
    expect(list.data.data.readings.map(({ id }) => id)).toEqual(expect.arrayContaining(readings.map(({ id }) => id)));

    const daily = await request(`/reports/daily?date=${readingDate}`, { token });
    expect(daily.status).toBe(200);
    expect(daily.data.data.statistics).toEqual({ highest: 150, lowest: 90, average: 120, count: 4 });

    const update = await request(`/readings/${readings[1].id}`, {
      method: 'PUT', token, body: { value: 120 },
    });
    expect(update.status).toBe(200);
    const updatedReport = await request(`/reports/daily?date=${readingDate}`, { token });
    expect(updatedReport.data.data.statistics).toEqual({ highest: 150, lowest: 90, average: 122.5, count: 4 });

    const deletion = await request(`/readings/${readings[2].id}`, { method: 'DELETE', token });
    expect(deletion.status).toBe(200);
    const finalReport = await request(`/reports/daily?date=${readingDate}`, { token });
    expect(finalReport.data.data.statistics).toEqual({ highest: 150, lowest: 90, average: 120, count: 3 });
  });

  afterAll(async () => {
    try {
      const disposableUser = createdUserId
        ? await prisma.user.findUnique({ where: { id: createdUserId, email: userEmail }, select: { id: true } })
        : await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
      if (disposableUser) {
        await prisma.glucoseReading.deleteMany({
          where: { id: { in: createdReadingIds }, userId: disposableUser.id },
        });
        await prisma.user.deleteMany({ where: { id: disposableUser.id, email: userEmail } });
        const remains = await prisma.user.count({ where: { id: disposableUser.id, email: userEmail } });
        if (remains !== 0) throw new Error('Could not confirm disposable integration user cleanup.');
      }
    } finally {
      await prisma.$disconnect();
    }
  });
});
