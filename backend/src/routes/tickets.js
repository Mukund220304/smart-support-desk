// routes/tickets.js
// -----------------
// Express router for all Ticket CRUD endpoints.
// Mounted under '/api' in server.js:
//   POST   /api/tickets       -> Create a new ticket + record 'created' activity
//   GET    /api/tickets       -> List tickets with optional search, filters & pagination
//   GET    /api/tickets/:id   -> Get ticket details + associated activity history
//   PATCH  /api/tickets/:id   -> Update ticket fields + record 'updated' / 'status_changed' activity
//   DELETE /api/tickets/:id   -> Delete a ticket + record 'deleted' activity

const express = require('express');
const router = express.Router();
const { Ticket } = require('../models/Ticket');
const { TicketActivity } = require('../models/TicketActivity');
const {
  validateId,
  validateCreateTicket,
  validateUpdateTicket,
  validateListTickets,
} = require('../middleware/validate');
const { predictTicket } = require('../utils/mlClient');
const {
  emitTicketCreated,
  emitTicketUpdated,
  emitTicketDeleted,
} = require('../utils/socketEvents');

/**
 * Helper: recordActivity
 * Creates an append-only audit log entry in the TicketActivity collection.
 * Wrapped in try/catch so activity logging errors never crash the primary request.
 */
async function recordActivity({ ticketId, action, changes = {}, summary = '' }) {
  try {
    await TicketActivity.create({
      ticketId,
      action,
      changes,
      summary,
    });
  } catch (err) {
    console.error(`Failed to record activity for ticket ${ticketId}:`, err.message);
  }
}

// ── 0. POST /api/predict — Proxy to Python ML microservice ─────────────────
router.post('/predict', async (req, res, next) => {
  try {
    const { title, description } = req.body || {};
    if (!title && !description) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'text', message: 'title or description is required for prediction' }],
      });
    }

    const prediction = await predictTicket({
      title: title || '',
      description: description || '',
    });

    res.status(200).json(prediction);
  } catch (err) {
    next(err);
  }
});

// ── 1. POST /api/tickets — Create a new ticket ───────────────────────────────
router.post('/tickets', validateCreateTicket, async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      status,
      mlCategory,
      mlPriority,
      mlConfidence,
    } = req.body;

    const ticket = await Ticket.create({
      title,
      description,
      category,
      priority,
      status: status || 'Open',
      mlCategory: mlCategory || null,
      mlPriority: mlPriority || null,
      mlConfidence: mlConfidence !== undefined ? mlConfidence : null,
    });

    // Record creation activity
    await recordActivity({
      ticketId: ticket._id,
      action: 'created',
      summary: `Ticket created with status "${ticket.status}" and priority "${ticket.priority}"`,
    });

    // Real-time broadcast
    emitTicketCreated(ticket);

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// ── 2. GET /api/tickets — List tickets (with filters, search & pagination) ───
router.get('/tickets', validateListTickets, async (req, res, next) => {
  try {
    const {
      search,
      category,
      priority,
      status,
      page = 1,
      limit = 20,
      sortBy = '-createdAt',
    } = req.query;

    const query = {};

    // Filter by exact match if provided
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (status) query.status = status;

    // Search query across title and description using regex or text search
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Run query and total count in parallel for efficiency
    const [tickets, total] = await Promise.all([
      Ticket.find(query).sort(sortBy).skip(skip).limit(limitNum),
      Ticket.countDocuments(query),
    ]);

    res.status(200).json({
      tickets,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. GET /api/tickets/:id — Get single ticket + activity history ───────────
router.get('/tickets/:id', validateId, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Retrieve activity logs for this ticket in reverse chronological order
    const activities = await TicketActivity.find({ ticketId: ticket._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      ticket,
      activities,
    });
  } catch (err) {
    next(err);
  }
});

// ── 4. PATCH /api/tickets/:id — Update ticket fields ─────────────────────────
router.patch('/tickets/:id', validateUpdateTicket, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updatableFields = ['title', 'description', 'category', 'priority', 'status'];
    const changes = {};
    let statusChanged = false;

    // Detect which fields actually changed
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== ticket[field]) {
        changes[field] = {
          from: ticket[field],
          to: req.body[field],
        };
        if (field === 'status') {
          statusChanged = true;
        }
        ticket[field] = req.body[field];
      }
    });

    // Only save and record activity if at least one field changed
    if (Object.keys(changes).length > 0) {
      await ticket.save();

      const action = statusChanged ? 'status_changed' : 'updated';
      const summary = statusChanged
        ? `Status changed from "${changes.status.from}" to "${changes.status.to}"`
        : `Updated fields: ${Object.keys(changes).join(', ')}`;

      await recordActivity({
        ticketId: ticket._id,
        action,
        changes,
        summary,
      });

      // Real-time broadcast
      emitTicketUpdated(ticket, changes);
    }

    res.status(200).json(ticket);
  } catch (err) {
    next(err);
  }
});

// ── 5. DELETE /api/tickets/:id — Delete a ticket ─────────────────────────────
router.delete('/tickets/:id', validateId, async (req, res, next) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Record the deletion event in activity history
    await recordActivity({
      ticketId: ticket._id,
      action: 'deleted',
      summary: `Ticket "${ticket.title}" was deleted`,
    });

    // Real-time broadcast
    emitTicketDeleted(ticket._id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
