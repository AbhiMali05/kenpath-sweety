import { prisma } from '../../config/database.js';

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month, day));
}

function getReportRange(reportType, selectedDate) {
  const year = selectedDate.getUTCFullYear();
  const month = selectedDate.getUTCMonth();
  const day = selectedDate.getUTCDate();

  if (reportType === 'daily') {
    const start = utcDate(year, month, day);
    return { start, end: start, endExclusive: utcDate(year, month, day + 1) };
  }

  if (reportType === 'month-to-date') {
    const start = utcDate(year, month, 1);
    const end = utcDate(year, month, day);
    return { start, end, endExclusive: utcDate(year, month, day + 1) };
  }

  const start = utcDate(year, month - 1, 1);
  const endExclusive = utcDate(year, month, 1);
  return { start, end: utcDate(year, month, 0), endExclusive };
}

function statisticsFrom(aggregate) {
  const count = aggregate._count._all;
  const average = aggregate._avg.value;
  return {
    highest: count ? aggregate._max.value : null,
    lowest: count ? aggregate._min.value : null,
    average: count ? Math.round(average * 10) / 10 : null,
    count,
  };
}

export async function generateReport(reportType, userId, selectedDate) {
  const range = getReportRange(reportType, selectedDate);
  const where = {
    userId,
    readingDate: { gte: range.start, lt: range.endExclusive },
  };

  const queries = [
    prisma.glucoseReading.aggregate({
      where,
      _max: { value: true },
      _min: { value: true },
      _avg: { value: true },
      _count: { _all: true },
    }),
  ];

  if (reportType === 'daily') {
    queries.push(prisma.glucoseReading.findMany({
      where,
      orderBy: [{ slot: 'asc' }, { id: 'asc' }],
      select: { id: true, readingDate: true, slot: true, value: true },
    }));
  }

  const [aggregate, readings = []] = await Promise.all(queries);
  const start = dateString(range.start);
  const end = dateString(range.end);
  const count = aggregate._count._all;

  return {
    reportType,
    ...(reportType === 'daily' ? { selectedDate: dateString(selectedDate) } : {}),
    dateRange: { start, end },
    statistics: statisticsFrom(aggregate),
    ...(reportType === 'daily'
      ? { readings: readings.map((reading) => ({ ...reading, readingDate: dateString(reading.readingDate) })) }
      : {}),
    empty: count === 0,
  };
}
