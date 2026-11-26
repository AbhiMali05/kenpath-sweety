import { useEffect, useState } from 'react';
import { getReport } from '../../api/reportsApi.js';
import { getApiErrorMessage } from '../../api/client.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import { formatCalendarDate, getLocalDateString } from '../../utils/dates.js';

const reportOptions = [
  ['daily', 'Daily report'],
  ['month-to-date', 'Month to date'],
  ['previous-month', 'Previous month'],
];
const slotLabels = {
  MORNING_FASTING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};

function StatisticCard({ label, value, unit }) {
  return <article className="stat-card"><span>{label}</span><strong>{value ?? '—'}</strong>{unit && <small>{unit}</small>}</article>;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [state, setState] = useState({ key: '', status: 'loading', report: null, message: '', error: '' });
  const key = `${reportType}:${selectedDate}`;

  useEffect(() => {
    const controller = new AbortController();
    getReport(reportType, selectedDate, controller.signal)
      .then((report) => {
        if (controller.signal.aborted) return;
        setState({ key, status: 'loaded', report, message: '', error: '' });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ key, status: 'error', report: null, message: '', error: getApiErrorMessage(error) });
      });
    return () => controller.abort();
  }, [key, reportType, selectedDate]);

  const current = state.key === key ? state : null;
  const isLoading = !current || current.status === 'loading';
  const report = current?.status === 'loaded' ? current.report : null;
  const error = current?.status === 'error' ? current.error : '';

  return (
    <section className="page-wrap">
      <div className="page-heading"><div><span className="eyebrow">YOUR OVERVIEW</span><h1>Reports</h1><p>Review summaries of your recorded glucose readings.</p></div><label className="date-picker-label" htmlFor="report-date">Reference date<input id="report-date" className="text-input date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label></div>
      <div className="report-tabs" role="group" aria-label="Select report period">{reportOptions.map(([value, label]) => <button key={value} type="button" className={`report-tab${reportType === value ? ' active' : ''}`} aria-pressed={reportType === value} onClick={() => setReportType(value)}>{label}</button>)}</div>
      {isLoading ? <LoadingState message="Preparing your report…" /> : error ? <ErrorState message={error} onRetry={() => setState({ key: '', status: 'loading', report: null, message: '', error: '' })} /> : report && (
        <div className="report-results" aria-live="polite">
          <div className="report-period"><div><span className="eyebrow">{report.reportType === 'daily' ? 'DAILY SUMMARY' : report.reportType === 'month-to-date' ? 'MONTH TO DATE' : 'PREVIOUS CALENDAR MONTH'}</span><h2>{report.reportType === 'daily' ? formatCalendarDate(report.selectedDate) : `${formatCalendarDate(report.dateRange.start, { month: 'short', year: 'numeric', timeZone: 'UTC' })} – ${formatCalendarDate(report.dateRange.end, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`}</h2><p>{report.dateRange.start === report.dateRange.end ? formatCalendarDate(report.dateRange.start) : `${formatCalendarDate(report.dateRange.start)} – ${formatCalendarDate(report.dateRange.end)}`}</p></div></div>
          {report.statistics.count === 0 && <div className="report-empty" role="status">No glucose readings found for this period.</div>}
          <div className="stats-grid"><StatisticCard label="Highest" value={report.statistics.highest} unit={report.statistics.highest === null ? '' : 'mg/dL'} /><StatisticCard label="Lowest" value={report.statistics.lowest} unit={report.statistics.lowest === null ? '' : 'mg/dL'} /><StatisticCard label="Average" value={report.statistics.average} unit={report.statistics.average === null ? '' : 'mg/dL'} /><StatisticCard label="Readings" value={report.statistics.count} /></div>
          {report.reportType === 'daily' && <section className="daily-detail content-panel" aria-labelledby="daily-readings-title"><div className="panel-heading"><div><span className="eyebrow">DAILY DETAIL</span><h2 id="daily-readings-title">Individual readings</h2></div><span className="count-pill">{report.readings.length}</span></div>{report.readings.length === 0 ? <EmptyState title="Nothing recorded yet" message="There are no readings for this date." /> : <ul className="reading-list report-reading-list">{report.readings.map((reading) => <li className="reading-row" key={reading.id}><div className="reading-slot-icon" aria-hidden="true">◷</div><div className="reading-info"><strong>{slotLabels[reading.slot] || reading.slot}</strong><span>{formatCalendarDate(reading.readingDate)}</span></div><div className="reading-result"><strong>{reading.value}</strong><span>mg/dL</span></div></li>)}</ul>}</section>}
        </div>
      )}
    </section>
  );
}
