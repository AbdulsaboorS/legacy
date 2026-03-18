-- Phase 5: Add optional description column to halaqas
-- Idempotent: uses IF NOT EXISTS for column and a DO block for the RLS policy

BEGIN;

-- 1. Add description column (max 150 chars, nullable)
ALTER TABLE halaqas
  ADD COLUMN IF NOT EXISTS description TEXT
  CHECK (description IS NULL OR char_length(description) <= 150);

-- 2. Add owner UPDATE policy (idempotent — skips if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'halaqas'
      AND policyname = 'Owner can update halaqa'
  ) THEN
    CREATE POLICY "Owner can update halaqa"
      ON halaqas
      FOR UPDATE
      USING (created_by = auth.uid());
  END IF;
END
$$;

COMMIT;
