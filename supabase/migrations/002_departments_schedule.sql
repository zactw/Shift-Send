-- ========================
-- FIX shift_templates to match grid-builder UI schema
-- ========================
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS days_of_week INTEGER[];
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS slots_required INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ========================
-- DEPARTMENTS
-- ========================
CREATE TABLE departments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_workspace ON departments(workspace_id);

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_select" ON departments FOR SELECT USING (workspace_id = get_user_workspace_id());
CREATE POLICY "departments_insert" ON departments FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());
CREATE POLICY "departments_update" ON departments FOR UPDATE USING (workspace_id = get_user_workspace_id());
CREATE POLICY "departments_delete" ON departments FOR DELETE USING (workspace_id = get_user_workspace_id());

-- ========================
-- ADD department_id TO employees
-- ========================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);

-- ========================
-- SCHEDULE ENTRIES (core of the new schedule system)
-- One row = one employee's shift on one specific date
-- ========================
CREATE TABLE schedule_entries (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id           UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_id              UUID NOT NULL REFERENCES schedule_periods(id) ON DELETE CASCADE,
  employee_id            UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id          UUID REFERENCES departments(id) ON DELETE SET NULL,
  date                   DATE NOT NULL,
  start_time             TIME,
  end_time               TIME,
  is_off                 BOOLEAN NOT NULL DEFAULT FALSE,
  needs_coverage         BOOLEAN NOT NULL DEFAULT FALSE,
  coverage_note          TEXT,
  covered_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE INDEX idx_schedule_entries_workspace ON schedule_entries(workspace_id);
CREATE INDEX idx_schedule_entries_period    ON schedule_entries(period_id);
CREATE INDEX idx_schedule_entries_employee  ON schedule_entries(employee_id);
CREATE INDEX idx_schedule_entries_date      ON schedule_entries(date);

CREATE TRIGGER update_schedule_entries_updated_at
  BEFORE UPDATE ON schedule_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule_entries_select" ON schedule_entries FOR SELECT USING (workspace_id = get_user_workspace_id());
CREATE POLICY "schedule_entries_insert" ON schedule_entries FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id());
CREATE POLICY "schedule_entries_update" ON schedule_entries FOR UPDATE USING (workspace_id = get_user_workspace_id());
CREATE POLICY "schedule_entries_delete" ON schedule_entries FOR DELETE USING (workspace_id = get_user_workspace_id());
