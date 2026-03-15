-- Legacy Phase 2: Constraints + Masterplan Columns + Seed Lobbies
-- Single transaction — apply via Supabase SQL Editor or CLI

BEGIN;

-- ================================================================
-- 1. Unique constraints for idempotent upserts in onboarding
-- ================================================================

ALTER TABLE streaks
  ADD CONSTRAINT streaks_user_id_unique UNIQUE (user_id);

ALTER TABLE habits
  ADD CONSTRAINT habits_user_name_unique UNIQUE (user_id, name);

-- ================================================================
-- 2. Masterplan columns on habits
--    Persisted after onboarding AI step, shown on dashboard
-- ================================================================

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS core_philosophy TEXT,
  ADD COLUMN IF NOT EXISTS actionable_steps JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weekly_roadmap   JSONB DEFAULT '[]'::jsonb;

-- ================================================================
-- 3. Seed default public lobbies for both genders
--    created_by = NULL (allowed via ON DELETE SET NULL)
--    Guard per gender so re-running is safe
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM halaqas WHERE gender = 'Brother' AND is_public = true
  ) THEN
    INSERT INTO halaqas (name, created_by, invite_code, gender, is_public, max_members)
    VALUES
      ('The Morning Scholars', NULL, 'MSCHLR', 'Brother', true, 8),
      ('Night Routine Squad',  NULL, 'NTROUT', 'Brother', true, 8),
      ('Weekend Warriors',     NULL, 'WKWRRR', 'Brother', true, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM halaqas WHERE gender = 'Sister' AND is_public = true
  ) THEN
    INSERT INTO halaqas (name, created_by, invite_code, gender, is_public, max_members)
    VALUES
      ('The Morning Seekers',   NULL, 'MRNSKR', 'Sister', true, 8),
      ('Evening Reflections',   NULL, 'EVNRFL', 'Sister', true, 8),
      ('Daily Devotion Circle', NULL, 'DDVTN1', 'Sister', true, 8);
  END IF;
END $$;

COMMIT;
