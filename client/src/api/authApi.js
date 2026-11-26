import apiClient from './client.js';

export async function registerAccount(values) {
  const { data } = await apiClient.post('/auth/register', values);
  return data;
}
