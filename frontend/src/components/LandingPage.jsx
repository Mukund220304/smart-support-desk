// components/LandingPage.jsx
// --------------------------
// Public-facing landing page explaining the problem of manual support triage
// and demonstrating how Smart Support Desk streamlines ticket management with ML.
//
// Design: Midnight charcoal with muted forest-green accents, clean typography,
// and restrained minimal styling.

import React from 'react';
import {
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  Activity,
  Radio,
  Sliders,
  CheckCircle2,
  Inbox,
  Clock,
  Compass,
} from 'lucide-react';

export default function LandingPage({ onOpenDashboard, onOpenTickets }) {
  return (
    <div className="landing-container">
      {/* ── 1. Hero Section ───────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="hero-pill">
          <span className="hero-pill-dot" />
          <span>Intelligent Support Triage System</span>
        </div>

        <h1 className="hero-title">
          Eliminate manual triage chaos with automated ticket intelligence.
        </h1>

        <p className="hero-subtitle">
          Manual support queues suffer from misrouted tickets, delayed response times,
          and operator burnout. Smart Support Desk combines centralized ticket management
          with a trained machine learning pipeline that automatically classifies incoming
          issues and suggests priority levels, keeping human agents in control with instant overrides.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary hero-btn-main"
            onClick={onOpenDashboard}
          >
            Open Dashboard
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenTickets}
          >
            View Ticket Queue
          </button>
        </div>

        {/* Live System Indicators */}
        <div className="hero-stats-bar">
          <div className="hero-stat-item">
            <span className="hero-stat-label">Database Engine</span>
            <span className="hero-stat-value">MongoDB Aggregation</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat-item">
            <span className="hero-stat-label">Inference Runtime</span>
            <span className="hero-stat-value">scikit-learn NLP</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat-item">
            <span className="hero-stat-label">Event Synchronization</span>
            <span className="hero-stat-value">Socket.IO WebSockets</span>
          </div>
        </div>
      </section>

      {/* ── 2. The Problem vs. Solution ───────────────────────────────────── */}
      <section className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">The Operational Challenge</span>
          <h2 className="section-title">Why traditional ticket triage falls short</h2>
          <p className="section-desc">
            Customer inquiries arrive continuously with unstructured wording, ambiguous
            urgency, and varied technical depth. Relying solely on manual sorting creates bottlenecks.
          </p>
        </div>

        <div className="comparison-grid">
          <div className="comparison-card challenge-card">
            <div className="comparison-header">
              <ShieldAlert size={20} className="comparison-icon challenge-icon" />
              <h3>The Manual Triage Problem</h3>
            </div>
            <ul className="comparison-list">
              <li>
                <strong>Inbox Chaos:</strong> Critical production outages sit in the same unorganized
                inbox as routine billing inquiries.
              </li>
              <li>
                <strong>Inconsistent Categorization:</strong> Different agents classify the same
                technical issues under conflicting departments.
              </li>
              <li>
                <strong>Delayed SLA Response:</strong> High-priority issues are buried under non-urgent
                general inquiries until human review occurs.
              </li>
              <li>
                <strong>Lack of Auditability:</strong> Unrecorded edits and missing before/after change
                histories leave teams blind to how tickets progressed.
              </li>
            </ul>
          </div>

          <div className="comparison-card solution-card">
            <div className="comparison-header">
              <Sparkles size={20} className="comparison-icon solution-icon" />
              <h3>The Smart Support Desk Solution</h3>
            </div>
            <ul className="comparison-list">
              <li>
                <strong>Real-Time ML Classification:</strong> Dual scikit-learn models evaluate
                title and description patterns to suggest category and urgency immediately.
              </li>
              <li>
                <strong>Human-in-the-Loop Overrides:</strong> Operators can accept recommendations
                with one click or manually override them while preserving the AI audit baseline.
              </li>
              <li>
                <strong>Database Aggregation Analytics:</strong> Live operational metrics computed
                directly on MongoDB records via aggregation pipelines without mock data.
              </li>
              <li>
                <strong>Append-Only Audit Trail:</strong> Every creation, status transition, field edit,
                and deletion is recorded in a dedicated audit collection.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 3. How It Works ───────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">End-to-End Workflow</span>
          <h2 className="section-title">How Smart Support Desk Works</h2>
          <p className="section-desc">
            A reliable four-step lifecycle from ticket submission to verified resolution.
          </p>
        </div>

        <div className="workflow-steps">
          <div className="workflow-step">
            <div className="step-number">01</div>
            <h4 className="step-title">Ticket Ingestion</h4>
            <p className="step-text">
              The user or support operator submits a ticket with an issue title and detailed
              technical description. Input validation ensures complete records.
            </p>
          </div>

          <div className="workflow-step">
            <div className="step-number">02</div>
            <h4 className="step-title">AI Classification</h4>
            <p className="step-text">
              The Python ML microservice runs a TF-IDF vectorizer and logistic regression models
              to predict the category, priority level, and confidence percentage in real time.
            </p>
          </div>

          <div className="workflow-step">
            <div className="step-number">03</div>
            <h4 className="step-title">Operator Review</h4>
            <p className="step-text">
              The operator reviews the suggestion badge. They can apply the recommendation
              instantly or override it. Both the user selection and AI prediction are saved.
            </p>
          </div>

          <div className="workflow-step">
            <div className="step-number">04</div>
            <h4 className="step-title">Live Resolution</h4>
            <p className="step-text">
              Status changes and updates are saved to MongoDB, appended to the immutable activity
              history, and broadcasted to connected operators via Socket.IO.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. Key Platform Features ──────────────────────────────────────── */}
      <section className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">Capabilities</span>
          <h2 className="section-title">Built for operational clarity</h2>
        </div>

        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon-wrap">
              <Inbox size={20} />
            </div>
            <h4>Centralized Management</h4>
            <p>
              Full CRUD lifecycle with server-side multi-parameter filtering, text search across
              titles and descriptions, and cursor-free pagination.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-wrap">
              <Sparkles size={20} />
            </div>
            <h4>AI-Assisted Classification</h4>
            <p>
              Two independent scikit-learn models evaluate category and priority separately.
              Trained with Jaccard deduplication to eliminate data leakage.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-wrap">
              <Layers size={20} />
            </div>
            <h4>Database-Driven Analytics</h4>
            <p>
              Live operational metrics computed directly in MongoDB using $facet and $group
              aggregation pipelines with date range filtering. Zero mock numbers.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-wrap">
              <Activity size={20} />
            </div>
            <h4>Append-Only Activity Log</h4>
            <p>
              Every ticket mutation logs an event in the TicketActivity collection, tracking
              timestamps and exact before/after field changes without storing unnecessary PII.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-wrap">
              <Radio size={20} />
            </div>
            <h4>Real-Time Synchronization</h4>
            <p>
              Socket.IO broadcasts lightweight mutation signals across connected browser tabs,
              triggering authoritative REST re-fetches to keep state consistent.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-wrap">
              <Sliders size={20} />
            </div>
            <h4>Transparent Auditability</h4>
            <p>
              Initial ML predictions (category, priority, confidence) remain immutable, allowing
              teams to evaluate model accuracy against final human decisions over time.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom Call to Action ───────────────────────────────────────── */}
      <section className="landing-cta">
        <div className="cta-inner">
          <h2>Ready to explore the workspace?</h2>
          <p>
            Access the live operational dashboard, search and filter the ticket queue,
            or submit a sample ticket to test the real-time AI classification pipeline.
          </p>
          <div className="cta-buttons">
            <button
              type="button"
              className="btn btn-primary hero-btn-main"
              onClick={onOpenDashboard}
            >
              Open Dashboard
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenTickets}
            >
              View Ticket Queue
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. Professional Footer ────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-dot" />
              <span className="footer-logo-text">Smart Support Desk</span>
            </div>
            <p className="footer-tagline">
              Intelligent ticket management and real-time operational triage.
            </p>
          </div>

          <div className="footer-links">
            <span className="footer-links-title">Navigation</span>
            <button type="button" className="footer-link-btn" onClick={onOpenDashboard}>
              Dashboard Analytics
            </button>
            <button type="button" className="footer-link-btn" onClick={onOpenTickets}>
              Ticket Queue
            </button>
          </div>

          <div className="footer-tech">
            <span className="footer-links-title">Technology Stack</span>
            <div className="tech-tags">
              <span className="tech-tag">React 18</span>
              <span className="tech-tag">Vite</span>
              <span className="tech-tag">Node.js</span>
              <span className="tech-tag">Express</span>
              <span className="tech-tag">MongoDB</span>
              <span className="tech-tag">scikit-learn</span>
              <span className="tech-tag">Socket.IO</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>Smart Support Desk • Technical Assessment Implementation</span>
          <span className="footer-subtext">Clean Architecture • Zero Mock Analytics • Dedicated ML Microservice</span>
        </div>
      </footer>
    </div>
  );
}
