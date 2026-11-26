import { prisma } from '../../config/database.js';
import { slotLabels } from './readings.validation.js';

export class ReadingConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReadingConflictError';
  }
}

function duplicateMessage(slot) {
  return `You already have an ${slotLabels[slot]} reading for this date.`;
}

function isUniqueConflict(error) {
  return error?.code === 'P2002';
}

export async function createReading(userId, input) {
  const dailyCount = await prisma.glucoseReading.count({ where: { userId, readingDate: input.readingDate } });
  if (dailyCount >= 4) throw new ReadingConflictError('You can add only 4 readings per day.');

  const duplicate = await prisma.glucoseReading.findFirst({
    where: { userId, readingDate: input.readingDate, slot: input.slot },
    select: { id: true },
  });
  if (duplicate) throw new ReadingConflictError(duplicateMessage(input.slot));

  try {
    return await prisma.glucoseReading.create({ data: { ...input, userId } });
  } catch (error) {
    if (isUniqueConflict(error)) throw new ReadingConflictError(duplicateMessage(input.slot));
    throw error;
  }
}

export function listReadings(userId) {
  return prisma.glucoseReading.findMany({
    where: { userId },
    orderBy: [{ readingDate: 'desc' }, { slot: 'asc' }, { id: 'asc' }],
  });
}

export async function updateReading(userId, id, input) {
  const current = await prisma.glucoseReading.findFirst({
    where: { id, userId },
    select: { id: true, readingDate: true, slot: true },
  });
  if (!current) return null;

  const nextDate = input.readingDate ?? current.readingDate;
  const nextSlot = input.slot ?? current.slot;
  const duplicate = await prisma.glucoseReading.findFirst({
    where: { userId, readingDate: nextDate, slot: nextSlot, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) throw new ReadingConflictError(duplicateMessage(nextSlot));

  try {
    const result = await prisma.glucoseReading.updateMany({
      where: { id, userId },
      data: input,
    });
    if (result.count === 0) return null;
    return prisma.glucoseReading.findFirst({ where: { id, userId } });
  } catch (error) {
    if (isUniqueConflict(error)) throw new ReadingConflictError(duplicateMessage(nextSlot));
    throw error;
  }
}

export async function deleteReading(userId, id) {
  const result = await prisma.glucoseReading.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
