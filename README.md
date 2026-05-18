# AssetFlow — Employee Inventory Management System

A full-stack web application for managing company assets (laptops, monitors, phones, accessories) with an **event-driven** architecture — all asset status is derived from an `asset_events` table, never stored directly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MySQL |
| Auth | JWT (JSON Web Tokens) |
| File Uploads | Multer |
| Charts | Recharts |

---

## Project Structure

```
employee-inventory-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Auth, validation, upload, error handler
│   │   ├── models/          # migrate.js, seed.js
│   │   ├── routes/          # Express routers
│   │   └── uploads/         # Uploaded damage photos
│   ├── .env
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/             # Axios client + endpoint functions
    │   ├── components/      # Sidebar, Modal, StatCard, Pagination...
    │   ├── context/         # AuthContext
    │   ├── pages/           # All page components
    │   └── utils/           # Helpers, formatters, badge components
    ├── .env
    └── package.json
```

---

## Quick Start

### Prerequisites
- **Node.js** v18+
- **MySQL** v8+ running locally
- A MySQL database named `employee_inventory`

---

### 1. Database Setup

Create the database in MySQL:
```sql
CREATE DATABASE employee_inventory;
```

---

### 2. Backend Setup

```bash
cd backend

# Copy env and fill in your DB credentials
copy .env.example .env

# Install dependencies
npm install

# Run migrations (creates all tables)
npm run migrate

# Seed default admin + sample data
npm run seed

# Start development server
npm run dev
```

> Backend runs on **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

> Frontend runs on **http://localhost:5173**

---

### 4. Login

| Field | Value |
|---|---|
| Email | `admin@company.com` |
| Password | `admin123` |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Assets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/assets` | List with search/filter/pagination |
| GET | `/api/assets/:id` | Single asset with derived status |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete (if not allocated) |

### Allocations / Returns / Damages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/allocations` | Active allocations |
| POST | `/api/allocations` | Allocate asset (validates in-stock) |
| POST | `/api/returns` | Return asset (validates allocated) |
| GET | `/api/damages` | All damage reports |
| POST | `/api/damages` | Submit damage report + photo upload |

### History
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/history` | All events (filterable by type) |
| GET | `/api/history/assets/:id` | Event history for one asset |
| GET | `/api/history/employees/:id` | Event history for one employee |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Stats, charts, low-stock alerts |

---

## Business Rules

- ✅ Asset status is **always derived** from the latest event — never stored directly
- ✅ An asset can only be allocated if its current status is **in_stock / returned**
- ✅ The **same asset cannot be allocated twice** (checked before creating event)
- ✅ Returns are only allowed if the asset is **currently allocated**
- ✅ Damage description must be **minimum 20 characters**
- ✅ Serial numbers must be **unique** (enforced at DB level)
- ✅ Allocation history is **never overwritten** — every action is a new event row

---

## Features

- 🔐 JWT Authentication
- 📊 Dashboard with charts (bar + pie) and low-stock alerts
- 📦 Asset CRUD with search, category filter, status filter, pagination
- 👤 Employee CRUD with per-employee history modal
- 🔗 Asset allocation with employee selection
- 🔄 Return management — process returns from active allocations list
- ⚠️ Damage reporting with photo upload and severity levels
- 📅 Full event history with event-type filter

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=employee_inventory
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```
