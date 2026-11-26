import { useEffect, useState } from 'react';
import { createReading, deleteReading, getReadings, updateReading } from '../../api/readingsApi.js';
import { getApiErrorMessage } from '../../api/client.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import { formatCalendarDate, getLocalDateString } from '../../utils/dates.js';

const slots = [
  ['MORNING_FASTING', 'Morning (fasting)'],
  ['AFTER_BREAKFAST', 'After breakfast'],
  ['AFTER_LUNCH', 'After lunch'],
  ['AFTER_DINNER', 'After dinner'],
];

export default function ReadingsPage() {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [listState, setListState] = useState({ date: selectedDate, status: 'loading', readings: [], error: '' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ slot: '', value: '', readingDate: selectedDate });
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getReadings(controller.signal)
      .then((allReadings) => {
        if (controller.signal.aborted) return;
        setListState({ date: selectedDate, status: 'loaded', readings: allReadings.filter((item) => item.readingDate === selectedDate), error: '' });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setListState({ date: selectedDate, status: 'error', readings: [], error: getApiErrorMessage(error) });
      });
    return () => controller.abort();
  }, [selectedDate, refreshKey]);

  function changeDate(event) {
    const date = event.target.value;
    setSelectedDate(date);
    setEditingId(null);
    setForm({ slot: '', value: '', readingDate: date });
    setFormError('');
    setSuccessMessage('');
  }

  function startEdit(reading) {
    setEditingId(reading.id);
    setForm({ slot: reading.slot, value: String(reading.value), readingDate: reading.readingDate });
    setFormError('');
    setSuccessMessage('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ slot: '', value: '', readingDate: selectedDate });
    setFormError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');
    if (isSaving) return;
    const parsedValue = form.value === '' ? NaN : Number(form.value);
    if (!Number.isInteger(parsedValue)) return setFormError('Enter a whole-number glucose value.');
    if (parsedValue < 40 || parsedValue > 600) return setFormError('Value must be between 40 and 600 mg/dL.');
    if (!form.slot) return setFormError('Choose a reading time slot.');
    if (editingId && !form.readingDate) return setFormError('Choose a reading date.');

    setIsSaving(true);
    try {
      const input = { value: parsedValue, slot: form.slot };
      if (editingId) {
        input.readingDate = form.readingDate;
        await updateReading(editingId, input);
        setSelectedDate(form.readingDate);
        setSuccessMessage('Reading updated successfully.');
        setEditingId(null);
        setForm({ slot: '', value: '', readingDate: form.readingDate });
      } else {
        await createReading({ readingDate: selectedDate, ...input });
        setSuccessMessage('Reading saved successfully.');
        setForm({ slot: '', value: '', readingDate: selectedDate });
      }
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(reading) {
    if (!window.confirm('Delete this glucose reading? This cannot be undone.')) return;
    setDeletingId(reading.id);
    setFormError('');
    setSuccessMessage('');
    try {
      await deleteReading(reading.id);
      setSuccessMessage('Reading deleted.');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  const readings = listState.date === selectedDate ? listState.readings : [];
  const isLoading = listState.date !== selectedDate || listState.status === 'loading';
  const listError = listState.date === selectedDate && listState.status === 'error' ? listState.error : '';
  const usedSlots = new Set(readings.map((reading) => reading.slot));
  const availableSlots = slots.filter(([value]) => value === form.slot || !usedSlots.has(value));

  return (
    <section className="page-wrap">
      <div className="page-heading readings-heading"><div><span className="eyebrow">YOUR DAILY LOG</span><h1>Readings</h1><p>Keep your glucose check-ins together, one day at a time.</p></div><label className="date-picker-label" htmlFor="reading-date">Select date<input id="reading-date" className="text-input date-input" type="date" value={selectedDate} max={getLocalDateString()} onChange={changeDate} /></label></div>
      <div className="readings-grid">
        <section className="content-panel reading-form-panel" aria-labelledby="reading-form-title">
          <div className="panel-heading"><div><span className="eyebrow">{editingId ? 'EDIT ENTRY' : 'NEW CHECK-IN'}</span><h2 id="reading-form-title">{editingId ? 'Update reading' : 'Add a reading'}</h2></div><span className="unit-pill">mg/dL</span></div>
          <form className="form-stack reading-form" onSubmit={handleSubmit} noValidate>
            {formError && <ErrorState message={formError} />}
            {successMessage && <div className="success-message" role="status">{successMessage}</div>}
            {!editingId && !isLoading && readings.length >= 4 && <div className="success-message slots-full" role="status">All four time slots have a reading for this date.</div>}
            {editingId && <><label className="field-label" htmlFor="edit-reading-date">Reading date</label><input id="edit-reading-date" className="text-input" type="date" max={getLocalDateString()} value={form.readingDate} onChange={(event) => setForm({ ...form, readingDate: event.target.value })} /></>}
            <label className="field-label" htmlFor="reading-slot">Time slot</label>
            <select id="reading-slot" className="text-input" value={form.slot} onChange={(event) => setForm({ ...form, slot: event.target.value })}>
              <option value="">Choose a time slot</option>
              {availableSlots.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="field-label" htmlFor="reading-value">Glucose value <span className="label-unit">(mg/dL)</span></label>
            <input id="reading-value" className="text-input value-input" type="number" inputMode="numeric" min="40" max="600" step="1" placeholder="For example, 105" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} />
            <span className="field-hint">Enter a whole number from 40 to 600.</span>
            <div className="form-actions"><button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Save reading'}</button>{editingId && <button className="button button-secondary" type="button" onClick={cancelEdit} disabled={isSaving}>Cancel</button>}</div>
          </form>
        </section>
        <section className="content-panel reading-list-panel" aria-labelledby="reading-list-title">
          <div className="panel-heading"><div><span className="eyebrow">{formatCalendarDate(selectedDate)}</span><h2 id="reading-list-title">Your readings</h2></div><span className="count-pill">{readings.length} / 4</span></div>
          {isLoading ? <LoadingState message="Loading readings…" /> : listError ? <ErrorState message={listError} onRetry={() => setRefreshKey((key) => key + 1)} /> : readings.length === 0 ? <EmptyState title="No readings for this day" message="Choose a time slot and add your first check-in." /> : (
            <ul className="reading-list">{readings.map((reading) => {
              const label = slots.find(([slot]) => slot === reading.slot)?.[1] || reading.slot;
              return <li className="reading-row" key={reading.id}><div className="reading-slot-icon" aria-hidden="true">◷</div><div className="reading-info"><strong>{label}</strong><span>{formatCalendarDate(reading.readingDate)}</span></div><div className="reading-result"><strong>{reading.value}</strong><span>mg/dL</span></div><div className="reading-actions"><button className="text-action" type="button" onClick={() => startEdit(reading)} aria-label={`Edit ${label} reading`}>Edit</button><button className="text-action danger-action" type="button" onClick={() => handleDelete(reading)} disabled={deletingId === reading.id} aria-label={`Delete ${label} reading`}>{deletingId === reading.id ? 'Deleting…' : 'Delete'}</button></div></li>;
            })}</ul>
          )}
          {!isLoading && readings.length > 0 && <p className="list-footnote">Readings are private to your account.</p>}
        </section>
      </div>
    </section>
  );
}
