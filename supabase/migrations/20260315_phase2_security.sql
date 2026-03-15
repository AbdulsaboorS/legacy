BEGIN;

-- Enable RLS on all tables
ALTER TABLE halaqas ENABLE ROW LEVEL SECURITY;
ALTER TABLE halaqa_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE halaqa_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read (to see names in grids), but only update/insert their own
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Halaqas: Read public lobbies or circles they are members of
CREATE POLICY "Users can view public halaqas or halaqas they belong to"
ON halaqas FOR SELECT 
USING (
  is_public = true 
  OR 
  id IN (SELECT halaqa_id FROM halaqa_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their own halaqas"
ON halaqas FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update halaqas they created"
ON halaqas FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete halaqas they created"
ON halaqas FOR DELETE
USING (created_by = auth.uid());

-- Halaqa Members: View members of their circles or public lobbies (for capacity counts)
CREATE POLICY "Users can view members of their halaqas or public halaqas"
ON halaqa_members FOR SELECT
USING (
  halaqa_id IN (SELECT id FROM halaqas WHERE is_public = true)
  OR
  halaqa_id IN (SELECT halaqa_id FROM halaqa_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their own membership"
ON halaqa_members FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can completely leave halaqas"
ON halaqa_members FOR DELETE
USING (user_id = auth.uid());

-- Halaqa Reactions: View sent or received, insert as sender
CREATE POLICY "Users can view their incoming or outgoing reactions"
ON halaqa_reactions FOR SELECT
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can insert reactions"
ON halaqa_reactions FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- Atomic creation RPC
CREATE OR REPLACE FUNCTION create_private_halaqa(
  p_name TEXT,
  p_gender TEXT,
  p_invite_code TEXT
) RETURNS UUID AS $$
DECLARE
  new_halaqa_id UUID;
  uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO halaqas (name, created_by, invite_code, gender, is_public, max_members)
  VALUES (p_name, uid, p_invite_code, p_gender, false, 8)
  RETURNING id INTO new_halaqa_id;

  INSERT INTO halaqa_members (halaqa_id, user_id)
  VALUES (new_halaqa_id, uid);

  RETURN new_halaqa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
