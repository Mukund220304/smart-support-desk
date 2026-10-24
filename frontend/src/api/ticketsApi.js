// api/ticketsApi.js
// -----------------
// Axios wrapper for all backend REST endpoints.
// Requests to '/api' are routed through the Vite dev server proxy to http://localhost:3001.

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * fetchTickets: Query tickets with pagination, search, and filtering
 * @param {Object} params - { search, category, priority, status, page, limit, sortBy }
 */
export async function fetchTickets(params = {}) {
  const response = await api.get('/tickets', { params });
  return response.data;
}

/**
 * fetchTicketById: Get single ticket details and its activity history timeline
 * @param {string} id - MongoDB ObjectId
 */
export async function fetchTicketById(id) {
  const response = await api.get(`/tickets/${id}`);
  return response.data;
}

/**
 * createTicket: Submit a new ticket with optional ML prediction fields
 * @param {Object} data - { title, description, category, priority, status?, mlCategory?, mlPriority?, mlConfidence? }
 */
export async function createTicket(data) {
  const response = await api.post('/tickets', data);
  return response.data;
}

/**
 * updateTicket: Patch editable fields (status, category, priority, title, description)
 * @param {string} id - MongoDB ObjectId
 * @param {Object} data - Partial ticket object
 */
export async function updateTicket(id, data) {
  const response = await api.patch(`/tickets/${id}`, data);
  return response.data;
}

/**
 * deleteTicket: Remove ticket by ID
 * @param {string} id - MongoDB ObjectId
 */
export async function deleteTicket(id) {
  await api.delete(`/tickets/${id}`);
}

/**
 * fetchDashboardStats: Live aggregation metrics directly from MongoDB
 * @param {Object} params - { from?, to? }
 */
export async function fetchDashboardStats(params = {}) {
  const response = await api.get('/dashboard/stats', { params });
  return response.data;
}

/**
 * predictTicket: Proxies title & description to Python ML microservice
 * @param {Object} payload - { title, description }
 */
export async function predictTicket(payload) {
  const response = await api.post('/predict', payload);
  return response.data;
}

export default api;
