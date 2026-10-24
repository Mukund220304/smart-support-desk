// models/Ticket.js
// ----------------
// Defines the shape of every ticket stored in MongoDB.
// Mongoose uses this schema to validate data before saving and to create
// the 'tickets' collection automatically on first insert.

const mongoose = require('mongoose');

// ── Allowed values ──────────────────────────────────────────────────────────
// Defining these as exported constants lets routes and tests import the same
// list instead of duplicating string literals.
const CATEGORIES = [
  'Technical Issue',
  'Billing',
  'Account Access',
  'General Inquiry',
];

const PRIORITIES = ['Low', 'Medium', 'High'];

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

// ── Schema ───────────────────────────────────────────────────────────────────
const ticketSchema = new mongoose.Schema(
  {
    // ── Core fields (user-supplied) ─────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // User's final selections — may be set manually or accepted from ML
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: 'Invalid category: {VALUE}' },
    },

    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: { values: PRIORITIES, message: 'Invalid priority: {VALUE}' },
    },

    status: {
      type: String,
      enum: { values: STATUSES, message: 'Invalid status: {VALUE}' },
      default: 'Open',
    },

    // ── ML predictions (stored at create-time, never overwritten by PATCH) ──
    // Keeping these separate from the user fields lets us compare what the
    // model suggested vs. what the user actually chose.
    mlCategory: {
      type: String,
      enum: { values: [...CATEGORIES, null], message: 'Invalid mlCategory' },
      default: null,
    },

    mlPriority: {
      type: String,
      enum: { values: [...PRIORITIES, null], message: 'Invalid mlPriority' },
      default: null,
    },

    // Confidence score for the category prediction (0.0 – 1.0)
    mlConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
  },
  {
    // timestamps: true tells Mongoose to automatically manage:
    //   createdAt — set once when the document is first inserted
    //   updatedAt — updated every time the document is saved
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// These speed up the most common queries in the application:
//   - Filtering by status, category, priority (GET /api/tickets with filters)
//   - Sorting newest-first (createdAt: -1)
//   - Full-text search on title and description
ticketSchema.index({ status: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ title: 'text', description: 'text' });

// ── Model ─────────────────────────────────────────────────────────────────────
const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = { Ticket, CATEGORIES, PRIORITIES, STATUSES };
