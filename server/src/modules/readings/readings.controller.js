import { createReading, deleteReading, listReadings, ReadingConflictError, updateReading } from './readings.service.js';

function serializeReading(reading) {
  return { ...reading, readingDate: reading.readingDate.toISOString().slice(0, 10) };
}

function handleError(error, res, next) {
  if (error instanceof ReadingConflictError) {
    return res.status(409).json({ success: false, message: error.message });
  }
  if (error?.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'A reading already exists for this date and slot.' });
  }
  return next(error);
}

export async function create(req, res, next) {
  try {
    const reading = await createReading(req.auth.userId, req.readingInput);
    return res.status(201).json({ success: true, message: 'Reading created successfully.', data: { reading: serializeReading(reading) } });
  } catch (error) { return handleError(error, res, next); }
}

export async function list(req, res, next) {
  try {
    const readings = await listReadings(req.auth.userId);
    return res.status(200).json({ success: true, message: 'Readings loaded successfully.', data: { readings: readings.map(serializeReading) } });
  } catch (error) { return next(error); }
}

export async function update(req, res, next) {
  try {
    const reading = await updateReading(req.auth.userId, req.readingId, req.readingInput);
    if (!reading) return res.status(404).json({ success: false, message: 'Reading not found.' });
    return res.status(200).json({ success: true, message: 'Reading updated successfully.', data: { reading: serializeReading(reading) } });
  } catch (error) { return handleError(error, res, next); }
}

export async function remove(req, res, next) {
  try {
    const deleted = await deleteReading(req.auth.userId, req.readingId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Reading not found.' });
    return res.status(200).json({ success: true, message: 'Reading deleted successfully.' });
  } catch (error) { return next(error); }
}
