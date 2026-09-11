CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(120) NOT NULL, email VARCHAR(320) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'kitchen_staff')), branch_id UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, session_version INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_branch_scope CHECK ((role = 'super_admin' AND branch_id IS NULL) OR (role IN ('branch_manager', 'kitchen_staff') AND branch_id IS NOT NULL))
);
