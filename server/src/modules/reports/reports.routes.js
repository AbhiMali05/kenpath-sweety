import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { dailyReport, monthToDateReport, previousMonthReport } from './reports.controller.js';
import { validateReportDate } from './reports.validation.js';

const router = Router();

router.use(authenticate, validateReportDate);
router.get('/daily', dailyReport);
router.get('/month-to-date', monthToDateReport);
router.get('/previous-month', previousMonthReport);

export default router;
