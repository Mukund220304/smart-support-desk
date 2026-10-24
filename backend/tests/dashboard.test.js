// tests/dashboard.test.js
// -----------------------
// Automated tests for GET /api/dashboard/stats.
// Directly verifies that creating, updating, and deleting tickets dynamically
// updates MongoDB aggregation stats in real time.

const request = require('supertest');
const app = require('../src/server');
const { Ticket } = require('../src/models/Ticket');
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

describe('GET /api/dashboard/stats', () => {
  test('returns all zeroed counts on an empty database', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .expect(200);

    expect(res.body.totalTickets).toBe(0);
    expect(res.body.openAndInProgress).toBe(0);
    expect(res.body.highPriority).toBe(0);
    expect(res.body.resolved).toBe(0);

    expect(res.body.byStatus).toEqual({
      Open: 0,
      'In Progress': 0,
      Resolved: 0,
      Closed: 0,
    });

    expect(res.body.byPriority).toEqual({
      Low: 0,
      Medium: 0,
      High: 0,
    });

    expect(res.body.byCategory).toEqual({
      'Technical Issue': 0,
      Billing: 0,
      'Account Access': 0,
      'General Inquiry': 0,
    });
  });

  test('calculates accurate statistics when tickets are created', async () => {
    await Ticket.create([
      {
        title: 'Crash on launch',
        description: 'Application crashes immediately upon clicking icon.',
        category: 'Technical Issue',
        priority: 'High',
        status: 'Open',
      },
      {
        title: 'Billing double charge',
        description: 'Monthly charge was applied twice to Visa card.',
        category: 'Billing',
        priority: 'High',
        status: 'In Progress',
      },
      {
        title: 'Password reset request',
        description: 'Need help resetting forgotten password for admin.',
        category: 'Account Access',
        priority: 'Medium',
        status: 'Resolved',
      },
      {
        title: 'General question about API rate limits',
        description: 'How many requests per minute are permitted on standard tier?',
        category: 'General Inquiry',
        priority: 'Low',
        status: 'Closed',
      },
    ]);

    const res = await request(app)
      .get('/api/dashboard/stats')
      .expect(200);

    expect(res.body.totalTickets).toBe(4);
    expect(res.body.highPriority).toBe(2);
    expect(res.body.openAndInProgress).toBe(2); // 1 Open + 1 In Progress
    expect(res.body.resolved).toBe(1);

    expect(res.body.byCategory['Technical Issue']).toBe(1);
    expect(res.body.byCategory['Billing']).toBe(1);
    expect(res.body.byCategory['Account Access']).toBe(1);
    expect(res.body.byCategory['General Inquiry']).toBe(1);

    expect(res.body.byPriority['High']).toBe(2);
    expect(res.body.byPriority['Medium']).toBe(1);
    expect(res.body.byPriority['Low']).toBe(1);

    expect(res.body.byStatus['Open']).toBe(1);
    expect(res.body.byStatus['In Progress']).toBe(1);
    expect(res.body.byStatus['Resolved']).toBe(1);
    expect(res.body.byStatus['Closed']).toBe(1);
  });

  test('reflects status changes dynamically after PATCH mutation', async () => {
    const ticket = await Ticket.create({
      title: 'Server memory leak alert',
      description: 'Node.js process RAM usage grows steadily until OOM crash.',
      category: 'Technical Issue',
      priority: 'High',
      status: 'Open',
    });

    // Initial stats check: 1 Open ticket
    let res = await request(app).get('/api/dashboard/stats').expect(200);
    expect(res.body.byStatus.Open).toBe(1);
    expect(res.body.byStatus.Resolved).toBe(0);
    expect(res.body.openAndInProgress).toBe(1);
    expect(res.body.resolved).toBe(0);

    // Update status to Resolved
    await request(app)
      .patch(`/api/tickets/${ticket._id}`)
      .send({ status: 'Resolved' })
      .expect(200);

    // Stats check after mutation: 0 Open, 1 Resolved
    res = await request(app).get('/api/dashboard/stats').expect(200);
    expect(res.body.byStatus.Open).toBe(0);
    expect(res.body.byStatus.Resolved).toBe(1);
    expect(res.body.openAndInProgress).toBe(0);
    expect(res.body.resolved).toBe(1);
  });

  test('decrements counts dynamically when a ticket is deleted', async () => {
    const ticket1 = await Ticket.create({
      title: 'Spam ticket to delete',
      description: 'Random sales solicitation through support desk form.',
      category: 'General Inquiry',
      priority: 'Low',
      status: 'Open',
    });

    const ticket2 = await Ticket.create({
      title: 'Real technical bug report',
      description: 'Critical bug report that should stay in database.',
      category: 'Technical Issue',
      priority: 'High',
      status: 'Open',
    });

    let res = await request(app).get('/api/dashboard/stats').expect(200);
    expect(res.body.totalTickets).toBe(2);
    expect(res.body.byCategory['General Inquiry']).toBe(1);

    // Delete ticket1
    await request(app)
      .delete(`/api/tickets/${ticket1._id}`)
      .expect(204);

    // Verify stats updated after deletion
    res = await request(app).get('/api/dashboard/stats').expect(200);
    expect(res.body.totalTickets).toBe(1);
    expect(res.body.byCategory['General Inquiry']).toBe(0);
    expect(res.body.byCategory['Technical Issue']).toBe(1);
  });

  test('filters statistics by date range (from and to)', async () => {
    const pastDate = new Date('2025-01-01T00:00:00.000Z');
    const futureDate = new Date('2025-06-01T00:00:00.000Z');

    // Create a ticket with an older createdAt
    const t1 = new Ticket({
      title: 'Old ticket created in January',
      description: 'Ticket created early in the year for historical query test.',
      category: 'Billing',
      priority: 'Low',
      status: 'Resolved',
    });
    t1.createdAt = pastDate;
    await t1.save();

    // Create a ticket with a newer createdAt
    const t2 = new Ticket({
      title: 'Recent ticket created in June',
      description: 'Ticket created later in the year for date filter range test.',
      category: 'Technical Issue',
      priority: 'High',
      status: 'Open',
    });
    t2.createdAt = futureDate;
    await t2.save();

    // Filter range that only includes t2
    const res = await request(app)
      .get('/api/dashboard/stats?from=2025-05-01T00:00:00.000Z&to=2025-07-01T00:00:00.000Z')
      .expect(200);

    expect(res.body.totalTickets).toBe(1);
    expect(res.body.byCategory['Technical Issue']).toBe(1);
    expect(res.body.byCategory['Billing']).toBe(0);
  });
});
