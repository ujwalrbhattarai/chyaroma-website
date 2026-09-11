-- Mark any demo branch records as system demo branches so they are never returned in management APIs or UI dropdowns
UPDATE branches
  SET is_demo = TRUE
  WHERE (is_demo IS NULL OR is_demo = FALSE)
    AND (LOWER(name) LIKE '%demo%' OR LOWER(contact_email) LIKE '%demo%' OR LOWER(address) LIKE '%demo%');
