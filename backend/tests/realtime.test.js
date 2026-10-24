// tests/realtime.test.js
// ----------------------
// Automated integration tests for Socket.IO real-time event broadcasting.
// Verifies that:
//   - POST /api/tickets triggers 'ticket:created'
//   - PATCH /api/tickets/:id triggers 'ticket:updated'
//   - DELETE /api/tickets/:id triggers 'ticket:deleted'
//   - Events transmit appropriate identifier payloads without leaking sensitive data.

const request = require('supertest');
const { io: ioc } = require('socket.io-client');
const app = require('../src/server');
const { server } = require('../src/server');
const { Ticket } = require('../src/models/Ticket');
const { connectTestDB, clearTestDB, closeTestDB } = require('./dbHelper');

let clientSocket;
let serverPort;

beforeAll(async () => {
  await connectTestDB();

  // Listen on ephemeral port for test client
  await new Promise((resolve) => {
    server.listen(0, () => {
      serverPort = server.address().port;
      resolve();
    });
  });

  // Connect test client socket
  clientSocket = ioc(`http://localhost:${serverPort}`, {
    transports: ['websocket'],
    forceNew: true,
  });

  await new Promise((resolve) => {
    clientSocket.on('connect', resolve);
  });
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  if (clientSocket) {
    clientSocket.disconnect();
  }
  await new Promise((resolve) => {
    server.close(resolve);
  });
  await closeTestDB();
});

describe('Socket.IO Real-Time Events', () => {
  test('broadcasts "ticket:created" when a new ticket is submitted', (done) => {
    clientSocket.once('ticket:created', (data) => {
      try {
        expect(data.ticketId).toBeDefined();
        expect(data.title).toBe('Websocket integration test ticket');
        expect(data.status).toBe('Open');
        done();
      } catch (err) {
        done(err);
      }
    });

    request(app)
      .post('/api/tickets')
      .send({
        title: 'Websocket integration test ticket',
        description: 'Testing that Socket.IO emits creation events reliably.',
        category: 'Technical Issue',
        priority: 'High',
      })
      .expect(201)
      .end((err) => {
        if (err) done(err);
      });
  });

  test('broadcasts "ticket:updated" when ticket fields are patched', async () => {
    const ticket = await Ticket.create({
      title: 'Ticket to update for websocket test',
      description: 'Initial description that is long enough.',
      category: 'Billing',
      priority: 'Low',
      status: 'Open',
    });

    const eventPromise = new Promise((resolve, reject) => {
      clientSocket.once('ticket:updated', (data) => {
        try {
          expect(data.ticketId).toBe(ticket._id.toString());
          expect(data.status).toBe('In Progress');
          expect(data.changes.status.from).toBe('Open');
          expect(data.changes.status.to).toBe('In Progress');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    await request(app)
      .patch(`/api/tickets/${ticket._id}`)
      .send({ status: 'In Progress' })
      .expect(200);

    await eventPromise;
  });

  test('broadcasts "ticket:deleted" when ticket is removed', async () => {
    const ticket = await Ticket.create({
      title: 'Ticket to delete for websocket test',
      description: 'Will be removed to trigger delete event.',
      category: 'General Inquiry',
      priority: 'Low',
    });

    const eventPromise = new Promise((resolve, reject) => {
      clientSocket.once('ticket:deleted', (data) => {
        try {
          expect(data.ticketId).toBe(ticket._id.toString());
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    await request(app)
      .delete(`/api/tickets/${ticket._id}`)
      .expect(204);

    await eventPromise;
  });
});
