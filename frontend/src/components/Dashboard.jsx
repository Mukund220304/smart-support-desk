// components/Dashboard.jsx
// ------------------------
// Real-time operational analytics dashboard driven strictly by MongoDB aggregation.
// Features:
//   - 4 Top-level KPI cards (Total, In Progress/Open, High Priority, Resolved)
//   - Category distribution visual bars
//   - Priority and Status breakdown matrices
//   - Date range filtering
//   - All 4 UI states: Loading, Error, Empty, and Success

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { fetchDashboardStats } from '../api/ticketsApi';

export default function Dashboard({ onNavigateToTickets, refreshTrigger = 0 }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (dateRange.from) params.from = new Date(dateRange.from).toISOString();
      if (dateRange.to) params.to = new Date(dateRange.to).toISOString();

      const data = await fetchDashboardStats(params);
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setError(err.response?.data?.error || err.message || 'Unable to connect to database stats');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshTrigger]);

  const handleResetDates = () => {
    setDateRange({ from: '', to: '' });
  };

  // ── Render States ──────────────────────────────────────────────────────────

  if (loading && !stats) {
    return (
      <div className="card state-container">
        <RefreshCw size={36} className="empty-icon animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        <h3>Loading Operational Metrics...</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Aggregating live ticket records directly from MongoDB.
        </p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="card state-container">
        <AlertCircle size={40} color="#f43f5e" />
        <h3>Failed to Load Statistics</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
        <button type="button" className="btn btn-primary" onClick={loadStats}>
          <RefreshCw size={16} /> Retry Query
        </button>
      </div>
    );
  }

  const total = stats?.totalTickets || 0;
  const categories = stats?.byCategory || {};
  const priorities = stats?.byPriority || {};
  const statuses = stats?.byStatus || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Dashboard Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Operational Intelligence</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Live aggregation metrics calculated directly from MongoDB storage
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Date range filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <input
              type="date"
              aria-label="Filter from date"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>–</span>
            <input
              type="date"
              aria-label="Filter to date"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
            />
            {(dateRange.from || dateRange.to) && (
              <button
                type="button"
                onClick={handleResetDates}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadStats}
            title="Refresh database statistics"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error alert banner if re-fetch fails */}
      {error && (
        <div className="error-banner">
          <span>Failed to refresh latest metrics: {error}</span>
          <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={loadStats}>
            Retry
          </button>
        </div>
      )}

      {/* 4 Primary Operational KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={onNavigateToTickets} style={{ cursor: 'pointer' }}>
          <div>
            <div className="kpi-label">Total Tickets</div>
            <div className="kpi-val">{total}</div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}>
            <Layers size={20} />
          </div>
        </div>

        <div className="kpi-card" onClick={onNavigateToTickets} style={{ cursor: 'pointer' }}>
          <div>
            <div className="kpi-label">Active Workload</div>
            <div className="kpi-val" style={{ color: 'var(--status-progress)' }}>
              {stats?.openAndInProgress || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Open & In Progress</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--status-progress-bg)', color: 'var(--status-progress)', border: '1px solid rgba(196, 130, 39, 0.25)' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="kpi-card" onClick={onNavigateToTickets} style={{ cursor: 'pointer' }}>
          <div>
            <div className="kpi-label">High Priority</div>
            <div className="kpi-val" style={{ color: 'var(--priority-high)' }}>
              {stats?.highPriority || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Urgent attention needed</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--priority-high-bg)', color: 'var(--priority-high)', border: '1px solid rgba(194, 65, 76, 0.25)' }}>
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="kpi-card" onClick={onNavigateToTickets} style={{ cursor: 'pointer' }}>
          <div>
            <div className="kpi-label">Resolved Tickets</div>
            <div className="kpi-val" style={{ color: 'var(--status-resolved)' }}>
              {stats?.resolved || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed tickets</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--status-resolved-bg)', color: 'var(--status-resolved)', border: '1px solid rgba(59, 138, 102, 0.25)' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="card state-container" style={{ margin: '1rem 0' }}>
          <Inbox size={44} className="empty-icon" />
          <h3>No Ticket Data in Database</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
            There are currently no tickets matching the criteria in MongoDB. Create your first ticket or run the seed script to view analytics.
          </p>
        </div>
      ) : (
        /* Visual Breakdown Matrices */
        <div className="dist-grid">
          {/* Category Distribution Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem' }}>Category Distribution</h3>
            {Object.entries(categories).map(([cat, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              let fillBg = 'var(--cat-tech)';
              if (cat === 'Billing') fillBg = 'var(--cat-billing)';
              if (cat === 'Account Access') fillBg = 'var(--cat-access)';
              if (cat === 'General Inquiry') fillBg = 'var(--cat-general)';

              return (
                <div key={cat} className="dist-bar-item">
                  <div className="dist-bar-header">
                    <span style={{ fontWeight: 500 }}>{cat}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{count}</strong> ({pct}%)
                    </span>
                  </div>
                  <div className="dist-bar-track">
                    <div
                      className="dist-bar-fill"
                      style={{ width: `${pct}%`, background: fillBg }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status & Priority Matrices */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Status Breakdown */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Status Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {Object.entries(statuses).map(([st, count]) => (
                  <div
                    key={st}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span className={`badge badge-status-${st.toLowerCase().replace(/\s+/g, '-')}`}>
                      {st}
                    </span>
                    <strong style={{ fontSize: '1.1rem' }}>{count}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Priority Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {Object.entries(priorities).map(([pri, count]) => (
                  <div
                    key={pri}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span className={`badge badge-priority-${pri.toLowerCase()}`}>
                      {pri}
                    </span>
                    <strong style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>{count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
