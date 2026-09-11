-- Allow any role label for branch-level staff (e.g. waiter, cashier, barista,
-- host) while keeping super_admin special (always branch-less).
-- The original CHECK in 20260804_create_users.sql hardcoded only
-- ('super_admin', 'branch_manager', 'kitchen_staff').
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_branch_scope;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (char_length(role) BETWEEN 1 AND 32);

ALTER TABLE users ADD CONSTRAINT users_role_branch_scope
  CHECK ((role = 'super_admin' AND branch_id IS NULL) OR (role <> 'super_admin' AND branch_id IS NOT NULL));
