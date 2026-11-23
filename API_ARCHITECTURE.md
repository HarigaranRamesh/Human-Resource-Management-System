# NIRALIX HRMS — API Architecture & Integration Specification

> **Version:** 2.0.0 (PostgreSQL Enterprise Engine)  
> **Protocol:** RESTful HTTPS / JSON  
> **Default Port:** `8080` (Backend) | `5173` (Frontend)

---

## 1. Architectural Overview

The NIRALIX HRMS backend is architected following **Clean Layered Architecture** with distinct responsibilities:

```
HTTP Request ──► Express Master Router ──► Auth Middleware ──► Controller ──► Repository ──► PostgreSQL Pool
                                                                  │
                                                                  ▼
                                                      Domain Services (PDF/OTP)
```

- **Routes (`src/routes/`):** Define URL endpoints and route mappings.
- **Middleware (`src/middleware/`):** Verify JWT authentication tokens, role permissions, CORS, and request sanitation.
- **Controllers (`src/controllers/`):** Validate incoming request bodies, enforce business logic, and orchestrate responses.
- **Repositories (`src/db/repositories/`):** Isolate all SQL statements with 100% parameterized queries using `pg.Pool`.
- **Services (`src/services/`):** Specialized utilities including PDF rendering (`pdfkit`), SMS OTP dispatch, and token generation.

---

## 2. Standard Request & Response Protocol

### Global Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

### Standard Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Standard Error Response Format
```json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Detailed error explanation",
  "details": null
}
```

---

## 3. Authentication & Security Flow

### A. Mobile OTP Flow (Passwordless)
1. **Send OTP (`POST /api/auth/send-otp`)**
   - Payload: `{ "mobile": "9876543210" }`
   - Action: Validates user existence in PostgreSQL, generates a cryptographic 6-digit numeric OTP with 5-minute TTL, and dispatches SMS. In local/development mode, also provides `devOtp` for fast testing.
2. **Verify OTP (`POST /api/auth/verify-otp`)**
   - Payload: `{ "mobile": "9876543210", "otp": "123456" }`
   - Action: Validates matching OTP within expiration window. Upon match, generates a signed JWT payload including `id`, `emp_id`, `role`, and `name`.

### B. Admin Password Login Flow
- **Endpoint:** `POST /api/auth/login`
- Payload: `{ "identifier": "OA1101", "password": "SecurePassword123!" }`
- Action: Searches user by either `emp_id` or `email`, runs `bcrypt.compare()` against stored hash, and returns JWT token and full profile payload.

---

## 4. API Endpoints Directory

### 🏢 1. Organization Onboarding (`/api/onboard`)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/onboard/status` | Public | Returns whether organization and Super Admin are provisioned. |
| `POST` | `/api/onboard/setup` | Public (Initial) | Provisions Organization Settings, sets dynamic ID Prefix (e.g. `OA`), creates Super Admin as `${Prefix}1101`, and returns signed JWT. |

---

### 👥 2. User & Employee Directory (`/api/user`, `/api/users`)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/users` | Authenticated | Returns paginated employee directory with role and department filters. |
| `GET` | `/api/user/:id` | Authenticated | Fetches complete user dossier by user ID or employee ID. |
| `POST` | `/api/user/create` | Admin / HR | Adds new employee with dynamic sequence ID `${Prefix}${1101 + seq}`. |
| `PUT` | `/api/user/update/:id` | Admin / Self | Updates personal info, KYC numbers (Aadhaar, PAN, Voter ID, Passport), emergency contacts, and addresses. |
| `DELETE` | `/api/user/delete/:id` | Super Admin | Soft-deletes user and archives them to `deleted_users` table. |

---

### 🕒 3. Attendance Management (`/api/attendance`)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/attendance/punch-in` | Authenticated | Records employee punch-in timestamp with location notes. |
| `POST` | `/api/attendance/punch-out` | Authenticated | Records punch-out, calculates working hours and overtime. |
| `GET` | `/api/attendance/daily` | Admin / HR | Fetches daily aggregate attendance report across all departments. |
| `GET` | `/api/attendance/monthly` | Authenticated | Returns full calendar grid of punches, leaves, and absences for user. |

---

### 💰 4. Payroll & Payslips (`/api/payroll`, `/api/payslip`)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/payroll/summary` | Admin / HR | Returns enterprise payroll metrics: Total CTC, monthly disbursements, deductions. |
| `GET` | `/api/payroll/user/:id` | Authenticated | Retrieves current salary structure and payslip history. |
| `POST` | `/api/payroll/generate` | Super Admin | Executes batch monthly salary run and creates persistent payslip records. |
| `GET` | `/api/payroll/payslip/:id/pdf` | Authenticated | Generates and streams downloadable, signed NIRALIX PDF payslip. |

---

### ✉️ 5. Official Letters Hub (`/api/letters`, `/api/certificates`)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/letters/my-letters` | Authenticated | Returns list of available official letters for logged-in employee. |
| `GET` | `/api/letters/templates` | Super Admin | Fetches master letter templates (Offer, Appointment, Experience). |
| `POST` | `/api/letters/generate` | Super Admin | Issues new letter to employee with dynamic joining/relieving variables. |
| `GET` | `/api/letters/download/:id/pdf`| Authenticated | Generates clean, branded NIRALIX letterhead PDF for printing/download. |

---

### 🌴 6. Leave Applications (`/api/leaves`, `/api/leave-policies`)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/leaves/my-leaves` | Authenticated | Fetches current user's leave applications and balance balances. |
| `POST` | `/api/leaves/apply` | Authenticated | Submits new leave request with date range and reason. |
| `PUT` | `/api/leaves/action/:id`| Manager / Admin | Approves or rejects pending leave application. |
| `GET` | `/api/leave-policies` | Authenticated | Returns annual leave policy rules and allocations. |

---

### 🗄️ 7. Document Vault (`/api/documents`)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/documents/user/:id` | Authenticated | Returns all KYC and employment documents uploaded by user. |
| `POST` | `/api/documents/upload` | Authenticated | Multipart upload (`multer`) for Aadhaar, PAN, Passport, and certificates. |
| `PUT` | `/api/documents/verify/:id`| Admin / HR | Marks document as officially verified. |

---

### 🌲 8. Organization Hierarchy & Feed (`/api/organization`, `/api/announcements`)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/organization/tree` | Authenticated | Returns recursive JSON node tree of full corporate reporting structure. |
| `GET` | `/api/announcements` | Authenticated | Returns company-wide announcements and social feed posts. |
| `POST` | `/api/announcements/create` | Admin | Posts official broadcast message with priority tagging. |

---

## 5. PostgreSQL Database Schema

```sql
-- 1. Organization Master Settings
CREATE TABLE IF NOT EXISTS organization_settings (
  id SERIAL PRIMARY KEY,
  org_name VARCHAR(255) NOT NULL,
  id_prefix VARCHAR(10) NOT NULL DEFAULT 'NIR',
  official_email VARCHAR(255),
  official_contact VARCHAR(50),
  website VARCHAR(255),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enterprise Users & KYC Dossier
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  personal_email VARCHAR(255),
  mobile_no VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  gender VARCHAR(20),
  dob DATE,
  date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
  role_id INTEGER REFERENCES roles(id),
  department VARCHAR(100),
  designation VARCHAR(100),
  annual_ctc NUMERIC(12, 2) DEFAULT 600000.00,
  blood_group VARCHAR(10),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  parents_details TEXT,
  address TEXT,
  aadhaar_no VARCHAR(20),
  pan_no VARCHAR(20),
  voter_id VARCHAR(30),
  passport_no VARCHAR(30),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. HTTP Status Code Standard

| Status Code | Code Constant | Meaning |
|---|---|---|
| `200 OK` | `SUCCESS` | Request succeeded; returned expected data. |
| `201 Created` | `CREATED` | Resource (e.g. employee, leave, letter) created successfully. |
| `400 Bad Request` | `VALIDATION_ERROR` | Missing or invalid required fields. |
| `401 Unauthorized` | `AUTH_REQUIRED` | Missing, malformed, or expired JWT token. |
| `403 Forbidden` | `ACCESS_DENIED` | Insufficient permissions for requested resource. |
| `404 Not Found` | `NOT_FOUND` | Target record (user, payslip, letter) does not exist. |
| `500 Server Error` | `INTERNAL_ERROR` | Unhandled database or backend exception. |

---
*Maintained under NIRALIX HRMS Enterprise Specification.*
