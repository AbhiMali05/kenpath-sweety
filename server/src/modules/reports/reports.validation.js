import { parseReadingDate } from '../readings/readings.validation.js';

export function validateReportDate(req, res, next) {
  const date = req.query.date;
  if (typeof date !== 'string' || !date) {
    return res.status(400).json({ success: false, message: 'A report date in YYYY-MM-DD format is required.' });
  }

  const parsedDate = parseReadingDate(date);
  if (!parsedDate) {
    return res.status(400).json({ success: false, message: 'Please enter a valid date in YYYY-MM-DD format.' });
  }

  req.reportDate = { value: date, date: parsedDate };
  return next();
}
