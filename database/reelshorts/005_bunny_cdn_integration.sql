-- Migration: Bunny.net CDN Integration
-- Description: Add Bunny.net video ID and CDN URLs to videos table

-- Add Bunny.net fields to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS bunny_video_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS bunny_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'uploading', 'processing', 'ready', 'error'
ALTER TABLE videos ADD COLUMN IF NOT EXISTS bunny_hls_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS bunny_thumbnail_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS cdn_enabled BOOLEAN DEFAULT false;

-- Create indexes for Bunny.net queries
CREATE INDEX IF NOT EXISTS idx_videos_bunny_id ON videos(bunny_video_id) WHERE bunny_video_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_cdn_enabled ON videos(cdn_enabled) WHERE cdn_enabled = true;
CREATE INDEX IF NOT EXISTS idx_videos_bunny_status ON videos(bunny_status);

COMMENT ON COLUMN videos.bunny_video_id IS 'Bunny.net Stream video GUID';
COMMENT ON COLUMN videos.bunny_status IS 'Bunny.net encoding status: pending, uploading, processing, ready, error';
COMMENT ON COLUMN videos.bunny_hls_url IS 'Bunny.net HLS manifest URL for adaptive streaming';
COMMENT ON COLUMN videos.bunny_thumbnail_url IS 'Bunny.net generated thumbnail URL';
COMMENT ON COLUMN videos.cdn_enabled IS 'Whether this video is served via Bunny.net CDN';
