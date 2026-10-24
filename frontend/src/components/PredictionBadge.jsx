// components/PredictionBadge.jsx
// ------------------------------
// Visual badge displaying the ML classification prediction and confidence score.
// Indicates whether the suggestion was accepted by the user or manually overridden.

import React from 'react';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export default function PredictionBadge({
  category,
  priority,
  confidence,
  isOverridden = false,
  onApply = null,
}) {
  if (!category && !priority) return null;

  const percent = confidence !== null && confidence !== undefined
    ? Math.round(confidence * 100)
    : null;

  return (
    <div className="prediction-banner">
      <div className="prediction-header">
        <div className="prediction-title">
          <Sparkles size={15} color="var(--accent-text)" />
          <span>AI Classification Suggestion</span>
        </div>
        {percent !== null && (
          <span className="confidence-pill">
            {percent}% confidence
          </span>
        )}
      </div>

      <div className="prediction-body">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {category && (
            <span className={`badge badge-category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
              {category}
            </span>
          )}
          {priority && (
            <span className={`badge badge-priority-${priority.toLowerCase()}`}>
              {priority} Priority
            </span>
          )}

          {isOverridden ? (
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={14} /> Manually Overridden
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle size={14} /> Recommended
            </span>
          )}
        </div>

        {onApply && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onApply}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
          >
            Apply Suggestion
          </button>
        )}
      </div>
    </div>
  );
}
