// utils/mlClient.js
// ------------------
// HTTP client to communicate with the Python ML microservice.
// Forwards title and description to the Flask service on port 5001 (or ML_SERVICE_URL).

const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * predictTicket
 * Calls POST /predict on the Python Flask service.
 * Returns { category, priority, confidence }.
 */
async function predictTicket({ title, description }) {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      { title, description },
      { timeout: 5000 }
    );
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      const error = new Error('ML prediction service is currently unavailable');
      error.status = 503;
      throw error;
    }
    if (err.response && err.response.data) {
      const error = new Error(err.response.data.error || 'ML prediction failed');
      error.status = err.response.status || 400;
      throw error;
    }
    throw err;
  }
}

module.exports = {
  predictTicket,
};
