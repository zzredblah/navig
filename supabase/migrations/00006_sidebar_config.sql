-- Add sidebar_config column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sidebar_config jsonb DEFAULT '{}';

-- Comment
COMMENT ON COLUMN profiles.sidebar_config IS 'User sidebar menu visibility configuration. Format: { "hidden": ["/team", "/documents/trash"] }';
