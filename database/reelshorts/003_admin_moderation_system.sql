-- Migration: Admin Moderation System
-- Description: Add user roles, video moderation status, and admin capabilities

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'creator', 'moderator', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add moderation fields to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged', 'reviewing'));
ALTER TABLE videos ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- Create index for moderation queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_videos_moderation_status ON videos(moderation_status);
CREATE INDEX IF NOT EXISTS idx_videos_flagged ON videos(flag_count) WHERE flag_count > 0;

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'approve_video', 'reject_video', 'ban_user', 'unban_user', etc.
    target_type VARCHAR(20) NOT NULL, -- 'user', 'video', 'comment'
    target_id UUID NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON admin_activity_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity_log(created_at DESC);

-- Create platform statistics view for admin dashboard
CREATE OR REPLACE VIEW admin_platform_stats AS
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week,
    (SELECT COUNT(*) FROM users WHERE is_banned = true) as banned_users,
    (SELECT COUNT(*) FROM videos) as total_videos,
    (SELECT COUNT(*) FROM videos WHERE created_at > NOW() - INTERVAL '7 days') as new_videos_week,
    (SELECT COUNT(*) FROM videos WHERE moderation_status = 'pending') as videos_pending_moderation,
    (SELECT COUNT(*) FROM videos WHERE moderation_status = 'flagged') as flagged_videos,
    (SELECT COUNT(*) FROM content_moderation WHERE status = 'pending') as pending_reports,
    (SELECT SUM(view_count) FROM videos) as total_views,
    (SELECT SUM(comment_count) FROM videos) as total_comments;

-- Grant admin role to first user (you can change this)
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

COMMENT ON COLUMN users.role IS 'User role: user (default), creator (verified filmmaker), moderator, admin';
COMMENT ON COLUMN videos.moderation_status IS 'Moderation status: pending (awaiting review), approved (published), rejected (blocked), flagged (reported), reviewing (under investigation)';
COMMENT ON TABLE admin_activity_log IS 'Logs all administrative actions for audit trail';
