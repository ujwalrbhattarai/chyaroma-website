-- Fix CHECK constraint violations when creating non-login staff
-- (Cashier, Waiter, Cleaner, Host, Barista, custom roles).
--
-- ROOT CAUSE
-- ----------
-- Two legacy constraints were never updated when custom staff roles were
-- introduced (20260813_allow_custom_staff_roles.sql was not applied to the
-- live database):
--
--   users_role_check
--     → Only allowed: super_admin | branch_manager | kitchen_staff
--     → Rejects: cashier, waiter, cleaner, host, barista, any custom role
--
--   users_role_branch_scope
--     → Only allowed branch_manager and kitchen_staff to have a branch_id
--     → Rejects: any other role even with a valid branch assignment
--
-- This migration:
--   1. Drops both broken constraints (idempotent – IF EXISTS).
--   2. Re-adds users_role_check  as a length-only check (any role string 1-32 chars).
--   3. Re-adds users_role_branch_scope  with the correct super_admin-vs-branch rule.
--   4. Adds users_login_credentials_check  to enforce that:
--        can_login = TRUE  ↔  password_hash IS NOT NULL
--        can_login = FALSE ↔  password_hash IS NULL
--      (also idempotent – drops before re-adding so re-running is safe).
-- ---------------------------------------------------------------------------

-- 1. Remove the hardcoded-role constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_branch_scope;

-- 2. Role must be a non-empty string up to 32 characters (any value is valid)
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (char_length(role) BETWEEN 1 AND 32);

-- 3. super_admin has no branch; every other role must belong to a branch
ALTER TABLE users ADD CONSTRAINT users_role_branch_scope
  CHECK (
    (role = 'super_admin' AND branch_id IS NULL)
    OR
    (role <> 'super_admin' AND branch_id IS NOT NULL)
  );

-- 4. Login credentials coherence:
--    A login account MUST have a password hash.
--    A staff-only record MUST NOT have a password hash.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_login_credentials_check;
ALTER TABLE users ADD CONSTRAINT users_login_credentials_check
  CHECK (
    (can_login = TRUE  AND password_hash IS NOT NULL)
    OR
    (can_login = FALSE AND password_hash IS NULL)
  );
