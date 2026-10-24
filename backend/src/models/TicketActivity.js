// models/TicketActivity.js
// -------------------------
// Records every important action taken on a ticket (audit log).
// Stored in a separate collection so the Ticket documents stay lean.
// This collection is append-only — activities are never edited or deleted.

const mongoose = require('mongoose');

// ── Allowed action types ──────────────────────────────────────────────────────
const ACTIONS = ['created', 'updated', 'status_changed', 'deleted'];

// ── Schema ────────────────────────────────────────────────────────────────────
const ticketActivitySchema = new mongoose.Schema(
  {
    // Which ticket this activity belongs to
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true, // fast lookup of all activities for a given ticket
    },

    // What kind of action happened
    action: {
      type: String,
      required: true,
      enum: { values: ACTIONS, message: 'Invalid action type: {VALUE}' },
    },

    // What specifically changed — stored as { fieldName: { from, to } }
    // Example: { status: { from: 'Open', to: 'In Progress' } }
    // We only log field names and their before/after values — no PII.
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Human-readable summary (optional, useful on the detail page)
    summary: {
      type: String,
      maxlength: 300,
    },
  },
  {
    // createdAt is auto-set; we don't need updatedAt because activities
    // are immutable once written.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Model ──────────────────────────────────────────────────────────────────────
const TicketActivity = mongoose.model('TicketActivity', ticketActivitySchema);

module.exports = { TicketActivity, ACTIONS };
