-- Bridge table: tracks streaming video submissions to FestScout festivals.
-- Used by streaming-api/src/routes/festivalBridge.js

CREATE TABLE IF NOT EXISTS festival_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
    submitter_id TEXT NOT NULL REFERENCES stream_users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    director TEXT,
    synopsis TEXT,
    contact_email TEXT,
    submitted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (video_id, festival_id)
);

CREATE INDEX IF NOT EXISTS idx_festival_submissions_submitter
    ON festival_submissions (submitter_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_festival_submissions_festival
    ON festival_submissions (festival_id);
