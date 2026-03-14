-- Add profiles table to existing schema
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  preferred_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Brother', 'Sister')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: In a real app we'd add RLS policies here
