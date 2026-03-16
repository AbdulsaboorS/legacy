-- Legacy Phase 2: habit_plans versioned plan storage + atomic save RPC
-- Apply via Supabase SQL Editor or: supabase db push

BEGIN;

-- ================================================================
-- 1. habit_plans table
--    Append-only log of plan versions per habit.
--    is_active = true identifies the current version.
--    Plans are archived (is_active = false), never deleted.
-- ================================================================

CREATE TABLE IF NOT EXISTS habit_plans (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id            UUID        NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  version             INTEGER     NOT NULL DEFAULT 1,
  core_philosophy     TEXT,
  actionable_steps    JSONB       DEFAULT '[]'::jsonb,
  weekly_roadmap      JSONB       DEFAULT '[]'::jsonb,
  daily_actions       JSONB       DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast "get active plan for habit" lookup
CREATE INDEX IF NOT EXISTS idx_habit_plans_habit_active
  ON habit_plans (habit_id, is_active)
  WHERE is_active = true;

-- Fast plan history list ordered by recency
CREATE INDEX IF NOT EXISTS idx_habit_plans_habit_created
  ON habit_plans (habit_id, created_at DESC);

-- ================================================================
-- 2. RLS
-- ================================================================

ALTER TABLE habit_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own habit plans"
  ON habit_plans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own habit plans"
  ON habit_plans FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own habit plans"
  ON habit_plans FOR UPDATE
  USING (user_id = auth.uid());

-- No DELETE policy: plans are archived, not deleted

-- ================================================================
-- 3. save_habit_plan(p_habit_id, ...) — atomic archive + insert
--
--    Archives all prior active plans for the habit, then inserts
--    a new active plan. Runs in a single transaction (SECURITY DEFINER)
--    so no window exists where two rows have is_active = true.
--
--    COALESCE(MAX(version), 0) + 1 handles the first plan correctly.
-- ================================================================

CREATE OR REPLACE FUNCTION save_habit_plan(
  p_habit_id            UUID,
  p_core_philosophy     TEXT,
  p_actionable_steps    JSONB,
  p_weekly_roadmap      JSONB,
  p_daily_actions       JSONB
) RETURNS habit_plans AS $$
DECLARE
  uid          UUID    := auth.uid();
  next_version INTEGER;
  new_plan     habit_plans;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user owns the habit (RLS alone is not enough inside SECURITY DEFINER)
  IF NOT EXISTS (
    SELECT 1 FROM habits WHERE id = p_habit_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'Habit not found or not owned by user';
  END IF;

  -- Archive all prior active plans for this habit
  UPDATE habit_plans
  SET is_active = false
  WHERE habit_id = p_habit_id AND is_active = true;

  -- Determine next version (COALESCE handles NULL when no prior rows exist)
  SELECT COALESCE(MAX(version), 0) + 1
  INTO next_version
  FROM habit_plans
  WHERE habit_id = p_habit_id;

  -- Insert new active plan
  INSERT INTO habit_plans (
    habit_id, user_id, is_active, version,
    core_philosophy, actionable_steps, weekly_roadmap, daily_actions
  )
  VALUES (
    p_habit_id, uid, true, next_version,
    p_core_philosophy, p_actionable_steps, p_weekly_roadmap, p_daily_actions
  )
  RETURNING * INTO new_plan;

  RETURN new_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
