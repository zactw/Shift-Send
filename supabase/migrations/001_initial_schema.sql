-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================
-- WORKSPACES
-- ========================
CREATE TABLE workspaces (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   TEXT NOT NULL,
  slug                   TEXT NOT NULL UNIQUE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  subscription_status    TEXT NOT NULL DEFAULT 'trialing',
  twilio_phone_number    TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================
-- USERS (managers/owners)
-- ========================
CREATE TABLE users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager', 'employee')),
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================
-- EMPLOYEES
-- ========================
CREATE TABLE employees (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id       UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  full_name          TEXT NOT NULL,
  phone              TEXT NOT NULL,
  email              TEXT,
  position           TEXT,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  availability_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, phone)
);

-- ========================
-- SHIFT TEMPLATES
-- ========================
CREATE TABLE shift_templates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  day_of_week    INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  required_staff INTEGER NOT NULL DEFAULT 1,
  position       TEXT,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================
-- SCHEDULE PERIODS
-- ========================
CREATE TABLE schedule_periods (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================
-- SHIFTS
-- ========================
CREATE TABLE shifts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_id      UUID NOT NULL REFERENCES schedule_periods(id) ON DELETE CASCADE,
  template_id    UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  date           DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  required_staff INTEGER NOT NULL DEFAULT 1,
  position       TEXT,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filling', 'filled', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================
-- SHIFT ASSIGNMENTS
-- ========================
CREATE TABLE shift_assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  shift_id      UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  sms_sent_at   TIMESTAMPTZ,
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shift_id, employee_id)
);

-- ========================
-- AVAILABILITY
-- ========================
CREATE TABLE availability (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, day_of_week)
);

-- ========================
-- INDEXES
-- ========================
CREATE INDEX idx_users_workspace ON users(workspace_id);
CREATE INDEX idx_employees_workspace ON employees(workspace_id);
CREATE INDEX idx_employees_phone ON employees(phone);
CREATE INDEX idx_shift_templates_workspace ON shift_templates(workspace_id);
CREATE INDEX idx_schedule_periods_workspace ON schedule_periods(workspace_id);
CREATE INDEX idx_shifts_workspace ON shifts(workspace_id);
CREATE INDEX idx_shifts_period ON shifts(period_id);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX idx_availability_employee ON availability(employee_id);

-- ========================
-- UPDATED_AT TRIGGER
-- ========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_periods_updated_at BEFORE UPDATE ON schedule_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_assignments_updated_at BEFORE UPDATE ON shift_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================
-- HELPER FUNCTION
-- ========================
CREATE OR REPLACE FUNCTION get_user_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ========================
-- ROW LEVEL SECURITY
-- ========================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Workspaces: users can see/edit their own workspace
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT USING (id = get_user_workspace_id());

CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE USING (id = get_user_workspace_id());

-- Users: see users in same workspace
CREATE POLICY "users_select" ON users
  FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (workspace_id = get_user_workspace_id());

-- Employees: full CRUD within workspace
CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "employees_insert" ON employees
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "employees_update" ON employees
  FOR UPDATE USING (workspace_id = get_user_workspace_id());

CREATE POLICY "employees_delete" ON employees
  FOR DELETE USING (workspace_id = get_user_workspace_id());

-- Shift templates
CREATE POLICY "shift_templates_select" ON shift_templates
  FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "shift_templates_insert" ON shift_templates
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "shift_templates_update" ON shift_templates
  FOR UPDATE USING (workspace_id = get_user_workspace_id());

CREATE POLICY "shift_templates_delete" ON shift_templates
  FOR DELETE USING (workspace_id = get_user_workspace_id());

-- Schedule periods
CREATE POLICY "schedule_periods_select" ON schedule_periods
  FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "schedule_periods_insert" ON schedule_periods
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "schedule_periods_update" ON schedule_periods
  FOR UPDATE USING (workspace_id = get_user_workspace_id());

CREATE POLICY "schedule_periods_delete" ON schedule_periods
  FOR DELETE USING (workspace_id = get_user_workspace_id());

-- Shifts
CREATE POLICY "shifts_select" ON shifts
  FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "shifts_insert" ON shifts
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "shifts_update" ON shifts
  FOR UPDATE USING (workspace_id = get_user_workspace_id());

CREATE POLICY "shifts_delete" ON shifts
  FOR DELETE USING (workspace_id = get_user_workspace_id());

-- Shift assignments
CREATE POLICY "shift_assignments_select" ON shift_assignments
  FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "shift_assignments_insert" ON shift_assignments
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "shift_assignments_update" ON shift_assignments
  FOR UPDATE USING (workspace_id = get_user_workspace_id());

CREATE POLICY "shift_assignments_delete" ON shift_assignments
  FOR DELETE USING (workspace_id = get_user_workspace_id());

-- Availability: employees can update their own via token (handled via service role in API)
CREATE POLICY "availability_select" ON availability
  FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "availability_insert" ON availability
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "availability_update" ON availability
  FOR UPDATE USING (workspace_id = get_user_workspace_id());

CREATE POLICY "availability_delete" ON availability
  FOR DELETE USING (workspace_id = get_user_workspace_id());
