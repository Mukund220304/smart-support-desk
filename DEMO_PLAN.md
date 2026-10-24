# Smart Support Desk — 3–5 Minute Technical Interview Demo Plan

This guide provides a structured, high-impact demonstration script designed for live technical interviews. Follow these steps sequentially to showcase the full-stack architecture, machine learning capabilities, real-time synchronization, and automated testing.

---

## ⏱ Demo Outline & Timeline

| Time | Phase | Focus |
| :--- | :--- | :--- |
| **0:00 – 0:45** | Architecture Overview | Tech stack, microservice separation, MongoDB persistence |
| **0:45 – 1:45** | AI Classification & Override | ML inference, `PredictionBadge`, manual override preservation |
| **1:45 – 2:45** | Ticket Lifecycle & Audit History | Live status change, append-only `TicketActivity` timeline |
| **2:45 – 3:45** | Operational Dashboard & Real-Time | MongoDB aggregation (`$facet`), multi-client Socket.IO sync |
| **3:45 – 4:30** | Testing & ML Quality Validation | Running Jest (40 tests) and pytest (8 tests), zero-leakage deduplication |

---

## 🎬 Step-by-Step Walkthrough Script

### Phase 1: Architecture Overview (0:00 – 0:45)
1. **Show running processes**:
   - Backend on `http://localhost:3001` (Node.js + Express + Socket.IO).
   - Python ML microservice on `http://localhost:5001` (Flask + scikit-learn).
   - Frontend on `http://localhost:5173` (React + Vite).
2. **What to say**:
   > *"Smart Support Desk is an intelligent ticket management system. I designed it using a decoupled architecture: Node.js handles REST routing, business logic, and real-time Socket.IO broadcasts; MongoDB persists tickets and audit history; and an independent Python Flask service handles NLP inference using scikit-learn. This separation of concerns allows the ML model to be updated or retrained without touching the primary web backend."*

---

### Phase 2: AI Classification with Manual Override (0:45 – 1:45)
1. In the browser, navigate to the **Tickets** tab and click **"+ New Ticket"**.
2. Type an example:
   - **Title**: `Production database connection timeout on checkout cluster`
   - **Description**: `CRITICAL: The main PostgreSQL cluster has exhausted its connection pool. Customers are unable to complete purchases and errors are spiking.`
3. Click **"AI Auto-Predict"**.
4. Point out the **`PredictionBadge`**:
   - Category automatically suggested: **Technical Issue**
   - Priority automatically suggested: **High**
   - Confidence percentage: **~98%**
5. Demonstrate **Manual Override**:
   - Change Priority to **"Low"** manually.
   - Show how the badge dynamically changes from *"Recommended"* to *"Manually Overridden"*.
6. Click **"Create Ticket"**.
7. **What to say**:
   > *"When the user writes a description, the frontend calls POST /api/predict which proxies to our Python NLP pipeline. A key UX and data integrity decision I made was storing both `category`/`priority` (the user's final decision) and `mlCategory`/`mlPriority` (the AI's initial suggestion) as separate fields in MongoDB. This preserves full auditability so we can measure real-world model accuracy over time."*

---

### Phase 3: Ticket Lifecycle & Activity Audit History (1:45 – 2:45)
1. Click on the newly created ticket row to open the **Ticket Details** modal.
2. Note the initial AI prediction vs. current status.
3. Use the **Update Status** dropdown to change status from **"Open"** to **"In Progress"**, then **"Resolved"**.
4. Scroll down to the **Activity History** timeline:
   - Point out the append-only logs with timestamps and exact before/after diffs (`status: "Open" → "In Progress"`).
5. **What to say**:
   > *"Every mutation generates an immutable record in our separate `TicketActivity` collection. We track exact field diffs without storing unnecessary PII. Keeping this in a dedicated collection ensures that general ticket queries remain lightweight, while full audit timelines are queried on demand."*

---

### Phase 4: Operational Dashboard & Real-Time Sync (2:45 – 3:45)
1. Click the **Dashboard** tab.
2. Point out:
   - Live KPI cards: Total Tickets, Active Workload, High Priority, Resolved.
   - Real-time Category Distribution bars and percentage breakdowns.
3. Open a **second browser tab or incognito window** side-by-side:
   - Delete or create a ticket in tab 1.
   - Show tab 2 instantly updating its counts without requiring a manual page refresh.
4. **What to say**:
   > *"The dashboard figures are computed entirely on the database engine using MongoDB aggregation pipelines with `$facet` and `$group`—there are zero hardcoded mock statistics. For real-time updates across multiple operators, I implemented Socket.IO. We follow an authoritative data pattern: the server broadcasts only lightweight notification hints (`ticket:created`), and clients trigger a targeted re-fetch from the API, eliminating data desynchronization."*

---

### Phase 5: Automated Testing & ML Quality Validation (3:45 – 4:30)
1. In your terminal, run the backend tests:
   ```bash
   cd backend && npm test
   ```
   - Highlight **40 passed tests** across 5 suites (including CRUD, input validation, aggregation math, and Socket.IO).
   - Point out that tests use `mongodb-memory-server` and run isolated in-memory without touching production/Atlas.
2. Run the ML tests:
   ```bash
   cd ml && pytest tests/test_ml.py -v
   ```
   - Highlight **8 passed tests** validating model serialization, real inference, and zero train/test data leakage (Jaccard similarity < 0.75).
3. **Closing statement**:
   > *"All 48 automated tests pass consistently across both runtimes. The ML pipeline includes automated Jaccard deduplication to prevent near-duplicate sentence leakage between training and evaluation splits."*

---

## ❓ Probable Interview Questions & Suggested Answers

### Q1: Why did you choose MongoDB over a relational database like PostgreSQL?
> **Answer**: *"For a support desk application, tickets frequently evolve (such as adding custom metadata, dynamic tags, or ML confidence scores), and activity histories are natural document models. MongoDB's Aggregation Framework (`$facet`, `$group`) allows us to calculate all multi-dimensional dashboard metrics in a single database round-trip without complex SQL multi-table joins."*

### Q2: Why TF-IDF and Logistic Regression instead of an LLM or deep transformer?
> **Answer**: *"Logistic Regression trained on TF-IDF n-grams is lightweight, deterministic, and trains in under two seconds on a CPU without requiring external API keys or heavy GPU infrastructure. It outputs calibrated probability estimates via `predict_proba` for confidence scores. For a production deployment, we could easily swap this pipeline for a fine-tuned DistilBERT model behind the same Flask `/predict` contract without altering any Node.js code."*

### Q3: How do you handle WebSocket connection drops?
> **Answer**: *"Our Socket.IO client has auto-reconnection configured with exponential backoff. Crucially, our architecture does not rely on the WebSocket payload as the single source of truth; socket events only act as invalidation signals that prompt the UI to execute an authoritative REST GET request."*
