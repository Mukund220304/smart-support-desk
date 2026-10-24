// server.js
// ---------
// Entry point for the Express + Socket.IO application.
// Responsibilities:
//   1. Load environment variables from .env
//   2. Connect to MongoDB
//   3. Mount middleware (JSON parsing, CORS)
//   4. Mount route handlers
//   5. Global error handler
//   6. Initialize Socket.IO on HTTP server for real-time events
//   7. Start listening on the configured port

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const { initSocket } = require('./utils/socketEvents');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO attached to HTTP server
initSocket(server);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

const corsOriginHandler = (origin, callback) => {
  // Allow requests with no origin (like mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);
  if (
    origin.endsWith('.netlify.app') ||
    origin.includes('localhost') ||
    origin === process.env.FRONTEND_URL
  ) {
    return callback(null, true);
  }
  return callback(null, true); // Permissive fallback for preview deployments
};

app.use(cors({
  origin: corsOriginHandler,
  credentials: true,
}));

// ── Routes ────────────────────────────────────────────────────────────────────
const healthHandler = (req, res) => {
  res.json({ status: 'ok', message: 'Smart Support Desk API is running' });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Ticket CRUD + /predict proxy mounted on both /api and root /
const ticketRoutes = require('./routes/tickets');
app.use('/api', ticketRoutes);
app.use('/', ticketRoutes);

// Dashboard stats aggregation mounted on both /api and root /
const dashboardRoutes = require('./routes/dashboard');
app.use('/api', dashboardRoutes);
app.use('/', dashboardRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server + Socket.IO running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.server = server;
