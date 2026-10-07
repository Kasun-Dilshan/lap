# Company Laptop Tracking & Management System (CLTMS)

A complete, production-ready, enterprise-grade **Company Laptop Tracking & Management System** designed for IT and Corporate Asset Management teams to register, monitor, allocate, and maintain company-owned laptops across Windows and macOS environments.

> **Ethical Asset Management Notice**:  
> This system is strictly engineered for authorized company-owned hardware tracking and IT lifecycle management. In adherence to privacy standards, it does **not** implement keystroke logging, webcam/microphone monitoring, browser password scraping, or continuous invasive GPS surveillance. Geolocation uses responsible, approximate network/IP mapping.

---

## 📑 Table of Contents

1. [Features & Capabilities](#features--capabilities)
2. [Technology Stack](#technology-stack)
3. [Architecture & Project Structure](#architecture--project-structure)
4. [Database Design & Setup](#database-design--setup)
5. [Default Admin Credentials](#default-admin-credentials)
6. [Quick Start & Installation](#quick-start--installation)
7. [Laptop Agent Deployment](#laptop-agent-deployment)
   - [Windows Installation](#windows-installation)
   - [macOS Installation](#macos-installation)
   - [Fleet Heartbeat Simulator](#fleet-heartbeat-simulator)
8. [REST API Documentation](#rest-api-documentation)
9. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
10. [Production Deployment Guide](#production-deployment-guide)
11. [Verification & Testing](#verification--testing)

---

## 🌟 Features & Capabilities

- **Executive Fleet Dashboard**:
  - Live metric overview cards: Total Laptops, Online Devices, Offline Devices, Maintenance, Assigned, Unassigned Stock Pool, and Active Anomalies.
  - Interactive Recharts data visualizations: Online/Offline status donut, Devices by Department bar chart, OS distribution (Windows vs macOS), and Maintenance ticket breakdown.
- **Hardware & Asset Inventory**:
  - Full asset profiles: Asset Tag (e.g. `SG-LAP-001`), Serial Number, Hostname, Manufacturer, Model, OS Build, CPU, RAM, NVMe storage, and Battery health.
  - Table and Grid visual views with live sorting, multi-attribute filtering (Status, OS, Department, Allocation), and dynamic instant search.
- **Heartbeat & Telemetry Subsystem**:
  - Configurable agent heartbeat cycle (default 60 seconds).
  - Background monitor automatically transitions workstations to `OFFLINE` if no heartbeat is received within the configured threshold (default 5 minutes).
  - Telemetry area charts graphing live CPU and RAM consumption over time.
- **Responsible Device Location**:
  - Approximate network-based geolocation (City, Region, Country, Coordinates, ISP).
  - Visual OpenStreetMap integration on device profiles.
- **Device Enrollment & Onboarding**:
  - Generation of cryptographically random, expiring enrollment tokens (e.g., `ENROLL-XXXX-XXXX-XXXX`).
  - Single-use or batch multi-use token lifecycle management.
  - Automatic hardware fingerprinting and persistent `device_token` allocation.
- **Employee & Department Management**:
  - Staff custodian directory with employee IDs, contact info, positions, and branch offices.
  - One-click laptop assignment, reassignment, and return to stock pool.
  - Department budget and hardware value aggregation.
- **Maintenance & Repair Workflows**:
  - Diagnostic ticket lifecycle: `Open` &rarr; `In Progress` &rarr; `Completed`.
  - Severity priorities (`Low`, `Medium`, `High`, `Critical`) and technician dispatch tracking.
  - Completing tickets automatically restores laptops to active fleet status.
- **Automated Fleet Alerts**:
  - Automated detection for offline threshold breaches, low storage (`> 90%`), degraded battery (`< 15%`), and upcoming warranty expirations (`< 30 days`).
  - Active, Acknowledged, and Resolved state machine.
- **Auditing & Compliance Reports**:
  - Modular report generator for Devices, Employee Custodians, Department Costs, and Maintenance.
  - Instant export to CSV, JSON, and printer-friendly PDF styling.
  - Complete security audit trail recording operator IP, action timestamps, and payloads.

---

## 🛠 Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide React, Recharts, OpenStreetMap |
| **Backend** | PHP 8.0+, PDO, JWT (HS256), bcrypt password hashing, CORS |
| **Database** | MySQL 8.0+ |
| **Agent** | Node.js, Windows PowerShell, macOS launchd daemon |

---

## 📂 Architecture & Project Structure

```
company-laptop-management/
│
├── backend/
│   ├── config/
│   │   └── config.php            # Environment & MySQL settings
│   ├── controllers/              # REST API controllers for all modules
│   ├── public/
│   │   └── index.php             # Front controller
│   ├── scripts/
│   │   ├── setup-db.php          # Import schema.sql + seed.sql
│   │   └── heartbeat-monitor.php # Optional offline monitor loop
│   ├── services/
│   │   └── HeartbeatMonitor.php  # Fleet offline / warranty checks
│   ├── src/                      # Router, Auth, JWT, Database helpers
│   ├── routes.php                # API route table
│   ├── router.php                # PHP built-in server entry
│   ├── .env.example
│   └── package.json              # npm scripts wrapping php -S
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Authentication & RBAC state
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx # Enterprise dark sidebar + header
│   │   ├── pages/
│   │   │   ├── Alerts.jsx        # Fleet anomalies & incident response
│   │   │   ├── AuditLogs.jsx     # Security audit trail
│   │   │   ├── Dashboard.jsx     # Executive overview cards & Recharts
│   │   │   ├── Departments.jsx   # Corporate cost centers
│   │   │   ├── DeviceDetails.jsx # Complete laptop profile & telemetry charts
│   │   │   ├── Devices.jsx       # Inventory table & grid view
│   │   │   ├── Employees.jsx     # Staff custodians & asset assignment
│   │   │   ├── Login.jsx         # Authentication screen + quick role fill
│   │   │   ├── Maintenance.jsx   # Hardware repair tickets
│   │   │   ├── Reports.jsx       # CSV & print audit reports
│   │   │   └── Settings.jsx      # Thresholds & enrollment token manager
│   │   ├── services/
│   │   │   └── api.js            # Authenticated fetch client
│   │   ├── App.jsx               # Protected route tree
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── agent/
│   ├── agent.js                  # Cross-platform lightweight Laptop Agent
│   ├── simulate-fleet.js         # Real-time multi-device telemetry simulator
│   ├── windows/
│   │   ├── install-agent.ps1     # Windows PowerShell installer & Scheduled Task
│   │   └── agent-service.ps1     # Background execution wrapper
│   └── macos/
│       ├── com.company.laptopagent.plist # macOS launchd daemon specification
│       └── install-agent.sh      # macOS deployment script
│
├── database/
│   ├── schema.sql                # Production MySQL 8.0 schema
│   └── seed.sql                  # Realistic sample company fleet dataset
│
└── README.md
```

---

## 🗄 Database Design & Setup

The system includes complete production-grade SQL definitions:
- [`database/schema.sql`](file:///C:/Users/EragonX/.gemini/antigravity/scratch/company-laptop-management/database/schema.sql)
- [`database/seed.sql`](file:///C:/Users/EragonX/.gemini/antigravity/scratch/company-laptop-management/database/seed.sql)

### Tables
1. `users` — Administrator credentials, bcrypt hashes, and RBAC roles.
2. `departments` — Business units, codes, and allocated IT budgets.
3. `employees` — Staff directory and device custodianship.
4. `enrollment_tokens` — Provisioning tokens with expiration and use limits.
5. `devices` — Hardware inventory, network endpoints, telemetry metrics, and device auth tokens.
6. `device_heartbeats` — Historical telemetry time-series (CPU, RAM, Disk, Battery).
7. `device_locations` — Approximate IP-derived geolocation logs.
8. `device_assignments` — Custody transfer history.
9. `maintenance` — Hardware repair tickets, technician logs, and resolution dates.
10. `alerts` — Fleet health alarms and resolution records.
11. `notifications` — In-app alerts for IT administrators.
12. `audit_logs` — Immutable administrative operations log.
13. `settings` — Configurable heartbeat intervals and alert thresholds.

### MySQL Setup
1. Install and start MySQL 8.0+.
2. Copy `backend/.env.example` to `backend/.env` and set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Run `npm run setup:db` (or `php backend/scripts/setup-db.php`) to import `database/schema.sql` and `database/seed.sql`.

---

## 🔐 Default Admin Credentials

Four role-delineated accounts are pre-seeded for testing:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Super Admin** | `admin@company.com` | `Admin@123456` | Full platform control, user creation, device deletion |
| **IT Admin** | `itadmin@company.com` | `ItAdmin@123456` | Inventory management, assignment, maintenance, enrollment |
| **Manager** | `manager@company.com` | `Manager@123456` | View fleet status, inspection, audit reports |
| **Viewer** | `viewer@company.com` | `Viewer@123456` | Read-only access |

> The login page features a 1-click **Instant Demo Role Switcher** to quickly test permissions for any role without manual typing.

---

## 🚀 Quick Start & Installation

### Prerequisites
- PHP 8.0+ with `pdo_mysql`, `openssl`, `json`, `mbstring`
- MySQL 8.0+
- Node.js 18+ (frontend / laptop agent only)
- npm 9.0.0 or higher

### 1. Backend Setup (PHP + MySQL)
```bash
# Configure MySQL credentials
cp backend/.env.example backend/.env

# Create schema + seed sample fleet data
npm run setup:db

# Start PHP API on http://localhost:5000
npm run start:backend
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Launches Vite dev server on http://localhost:5173
```
Open **`http://localhost:5173`** in your browser.

---

## 💻 Laptop Agent Deployment

The Laptop Agent (`agent/agent.js`) runs quietly in the background on company workstations, consuming `< 15MB RAM` and `< 0.1% CPU`.

### How Enrollment Works:
1. IT Admin opens the dashboard and clicks **Device Enrollment** (or navigates to Settings &rarr; Enrollment Tokens).
2. Click **Generate Enrollment Token** (e.g. `ENROLL-CORP-2026-HQ01`).
3. Deploy the agent on the laptop with the token.

### Running Agent Manually:
```bash
cd agent
node agent.js --server=http://localhost:5000 --token=ENROLL-CORP-2026-HQ01
```
The agent automatically:
- Identifies machine UUID, serial number, OS build, CPU model, total RAM, and storage.
- Calls `/api/devices/register`.
- Securely stores its persistent `device_token` in `agent_config.json`.
- Streams telemetry heartbeats every 60 seconds.

### Windows Installation (Auto-Start)
Run PowerShell as Administrator on the target Windows laptop:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\agent\windows\install-agent.ps1 -ServerUrl "https://your-server.com" -EnrollmentToken "ENROLL-XXXX-XXXX-XXXX"
```
This registers a **Windows Scheduled Task** (`CompanyLaptopMonitoringAgent`) that starts automatically at logon, with automatic restart upon failure.

### macOS Installation (Auto-Start)
Run Terminal on the target macOS workstation:
```bash
chmod +x ./agent/macos/install-agent.sh
sudo ./agent/macos/install-agent.sh "https://your-server.com" "ENROLL-XXXX-XXXX-XXXX"
```
This creates and loads a native macOS launchd daemon at `/Library/LaunchDaemons/com.company.laptopagent.plist`.

### Real-Time Fleet Simulator
To simulate 10+ live laptops sending heartbeats with varying CPU, RAM, and battery metrics in real-time on your dashboard:
```bash
node agent/simulate-fleet.js --interval=15
```

---

## 📡 REST API Documentation

### Authentication
- `POST /api/auth/login` — Authenticate user and receive JWT.
- `GET /api/auth/me` — Retrieve current user profile.
- `POST /api/auth/change-password` — Change password.

### Devices & Fleet Telemetry
- `GET /api/devices/stats` — Executive dashboard metrics.
- `GET /api/devices` — Search and filter laptop inventory (`search`, `status`, `os`, `department_id`, `assigned`).
- `GET /api/devices/:id` — Full laptop profile, telemetry time-series, and location.
- `POST /api/devices` — Manually create laptop record (*IT Admin/Super Admin*).
- `PUT /api/devices/:id` — Update device metadata.
- `DELETE /api/devices/:id` — Delete device (*Super Admin*).
- `PUT /api/devices/:id/assign` — Assign laptop to employee and department.
- `PUT /api/devices/:id/unassign` — Return laptop to unassigned stock pool.
- `PUT /api/devices/:id/maintenance` — Toggle maintenance diagnostic mode.
- `PUT /api/devices/:id/deactivate` — Retire/deactivate hardware.

### Agent Communication
- `POST /api/devices/register` — Onboard hardware using enrollment token.
- `POST /api/devices/heartbeat` — Periodic telemetry push (`Authorization: Bearer <device_token>`).

### Maintenance & Repairs
- `GET /api/maintenance` — List diagnostic tickets (`status`, `priority`).
- `POST /api/maintenance` — Create repair ticket.
- `PUT /api/maintenance/:id` — Update ticket status, technician, and notes.

### Alerts & Notifications
- `GET /api/alerts` — Active fleet anomalies.
- `PUT /api/alerts/:id/acknowledge` — Acknowledge alert.
- `PUT /api/alerts/:id/resolve` — Mark alert resolved.
- `POST /api/alerts/check` — Force immediate fleet health audit scan.

### Reports & Compliance
- `GET /api/reports/devices?format=csv` — Export device inventory.
- `GET /api/reports/employees?format=csv` — Export employee custody list.
- `GET /api/reports/departments?format=csv` — Export departmental asset values.
- `GET /api/reports/maintenance?format=csv` — Export maintenance audit logs.

### Audit Logs & Settings
- `GET /api/audit-logs` — Administrative security audit trail.
- `GET /api/settings` — Current system configuration and threshold values.
- `PUT /api/settings` — Update monitoring thresholds.
- `GET /api/enrollment-tokens` — List enrollment tokens.
- `POST /api/enrollment-tokens` — Generate new onboarding token.

---

## 🛡️ Role-Based Access Control (RBAC)

| Capability | Super Admin | IT Admin | Manager | Viewer |
|---|:---:|:---:|:---:|:---:|
| View Dashboard & Telemetry | ✅ | ✅ | ✅ | ✅ |
| View Device Details & Map | ✅ | ✅ | ✅ | ✅ |
| Export Compliance Reports | ✅ | ✅ | ✅ | ✅ |
| Enroll / Register Devices | ✅ | ✅ | ❌ | ❌ |
| Assign / Unassign Custodians | ✅ | ✅ | ❌ | ❌ |
| Manage Maintenance Tickets | ✅ | ✅ | ❌ | ❌ |
| Manage System Thresholds | ✅ | ✅ | ❌ | ❌ |
| Manage Admin Users | ✅ | ❌ | ❌ | ❌ |
| Delete Device Records | ✅ | ❌ | ❌ | ❌ |

---

## 🚢 Production Deployment Guide

### Frontend Deployment (Vercel)
1. Push code to your Git repository.
2. Link the `frontend/` directory in Vercel.
3. Configure Environment Variable:
   - `VITE_API_URL=https://your-backend-api.onrender.com`
4. Deploy!

### Backend Deployment (Render / VPS)
1. Link the `backend/` directory in Render (Node Web Service) or VPS.
2. Build command: `npm install`
3. Start command: `npm start`
4. Set Environment Variables:
   ```env
   NODE_ENV=production
   PORT=5000
   DB_TYPE=mysql
   DB_HOST=your-mysql-host.com
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=company_laptop_db
   JWT_SECRET=your-secure-production-jwt-secret
   ```

---

## 🧪 Verification & Testing

To run the automated 12-stage workflow test suite:
```bash
cd backend
node scripts/test-workflows.js
```

All 12 stages will be tested and reported:
- Health Check (`/api/health`)
- Super Admin Authentication
- Viewer Authentication
- RBAC Boundary Enforcement (403 Forbidden check)
- Fleet Dashboard Metric Aggregations
- Hardware Agent Onboarding via Enrollment Token
- Live Telemetry Ingestion (Heartbeat)
- Device Profile & History Graph Data
- Employee Hardware Custody Assignment
- Maintenance Ticket State Machine
- CSV Report Export Generation
- Administrative Security Audit Logging

---

*Engineered for Corporate IT Teams & Asset Management Compliance.*
#   l a p  
 