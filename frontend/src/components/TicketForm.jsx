// components/TicketForm.jsx
// -------------------------
// Modal form for creating a new support ticket or editing an existing one.
// Integrates live ML prediction:
//   - User types title & description
//   - Clicks "Auto-Predict" (or automatically triggered)
//   - Suggests category, priority, and confidence percentage
//   - User can accept suggestion or manually override values

import React, { useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { createTicket, updateTicket, predictTicket } from '../api/ticketsApi';
import PredictionBadge from './PredictionBadge';

const CATEGORIES = [
  'Technical Issue',
  'Billing',
  'Account Access',
  'General Inquiry',
];

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function TicketForm({ isOpen, onClose, onSuccess, initialTicket = null }) {
  const isEdit = Boolean(initialTicket);

  const [formData, setFormData] = useState({
    title: initialTicket?.title || '',
    description: initialTicket?.description || '',
    category: initialTicket?.category || 'Technical Issue',
    priority: initialTicket?.priority || 'Medium',
    status: initialTicket?.status || 'Open',
  });

  // Track ML prediction state separately from user selections
  const [mlPrediction, setMlPrediction] = useState({
    category: initialTicket?.mlCategory || null,
    priority: initialTicket?.mlPriority || null,
    confidence: initialTicket?.mlConfidence || null,
  });

  const [predicting, setPredicting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Check if current user selections differ from ML recommendation
  const isOverridden = Boolean(
    mlPrediction.category &&
    (formData.category !== mlPrediction.category || formData.priority !== mlPrediction.priority)
  );

  // ── Run ML Prediction ──────────────────────────────────────────────────────
  const handleAutoPredict = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      setError('Please enter a title or description first so the AI has context to predict.');
      return;
    }

    try {
      setPredicting(true);
      setError(null);
      const result = await predictTicket({
        title: formData.title,
        description: formData.description,
      });

      setMlPrediction({
        category: result.category,
        priority: result.priority,
        confidence: result.confidence,
      });

      // Automatically apply recommendation initially if creating new ticket
      if (!isEdit) {
        setFormData((prev) => ({
          ...prev,
          category: result.category,
          priority: result.priority,
        }));
      }
    } catch (err) {
      console.error('ML prediction error:', err);
      setError('AI prediction service unavailable. You can still select category & priority manually.');
    } finally {
      setPredicting(false);
    }
  };

  // ── Apply Suggestion button click ──────────────────────────────────────────
  const handleApplySuggestion = () => {
    if (mlPrediction.category && mlPrediction.priority) {
      setFormData((prev) => ({
        ...prev,
        category: mlPrediction.category,
        priority: mlPrediction.priority,
      }));
    }
  };

  // ── Form Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.title.trim().length < 3) {
      setError('Title must be at least 3 characters long.');
      return;
    }
    if (formData.description.trim().length < 10) {
      setError('Description must be at least 10 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        // ML fields are not editable via PATCH (audit preservation)
        const updated = await updateTicket(initialTicket._id, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          status: formData.status,
        });
        onSuccess(updated, 'Ticket updated successfully');
      } else {
        const payload = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          status: formData.status,
          mlCategory: mlPrediction.category,
          mlPriority: mlPrediction.priority,
          mlConfidence: mlPrediction.confidence,
        };
        const created = await createTicket(payload);
        onSuccess(created, 'Ticket created successfully');
      }
      onClose();
    } catch (err) {
      console.error('Failed to save ticket:', err);
      const msg = err.response?.data?.details
        ? err.response.data.details.map((d) => d.message).join(', ')
        : err.response?.data?.error || err.message || 'Failed to save ticket';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Ticket' : 'Create New Support Ticket'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title input */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-title">Title *</label>
            <input
              id="ticket-title"
              type="text"
              className="form-input"
              placeholder="e.g. Database connection timeout on production cluster"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Description input */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="ticket-description">Description *</label>
              {!isEdit && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAutoPredict}
                  disabled={predicting || (!formData.title && !formData.description)}
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', gap: '0.35rem' }}
                >
                  {predicting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} color="var(--accent-text)" />
                      AI Auto-Predict
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              id="ticket-description"
              className="form-textarea"
              placeholder="Provide a detailed explanation of the issue, urgency cues, or error logs..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* ML Prediction Badge (if available) */}
          {mlPrediction.category && (
            <PredictionBadge
              category={mlPrediction.category}
              priority={mlPrediction.priority}
              confidence={mlPrediction.confidence}
              isOverridden={isOverridden}
              onApply={isOverridden ? handleApplySuggestion : null}
            />
          )}

          {/* Category & Priority Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="ticket-category">Category *</label>
              <select
                id="ticket-category"
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ticket-priority">Priority *</label>
              <select
                id="ticket-priority"
                className="form-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>{pri}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status (shown in edit or create) */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-status">Status</label>
            <select
              id="ticket-status"
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Update Ticket' : 'Create Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
