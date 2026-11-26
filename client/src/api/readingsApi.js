import apiClient from './client.js';

export async function getReadings(signal) {
  const { data } = await apiClient.get('/readings', { signal });
  return data.data.readings;
}

export async function createReading(input) {
  const { data } = await apiClient.post('/readings', input);
  return data.data.reading;
}

export async function updateReading(id, input) {
  const { data } = await apiClient.put(`/readings/${id}`, input);
  return data.data.reading;
}

export async function deleteReading(id) {
  const { data } = await apiClient.delete(`/readings/${id}`);
  return data;
}
