-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day >= 0 AND day <= 6),
  startTime NUMERIC NOT NULL,
  endTime NUMERIC NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user_id to speed up queries
CREATE INDEX IF NOT EXISTS idx_blocks_user_id ON blocks(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see and modify their own blocks
CREATE POLICY "Users can view their own blocks"
  ON blocks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blocks"
  ON blocks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blocks"
  ON blocks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocks"
  ON blocks
  FOR DELETE
  USING (auth.uid() = user_id);
