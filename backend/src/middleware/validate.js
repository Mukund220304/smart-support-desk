// middleware/validate.js
// ----------------------
// Centralises all express-validator rules and the result-checking middleware.
//
// HOW IT WORKS:
//   Each exported array is a chain of validator middlewares.
//   The last item in every chain is `checkValidation`, which reads the
//   accumulated errors and returns a 400 if any exist.
//
// USAGE IN A ROUTE FILE:
//   const { validateCreateTicket } = require('../middleware/validate');
//   router.post('/tickets', validateCreateTicket, handler);

const { body, param, query, validationResult } = require('express-validator');
const { CATEGORIES, PRIORITIES, STATUSES } = require('../models/Ticket');

// ── Shared helper ─────────────────────────────────────────────────────────────

/**
 * checkValidation
 * Reads accumulated express-validator errors. If any exist, returns a 400
 * response with an array of { field, message } objects.
 * If no errors, calls next() to continue to the route handler.
 */
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── MongoDB ObjectId validator ────────────────────────────────────────────────
// Reused by any route that has an :id param
const validateId = [
  param('id')
    .isMongoId()
    .withMessage('id must be a valid MongoDB ObjectId'),
  checkValidation,
];

// ── POST /api/tickets ─────────────────────────────────────────────────────────
const validateCreateTicket = [
  body('title')
    .trim()
    .notEmpty().withMessage('title is required')
    .isLength({ min: 3 }).withMessage('title must be at least 3 characters')
    .isLength({ max: 200 }).withMessage('title cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('description is required')
    .isLength({ min: 10 }).withMessage('description must be at least 10 characters')
    .isLength({ max: 2000 }).withMessage('description cannot exceed 2000 characters'),

  body('category')
    .notEmpty().withMessage('category is required')
    .isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),

  body('priority')
    .notEmpty().withMessage('priority is required')
    .isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}`),

  // status is optional on create (defaults to 'Open')
  body('status')
    .optional()
    .isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),

  // ML fields are optional — set by the frontend after calling /predict
  body('mlCategory')
    .optional({ nullable: true })
    .isIn(CATEGORIES).withMessage(`mlCategory must be one of: ${CATEGORIES.join(', ')}`),

  body('mlPriority')
    .optional({ nullable: true })
    .isIn(PRIORITIES).withMessage(`mlPriority must be one of: ${PRIORITIES.join(', ')}`),

  body('mlConfidence')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 1 }).withMessage('mlConfidence must be a number between 0 and 1'),

  checkValidation,
];

// ── PATCH /api/tickets/:id ────────────────────────────────────────────────────
// All fields are optional — only provided fields are updated.
// ML fields are NOT patchable; they're set once at creation and preserved.
const validateUpdateTicket = [
  param('id')
    .isMongoId().withMessage('id must be a valid MongoDB ObjectId'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('title must be at least 3 characters')
    .isLength({ max: 200 }).withMessage('title cannot exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage('description must be at least 10 characters')
    .isLength({ max: 2000 }).withMessage('description cannot exceed 2000 characters'),

  body('category')
    .optional()
    .isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}`),

  body('status')
    .optional()
    .isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),

  // Reject attempts to patch ML fields through this endpoint
  body('mlCategory')
    .not().exists().withMessage('mlCategory cannot be changed after creation'),
  body('mlPriority')
    .not().exists().withMessage('mlPriority cannot be changed after creation'),
  body('mlConfidence')
    .not().exists().withMessage('mlConfidence cannot be changed after creation'),

  checkValidation,
];

// ── GET /api/tickets (list) ───────────────────────────────────────────────────
const validateListTickets = [
  query('category')
    .optional()
    .isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),

  query('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}`),

  query('status')
    .optional()
    .isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt'])
    .withMessage('sortBy must be one of: createdAt, -createdAt, updatedAt, -updatedAt'),

  checkValidation,
];

module.exports = {
  validateId,
  validateCreateTicket,
  validateUpdateTicket,
  validateListTickets,
  checkValidation,
};
