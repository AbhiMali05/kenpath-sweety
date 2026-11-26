import { generateReport } from './reports.service.js';

function createHandler(reportType) {
  return async (req, res, next) => {
    try {
      const report = await generateReport(reportType, req.auth.userId, req.reportDate.date);
      const message = report.empty
        ? 'No glucose readings found for this period.'
        : `${reportType === 'month-to-date' ? 'Month-to-date' : reportType[0].toUpperCase() + reportType.slice(1)} report generated successfully.`;
      const { empty, ...data } = report;
      return res.status(200).json({ success: true, message, data });
    } catch (error) {
      return next(error);
    }
  };
}

export const dailyReport = createHandler('daily');
export const monthToDateReport = createHandler('month-to-date');
export const previousMonthReport = createHandler('previous-month');
