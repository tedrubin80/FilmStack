-- Initialize YouTube-style streaming platform database

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    subscriber_count INTEGER DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channels table (users can have multiple channels)
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    banner_url TEXT,
    avatar_url TEXT,
    subscriber_count INTEGER DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Videos table
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration INTEGER, -- in seconds
    file_size BIGINT,
    video_quality JSONB, -- stores available qualities
    tags TEXT[],
    view_count BIGINT DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_live BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    is_unlisted BOOLEAN DEFAULT FALSE,
    is_monetized BOOLEAN DEFAULT FALSE,
    upload_status VARCHAR(20) DEFAULT 'processing', -- processing, ready, failed
    stream_key VARCHAR(255) UNIQUE,
    rtmp_url TEXT,
    hls_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Video files table (for different qualities)
CREATE TABLE video_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    quality VARCHAR(10) NOT NULL, -- 360p, 480p, 720p, 1080p, etc.
    file_path TEXT NOT NULL,
    file_size BIGINT,
    bitrate INTEGER,
    codec VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id), -- for replies
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_id, channel_id)
);

-- Likes/Dislikes table
CREATE TABLE video_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id)
);

-- Comment reactions table
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comment_id)
);

-- View history table
CREATE TABLE view_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    watch_time INTEGER DEFAULT 0, -- seconds watched
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Playlists table
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    video_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Playlist videos table
CREATE TABLE playlist_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, video_id)
);

-- Live streams table
CREATE TABLE live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    stream_key VARCHAR(255) UNIQUE NOT NULL,
    rtmp_url TEXT NOT NULL,
    hls_url TEXT,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, live, ended
    viewer_count INTEGER DEFAULT 0,
    max_viewers INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- new_video, live_stream, comment, like, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_id UUID, -- video_id, comment_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default film categories
INSERT INTO categories (name, description, color) VALUES
('Drama', 'Dramatic short films and character studies', '#FF6B6B'),
('Comedy', 'Comedic short films and sketches', '#4ECDC4'),
('Horror', 'Horror and thriller short films', '#45B7D1'),
('Romance', 'Romantic short films and love stories', '#96CEB4'),
('Action', 'Action and adventure short films', '#FFEAA7'),
('Sci-Fi', 'Science fiction and futuristic films', '#DDA0DD'),
('Documentary', 'Documentary short films and real stories', '#98D8C8'),
('Animation', 'Animated short films and motion graphics', '#F7DC6F'),
('Experimental', 'Avant-garde and experimental cinema', '#BB8FCE'),
('Southern Gothic', 'Southern themed films and gothic stories', '#85C1E9');

-- Film metadata table for additional film information
CREATE TABLE film_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    film_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    cast_info TEXT,
    crew_info TEXT,
    production_year INTEGER,
    budget DECIMAL(12,2),
    runtime_original INTEGER, -- original runtime before any edits
    awards TEXT,
    festivals TEXT[],
    behind_the_scenes_url TEXT,
    trailer_url TEXT,
    imdb_id VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User upload tracking for daily limits
CREATE TABLE user_upload_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_date DATE NOT NULL,
    uploads_count INTEGER DEFAULT 0,
    total_size_uploaded BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, upload_date)
);

-- Film ratings table (separate from reactions for detailed ratings)
CREATE TABLE film_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    film_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, film_id)
);

-- Film collections (curated lists by staff or users)
CREATE TABLE film_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    curator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Film collection items
CREATE TABLE film_collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES film_collections(id) ON DELETE CASCADE,
    film_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, film_id)
);

-- Film festivals integration
CREATE TABLE film_festivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website_url TEXT,
    submission_deadline DATE,
    festival_date_start DATE,
    festival_date_end DATE,
    location VARCHAR(255),
    entry_fee DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Streaming → FestScout bridge submissions (see 008_festival_submissions_bridge.sql)
CREATE TABLE festival_submissions (
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

-- User preferences for recommendations
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_genres UUID[], -- array of category IDs
    preferred_duration VARCHAR(20), -- short, medium, long
    content_rating_preference VARCHAR(10), -- G, PG, PG13, R
    language_preferences VARCHAR(10)[],
    autoplay_enabled BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Content moderation table
CREATE TABLE content_moderation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(20) NOT NULL, -- video, comment, user
    content_id UUID NOT NULL,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, removed
    action_taken VARCHAR(100),
    priority INTEGER DEFAULT 1, -- 1-5, 5 being highest priority
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Analytics events table for tracking user behavior
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL, -- video_view, video_complete, search, etc.
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions table
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired, suspended
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_method_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Festival award verification table
CREATE TABLE festival_awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    film_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    festival_name VARCHAR(255) NOT NULL,
    award_category VARCHAR(255) NOT NULL,
    award_type VARCHAR(100) NOT NULL, -- winner, finalist, honorable_mention, etc.
    award_year INTEGER NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    verification_document_url TEXT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscription waivers table
CREATE TABLE subscription_waivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    award_id UUID NOT NULL REFERENCES festival_awards(id) ON DELETE CASCADE,
    waiver_type VARCHAR(50) NOT NULL, -- full_waiver, partial_discount
    discount_percentage INTEGER DEFAULT 100, -- 100 = full waiver, 50 = 50% off, etc.
    waiver_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, used, expired
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    festival_director_email VARCHAR(255),
    festival_director_notified_at TIMESTAMP WITH TIME ZONE,
    festival_director_response TEXT,
    festival_director_responded_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Waiver code redemptions table
CREATE TABLE waiver_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waiver_id UUID NOT NULL REFERENCES subscription_waivers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2) NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Festival directors contact information
CREATE TABLE festival_directors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    festival_name VARCHAR(255) NOT NULL,
    director_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    organization VARCHAR(255),
    verification_authority BOOLEAN DEFAULT FALSE, -- can this director verify awards?
    auto_approve_waivers BOOLEAN DEFAULT FALSE, -- automatically approve waivers for this festival?
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email templates for waiver requests
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    template_variables JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features) VALUES
(
    'Premium Filmmaker',
    'Ad-free viewing, advanced analytics, priority upload processing, and exclusive content',
    12.99,
    129.99,
    '{"ad_free": true, "priority_processing": true, "advanced_analytics": true, "exclusive_content": true, "download_offline": true, "4k_streaming": true}'
),
(
    'Festival Pro',
    'All Premium features plus festival submission tools and networking features',
    24.99,
    249.99,
    '{"ad_free": true, "priority_processing": true, "advanced_analytics": true, "exclusive_content": true, "download_offline": true, "4k_streaming": true, "festival_tools": true, "networking": true, "industry_access": true}'
);

-- Insert Southern Short Film Festival director
INSERT INTO festival_directors (festival_name, director_name, email, organization, verification_authority, auto_approve_waivers) VALUES
('Southern Short Film Festival', 'Festival Director', 'director@southernshortfilmfestival.com', 'Southern Short Film Festival', true, true);

-- Insert email templates
INSERT INTO email_templates (template_name, subject_template, body_template, template_variables) VALUES
(
    'waiver_request_to_director',
    'Subscription Waiver Request - {{filmmaker_name}} ({{award_category}})',
    'Dear {{director_name}},

We hope this email finds you well. We are reaching out regarding a subscription waiver request on Southerns Short Films platform.

**Filmmaker Details:**
- Name: {{filmmaker_name}}
- Email: {{filmmaker_email}}
- Film Title: {{film_title}}

**Award Information:**
- Festival: {{festival_name}}
- Award Category: {{award_category}}
- Award Type: {{award_type}}
- Year: {{award_year}}

**Waiver Request:**
{{filmmaker_name}} has requested a subscription waiver based on their achievement at {{festival_name}}. As the festival director, we would appreciate your verification of this award.

**Action Required:**
Please respond to this email with one of the following:
- APPROVE: Confirm the award and approve the waiver
- REJECT: If the award information is incorrect
- VERIFY: If you need additional documentation

You can also verify awards directly through our platform at: {{verification_url}}

**About the Waiver:**
This waiver provides {{discount_percentage}}% discount on our premium subscription for one year, recognizing excellence in short filmmaking.

Thank you for your time and continued support of independent filmmakers.

Best regards,
Southerns Short Films Team
{{platform_contact_email}}',
    '{"filmmaker_name": "string", "filmmaker_email": "string", "film_title": "string", "festival_name": "string", "award_category": "string", "award_type": "string", "award_year": "number", "director_name": "string", "verification_url": "string", "discount_percentage": "number", "platform_contact_email": "string"}'
),
(
    'waiver_approved_notification',
    'Your Subscription Waiver Has Been Approved! 🎉',
    'Congratulations {{filmmaker_name}}!

Your subscription waiver request has been approved by the {{festival_name}} director.

**Your Waiver Details:**
- Waiver Code: {{waiver_code}}
- Discount: {{discount_percentage}}% off premium subscription
- Valid Until: {{expires_at}}

**How to Redeem:**
1. Go to your account settings
2. Click "Upgrade to Premium"
3. Enter waiver code: {{waiver_code}}
4. Enjoy your discounted premium subscription!

This waiver recognizes your achievement in {{award_category}} at {{festival_name}}. We''re proud to support award-winning filmmakers like you.

Start enjoying premium features:
- Ad-free viewing
- Priority upload processing
- Advanced analytics
- 4K streaming
- Exclusive content access

Redeem your waiver: {{redemption_url}}

Congratulations again on your achievement!

Best regards,
Southerns Short Films Team',
    '{"filmmaker_name": "string", "waiver_code": "string", "discount_percentage": "number", "expires_at": "string", "festival_name": "string", "award_category": "string", "redemption_url": "string"}'
);

-- Create indexes for better performance
CREATE INDEX idx_videos_channel_id ON videos(channel_id);
CREATE INDEX idx_videos_category_id ON videos(category_id);
CREATE INDEX idx_videos_created_at ON videos(created_at);
CREATE INDEX idx_videos_view_count ON videos(view_count);
CREATE INDEX idx_videos_is_live ON videos(is_live);
CREATE INDEX idx_videos_tags ON videos USING GIN(tags);
CREATE INDEX idx_videos_title_search ON videos USING GIN(to_tsvector('english', title));

CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

CREATE INDEX idx_subscriptions_subscriber_id ON subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_channel_id ON subscriptions(channel_id);

CREATE INDEX idx_view_history_user_id ON view_history(user_id);
CREATE INDEX idx_view_history_video_id ON view_history(video_id);
CREATE INDEX idx_view_history_created_at ON view_history(created_at);

CREATE INDEX idx_video_reactions_user_id ON video_reactions(user_id);
CREATE INDEX idx_video_reactions_video_id ON video_reactions(video_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create triggers for updating counts
CREATE OR REPLACE FUNCTION update_video_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE videos 
    SET view_count = (
        SELECT COUNT(*) 
        FROM view_history 
        WHERE video_id = NEW.video_id
    )
    WHERE id = NEW.video_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_view_count
    AFTER INSERT ON view_history
    FOR EACH ROW
    EXECUTE FUNCTION update_video_view_count();

-- Function to update like/dislike counts
CREATE OR REPLACE FUNCTION update_video_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE videos 
    SET 
        like_count = (
            SELECT COUNT(*) 
            FROM video_reactions 
            WHERE video_id = COALESCE(NEW.video_id, OLD.video_id) 
            AND reaction_type = 'like'
        ),
        dislike_count = (
            SELECT COUNT(*) 
            FROM video_reactions 
            WHERE video_id = COALESCE(NEW.video_id, OLD.video_id) 
            AND reaction_type = 'dislike'
        )
    WHERE id = COALESCE(NEW.video_id, OLD.video_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_reaction_counts
    AFTER INSERT OR UPDATE OR DELETE ON video_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_video_reaction_counts();