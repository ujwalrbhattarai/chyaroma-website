-- Add is_demo flag to branches so the Demo Branch can be identified
-- reliably without relying on a name string match.
-- Backward-compatible: existing rows default to FALSE.
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark the existing Demo Branch as a system/demo branch.
-- The name 'Chyaroma Demo Branch' is the canonical name used by upsertDemoBranch().
-- After this migration, the backend will use is_demo = TRUE for all identification,
-- and upsertDemoBranch() will also SET is_demo = TRUE on every bootstrap run.
UPDATE branches
  SET is_demo = TRUE
  WHERE name = 'Chyaroma Demo Branch' AND is_demo = FALSE;
