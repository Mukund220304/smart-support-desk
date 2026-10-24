// components/TicketList.jsx
// -----------------------
// Paginated, searchable, and filterable list of support tickets.
// Supports:
//   - Keyword search across title and description
//   - Filter by Category, Priority, and Status
//   - Server-side Pagination (page, limit)
//   - 4 UI states: Loading, Error, Empty, and Success

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  Inbox,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchTickets, deleteTicket } from '../api/ticketsApi';

const CATEGORIES = [
  'All Categories',
  'Technical Issue',
  'Billing',
  'Account Access',
  'General Inquiry',
];

const PRIORITIES = ['All Priorities', 'High', 'Medium', 'Low'];
const STATUSES = ['All Statuses', 'Open', 'In Progress', 'Resolved', 'Closed'];

export default function TicketList({
  onSelectTicket,
  onOpenCreate,
  refreshTrigger = 0,
}) {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [priority, setPriority] = useState('All Priorities');
  const [status, setStatus] = useState('All Statuses');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        sortBy: '-createdAt',
      };

      if (search.trim()) params.search = search.trim();
      if (category !== 'All Categories') params.category = category;
      if (priority !== 'All Priorities') params.priority = priority;
      if (status !== 'All Statuses') params.status = status;

      const data = await fetchTickets(params);
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError(err.response?.data?.error || err.message || 'Unable to connect to tickets API');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, category, priority, status]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets, refreshTrigger]);

  const handleDelete = async (e, ticket) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ticket: "${ticket.title}"?`)) {
      return;
    }
    try {
      await deleteTicket(ticket._id);
      loadTickets();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete ticket.');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All Categories');
    setPriority('All Priorities');
    setStatus('All Statuses');
    setPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Toolbar */}
      <div className="toolbar">
        {/* Search bar */}
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search tickets by title, keywords or error code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Dropdown Filters & Create Button */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            aria-label="Filter by category"
            className="select-filter"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            aria-label="Filter by priority"
            className="select-filter"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            className="select-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadTickets}
            title="Refresh list"
            style={{ padding: '0.6rem 0.75rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenCreate}
            style={{ gap: '0.4rem' }}
          >
            <Plus size={18} /> New Ticket
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button type="button" className="btn btn-secondary" onClick={loadTickets} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card state-container" style={{ padding: '3rem 1rem' }}>
          <RefreshCw size={32} className="empty-icon animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading tickets from database...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && tickets.length === 0 && (
        <div className="card state-container">
          <Inbox size={48} className="empty-icon" />
          <h3>No Tickets Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
            {search || category !== 'All Categories' || priority !== 'All Priorities' || status !== 'All Statuses'
              ? 'No tickets match your active search and filter criteria.'
              : 'Your support desk is clean. Create your first support ticket to get started.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            {(search || category !== 'All Categories' || priority !== 'All Priorities' || status !== 'All Statuses') && (
              <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
                Clear Filters
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onOpenCreate}>
              <Plus size={16} /> Create Ticket
            </button>
          </div>
        </div>
      )}

      {/* Success State: Data Table */}
      {!loading && tickets.length > 0 && (
        <div className="table-container">
          <table className="tickets-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t._id} onClick={() => onSelectTicket(t._id)}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    #{t._id.slice(-6)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                      {t.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '450px',
                      }}
                    >
                      {t.description}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-category-${t.category.toLowerCase().replace(/\s+/g, '-')}`}>
                      {t.category}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-priority-${t.priority.toLowerCase()}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-status-${t.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {formatDate(t.createdAt)}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={() => onSelectTicket(t._id)}
                        title="View details & audit history"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={(e) => handleDelete(e, t)}
                        title="Delete ticket"
                        style={{ color: 'var(--priority-high)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {!loading && total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{tickets.length}</strong> of <strong>{total}</strong> tickets
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', padding: '0 0.5rem' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
