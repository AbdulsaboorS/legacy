-- Legacy Phase 4: Live Circle Feed
-- Adds habit_log_id FK to halaqa_reactions and creates get_circle_feed SECURITY DEFINER RPC
-- Apply via Supabase SQL Editor or CLI

BEGIN;

-- ================================================================
-- 1. Add habit_log_id to halaqa_reactions
--
--    Nullable so existing reactions (without log context) remain valid.
--    ON DELETE SET NULL prevents orphan issues if a log is deleted.
-- ================================================================

ALTER TABLE halaqa_reactions
  ADD COLUMN IF NOT EXISTS habit_log_id UUID REFERENCES habit_logs(id) ON DELETE SET NULL;

-- ================================================================
-- 2. get_circle_feed(p_halaqa_id UUID)
--
--    Returns the 48-hour activity feed for a halaqa circle.
--    Row types:
--      'log'       — habit check-ins aggregated per member per day
--      'milestone' — streak milestones (7, 14, 21, 28, 30 days)
--      'joined'    — new members who joined within the 48hr window
--
--    Security:
--      SECURITY DEFINER — executes as function owner, bypassing RLS
--      on habit_logs so members can read each other's logs.
--      Membership is verified inside the function before any data access.
-- ================================================================

CREATE OR REPLACE FUNCTION get_circle_feed(p_halaqa_id UUID)
RETURNS TABLE(
  row_type     TEXT,
  user_id      UUID,
  display_name TEXT,
  habits       JSONB,
  streak       INTEGER,
  created_at   TIMESTAMPTZ,
  habit_log_id UUID,
  reactions    JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_window TIMESTAMPTZ := now() - INTERVAL '48 hours';
BEGIN

  -- Security guard: caller must be a member of this halaqa
  IF NOT EXISTS (
    SELECT 1 FROM halaqa_members
    WHERE halaqa_id = p_halaqa_id
      AND user_id   = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member';
  END IF;

  RETURN QUERY
  WITH log_rows AS (
    -- Habit check-ins completed within the 48hr window,
    -- grouped per member per day. Uses MIN(hl.id) as the
    -- representative habit_log_id for reactions.
    SELECT
      'log'::TEXT                                                              AS row_type,
      hl.user_id,
      p.preferred_name                                                         AS display_name,
      jsonb_agg(jsonb_build_object('name', h.name, 'icon', h.icon)
                ORDER BY h.name)                                               AS habits,
      COALESCE(s.current_streak, 0)::INTEGER                                   AS streak,
      MAX(hl.created_at)                                                       AS created_at,
      MIN(hl.id)                                                               AS habit_log_id
    FROM habit_logs hl
    JOIN profiles p ON p.id = hl.user_id
    JOIN habits   h ON h.id = hl.habit_id
    LEFT JOIN streaks s ON s.user_id = hl.user_id
    WHERE hl.created_at >= p_window
      AND hl.completed  = true
      AND hl.user_id IN (
        SELECT user_id FROM halaqa_members WHERE halaqa_id = p_halaqa_id
      )
    GROUP BY hl.user_id, hl.date, p.preferred_name, s.current_streak
  ),

  milestone_rows AS (
    -- Members whose streak hit a milestone number today
    SELECT
      'milestone'::TEXT                                      AS row_type,
      hm.user_id,
      p.preferred_name                                       AS display_name,
      '[]'::JSONB                                            AS habits,
      s.current_streak::INTEGER                              AS streak,
      (CURRENT_DATE || 'T00:00:00Z')::TIMESTAMPTZ            AS created_at,
      NULL::UUID                                             AS habit_log_id
    FROM halaqa_members hm
    JOIN profiles p ON p.id = hm.user_id
    JOIN streaks  s ON s.user_id = hm.user_id
    WHERE hm.halaqa_id = p_halaqa_id
      AND s.current_streak IN (7, 14, 21, 28, 30)
      AND s.last_completed_date = CURRENT_DATE
  ),

  joined_rows AS (
    -- Members who joined this halaqa within the 48hr window
    SELECT
      'joined'::TEXT       AS row_type,
      hm.user_id,
      p.preferred_name     AS display_name,
      '[]'::JSONB          AS habits,
      0::INTEGER           AS streak,
      hm.joined_at         AS created_at,
      NULL::UUID           AS habit_log_id
    FROM halaqa_members hm
    JOIN profiles p ON p.id = hm.user_id
    WHERE hm.halaqa_id = p_halaqa_id
      AND hm.joined_at >= p_window
  ),

  reaction_counts AS (
    -- Aggregate emoji reactions per habit_log_id for the window
    SELECT
      sub.habit_log_id,
      jsonb_object_agg(sub.emoji, sub.cnt) AS reaction_counts
    FROM (
      SELECT
        hr.habit_log_id,
        hr.emoji,
        COUNT(*) AS cnt
      FROM halaqa_reactions hr
      WHERE hr.halaqa_id   = p_halaqa_id
        AND hr.habit_log_id IS NOT NULL
        AND hr.created_at  >= p_window
      GROUP BY hr.habit_log_id, hr.emoji
    ) sub
    GROUP BY sub.habit_log_id
  )

  -- Union all row types and join reactions, order newest first
  SELECT
    r.row_type,
    r.user_id,
    r.display_name,
    r.habits,
    r.streak,
    r.created_at,
    r.habit_log_id,
    COALESCE(rc.reaction_counts, '{}'::JSONB) AS reactions
  FROM (
    SELECT * FROM log_rows
    UNION ALL
    SELECT * FROM milestone_rows
    UNION ALL
    SELECT * FROM joined_rows
  ) r
  LEFT JOIN reaction_counts rc ON rc.habit_log_id = r.habit_log_id
  ORDER BY r.created_at DESC;

END;
$$;

-- ================================================================
-- 3. Grant execute to authenticated users
-- ================================================================

GRANT EXECUTE ON FUNCTION get_circle_feed(UUID) TO authenticated;

COMMIT;
