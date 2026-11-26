import apiClient from './client.js';

export async function getReport(type, date, signal) {
  const params = new URLSearchParams({ date });
  const { data } = await apiClient.get(`/reports/${type}?${params.toString()}`, { signal });
  return data.data;
}
