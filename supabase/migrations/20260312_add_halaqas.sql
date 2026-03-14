-- Create halaqas schema
CREATE TABLE IF NOT EXISTS halaqas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE set null,
  invite_code TEXT UNIQUE NOT NULL,
  gender TEXT CHECK (gender IN ('Brother', 'Sister')) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  max_members INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create halaqa_members
CREATE TABLE IF NOT EXISTS halaqa_members (
  halaqa_id UUID REFERENCES halaqas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (halaqa_id, user_id)
);

-- Create halaqa_reactions
CREATE TABLE IF NOT EXISTS halaqa_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  halaqa_id UUID REFERENCES halaqas(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: In a real production app, strict RLS policies would be added here to restrict row access securely.
