// utils/socketEvents.js
// --------------------
// Socket.IO server initialization and event broadcasting helper.
// Follows our core architecture rule:
//   Payloads are minimal (IDs and action hint). Clients fetch authoritative
//   data from the REST API upon receiving events, preventing state desynchronization.

const { Server } = require('socket.io');

let io = null;

/**
 * initSocket
 * Attaches Socket.IO to the Express HTTP server instance.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin.endsWith('.netlify.app') ||
          origin.includes('localhost') ||
          origin === process.env.FRONTEND_URL
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Client connected
    socket.on('disconnect', () => {
      // Client disconnected
    });
  });

  return io;
}

/**
 * getIO
 * Retrieves the active Socket.IO server instance.
 */
function getIO() {
  return io;
}

/**
 * emitTicketCreated
 * Broadcasts ticket:created to all connected clients.
 */
function emitTicketCreated(ticket) {
  if (!io) return;
  io.emit('ticket:created', {
    ticketId: ticket._id,
    title: ticket.title,
    status: ticket.status,
  });
}

/**
 * emitTicketUpdated
 * Broadcasts ticket:updated with minimal change details.
 */
function emitTicketUpdated(ticket, changes = {}) {
  if (!io) return;
  io.emit('ticket:updated', {
    ticketId: ticket._id,
    status: ticket.status,
    changes,
  });
}

/**
 * emitTicketDeleted
 * Broadcasts ticket:deleted with the affected ID.
 */
function emitTicketDeleted(ticketId) {
  if (!io) return;
  io.emit('ticket:deleted', {
    ticketId,
  });
}

module.exports = {
  initSocket,
  getIO,
  emitTicketCreated,
  emitTicketUpdated,
  emitTicketDeleted,
};
