// tests/predict.test.js
// ---------------------
// Automated tests for POST /api/predict.
// Tests the Express proxy endpoint, input validation, and upstream error handling.

const request = require('supertest');
const axios = require('axios');
const app = require('../src/server');

jest.mock('axios');

describe('POST /api/predict', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with prediction from ML microservice', async () => {
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        category: 'Technical Issue',
        priority: 'High',
        confidence: 0.96,
      },
    });

    const res = await request(app)
      .post('/api/predict')
      .send({
        title: 'Database connection pool exhausted',
        description: 'FATAL: remaining connection slots are reserved for non-replication superuser connections',
      })
      .expect(200);

    expect(res.body.category).toBe('Technical Issue');
    expect(res.body.priority).toBe('High');
    expect(res.body.confidence).toBe(0.96);
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  test('returns 400 when both title and description are missing', async () => {
    const res = await request(app)
      .post('/api/predict')
      .send({})
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns 503 when ML microservice is unreachable', async () => {
    const connError = new Error('connect ECONNREFUSED 127.0.0.1:5001');
    connError.code = 'ECONNREFUSED';
    axios.post.mockRejectedValueOnce(connError);

    const res = await request(app)
      .post('/api/predict')
      .send({
        title: 'Network outage on internal gateway',
        description: 'Cannot reach any internal service across VPC subnet.',
      })
      .expect(503);

    expect(res.body.error).toContain('ML prediction service is currently unavailable');
  });
});
