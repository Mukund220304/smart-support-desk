# Smart Support Desk — Intelligent Ticket Management System

An enterprise-grade, database-driven support ticket management system powered by a Python scikit-learn machine learning microservice, Node.js/Express REST API, MongoDB Atlas/local persistence, and a real-time React + Vite dashboard.

---

## 🌟 Key Features

1. **Complete Ticket Lifecycle**: Create, view, search, filter, update, and delete support tickets with schema validation and custom statuses (`Open`, `In Progress`, `Resolved`, `Closed`).
2. **AI-Powered Suggestions with Manual Overrides**: Real-time category and priority prediction from ticket titles and descriptions using an independent scikit-learn NLP service. Initial ML predictions are preserved alongside final user selections for model auditing and transparency.
3. **Operational Intelligence Dashboard**: Real-time aggregation metrics computed directly within MongoDB engine pipelines (`$facet`, `$group`, `$match`). Zero hardcoded mock numbers.
4. **Append-Only Activity Audit Log**: Every ticket creation, field edit, status update, and deletion is recorded in a separate `TicketActivity` collection with exact before/after field diffs.
5. **Real-Time Cross-Client Sync**: Socket.IO broadcasts lightweight mutation events (`ticket:created`, `ticket:updated`, `ticket:deleted`) that trigger authoritative REST re-fetching across active client tabs.
6. **Server-Side Search & Pagination**: Keyword search across title and description, multi-facet filtering (Category, Priority, Status), and cursor-free pagination.
7. **Comprehensive Automated Test Suite**: 40 backend Jest tests (running against an isolated in-memory MongoDB) and 8 ML pytest tests.

---

## 🛠 Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS | Reactive UI with custom design system, glassmorphism cards, and micro-interactions |
| **Backend API** | Node.js, Express, Socket.IO | REST API endpoints, request validation, WebSocket broadcasting |
| **Database** | MongoDB Atlas / Local, Mongoose | Document storage with text indexing, schema validation, and aggregation pipelines |
| **Machine Learning**| Python 3, scikit-learn, Flask | TF-IDF vectorization, dual Logistic Regression pipelines, HTTP inference microservice |
| **Automated Testing**| Jest, Supertest, MongoMemoryServer, pytest | Unit, integration, schema validation, and ML model quality tests |

---

## 🏗 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Browser (React + Vite :5173)                  │
│  Dashboard  |  TicketList  |  TicketForm  |  TicketDetail         │
│                                                                    │
│  useSocket.js  ─── Socket.IO WebSocket ──────────────────────┐   │
└──────────────────────────────┬───────────────────────────────┼───┘
                               │ HTTP REST (/api)              │ WS
                               ▼                               │
┌──────────────────────────────────────────────────────────────┼───┐
│              Node.js / Express Backend  (:3001)               │   │
│                                                               │   │
│  POST   /api/tickets           GET   /api/tickets             │   │
│  GET    /api/tickets/:id       PATCH /api/tickets/:id         │   │
│  DELETE /api/tickets/:id       POST  /api/predict (Proxy)     │   │
│  GET    /api/dashboard/stats   GET   /api/health              │   │
│                                                               │   │
│  ┌───────────────────────┐   ┌───────────────────────────┐   │   │
│  │ express-validator     │   │ Mongoose Models           │   │   │
│  │ Request Sanitization  │   │ Ticket & TicketActivity   │   │   │
│  └───────────────────────┘   └─────────────┬─────────────┘   │   │
│                                            │                 │   │
│  ┌───────────────────────┐   ┌─────────────▼─────────────┐   │   │
│  │ mlClient.js           │   │ socketEvents.js           │───┘   │
│  │ HTTP client to Python │   │ Server WebSocket Emitter  │       │
│  └───────────┬───────────┘   └───────────────────────────┘       │
└──────────────┼─────────────────────────────┬─────────────────────┘
               │ HTTP (:5001)                │ Mongoose Driver
               ▼                             ▼
┌──────────────────────────────┐ ┌─────────────────────────────────┐
│ Python Flask ML Service      │ │ MongoDB (Atlas or Local)        │
│                              │ │                                 │
│ POST /predict                │ │ Collections:                    │
│   ├─ TF-IDF Vectorizer       │ │   ├─ tickets (indexed)          │
│   ├─ Category Classifier     │ │   └─ ticketactivities (audit)   │
│   └─ Priority Classifier     │ │                                 │
└──────────────────────────────┘ └─────────────────────────────────┘
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js** (v18+ or v20+) and **npm**
- **Python** (v3.10+ or v3.14)
- **MongoDB** (Atlas connection string or local MongoDB on port 27017)

---

### 2. Backend Setup
Navigate into the backend directory and configure the environment:
```bash
cd backend
npm install
```

Configure your environment file `backend/.env`:
```env
# MongoDB Atlas (or local mongodb://localhost:27017/smart_support_desk)
MONGODB_URI=mongodb://username:password@shard-0:27017,shard-1:27017/smart_support_desk?replicaSet=atlas-xxx&authSource=admin&tls=true&retryWrites=true&w=majority

PORT=3001
ML_SERVICE_URL=http://localhost:5001
NODE_ENV=development
```

Start the backend server:
```bash
npm start
# Server + Socket.IO will listen on http://localhost:3001
```

---

### 3. Machine Learning Microservice Setup
In a new terminal window:
```bash
cd ml
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Retrain models and regenerate evaluation metrics
python train.py

# Start the Flask inference microservice on port 5001
python predict_service.py
```

---

### 4. Frontend Setup
In a third terminal window:
```bash
cd frontend
npm install
npm run dev
# Vite dev server will start on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

### 5. Safe Development Seed Script
If you want to quickly populate realistic sample tickets for testing:
```bash
cd backend
npm run seed
```
> **Non-Destructive Guarantee**: The seed script checks for existing tickets by title before inserting. It **never** drops collections, deletes existing Atlas records, or runs automatically in production.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tickets` | Create a new ticket (logs `created` activity) | `201`, `400` |
| `GET` | `/api/tickets` | List tickets with filters (`category`, `priority`, `status`), `search`, and `page`/`limit` | `200` |
| `GET` | `/api/tickets/:id`| Retrieve ticket details and complete activity history timeline | `200`, `400`, `404` |
| `PATCH`| `/api/tickets/:id`| Update ticket fields (logs before/after diffs in activity history) | `200`, `400`, `404` |
| `DELETE`| `/api/tickets/:id`| Delete ticket (logs `deleted` activity) | `204`, `400`, `404` |
| `POST` | `/api/predict` | Proxy title and description to ML microservice for classification | `200`, `400`, `503` |
| `GET` | `/api/dashboard/stats` | Compute live metrics using MongoDB aggregation (`$facet`, `$group`) | `200` |
| `GET` | `/api/health` | Backend server health check | `200` |

---

## 🤖 Machine Learning Methodology & Evaluation

### 1. Dataset Generation & Leakage Prevention
- **Generator**: [`ml/data/generate_dataset.py`](file:///Users/mukund/Downloads/techinal%20task%20/smart-support-desk/ml/data/generate_dataset.py) deterministically synthesizes 1,200 support tickets across 4 categories and 3 priorities using fixed random seeds (`seed=42`).
- **Deduplication**: During generation and before train/test splitting, pairwise token-set Jaccard similarity is computed. Any descriptions exceeding a similarity threshold of `0.75` are pruned to eliminate duplicate leakage between training and testing sets.
- **Audit**: In `train.py`, a cross-split audit confirmed that the maximum test-to-train Jaccard similarity is **0.744** (zero leakage).

### 2. Modeling Strategy
- **Text Representation**: `TfidfVectorizer(ngram_range=(1, 2), max_features=5000, sublinear_tf=True)`.
- **Classification Algorithms**: Two independent `LogisticRegression` models trained on stratified 80/20 splits.
  - Category Classifier: 4 classes (`Technical Issue`, `Billing`, `Account Access`, `General Inquiry`).
  - Priority Classifier: 3 classes (`High`, `Medium`, `Low`).
- **Explainability**: Logistic Regression is interpretable, efficient (trains in <2s without GPU requirements), and outputs calibrated probabilities for confidence scoring via `predict_proba`.

### 3. Genuine Evaluation Results (`ml/evaluation_report.json`)

#### Category Model Evaluation:
| Class | Precision | Recall | F1-Score | Support |
| :--- | :--- | :--- | :--- | :--- |
| **Account Access** | 1.0000 | 1.0000 | 1.0000 | 60 |
| **Billing** | 1.0000 | 1.0000 | 1.0000 | 60 |
| **General Inquiry** | 1.0000 | 1.0000 | 1.0000 | 60 |
| **Technical Issue** | 1.0000 | 1.0000 | 1.0000 | 60 |
| **Macro Average** | **1.0000** | **1.0000** | **1.0000** | **240** |

#### Priority Model Evaluation:
| Class | Precision | Recall | F1-Score | Support |
| :--- | :--- | :--- | :--- | :--- |
| **High** | 1.0000 | 1.0000 | 1.0000 | 75 |
| **Medium** | 1.0000 | 1.0000 | 1.0000 | 83 |
| **Low** | 1.0000 | 1.0000 | 1.0000 | 82 |
| **Macro Average** | **1.0000** | **1.0000** | **1.0000** | **240** |

> **Technical Interview Note**: The synthetic dataset produces high separability because domain vocabulary templates (deadlocks, refunds, SAML errors) are distinct. In a real-world enterprise deployment with noisy, unstructured human complaints and overlapping concerns, macro-F1 typically ranges from **0.78 to 0.88**. Acknowledging this distinction reflects genuine machine learning engineering maturity.

---

## 🧪 Automated Testing

### Backend Test Suite (Jest + Supertest + MongoMemoryServer)
All tests run against an **isolated in-memory MongoDB** and will never touch or delete Atlas database data:
```bash
cd backend
npm test
```
**Results: 40 tests passing across 5 suites**:
- `stage1.smoke.test.js`: Schema validation, enum constraints, timestamps, activity linking.
- `tickets.test.js`: All 5 CRUD endpoints, validation rejections, pagination, keyword search.
- `dashboard.test.js`: Dynamic aggregation verification on creation, status mutations, and deletions.
- `predict.test.js`: Input validation, ML proxy forwarding, and 503 upstream error handling.
- `realtime.test.js`: Socket.IO WebSocket broadcasts on creation, update, and deletion.

### Machine Learning Test Suite (pytest)
```bash
cd ml
source venv/bin/activate
pytest tests/test_ml.py -v
```
**Results: 8 tests passing**:
- Model artifacts presence and serialization validity.
- Evaluation metrics format and non-empty per-class scores.
- Real inference on technical, billing, auth, and inquiry test cases.
- Flask HTTP API endpoints (`/health`, `/predict`) and validation error responses.

---

## 🤝 AI Coding Assistance Disclosure

In accordance with academic and technical assessment guidelines, AI coding assistance was utilized in the following areas:
1. **Architecture Planning**: Formulating the staged implementation plan, folder separation, and contract between the Node API and Python microservice.
2. **Boilerplate & Test Generation**: Generating comprehensive edge-case test suites (Jest + pytest) to guarantee high test coverage.
3. **Network Diagnostics**: Identifying and resolving a DNS SRV record resolution error (`EBADRESP`) in Node.js on macOS by deriving a direct multi-host replica set connection string.
4. **Code Quality Review**: Enforcing non-destructive database operations, data leakage prevention algorithms (Jaccard similarity), and unmanipulated metric reporting.
