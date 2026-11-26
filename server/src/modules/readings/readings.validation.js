export const readingSlots = Object.freeze([
  'MORNING_FASTING',
  'AFTER_BREAKFAST',
  'AFTER_LUNCH',
  'AFTER_DINNER',
]);

export const slotLabels = Object.freeze({
  MORNING_FASTING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
});

export function parseReadingDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function dateError(value) {
  const parsed = parseReadingDate(value);
  if (!parsed) return 'Please enter a valid date in YYYY-MM-DD format.';
  const utcToday = new Date().toISOString().slice(0, 10);
  if (value > utcToday) return 'Date cannot be in the future.';
  return null;
}

function validateFields(req, res, next, { partial }) {
  const body = req.body ?? {};
  const input = {};

  if (!partial || Object.hasOwn(body, 'readingDate')) {
    if (!body.readingDate) return res.status(400).json({ success: false, message: 'Reading date is required.' });
    const error = dateError(body.readingDate);
    if (error) return res.status(400).json({ success: false, message: error });
    input.readingDate = parseReadingDate(body.readingDate);
  }

  if (!partial || Object.hasOwn(body, 'slot')) {
    if (!body.slot) return res.status(400).json({ success: false, message: 'Reading slot is required.' });
    if (!readingSlots.includes(body.slot)) return res.status(400).json({ success: false, message: 'Please choose a valid reading slot.' });
    input.slot = body.slot;
  }

  if (!partial || Object.hasOwn(body, 'value')) {
    if (body.value === undefined || body.value === null || body.value === '') {
      return res.status(400).json({ success: false, message: 'Please enter a glucose value.' });
    }
    if (typeof body.value !== 'number' || !Number.isInteger(body.value)) {
      return res.status(400).json({ success: false, message: 'Glucose value must be a whole number.' });
    }
    if (body.value < 40 || body.value > 600) {
      return res.status(400).json({ success: false, message: 'Value must be between 40 and 600 mg/dl.' });
    }
    input.value = body.value;
  }

  if (partial && Object.keys(input).length === 0) {
    return res.status(400).json({ success: false, message: 'Provide at least one reading field to update.' });
  }

  req.readingInput = input;
  next();
}

export function validateCreateReading(req, res, next) {
  return validateFields(req, res, next, { partial: false });
}

export function validateUpdateReading(req, res, next) {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Reading ID must be a positive integer.' });
  }
  req.readingId = id;
  return validateFields(req, res, next, { partial: true });
}

export function validateReadingId(req, res, next) {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Reading ID must be a positive integer.' });
  }
  req.readingId = id;
  return next();
}
