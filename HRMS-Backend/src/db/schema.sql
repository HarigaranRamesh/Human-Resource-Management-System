-- ============================================================
-- HRMS PostgreSQL Schema
-- Migrated from MongoDB/Mongoose models
-- Run once: psql -U postgres -d hrms -f schema.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE attendance_type AS ENUM (
    'Present','Absent','LOP','Sick Leave','Casual Leave',
    'Maternity Leave','Comp OFF','Holiday','Planned Leave'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_label AS ENUM (
    'Sick Leave','Casual Leave','Planned Leave',
    'Maternity Leave','Paternity Leave','Compoff Leave'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE accrual_type AS ENUM ('monthly','annual','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM (
    'HR','Development','Support','Documentation','Design','Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('Low','Medium','High','Critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'Pending','In Progress','Review','Completed','On Hold','Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- COUNTER (replaces MongoDB counter collection for empId)
-- ============================================================
CREATE TABLE IF NOT EXISTS counters (
  id          TEXT PRIMARY KEY,
  seq         INTEGER NOT NULL DEFAULT 0
);
INSERT INTO counters (id, seq) VALUES ('empId', 0), ('candidateId', 0)
  ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROLES / ACCESS
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role                  TEXT NOT NULL,
  is_system             BOOLEAN NOT NULL DEFAULT FALSE,
  main                  JSONB NOT NULL DEFAULT '[]',   -- menu tree
  has_payload_section   BOOLEAN NOT NULL DEFAULT TRUE,
  requires_documents    BOOLEAN NOT NULL DEFAULT TRUE,
  is_candidate_role     BOOLEAN NOT NULL DEFAULT FALSE,
  collects_bank_details BOOLEAN NOT NULL DEFAULT TRUE,
  id_prefix             TEXT NOT NULL DEFAULT 'OAID',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  start_time  TEXT,
  end_time    TEXT,
  grace_mins  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name             TEXT NOT NULL,
  mobile_no             TEXT UNIQUE,
  emp_id                TEXT UNIQUE,
  password              TEXT NOT NULL,
  email                 TEXT UNIQUE,
  official_email        TEXT,
  blood_group           TEXT,
  marital_status        TEXT,
  gender                TEXT,
  current_address       TEXT,
  permanent_address     TEXT,
  aadhar_no             TEXT DEFAULT '',
  pan_no                TEXT DEFAULT '',
  role_id               UUID REFERENCES roles(id),
  shift_id              UUID REFERENCES shifts(id),
  position              TEXT,
  designation           TEXT,
  department            TEXT,
  probation_period      TEXT,
  probation_status      TEXT,
  work_location         TEXT,
  direct_report         TEXT,
  status                BOOLEAN NOT NULL DEFAULT TRUE,
  emergency_contact_no   TEXT,
  emergency_contact_name TEXT,
  logcal                INTEGER DEFAULT 0,
  bank_name             TEXT DEFAULT '',
  branch_name           TEXT DEFAULT '',
  account_no            TEXT DEFAULT '',
  ifsc_code             TEXT DEFAULT '',
  account_holder_name   TEXT DEFAULT '',
  kms_charge            NUMERIC(10,2) DEFAULT 10,
  balance_amount        NUMERIC(12,2) DEFAULT 0,
  balance_updated_at    TIMESTAMPTZ DEFAULT NOW(),
  education             JSONB DEFAULT '[]',
  family_details        JSONB DEFAULT '[]',
  doj                   TIMESTAMPTZ DEFAULT NOW(),
  dob                   TIMESTAMPTZ DEFAULT NOW(),
  ref1_name             TEXT DEFAULT '',
  ref1_mobile           TEXT DEFAULT '',
  ref2_name             TEXT DEFAULT '',
  ref2_mobile           TEXT DEFAULT '',
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role → members (many-to-many)
CREATE TABLE IF NOT EXISTS role_members (
  role_id  UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, user_id)
);

-- Role hierarchy (self-ref)
CREATE TABLE IF NOT EXISTS role_parents (
  child_role_id  UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  parent_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (child_role_id, parent_role_id)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  reason_for_applying TEXT DEFAULT '',
  attendance_type   attendance_type DEFAULT 'Present',
  approved          BOOLEAN,          -- NULL = pending, true/false = decided
  is_holiday        BOOLEAN DEFAULT FALSE,
  geo_login_flag    BOOLEAN DEFAULT FALSE,
  geo_login_lat     NUMERIC(10,6) DEFAULT 0,
  geo_login_lon     NUMERIC(10,6) DEFAULT 0,
  geo_login_time    TIMESTAMPTZ,
  geo_login_address TEXT,
  geo_logout_flag   BOOLEAN DEFAULT FALSE,
  geo_logout_lat    NUMERIC(10,6) DEFAULT 0,
  geo_logout_lon    NUMERIC(10,6) DEFAULT 0,
  geo_logout_time   TIMESTAMPTZ,
  geo_logout_address TEXT,
  remarks           TEXT,
  late_mark         BOOLEAN DEFAULT FALSE,
  late_minutes      INTEGER DEFAULT 0,
  early_out         BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- ============================================================
-- LEAVE POLICY
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_policies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role         TEXT NOT NULL,
  label        leave_label NOT NULL,
  amount       NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  accrual_type accrual_type NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role, label)
);

-- ============================================================
-- LEAVE TYPES (per user balance buckets)
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        leave_label NOT NULL,
  value        NUMERIC(6,2) NOT NULL,
  validity     DATE,
  accrual_type accrual_type NOT NULL,
  remaining    JSONB DEFAULT '[]',    -- [{year, months:[12 nums], annualValue}]
  doj          DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, label)
);

-- ============================================================
-- PETROL REIMBURSEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS petrol_claims (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount             NUMERIC(10,2) DEFAULT 0,
  from_location      TEXT DEFAULT '',
  to_location        TEXT DEFAULT '',
  purpose_of_visit   TEXT DEFAULT '',
  kms                NUMERIC(8,2) DEFAULT 0,
  mode_of_transport  TEXT DEFAULT '',
  approved           BOOLEAN DEFAULT FALSE,
  approved_by        UUID REFERENCES users(id),
  approved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HOLIDAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  date        DATE NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  asset_type    TEXT,
  serial_no     TEXT,
  assigned_to   UUID REFERENCES users(id),
  assigned_at   TIMESTAMPTZ,
  returned_at   TIMESTAMPTZ,
  condition     TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  type             task_type DEFAULT 'Other',
  priority         task_priority DEFAULT 'Medium',
  status           task_status DEFAULT 'Pending',
  start_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date         TIMESTAMPTZ NOT NULL,
  estimated_hours  NUMERIC(6,2) DEFAULT 0,
  progress         INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  department       TEXT,
  project          TEXT,
  created_by       UUID NOT NULL REFERENCES users(id),
  tags             TEXT[] DEFAULT '{}',
  subtasks         JSONB DEFAULT '[]',
  comments         JSONB DEFAULT '[]',
  time_logs        JSONB DEFAULT '[]',
  history          JSONB DEFAULT '[]',
  attachments      JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task assignees (many-to-many)
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id  UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- ============================================================
-- PERFORMANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS performance_reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id    UUID REFERENCES users(id),
  period         TEXT,           -- e.g. "Q1 2025"
  rating         NUMERIC(3,1),
  comments       TEXT,
  goals          JSONB DEFAULT '[]',
  status         TEXT DEFAULT 'Pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FEED / ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS feed_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  media_url   TEXT,
  likes       UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYSLIPS / PAYLOADS
-- ============================================================
CREATE TABLE IF NOT EXISTS payslips (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month        INTEGER NOT NULL,
  year         INTEGER NOT NULL,
  basic        NUMERIC(12,2) DEFAULT 0,
  hra          NUMERIC(12,2) DEFAULT 0,
  allowances   JSONB DEFAULT '{}',
  deductions   JSONB DEFAULT '{}',
  gross        NUMERIC(12,2) DEFAULT 0,
  net          NUMERIC(12,2) DEFAULT 0,
  generated_by UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month, year)
);

-- ============================================================
-- DELETED USERS (soft-delete log)
-- ============================================================
CREATE TABLE IF NOT EXISTS deleted_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_data    JSONB NOT NULL,
  deleted_by   UUID,
  reason       TEXT,
  deleted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER DOCS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_docs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type    TEXT,
  file_url    TEXT,
  file_name   TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STANDARD MENUS
-- ============================================================
CREATE TABLE IF NOT EXISTS standard_menus (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL UNIQUE,
  menu_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_mobile    ON users(mobile_no);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_emp_id    ON users(emp_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id   ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_user      ON leave_types(user_id);
CREATE INDEX IF NOT EXISTS idx_petrol_user     ON petrol_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created   ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_perf_user       ON performance_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_author     ON feed_posts(author_id);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles','shifts','users','attendance','leave_policies',
    'leave_types','petrol_claims','holidays','assets','tasks',
    'performance_reviews','feed_posts','payslips'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON %I;
      CREATE TRIGGER trg_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ============================================================
-- ENTERPRISE HRMS EXTENSIONS (Non-Destructive)
-- ============================================================

-- Alter users to add profile_image, manager_id, and annual_ctc
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_ctc NUMERIC(14,2) DEFAULT 600000;

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  head_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DESIGNATIONS
CREATE TABLE IF NOT EXISTS designations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  level         INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SALARY STRUCTURES
CREATE TABLE IF NOT EXISTS salary_structures (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  description              TEXT,
  basic_pct                NUMERIC(5,2) DEFAULT 50.00,
  hra_pct                  NUMERIC(5,2) DEFAULT 50.00, -- 50% of Basic
  da_pct                   NUMERIC(5,2) DEFAULT 0.00,
  conveyance_monthly       NUMERIC(10,2) DEFAULT 1600.00,
  medical_monthly          NUMERIC(10,2) DEFAULT 1250.00,
  special_allowance_pct    NUMERIC(5,2) DEFAULT 0.00,
  pf_employee_pct          NUMERIC(5,2) DEFAULT 12.00,
  pf_employer_pct          NUMERIC(5,2) DEFAULT 12.00,
  pf_ceiling               NUMERIC(10,2) DEFAULT 15000.00,
  esi_employee_pct         NUMERIC(5,2) DEFAULT 0.75,
  esi_employer_pct         NUMERIC(5,2) DEFAULT 3.25,
  esi_threshold            NUMERIC(10,2) DEFAULT 21000.00,
  pt_monthly               NUMERIC(10,2) DEFAULT 200.00,
  is_default               BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EMPLOYEE SALARY ASSIGNMENTS
CREATE TABLE IF NOT EXISTS employee_salaries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  structure_id   UUID REFERENCES salary_structures(id) ON DELETE SET NULL,
  annual_ctc     NUMERIC(14,2) NOT NULL,
  monthly_gross  NUMERIC(14,2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, is_active)
);

-- 5. PAYROLL RUNS (Batch processing)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month            INTEGER NOT NULL,
  year             INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Draft', -- Draft, Approved, Finalized
  total_employees  INTEGER DEFAULT 0,
  total_gross      NUMERIC(14,2) DEFAULT 0,
  total_deductions NUMERIC(14,2) DEFAULT 0,
  total_net        NUMERIC(14,2) DEFAULT 0,
  processed_by     UUID REFERENCES users(id),
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(month, year)
);

-- 6. DETAILED PAYSLIPS
CREATE TABLE IF NOT EXISTS detailed_payslips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id    UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month             INTEGER NOT NULL,
  year              INTEGER NOT NULL,
  days_in_month     INTEGER NOT NULL DEFAULT 30,
  days_worked       NUMERIC(5,2) DEFAULT 30,
  lop_days          NUMERIC(5,2) DEFAULT 0,
  ctc_annual        NUMERIC(14,2) NOT NULL,
  basic             NUMERIC(12,2) NOT NULL,
  hra               NUMERIC(12,2) NOT NULL,
  da                NUMERIC(12,2) DEFAULT 0,
  conveyance        NUMERIC(12,2) DEFAULT 0,
  medical           NUMERIC(12,2) DEFAULT 0,
  special_allowance NUMERIC(12,2) DEFAULT 0,
  other_earnings    NUMERIC(12,2) DEFAULT 0,
  gross_earnings    NUMERIC(12,2) NOT NULL,
  pf_employee       NUMERIC(12,2) DEFAULT 0,
  pf_employer       NUMERIC(12,2) DEFAULT 0,
  esi_employee      NUMERIC(12,2) DEFAULT 0,
  esi_employer      NUMERIC(12,2) DEFAULT 0,
  professional_tax  NUMERIC(12,2) DEFAULT 0,
  tds_tax           NUMERIC(12,2) DEFAULT 0,
  other_deductions  NUMERIC(12,2) DEFAULT 0,
  total_deductions  NUMERIC(12,2) NOT NULL,
  net_salary        NUMERIC(12,2) NOT NULL,
  breakdown_meta    JSONB DEFAULT '{}',
  status            TEXT DEFAULT 'Finalized',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month, year)
);

-- 7. FORMAL LEAVE APPLICATIONS
CREATE TABLE IF NOT EXISTS leave_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type       TEXT NOT NULL, -- Sick Leave, Casual Leave, Planned Leave, Maternity Leave, Paternity Leave, Comp OFF
  from_date        DATE NOT NULL,
  to_date          DATE NOT NULL,
  total_days       NUMERIC(4,1) NOT NULL,
  is_half_day      BOOLEAN DEFAULT FALSE,
  half_day_period  TEXT, -- First Half, Second Half
  reason           TEXT NOT NULL,
  document_url     TEXT,
  status           TEXT NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected, Cancelled
  approver_id      UUID REFERENCES users(id),
  decision_reason  TEXT,
  decided_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EMPLOYEE DOCUMENTS VAULT (Keka-style)
CREATE TABLE IF NOT EXISTS employee_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL, -- Government ID, Educational, Experience, Banking, Other
  doc_type      TEXT NOT NULL, -- Aadhar, PAN, Degree, Relieving Letter, Passbook, etc.
  doc_name      TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     BIGINT DEFAULT 0,
  mime_type     TEXT,
  status        TEXT NOT NULL DEFAULT 'Verified', -- Pending, Verified, Rejected
  verified_by   UUID REFERENCES users(id),
  remarks       TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. COMPANY ANNOUNCEMENTS (Feed)
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  priority    TEXT DEFAULT 'Normal', -- Urgent, Normal, Info
  department  TEXT DEFAULT 'All',
  author_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  likes       UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default Standard Indian Salary Structure
INSERT INTO salary_structures (name, description, basic_pct, hra_pct, conveyance_monthly, medical_monthly, pf_employee_pct, pf_employer_pct, pt_monthly, is_default)
SELECT 'Standard Indian Corporate Structure', '50% Basic, 50% HRA, statutory PF (12%), PT (Rs. 200/mo), standard allowances', 50.00, 50.00, 1600.00, 1250.00, 12.00, 12.00, 200.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM salary_structures WHERE is_default = TRUE);

-- Auto-seed departments from existing distinct user departments
INSERT INTO departments (name, description)
SELECT DISTINCT department, department || ' Department'
FROM users
WHERE department IS NOT NULL AND department != ''
ON CONFLICT (name) DO NOTHING;

-- Auto-seed designations from existing distinct user positions/designations
INSERT INTO designations (name)
SELECT DISTINCT COALESCE(NULLIF(designation, ''), position)
FROM users
WHERE COALESCE(NULLIF(designation, ''), position) IS NOT NULL AND COALESCE(NULLIF(designation, ''), position) != ''
ON CONFLICT (name) DO NOTHING;

-- Populate manager_id hierarchy if null: point users to department heads or Super Admin
DO $$
DECLARE
  sa_id UUID;
BEGIN
  SELECT id INTO sa_id FROM users WHERE LOWER(position) LIKE '%administrator%' OR email LIKE 'admin%' LIMIT 1;
  IF sa_id IS NOT NULL THEN
    UPDATE users SET manager_id = sa_id WHERE manager_id IS NULL AND id != sa_id;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_detailed_payslips_user ON detailed_payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_detailed_payslips_period ON detailed_payslips(month, year);
CREATE INDEX IF NOT EXISTS idx_leave_app_user ON leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_app_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_emp_docs_user ON employee_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);

