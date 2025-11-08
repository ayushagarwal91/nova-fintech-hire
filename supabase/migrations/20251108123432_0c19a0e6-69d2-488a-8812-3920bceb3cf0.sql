-- Add new fields to assignments table for enhanced tracking
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('Junior', 'Mid', 'Senior')),
ADD COLUMN IF NOT EXISTS time_limit_hours INTEGER DEFAULT 48,
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'evaluated', 'passed', 'failed')),
ADD COLUMN IF NOT EXISTS final_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS anti_cheat_id TEXT UNIQUE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON assignments(deadline);
CREATE INDEX IF NOT EXISTS idx_assignments_candidate_id ON assignments(candidate_id);

-- Update trigger for assignments
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();