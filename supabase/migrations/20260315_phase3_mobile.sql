-- Legacy Phase 3 Mobile: device tokens, push notification RPCs
-- Apply via Supabase SQL Editor or CLI

BEGIN;

-- ================================================================
-- 1. device_tokens
--    Stores FCM tokens per user. FCM handles both iOS (via APNs
--    relay) and Android — one token type for both platforms.
--    UNIQUE(user_id, token) makes upsert idempotent on re-register.
-- ================================================================

CREATE TABLE IF NOT EXISTS device_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  platform   TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users manage their own device tokens"
ON device_tokens FOR ALL
USING (user_id = auth.uid());

-- ================================================================
-- 2. get_reminder_tokens(p_date)
--
--    Returns FCM tokens for users who:
--      - Have at least one active habit
--      - Have NOT completed all their habits today
--    Used by the daily morning reminder cron.
--    Returns NULL (not empty array) if no tokens qualify.
-- ================================================================

CREATE OR REPLACE FUNCTION get_reminder_tokens(p_date DATE)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(DISTINCT dt.token)
  FROM device_tokens dt
  WHERE dt.user_id IN (
    SELECT DISTINCT h.user_id
    FROM habits h
    WHERE h.is_active = true
  )
  AND dt.user_id NOT IN (
    -- Exclude users who already finished all habits today
    SELECT hl.user_id
    FROM habit_logs hl
    WHERE hl.date     = p_date
      AND hl.completed = true
    GROUP BY hl.user_id
    HAVING COUNT(hl.habit_id) >= (
      SELECT COUNT(*)
      FROM habits h2
      WHERE h2.user_id   = hl.user_id
        AND h2.is_active = true
    )
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ================================================================
-- 3. get_streak_alert_tokens(p_date)
--
--    Returns FCM tokens for users who:
--      - Have an active streak (current_streak > 0)
--      - Have NOT completed all their habits today
--    Used by the evening streak-at-risk cron.
-- ================================================================

CREATE OR REPLACE FUNCTION get_streak_alert_tokens(p_date DATE)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(DISTINCT dt.token)
  FROM device_tokens dt
  JOIN streaks s ON s.user_id = dt.user_id AND s.current_streak > 0
  WHERE dt.user_id NOT IN (
    SELECT hl.user_id
    FROM habit_logs hl
    WHERE hl.date     = p_date
      AND hl.completed = true
    GROUP BY hl.user_id
    HAVING COUNT(hl.habit_id) >= (
      SELECT COUNT(*)
      FROM habits h
      WHERE h.user_id   = hl.user_id
        AND h.is_active = true
    )
  );
$$ LANGUAGE sql SECURITY DEFINER;

COMMIT;
