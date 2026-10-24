// scripts/seed.js
// ---------------
// Development-only seed script to populate sample support tickets for demo purposes.
//
// SAFETY GUARDS:
//   1. Refuses to run if NODE_ENV === 'production'.
//   2. NEVER deletes, drops, or alters existing data in MongoDB Atlas or local DB.
//   3. Idempotent: checks if a sample ticket already exists by title and skips it.
//   4. Only runs when explicitly triggered via `npm run seed`.

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db');
const { Ticket } = require('../models/Ticket');
const { TicketActivity } = require('../models/TicketActivity');

// Guard against accidental production execution
if (process.env.NODE_ENV === 'production') {
  console.error('❌ SEED ABORTED: Seeding is disabled in production environments.');
  process.exit(1);
}

const SAMPLE_TICKETS = [
  {
    title: 'PostgreSQL connection timeout in production cluster',
    description: 'FATAL: remaining connection slots are reserved for non-replication superuser connections. API queries failing.',
    category: 'Technical Issue',
    priority: 'High',
    status: 'Open',
    mlCategory: 'Technical Issue',
    mlPriority: 'High',
    mlConfidence: 0.98,
  },
  {
    title: 'Double charge on invoice #INV-2024-089',
    description: 'My credit card was charged twice for the annual enterprise plan renewal this morning.',
    category: 'Billing',
    priority: 'High',
    status: 'In Progress',
    mlCategory: 'Billing',
    mlPriority: 'High',
    mlConfidence: 0.97,
  },
  {
    title: 'SMS two-factor authentication code not received',
    description: 'Unable to sign in because the SMS OTP verification code is not being delivered to my mobile device.',
    category: 'Account Access',
    priority: 'High',
    status: 'Open',
    mlCategory: 'Account Access',
    mlPriority: 'High',
    mlConfidence: 0.96,
  },
  {
    title: 'Documentation request for webhook retry policy',
    description: 'Could you clarify the exponential backoff interval used when a webhook delivery endpoint returns HTTP 503?',
    category: 'General Inquiry',
    priority: 'Low',
    status: 'Resolved',
    mlCategory: 'General Inquiry',
    mlPriority: 'Low',
    mlConfidence: 0.94,
  },
  {
    title: 'Redis cache latency spike causing session timeouts',
    description: 'Redis response time increased from 3ms to 500ms due to heavy memory fragmentation after batch update.',
    category: 'Technical Issue',
    priority: 'High',
    status: 'In Progress',
    mlCategory: 'Technical Issue',
    mlPriority: 'High',
    mlConfidence: 0.95,
  },
  {
    title: 'Request VAT invoice amendment for European audit',
    description: 'Please amend invoice #INV-2024-071 to include our registered EU VAT identification number.',
    category: 'Billing',
    priority: 'Medium',
    status: 'Resolved',
    mlCategory: 'Billing',
    mlPriority: 'Medium',
    mlConfidence: 0.95,
  },
  {
    title: 'SSO SAML signature verification failure for Okta users',
    description: 'Enterprise team members receive "Invalid SAML response signature" when logging in via company Okta portal.',
    category: 'Account Access',
    priority: 'High',
    status: 'Open',
    mlCategory: 'Account Access',
    mlPriority: 'High',
    mlConfidence: 0.99,
  },
  {
    title: 'Inquiry regarding native iOS and Android application roadmap',
    description: 'Our field service technicians are inquiring whether a native mobile app will be released in Q3 or Q4.',
    category: 'General Inquiry',
    priority: 'Low',
    status: 'Closed',
    mlCategory: 'General Inquiry',
    mlPriority: 'Low',
    mlConfidence: 0.93,
  },
  {
    title: 'Vite build fails in CI/CD pipeline with syntax error',
    description: 'Frontend compilation fails during GitHub Actions deployment after upgrading npm dependencies.',
    category: 'Technical Issue',
    priority: 'Medium',
    status: 'Resolved',
    mlCategory: 'Technical Issue',
    mlPriority: 'Medium',
    mlConfidence: 0.94,
  },
  {
    title: 'Refund requested within 30-day money-back guarantee window',
    description: 'Cancelled subscription 10 days after purchase. Please confirm when the refund will be credited to my account.',
    category: 'Billing',
    priority: 'Medium',
    status: 'In Progress',
    mlCategory: 'Billing',
    mlPriority: 'Medium',
    mlConfidence: 0.96,
  },
  {
    title: 'Google OAuth login popup redirects to blank screen',
    description: 'Clicking Sign in with Google on Chrome opens a blank popup window without completing authentication.',
    category: 'Account Access',
    priority: 'Medium',
    status: 'Open',
    mlCategory: 'Account Access',
    mlPriority: 'Medium',
    mlConfidence: 0.95,
  },
  {
    title: 'Question regarding automated daily CSV exports to Amazon S3',
    description: 'Does the system support automatically exporting daily ticket activity logs to an external S3 bucket?',
    category: 'General Inquiry',
    priority: 'Low',
    status: 'Open',
    mlCategory: 'General Inquiry',
    mlPriority: 'Low',
    mlConfidence: 0.92,
  },
];

async function seed() {
  console.log('🌱 Starting safe development seed...');
  console.log('⚠️  Atlas Safety: Existing database records will NOT be deleted or modified.');

  try {
    await connectDB();

    let insertedCount = 0;
    let skippedCount = 0;

    for (const sample of SAMPLE_TICKETS) {
      // Check if ticket already exists by title (non-destructive idempotency)
      const existing = await Ticket.findOne({ title: sample.title });
      if (existing) {
        skippedCount++;
        continue;
      }

      const ticket = await Ticket.create(sample);

      // Create matching activity entry
      await TicketActivity.create({
        ticketId: ticket._id,
        action: 'created',
        summary: `Sample ticket created for development with status "${ticket.status}" and priority "${ticket.priority}"`,
      });

      insertedCount++;
    }

    console.log('\n✅ Seeding Complete:');
    console.log(`   - Newly inserted: ${insertedCount} tickets`);
    console.log(`   - Skipped (already existed): ${skippedCount} tickets`);
    console.log(`   - Total sample pool: ${SAMPLE_TICKETS.length} tickets`);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
