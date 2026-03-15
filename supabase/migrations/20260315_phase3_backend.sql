-- Legacy Phase 3 Backend: Per-habit grace, authoritative streak RPC, reaction rate limit
-- Apply via Supabase SQL Editor or CLI

BEGIN;

-- ================================================================
-- 1. Per-habit grace date
--    Moves grace tracking from streaks (global) to habits (per-habit).
--    Each habit gets its own 7-day grace slot independently.
-- ================================================================

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS last_grace_date DATE;

-- ================================================================
-- 2. recalculate_streak(p_user_id)
--
--    Authoritative streak engine — replaces client-side logic.
--    Call after every habit toggle from DashboardClient.
--
--    Per-habit grace rules:
--      - Each habit can skip 1 day per 7-day window independently
--      - Grace slot: last_grace_date IS NULL OR <= today - 7 days
--      - If ANY habit has no grace and wasn't completed → day fails, return early
--      - If all habits pass (completed or graced) → streak advances
--
--    Streak rules:
--      - last_completed_date = today  → already counted, idempotent, return
--      - last_completed_date = yesterday → increment
--      - any other gap              → reset to 1
-- ================================================================

CREATE OR REPLACE FUNCTION recalculate_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  today             DATE    := CURRENT_DATE;
  yesterday         DATE    := CURRENT_DATE - 1;
  habit_rec         RECORD;
  habits_to_grace   UUID[]  := ARRAY[]::UUID[];
  all_success       BOOLEAN := true;
  last_date         DATE;
  cur_streak        INTEGER;
  lng_streak        INTEGER;
  total_comp        INTEGER;
  completed_count   INTEGER;
BEGIN
  -- Security: caller must be the target user
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Evaluate each active habit: completed today or grace available?
  FOR habit_rec IN
    SELECT
      h.id,
      h.last_grace_date,
      (
        SELECT COUNT(*) > 0
        FROM habit_logs hl
        WHERE hl.habit_id = h.id
          AND hl.date     = today
          AND hl.completed = true
      ) AS completed_today
    FROM habits h
    WHERE h.user_id   = p_user_id
      AND h.is_active = true
  LOOP
    IF NOT habit_rec.completed_today THEN
      IF habit_rec.last_grace_date IS NULL
         OR habit_rec.last_grace_date <= today - INTERVAL '7 days' THEN
        -- Grace slot available — mark to consume after all checks pass
        habits_to_grace := array_append(habits_to_grace, habit_rec.id);
      ELSE
        -- No grace left for this habit — day is incomplete
        all_success := false;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  -- Incomplete day — do not update streak, no grace consumed
  IF NOT all_success THEN
    RETURN;
  END IF;

  -- Consume grace slots for habits that needed them
  IF array_length(habits_to_grace, 1) > 0 THEN
    UPDATE habits
    SET last_grace_date = today
    WHERE id = ANY(habits_to_grace);
  END IF;

  -- Load current streak record
  SELECT current_streak, longest_streak, total_completions, last_completed_date
  INTO cur_streak, lng_streak, total_comp, last_date
  FROM streaks
  WHERE user_id = p_user_id;

  -- Already counted today (idempotent guard — safe to call multiple times per day)
  IF last_date = today THEN
    RETURN;
  END IF;

  -- Count actual completions today for total_completions delta
  SELECT COUNT(*) INTO completed_count
  FROM habit_logs
  WHERE user_id   = p_user_id
    AND date      = today
    AND completed = true;

  -- Determine new streak value
  IF last_date = yesterday THEN
    cur_streak := cur_streak + 1;
  ELSE
    cur_streak := 1; -- Gap > 1 day — reset
  END IF;

  lng_streak := GREATEST(cur_streak, COALESCE(lng_streak, 0));

  UPDATE streaks SET
    current_streak      = cur_streak,
    longest_streak      = lng_streak,
    total_completions   = COALESCE(total_comp, 0) + completed_count,
    last_completed_date = today,
    updated_at          = now()
  WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. send_halaqa_reaction(p_halaqa_id, p_receiver_id, p_emoji)
--
--    Rate-limited emoji reaction. Cap: 5 per (sender, receiver) per day.
--    Enforced server-side so clients can't bypass.
--    Replaces direct INSERT on halaqa_reactions from the client.
-- ================================================================

CREATE OR REPLACE FUNCTION send_halaqa_reaction(
  p_halaqa_id   UUID,
  p_receiver_id UUID,
  p_emoji       TEXT
) RETURNS void AS $$
DECLARE
  uid         UUID    := auth.uid();
  daily_count INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF uid = p_receiver_id THEN
    RAISE EXCEPTION 'Cannot send reaction to yourself';
  END IF;

  -- Verify sender is a member of this halaqa
  IF NOT EXISTS (
    SELECT 1 FROM halaqa_members
    WHERE halaqa_id = p_halaqa_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'Not a member of this halaqa';
  END IF;

  -- Verify receiver is also a member
  IF NOT EXISTS (
    SELECT 1 FROM halaqa_members
    WHERE halaqa_id = p_halaqa_id AND user_id = p_receiver_id
  ) THEN
    RAISE EXCEPTION 'Receiver is not a member of this halaqa';
  END IF;

  -- Enforce daily cap
  SELECT COUNT(*) INTO daily_count
  FROM halaqa_reactions
  WHERE sender_id   = uid
    AND receiver_id = p_receiver_id
    AND halaqa_id   = p_halaqa_id
    AND date        = CURRENT_DATE;

  IF daily_count >= 5 THEN
    RAISE EXCEPTION 'Daily reaction limit reached (5 per person per day)';
  END IF;

  INSERT INTO halaqa_reactions (halaqa_id, sender_id, receiver_id, emoji)
  VALUES (p_halaqa_id, uid, p_receiver_id, p_emoji);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
