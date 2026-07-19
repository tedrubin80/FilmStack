-- Migration: Creator Analytics System
-- Description: Add detailed analytics tracking for creators

-- Create video analytics aggregation table (for faster queries)
CREATE TABLE IF NOT EXISTS video_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- View metrics
    views_count INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    avg_watch_duration INTEGER DEFAULT 0, -- seconds
    completion_rate DECIMAL(5,2) DEFAULT 0.00, -- percentage

    -- Engagement metrics
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,

    -- Traffic sources
    source_direct INTEGER DEFAULT 0,
    source_search INTEGER DEFAULT 0,
    source_recommended INTEGER DEFAULT 0,
    source_external INTEGER DEFAULT 0,
    source_playlist INTEGER DEFAULT 0,

    -- Geographic data (top 5 countries)
    geo_data JSONB DEFAULT '{}',

    -- Device breakdown
    desktop_views INTEGER DEFAULT 0,
    mobile_views INTEGER DEFAULT 0,
    tablet_views INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(video_id, date)
);

CREATE INDEX IF NOT EXISTS idx_video_analytics_video_date ON video_analytics(video_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_video_analytics_date ON video_analytics(date DESC);

-- Create channel analytics aggregation table
CREATE TABLE IF NOT EXISTS channel_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Channel metrics
    total_views BIGINT DEFAULT 0,
    total_videos INTEGER DEFAULT 0,
    new_subscribers INTEGER DEFAULT 0,
    lost_subscribers INTEGER DEFAULT 0,
    total_subscribers INTEGER DEFAULT 0,

    -- Engagement
    total_likes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,

    -- Watch time (minutes)
    total_watch_time BIGINT DEFAULT 0,
    avg_view_duration INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(channel_id, date)
);

CREATE INDEX IF NOT EXISTS idx_channel_analytics_channel_date ON channel_analytics(channel_id, date DESC);

-- Create detailed view sessions table for granular tracking
CREATE TABLE IF NOT EXISTS view_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255), -- Anonymous session tracking

    -- Session details
    watch_duration INTEGER DEFAULT 0, -- seconds actually watched
    video_duration INTEGER, -- total video duration at time of view
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,

    -- Source tracking
    referrer_url TEXT,
    traffic_source VARCHAR(50), -- 'direct', 'search', 'recommended', 'external', 'playlist'

    -- Device & browser
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(50),
    os VARCHAR(50),

    -- Location
    country_code VARCHAR(2),
    city VARCHAR(100),
    ip_address INET,

    -- Engagement during session
    liked BOOLEAN DEFAULT false,
    commented BOOLEAN DEFAULT false,
    shared BOOLEAN DEFAULT false,

    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_view_sessions_video ON view_sessions(video_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_sessions_user ON view_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_sessions_started_at ON view_sessions(started_at DESC);

-- Create audience demographics table
CREATE TABLE IF NOT EXISTS audience_demographics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,

    -- Age groups (percentage)
    age_13_17 DECIMAL(5,2) DEFAULT 0.00,
    age_18_24 DECIMAL(5,2) DEFAULT 0.00,
    age_25_34 DECIMAL(5,2) DEFAULT 0.00,
    age_35_44 DECIMAL(5,2) DEFAULT 0.00,
    age_45_54 DECIMAL(5,2) DEFAULT 0.00,
    age_55_plus DECIMAL(5,2) DEFAULT 0.00,

    -- Gender distribution
    gender_male DECIMAL(5,2) DEFAULT 0.00,
    gender_female DECIMAL(5,2) DEFAULT 0.00,
    gender_other DECIMAL(5,2) DEFAULT 0.00,

    -- Top countries (JSONB array)
    top_countries JSONB DEFAULT '[]',

    -- Peak viewing times
    peak_hours JSONB DEFAULT '[]',

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audience_demographics_channel ON audience_demographics(channel_id);

-- Create revenue tracking table (for future monetization)
CREATE TABLE IF NOT EXISTS creator_revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Revenue sources
    ad_revenue DECIMAL(10,2) DEFAULT 0.00,
    tip_revenue DECIMAL(10,2) DEFAULT 0.00,
    premium_revenue DECIMAL(10,2) DEFAULT 0.00,
    sponsor_revenue DECIMAL(10,2) DEFAULT 0.00,

    -- Costs
    platform_fee DECIMAL(10,2) DEFAULT 0.00,
    processing_fee DECIMAL(10,2) DEFAULT 0.00,

    -- Net
    net_revenue DECIMAL(10,2) DEFAULT 0.00,

    -- Payout tracking
    payout_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'on_hold'
    payout_date DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(channel_id, date)
);

CREATE INDEX IF NOT EXISTS idx_creator_revenue_channel_date ON creator_revenue(channel_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_creator_revenue_payout_status ON creator_revenue(payout_status);

-- Create function to update video analytics
CREATE OR REPLACE FUNCTION update_video_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily video analytics when a view session ends
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        INSERT INTO video_analytics (
            video_id, date, views_count, unique_viewers, avg_watch_duration,
            completion_rate, likes_count, dislikes_count
        )
        VALUES (
            NEW.video_id,
            CURRENT_DATE,
            1,
            CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END,
            NEW.watch_duration,
            NEW.completion_percentage,
            CASE WHEN NEW.liked THEN 1 ELSE 0 END,
            0
        )
        ON CONFLICT (video_id, date) DO UPDATE SET
            views_count = video_analytics.views_count + 1,
            unique_viewers = video_analytics.unique_viewers + CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END,
            avg_watch_duration = (video_analytics.avg_watch_duration * video_analytics.views_count + NEW.watch_duration) / (video_analytics.views_count + 1),
            completion_rate = (video_analytics.completion_rate * video_analytics.views_count + NEW.completion_percentage) / (video_analytics.views_count + 1),
            updated_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic analytics update
DROP TRIGGER IF EXISTS trigger_update_video_analytics ON view_sessions;
CREATE TRIGGER trigger_update_video_analytics
    AFTER INSERT OR UPDATE ON view_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_video_analytics();

-- Create view for creator dashboard summary
CREATE OR REPLACE VIEW creator_dashboard_stats AS
SELECT
    c.id as channel_id,
    c.name as channel_name,
    c.user_id,

    -- Video stats
    (SELECT COUNT(*) FROM videos WHERE channel_id = c.id AND moderation_status = 'approved') as total_videos,
    (SELECT COUNT(*) FROM videos WHERE channel_id = c.id AND created_at > NOW() - INTERVAL '30 days') as videos_last_30_days,

    -- View stats
    (SELECT COALESCE(SUM(view_count), 0) FROM videos WHERE channel_id = c.id) as total_views,
    (SELECT COALESCE(SUM(va.views_count), 0)
     FROM video_analytics va
     JOIN videos v ON va.video_id = v.id
     WHERE v.channel_id = c.id AND va.date > NOW() - INTERVAL '30 days') as views_last_30_days,

    -- Engagement stats
    (SELECT COALESCE(SUM(like_count), 0) FROM videos WHERE channel_id = c.id) as total_likes,
    (SELECT COALESCE(SUM(comment_count), 0) FROM videos WHERE channel_id = c.id) as total_comments,
    (SELECT COALESCE(SUM(share_count), 0) FROM videos WHERE channel_id = c.id) as total_shares,

    -- Subscriber stats
    (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id) as total_subscribers,
    (SELECT COUNT(*) FROM subscriptions WHERE channel_id = c.id AND created_at > NOW() - INTERVAL '30 days') as new_subscribers_30_days,

    -- Watch time (estimated)
    (SELECT COALESCE(AVG(va.avg_watch_duration), 0)
     FROM video_analytics va
     JOIN videos v ON va.video_id = v.id
     WHERE v.channel_id = c.id) as avg_watch_duration,

    -- Revenue (future)
    (SELECT COALESCE(SUM(net_revenue), 0) FROM creator_revenue WHERE channel_id = c.id) as total_revenue,
    (SELECT COALESCE(SUM(net_revenue), 0) FROM creator_revenue WHERE channel_id = c.id AND date > NOW() - INTERVAL '30 days') as revenue_last_30_days

FROM channels c;

COMMENT ON TABLE video_analytics IS 'Daily aggregated analytics for videos';
COMMENT ON TABLE channel_analytics IS 'Daily aggregated analytics for channels';
COMMENT ON TABLE view_sessions IS 'Detailed view session tracking for granular analytics';
COMMENT ON TABLE audience_demographics IS 'Audience demographics for creator insights';
COMMENT ON TABLE creator_revenue IS 'Revenue tracking for creators (monetization)';
