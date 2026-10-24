// App.jsx
// -------
// Main application layout, view switching, and modal coordinator.
// Ties together:
//   - LandingPage (public-facing overview explaining the problem & ML solution)
//   - Dashboard (live aggregation metrics from MongoDB)
//   - TicketList (search, filter, pagination)
//   - TicketForm (create/edit with ML auto-prediction & overrides)
//   - TicketDetail (details, quick status change, activity timeline)

import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  BarChart3,
  Ticket as TicketIcon,
  Compass,
  Plus,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import TicketForm from './components/TicketForm';
import TicketDetail from './components/TicketDetail';
import useSocket from './hooks/useSocket';

export default function App() {
  // Determine initial tab from window hash or default to landing page
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'dashboard' || hash === 'tickets') {
      return hash;
    }
    return 'landing';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Success toast message
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'landing') {
      window.history.pushState(null, '', '/');
    } else {
      window.location.hash = tab;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync with browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'dashboard' || hash === 'tickets') {
        setActiveTab(hash);
      } else {
        setActiveTab('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleMutationSuccess = (ticket, message) => {
    showToast(message);
    // Increment trigger to re-fetch dashboard aggregation and ticket list
    setRefreshTrigger((prev) => prev + 1);
  };

  // Real-time synchronization: when another client modifies a ticket
  const handleSocketEvent = useCallback((action, data) => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useSocket(handleSocketEvent);

  return (
    <div className="app-layout">
      {/* Top Navigation Bar */}
      <nav className="navbar">
        <a
          href="#"
          className="nav-brand"
          onClick={(e) => {
            e.preventDefault();
            handleTabChange('landing');
          }}
        >
          <div className="brand-icon">
            <LifeBuoy size={18} />
          </div>
          <div>
            <span className="brand-title">Smart Support Desk</span>
            <span className="brand-badge">ML Triage</span>
          </div>
        </a>

        {/* View Switcher Tabs */}
        <div className="nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'landing' ? 'active' : ''}`}
            onClick={() => handleTabChange('landing')}
          >
            <Compass size={15} /> Overview
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
          >
            <BarChart3 size={15} /> Dashboard
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => handleTabChange('tickets')}
          >
            <TicketIcon size={15} /> Tickets
          </button>
        </div>

        {/* Quick Top-Right Action */}
        <div>
          {activeTab === 'landing' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleTabChange('dashboard')}
              style={{ gap: '0.4rem', fontSize: '0.85rem' }}
            >
              Open Dashboard <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCreateOpen(true)}
              style={{ gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> New Ticket
            </button>
          )}
        </div>
      </nav>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '4.5rem',
            right: '2rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--accent-border)',
            color: 'var(--text-primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 60,
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={17} color="var(--accent-text)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'landing' && (
          <LandingPage
            onOpenDashboard={() => handleTabChange('dashboard')}
            onOpenTickets={() => handleTabChange('tickets')}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigateToTickets={() => handleTabChange('tickets')}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'tickets' && (
          <TicketList
            onSelectTicket={(id) => setSelectedTicketId(id)}
            onOpenCreate={() => setIsCreateOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>

      {/* Modal: Create Ticket */}
      {isCreateOpen && (
        <TicketForm
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(ticket, msg) => handleMutationSuccess(ticket, msg)}
        />
      )}

      {/* Modal: Edit Ticket */}
      {editingTicket && (
        <TicketForm
          isOpen={Boolean(editingTicket)}
          initialTicket={editingTicket}
          onClose={() => setEditingTicket(null)}
          onSuccess={(ticket, msg) => handleMutationSuccess(ticket, msg)}
        />
      )}

      {/* Modal: Ticket Details & Activity Audit Log */}
      {selectedTicketId && (
        <TicketDetail
          ticketId={selectedTicketId}
          isOpen={Boolean(selectedTicketId)}
          onClose={() => setSelectedTicketId(null)}
          onEdit={(ticket) => setEditingTicket(ticket)}
          onDeleteSuccess={(id, msg) => handleMutationSuccess({ _id: id }, msg)}
          onStatusChangeSuccess={(updated) =>
            handleMutationSuccess(updated, `Status updated to "${updated.status}"`)
          }
        />
      )}
    </div>
  );
}
