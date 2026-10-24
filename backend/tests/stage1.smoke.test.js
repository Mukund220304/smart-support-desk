// tests/stage1.smoke.test.js
// ---------------------------
// Quick smoke tests that verify Stage 1 is wired up correctly:
//   1. Mongoose models load without throwing
//   2. Constants (enums) are exported correctly
//   3. A test Ticket document can be created in the in-memory DB
//   4. An invalid Ticket is rejected with Mongoose validation errors
//   5. A TicketActivity document can be saved and retrieved by ticketId

const mongoose = require('mongoose');
const { Ticket, CATEGORIES, PRIORITIES, STATUSES } = require('../src/models/Ticket');
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

// ─── Enum exports ──────────────────────────────────────────────────────────

describe('Ticket model — enum constants', () => {
  test('CATEGORIES has exactly 4 items', () => {
    expect(CATEGORIES).toHaveLength(4);
    expect(CATEGORIES).toContain('Technical Issue');
    expect(CATEGORIES).toContain('Billing');
    expect(CATEGORIES).toContain('Account Access');
    expect(CATEGORIES).toContain('General Inquiry');
  });

  test('PRIORITIES has exactly 3 items', () => {
    expect(PRIORITIES).toEqual(['Low', 'Medium', 'High']);
  });

  test('STATUSES has exactly 4 items', () => {
    expect(STATUSES).toEqual(['Open', 'In Progress', 'Resolved', 'Closed']);
  });
});

// ─── Valid ticket creation ──────────────────────────────────────────────────

describe('Ticket model — valid document', () => {
  test('saves a valid ticket and auto-sets timestamps + default status', async () => {
    const ticket = await Ticket.create({
      title: 'Login page is broken',
      description: 'Users cannot log in since the latest deployment.',
      category: 'Technical Issue',
      priority: 'High',
    });

    expect(ticket._id).toBeDefined();
    expect(ticket.status).toBe('Open');         // default
    expect(ticket.createdAt).toBeInstanceOf(Date);
    expect(ticket.updatedAt).toBeInstanceOf(Date);
    expect(ticket.mlCategory).toBeNull();       // default
    expect(ticket.mlPriority).toBeNull();
    expect(ticket.mlConfidence).toBeNull();
  });

  test('saves ML prediction fields when provided', async () => {
    const ticket = await Ticket.create({
      title: 'Invoice shows wrong amount',
      description: 'My last invoice charged me twice for the same item.',
      category: 'Billing',
      priority: 'Medium',
      mlCategory: 'Billing',
      mlPriority: 'Medium',
      mlConfidence: 0.91,
    });

    expect(ticket.mlCategory).toBe('Billing');
    expect(ticket.mlConfidence).toBe(0.91);
  });
});

// ─── Validation rejection ───────────────────────────────────────────────────

describe('Ticket model — validation errors', () => {
  test('rejects a ticket with missing required fields', async () => {
    await expect(Ticket.create({})).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('rejects a title shorter than 3 characters', async () => {
    await expect(
      Ticket.create({
        title: 'Hi',
        description: 'This description is long enough.',
        category: 'Billing',
        priority: 'Low',
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('rejects an invalid category', async () => {
    await expect(
      Ticket.create({
        title: 'Valid title here',
        description: 'This description is long enough.',
        category: 'NotARealCategory',
        priority: 'Low',
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('rejects an invalid priority', async () => {
    await expect(
      Ticket.create({
        title: 'Valid title here',
        description: 'This description is long enough.',
        category: 'Billing',
        priority: 'Critical',         // not in enum
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });
});

// ─── TicketActivity ─────────────────────────────────────────────────────────

describe('TicketActivity model', () => {
  test('saves a created activity and links it to a ticket', async () => {
    const ticket = await Ticket.create({
      title: 'Password reset not working',
      description: 'The reset email is never received by users.',
      category: 'Account Access',
      priority: 'High',
    });

    const activity = await TicketActivity.create({
      ticketId: ticket._id,
      action: 'created',
      summary: 'Ticket was created',
    });

    expect(activity.ticketId.toString()).toBe(ticket._id.toString());
    expect(activity.action).toBe('created');
    expect(activity.createdAt).toBeInstanceOf(Date);
    // updatedAt should NOT exist (we set timestamps: { createdAt: true, updatedAt: false })
    expect(activity.updatedAt).toBeUndefined();
  });

  test('saves a status_changed activity with before/after changes', async () => {
    const ticket = await Ticket.create({
      title: 'Billing statement incorrect',
      description: 'The statement shows charges from last month that were already paid.',
      category: 'Billing',
      priority: 'Medium',
    });

    const activity = await TicketActivity.create({
      ticketId: ticket._id,
      action: 'status_changed',
      changes: { status: { from: 'Open', to: 'In Progress' } },
      summary: 'Status changed from Open to In Progress',
    });

    expect(activity.changes.status.from).toBe('Open');
    expect(activity.changes.status.to).toBe('In Progress');
  });

  test('rejects an invalid action type', async () => {
    const ticket = await Ticket.create({
      title: 'General question about my account',
      description: 'I need help understanding my recent account changes.',
      category: 'General Inquiry',
      priority: 'Low',
    });

    await expect(
      TicketActivity.create({
        ticketId: ticket._id,
        action: 'hacked',             // not in ACTIONS enum
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });
});
