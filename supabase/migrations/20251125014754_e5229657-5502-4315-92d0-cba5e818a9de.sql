-- =====================================================
-- Create Calendar Events Table for Manual Events
-- =====================================================

-- Create Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT generate_short_id('CE'),

  -- Core fields
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'Reminder' CHECK (
    event_type IN ('Reminder', 'Meeting', 'Deadline', 'Site Visit', 'Call', 'Milestone', 'Review')
  ),

  -- Relationships
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Date and time
  event_date date NOT NULL,
  event_time time, -- NULL means "any time"

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id),

  CONSTRAINT calendar_events_short_id_format CHECK (short_id ~ '^CE-[a-z0-9]{4}$')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_short_id ON calendar_events(short_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace ON calendar_events(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date) WHERE deleted_at IS NULL;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trigger_update_calendar_events_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- NO RLS - Using UI filtering only per requirements
-- RLS is intentionally disabled to rely on application-level filtering

-- Enable realtime for calendar_events
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;