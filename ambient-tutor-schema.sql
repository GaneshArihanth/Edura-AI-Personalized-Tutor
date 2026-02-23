-- Ambient Tutor Phase 1 Schema Changes

-- 1. Add Profile Column to Users
-- We use JSONB to allow the Gemini AI to store flexible key-value pairs 
-- like {"learning_style": "visual", "current_state": "flow_state"}
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_persona_profile JSONB DEFAULT '{}'::jsonb;

-- 2. Create Telemetry Table
-- This table acts as our "Listening Layer", capturing events across the platform
CREATE TABLE IF NOT EXISTS user_telemetry_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g., 'quiz_failed', 'focus_session_completed', 'ide_error'
  event_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Row Level Security (RLS) for Telemetry
ALTER TABLE user_telemetry_events ENABLE ROW LEVEL SECURITY;

-- Users can only insert telemetry for their own user_id
CREATE POLICY "Users can insert their own telemetry"
  ON user_telemetry_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only view their own telemetry
CREATE POLICY "Users can view their own telemetry"
  ON user_telemetry_events FOR SELECT
  USING (auth.uid() = user_id);
