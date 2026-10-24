// routes/dashboard.js
// -------------------
// Express router for Dashboard operational statistics.
// Mounted under '/api' in server.js:
//   GET /api/dashboard/stats -> Calculates live metrics using MongoDB aggregation

const express = require('express');
const router = express.Router();
const { Ticket, CATEGORIES, PRIORITIES, STATUSES } = require('../models/Ticket');

/**
 * GET /api/dashboard/stats
 * Query params (optional):
 *   from: ISO date string (filters tickets created on or after this timestamp)
 *   to:   ISO date string (filters tickets created on or before this timestamp)
 *
 * Uses a single MongoDB aggregation pipeline with $facet to compute all
 * metrics simultaneously in the database engine without fetching all records
 * into Node memory.
 */
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const matchStage = {};

    // Date range filtering on createdAt if provided
    if (from || to) {
      matchStage.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate)) matchStage.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate)) matchStage.createdAt.$lte = toDate;
      }
    }

    const pipeline = [];

    // Apply match filter if dates specified
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // $facet executes multiple aggregation sub-pipelines in parallel over the input
    pipeline.push({
      $facet: {
        total: [{ $count: 'count' }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
      },
    });

    const [result] = await Ticket.aggregate(pipeline);

    const totalTickets = result.total[0] ? result.total[0].count : 0;

    // Initialize default objects with 0 for all enum items so the frontend
    // always receives a consistent shape even if there are 0 tickets in a category
    const byStatus = {};
    STATUSES.forEach((s) => {
      byStatus[s] = 0;
    });
    result.byStatus.forEach((item) => {
      if (item._id) byStatus[item._id] = item.count;
    });

    const byPriority = {};
    PRIORITIES.forEach((p) => {
      byPriority[p] = 0;
    });
    result.byPriority.forEach((item) => {
      if (item._id) byPriority[item._id] = item.count;
    });

    const byCategory = {};
    CATEGORIES.forEach((c) => {
      byCategory[c] = 0;
    });
    result.byCategory.forEach((item) => {
      if (item._id) byCategory[item._id] = item.count;
    });

    // Operational summary figures
    const openAndInProgress = (byStatus['Open'] || 0) + (byStatus['In Progress'] || 0);
    const highPriority = byPriority['High'] || 0;
    const resolved = byStatus['Resolved'] || 0;

    res.status(200).json({
      totalTickets,
      byStatus,
      byPriority,
      byCategory,
      openAndInProgress,
      highPriority,
      resolved,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
