import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReadingsPage from './ReadingsPage.jsx';
import { createReading, deleteReading, getReadings, updateReading } from '../../api/readingsApi.js';
import { getLocalDateString } from '../../utils/dates.js';

vi.mock('../../api/readingsApi.js', () => ({
  createReading: vi.fn(), deleteReading: vi.fn(), getReadings: vi.fn(), updateReading: vi.fn(),
}));

const today = getLocalDateString();
const sampleReading = { id: 12, readingDate: today, slot: 'MORNING_FASTING', value: 105 };

describe('readings page', () => {
  beforeEach(() => {
    getReadings.mockResolvedValue([]);
    createReading.mockResolvedValue({});
    updateReading.mockResolvedValue({});
    deleteReading.mockResolvedValue({});
  });

  it('uses local date, displays all four slots and shows the empty state', async () => {
    render(<ReadingsPage />);
    expect(screen.getByLabelText('Select date')).toHaveValue(today);
    expect(screen.getByRole('option', { name: 'Morning (fasting)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'After breakfast' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'After lunch' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'After dinner' })).toBeInTheDocument();
    expect(await screen.findByText('No readings for this day')).toBeInTheDocument();
  });

  it('validates numeric range and whole numbers before submitting', async () => {
    const user = userEvent.setup();
    render(<ReadingsPage />);
    await screen.findByText('No readings for this day');
    await user.selectOptions(screen.getByLabelText('Time slot'), 'MORNING_FASTING');
    await user.type(screen.getByLabelText('Glucose value (mg/dL)'), '39');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Value must be between 40 and 600 mg/dL.');
    expect(createReading).not.toHaveBeenCalled();
  });

  it('creates a reading with the selected calendar date and refreshes the list', async () => {
    const user = userEvent.setup();
    getReadings.mockResolvedValueOnce([]).mockResolvedValueOnce([sampleReading]);
    render(<ReadingsPage />);
    await screen.findByText('No readings for this day');
    await user.selectOptions(screen.getByLabelText('Time slot'), 'MORNING_FASTING');
    await user.type(screen.getByLabelText('Glucose value (mg/dL)'), '105');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    await screen.findByText('Morning (fasting)');
    expect(createReading).toHaveBeenCalledWith({ readingDate: today, slot: 'MORNING_FASTING', value: 105 });
    expect(await screen.findByText('Reading saved successfully.')).toBeInTheDocument();
  });

  it('updates and deletes an existing reading with confirmation', async () => {
    const user = userEvent.setup();
    getReadings.mockResolvedValue([sampleReading]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ReadingsPage />);
    await screen.findByText('Morning (fasting)');
    await user.click(screen.getByRole('button', { name: 'Edit Morning (fasting) reading' }));
    await user.clear(screen.getByLabelText('Glucose value (mg/dL)'));
    await user.type(screen.getByLabelText('Glucose value (mg/dL)'), '110');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateReading).toHaveBeenCalledWith(12, { readingDate: today, slot: 'MORNING_FASTING', value: 110 }));
    await user.click(screen.getByRole('button', { name: 'Delete Morning (fasting) reading' }));
    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(deleteReading).toHaveBeenCalledWith(12));
  });

  it('aborts an outdated date request and does not show its response for the new date', async () => {
    const firstRequest = getReadings.mockResolvedValueOnce([]);
    render(<ReadingsPage />);
    await screen.findByText('No readings for this day');
    const previousSignal = firstRequest.mock.calls[0][0];
    fireEvent.change(screen.getByLabelText('Select date'), { target: { value: '2026-01-08' } });
    await waitFor(() => expect(previousSignal.aborted).toBe(true));
    expect(getReadings).toHaveBeenCalledTimes(2);
  });

  it('preserves displayed readings and reports a mutation failure', async () => {
    const user = userEvent.setup();
    getReadings.mockResolvedValue([sampleReading]);
    deleteReading.mockRejectedValue({ userMessage: 'The server is temporarily unavailable.' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ReadingsPage />);
    await screen.findByText('Morning (fasting)');
    await user.click(screen.getByRole('button', { name: 'Delete Morning (fasting) reading' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The server is temporarily unavailable.');
    expect(screen.getByText('Morning (fasting)')).toBeInTheDocument();
  });
});
