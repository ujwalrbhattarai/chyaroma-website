-- Staff Records vs Login Accounts Separation
-- ---------------------------------------------------------------------------
-- Previously every row in `users` required a password_hash, meaning waiters,
-- cleaners, and other non-app-access staff were created as full login accounts.
--
-- This migration introduces two changes:
--   1. password_hash becomes nullable.  Staff-only records have NULL here.
--   2. A new `can_login` flag (default FALSE) explicitly marks which records
--      are allowed to authenticate against the application.
--
-- Backwards-compatibility:
--   All existing rows that already have a password_hash are real login
--   accounts → they receive can_login = TRUE automatically.
--
-- Retroactive strip (safe, optional):
--   If you want to ensure any previously-created Waiter/Cashier/etc. rows can
--   no longer log in even though they still have an old password_hash, run the
--   commented UPDATE below after the migration.
-- ---------------------------------------------------------------------------

-- 1. Allow staff-only records with no password
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Explicit login-enabled flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_login BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. All rows that already have a password are real auth accounts
UPDATE users SET can_login = TRUE WHERE password_hash IS NOT NULL;

-- 4. (OPTIONAL) Retroactively strip login access from non-login staff roles
--    that were created before this migration.  Un-comment if desired.
-- UPDATE users
--   SET can_login = FALSE
--   WHERE role NOT IN ('super_admin', 'branch_manager', 'kitchen_staff')
--     AND can_login = TRUE;
