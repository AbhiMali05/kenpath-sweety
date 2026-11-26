import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ReportsPage from './ReportsPage.jsx';
import { getReport } from '../../api/reportsApi.js';
import { getLocalDateString } from '../../utils/dates.js';

vi.mock('../../api/reportsApi.js', () => ({ getReport: vi.fn() }));

const today = getLocalDateString();
const dailyReport = {
  reportType: 'daily', selectedDate: today, dateRange: { start: today, end: today },
  statistics: { highest: 140, lowest: 95, average: 118.8, count: 2 },
  readings: [{ id: 1, readingDate: today, slot: 'MORNING_FASTING', value: 95 }],
};

describe('reports page', () => {
  beforeEach(() => getReport.mockResolvedValue(dailyReport));

  it('requests the daily report for the local reference date and displays backend statistics', async () => {
    render(<ReportsPage />);
    expect(await screen.findByText('Individual readings')).toBeInTheDocument();
    expect(screen.getByText('118.8')).toBeInTheDocument();
    expect(screen.getByText('Morning (fasting)')).toBeInTheDocument();
    expect(getReport).toHaveBeenCalledWith('daily', today, expect.any(AbortSignal));
  });

  it('selects month-to-date and previous-month report endpoints', async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);
    await screen.findByText('Individual readings');
    await user.click(screen.getByRole('button', { name: 'Month to date' }));
    await waitFor(() => expect(getReport).toHaveBeenLastCalledWith('month-to-date', today, expect.any(AbortSignal)));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await waitFor(() => expect(getReport).toHaveBeenLastCalledWith('previous-month', today, expect.any(AbortSignal)));
  });

  it('preserves null statistics and shows an empty report state', async () => {
    getReport.mockResolvedValue({ ...dailyReport, readings: [], statistics: { highest: null, lowest: null, average: null, count: 0 } });
    render(<ReportsPage />);
    expect(await screen.findByText('No glucose readings found for this period.')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('shows safe request errors and cancels stale requests when the date changes', async () => {
    getReport.mockRejectedValueOnce({ userMessage: 'Service unavailable.' }).mockResolvedValue(dailyReport);
    render(<ReportsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable.');
    const previousSignal = getReport.mock.calls[0][2];
    fireEvent.change(screen.getByLabelText('Reference date'), { target: { value: '2026-01-08' } });
    await screen.findByText('Individual readings');
    expect(previousSignal.aborted).toBe(true);
    expect(getReport).toHaveBeenLastCalledWith('daily', '2026-01-08', expect.any(AbortSignal));
  });
});
