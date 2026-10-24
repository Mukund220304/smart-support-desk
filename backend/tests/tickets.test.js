// tests/tickets.test.js
// ---------------------
// Automated tests for all 5 Ticket CRUD REST API endpoints.
// Verifies HTTP status codes, request validation, response payloads,
// and append-only TicketActivity logging for mutations.

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const { Ticket } = require('../src/models/Ticket');
const { TicketActivity } = require('../src/models/TicketActivity');
const { connectTestDB, clearTestDB, closeTestDB } = require('./dbHelper');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

// ── 1. POST /api/tickets ───────────────────────────────────────────────────────
describe('POST /api/tickets', () => {
  test('creates a new ticket with valid data and records creation activity', async () => {
    const payload = {
      title: 'Database connection timeout',
      description: 'The backend service fails to connect to database during peak hours.',
      category: 'Technical Issue',
      priority: 'High',
      mlCategory: 'Technical Issue',
      mlPriority: 'High',
      mlConfidence: 0.94,
    };

    const res = await request(app)
      .post('/api/tickets')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(res.body._id).toBeDefined();
    expect(res.body.title).toBe(payload.title);
    expect(res.body.status).toBe('Open'); // default
    expect(res.body.mlCategory).toBe('Technical Issue');
    expect(res.body.mlConfidence).toBe(0.94);

    // Verify activity logged in DB
    const activities = await TicketActivity.find({ ticketId: res.body._id });
    expect(activities).toHaveLength(1);
    expect(activities[0].action).toBe('created');
    expect(activities[0].summary).toContain('Open');
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ title: 'Just a title' })
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  test('returns 400 when fields have invalid enum values', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({
        title: 'Valid title text',
        description: 'Valid description that has enough characters.',
        category: 'NonExistentCategory',
        priority: 'Extreme',
      })
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
  });
});

// ── 2. GET /api/tickets (Listing, filtering, search, pagination) ───────────────
describe('GET /api/tickets', () => {
  beforeEach(async () => {
    await Ticket.create([
      {
        title: 'Billing discrepancy for invoice 104',
        description: 'Customer was billed twice for annual subscription fee.',
        category: 'Billing',
        priority: 'High',
        status: 'Open',
      },
      {
        title: 'Cannot reset password via email',
        description: 'Password reset link expires immediately or fails to send.',
        category: 'Account Access',
        priority: 'Medium',
        status: 'In Progress',
      },
      {
        title: 'General question regarding pricing tier',
        description: 'Customer wants to know differences between pro and enterprise.',
        category: 'General Inquiry',
        priority: 'Low',
        status: 'Resolved',
      },
    ]);
  });

  test('lists all tickets with pagination metadata', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .expect(200);

    expect(res.body.tickets).toHaveLength(3);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  test('filters tickets by category and status', async () => {
    const res = await request(app)
      .get('/api/tickets?category=Billing&status=Open')
      .expect(200);

    expect(res.body.tickets).toHaveLength(1);
    expect(res.body.tickets[0].category).toBe('Billing');
    expect(res.body.tickets[0].status).toBe('Open');
  });

  test('searches tickets by keyword in title or description', async () => {
    const res = await request(app)
      .get('/api/tickets?search=password')
      .expect(200);

    expect(res.body.tickets).toHaveLength(1);
    expect(res.body.tickets[0].title).toContain('password');
  });

  test('supports pagination parameters (limit and page)', async () => {
    const res = await request(app)
      .get('/api/tickets?limit=2&page=1')
      .expect(200);

    expect(res.body.tickets).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.totalPages).toBe(2);
  });
});

// ── 3. GET /api/tickets/:id ───────────────────────────────────────────────────
describe('GET /api/tickets/:id', () => {
  test('returns ticket and its activity history', async () => {
    const ticket = await Ticket.create({
      title: 'VPN connection dropping frequently',
      description: 'The internal VPN drops connection every 10-15 minutes.',
      category: 'Technical Issue',
      priority: 'High',
    });

    await TicketActivity.create({
      ticketId: ticket._id,
      action: 'created',
      summary: 'Ticket created',
    });

    const res = await request(app)
      .get(`/api/tickets/${ticket._id}`)
      .expect(200);

    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket._id).toBe(ticket._id.toString());
    expect(Array.isArray(res.body.activities)).toBe(true);
    expect(res.body.activities).toHaveLength(1);
    expect(res.body.activities[0].action).toBe('created');
  });

  test('returns 404 if ticket is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/tickets/${fakeId}`)
      .expect(404);

    expect(res.body.error).toBe('Ticket not found');
  });

  test('returns 400 for an invalid MongoDB ObjectId format', async () => {
    const res = await request(app)
      .get('/api/tickets/invalid-id-format')
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
  });
});

// ── 4. PATCH /api/tickets/:id ─────────────────────────────────────────────────
describe('PATCH /api/tickets/:id', () => {
  test('updates fields and records "updated" activity log', async () => {
    const ticket = await Ticket.create({
      title: 'Printer not discovered on office network',
      description: 'Office network scanner does not detect HP wireless printer.',
      category: 'Technical Issue',
      priority: 'Low',
    });

    const res = await request(app)
      .patch(`/api/tickets/${ticket._id}`)
      .send({ priority: 'Medium', title: 'Printer still not discovered' })
      .expect(200);

    expect(res.body.priority).toBe('Medium');
    expect(res.body.title).toBe('Printer still not discovered');

    // Verify activity record created with changes diff
    const activities = await TicketActivity.find({ ticketId: ticket._id });
    expect(activities.length).toBeGreaterThanOrEqual(1);
    const updateActivity = activities.find((a) => a.action === 'updated');
    expect(updateActivity).toBeDefined();
    expect(updateActivity.changes.priority.from).toBe('Low');
    expect(updateActivity.changes.priority.to).toBe('Medium');
  });

  test('records "status_changed" action when status is updated', async () => {
    const ticket = await Ticket.create({
      title: 'Upgrade subscription plan to business',
      description: 'Customer requests upgrade to business tier starting next month.',
      category: 'Billing',
      priority: 'Medium',
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/tickets/${ticket._id}`)
      .send({ status: 'In Progress' })
      .expect(200);

    expect(res.body.status).toBe('In Progress');

    const activity = await TicketActivity.findOne({
      ticketId: ticket._id,
      action: 'status_changed',
    });
    expect(activity).toBeDefined();
    expect(activity.changes.status.from).toBe('Open');
    expect(activity.changes.status.to).toBe('In Progress');
  });

  test('rejects attempts to overwrite ML prediction fields via PATCH', async () => {
    const ticket = await Ticket.create({
      title: 'Need access to staging environment',
      description: 'Developer needs access permissions to staging cluster.',
      category: 'Account Access',
      priority: 'Medium',
      mlCategory: 'Account Access',
    });

    const res = await request(app)
      .patch(`/api/tickets/${ticket._id}`)
      .send({ mlCategory: 'Billing' })
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
  });

  test('returns 404 when updating non-existent ticket', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/tickets/${fakeId}`)
      .send({ priority: 'High' })
      .expect(404);

    expect(res.body.error).toBe('Ticket not found');
  });
});

// ── 5. DELETE /api/tickets/:id ────────────────────────────────────────────────
describe('DELETE /api/tickets/:id', () => {
  test('deletes ticket, returns 204, and records "deleted" activity', async () => {
    const ticket = await Ticket.create({
      title: 'Spam ticket from automated bot',
      description: 'Random spam text received through public contact form.',
      category: 'General Inquiry',
      priority: 'Low',
    });

    await request(app)
      .delete(`/api/tickets/${ticket._id}`)
      .expect(204);

    // Verify document was removed from Ticket collection
    const found = await Ticket.findById(ticket._id);
    expect(found).toBeNull();

    // Verify deletion activity logged
    const deleteActivity = await TicketActivity.findOne({
      ticketId: ticket._id,
      action: 'deleted',
    });
    expect(deleteActivity).toBeDefined();
    expect(deleteActivity.summary).toContain('Spam ticket from automated bot');
  });

  test('returns 404 when deleting non-existent ticket', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/tickets/${fakeId}`)
      .expect(404);

    expect(res.body.error).toBe('Ticket not found');
  });

  test('returns 400 for invalid ObjectId on delete', async () => {
    await request(app)
      .delete('/api/tickets/bad-id')
      .expect(400);
  });
});
