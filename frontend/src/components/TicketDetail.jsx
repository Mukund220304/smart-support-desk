// components/TicketDetail.jsx
// ---------------------------
// Single ticket view displaying full information, quick status changer,
// and complete append-only Activity History Timeline (audit log).

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Loader2,
  History,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { fetchTicketById, updateTicket, deleteTicket } from '../api/ticketsApi';

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function TicketDetail({
  ticketId,
  isOpen,
  onClose,
  onEdit,
  onDeleteSuccess,
  onStatusChangeSuccess,
}) {
  const [ticket, setTicket] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTicketById(ticketId);
      setTicket(data.ticket);
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Failed to load ticket details:', err);
      setError('Unable to load ticket details from database.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (isOpen) {
      loadTicket();
    }
  }, [isOpen, loadTicket]);

  if (!isOpen) return null;

  // ── Handle Quick Status Change ─────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (!ticket || newStatus === ticket.status) return;
    try {
      setUpdatingStatus(true);
      const updated = await updateTicket(ticket._id, { status: newStatus });
      setTicket(updated);
      // Reload activity log so the status_changed event appears on timeline
      const fresh = await fetchTicketById(ticket._id);
      setActivities(fresh.activities || []);
      if (onStatusChangeSuccess) onStatusChangeSuccess(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update ticket status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Handle Delete ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ticket: "${ticket.title}"?`)) {
      return;
    }
    try {
      setDeleting(true);
      await deleteTicket(ticket._id);
      onDeleteSuccess(ticket._id, 'Ticket deleted successfully');
      onClose();
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      setError('Failed to delete ticket from database.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              #{ticket?._id?.slice(-6) || '...'}
            </span>
            <h3>Ticket Details</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close details">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="state-container" style={{ padding: '3rem 1rem' }}>
            <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" />
            <p style={{ color: 'var(--text-secondary)' }}>Loading ticket and audit history...</p>
          </div>
        ) : error && !ticket ? (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : ticket ? (
          <div>
            {/* Title & Badges */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.65rem', lineHeight: '1.3' }}>
                {ticket.title}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge badge-category-${ticket.category.toLowerCase().replace(/\s+/g, '-')}`}>
                  {ticket.category}
                </span>
                <span className={`badge badge-priority-${ticket.priority.toLowerCase()}`}>
                  {ticket.priority} Priority
                </span>
                <span className={`badge badge-status-${ticket.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {ticket.status}
                </span>
              </div>
            </div>

            {/* Description Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.5rem',
                fontSize: '0.95rem',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
              }}
            >
              {ticket.description}
            </div>

            {/* Quick Status Bar & Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Update Status:
                </span>
                <select
                  className="form-select"
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updatingStatus}
                  style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                {updatingStatus && <Loader2 size={16} className="animate-spin" />}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    onClose();
                    onEdit(ticket);
                  }}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>

            {/* Metadata & AI Audit Card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.75rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                  <Calendar size={13} /> Created At
                </div>
                <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem', fontWeight: 500 }}>
                  {formatDate(ticket.createdAt)}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                  <Clock size={13} /> Last Updated
                </div>
                <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem', fontWeight: 500 }}>
                  {formatDate(ticket.updatedAt)}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-text)' }}>
                  <Sparkles size={13} /> Initial ML Prediction
                </div>
                <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem', fontWeight: 500 }}>
                  {ticket.mlCategory
                    ? `${ticket.mlCategory} (${ticket.mlPriority}) • ${Math.round((ticket.mlConfidence || 0) * 100)}%`
                    : 'Manual (No ML)'}
                </div>
              </div>
            </div>

            {/* Activity History Timeline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <History size={18} color="var(--accent-primary)" />
                <h4 style={{ fontSize: '1rem' }}>Activity History ({activities.length})</h4>
              </div>

              {activities.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity logged yet.</p>
              ) : (
                <div className="timeline">
                  {activities.map((act) => (
                    <div key={act._id} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-action">
                            {act.action.replace('_', ' ')}
                          </span>
                          <span className="timeline-time">{formatDate(act.createdAt)}</span>
                        </div>
                        {act.summary && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {act.summary}
                          </div>
                        )}
                        {act.changes && Object.keys(act.changes).length > 0 && (
                          <div className="timeline-diff">
                            {Object.entries(act.changes).map(([field, diff]) => (
                              <div key={field} style={{ marginTop: '0.2rem' }}>
                                <strong>{field}:</strong>{' '}
                                <span style={{ color: '#f87171' }}>"{diff.from}"</span> →{' '}
                                <span style={{ color: '#4ade80' }}>"{diff.to}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
