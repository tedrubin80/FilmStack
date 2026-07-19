-- ============================================
-- POSTGRESQL USER AUTHENTICATION SCHEMA
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for better text search

-- Custom types for user system
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'creator', 'user');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE auth_provider AS ENUM ('local', 'google', 'facebook', 'twitter', 'github');
CREATE TYPE verification_type AS ENUM ('email', 'phone', 'password_reset', 'account_activation');

-- ============================================
-- USERS TABLE - Core user information
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Authentication
    password_hash VARCHAR(255), -- null for OAuth-only accounts
    salt VARCHAR(255),
    auth_provider auth_provider DEFAULT 'local',
    provider_id VARCHAR(255), -- ID from OAuth provider
    
    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    date_of_birth DATE,
    location VARCHAR(255),
    website VARCHAR(255),
    
    -- Account status
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'pending_verification',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Security and tracking
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP WITH TIME ZONE,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    
    -- Privacy settings
    profile_public BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- soft delete
    
    -- Constraints
    CONSTRAINT valid_username CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$'),
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone ~ '^\+?[1-9]\d{1,14}$' OR phone IS NULL),
    CONSTRAINT valid_website CHECK (website ~ '^https?://.+' OR website IS NULL)
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, provider_id);
CREATE INDEX idx_users_search ON users USING GIN(to_tsvector('english', 
    COALESCE(username, '') || ' ' || 
    COALESCE(display_name, '') || ' ' || 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '')
));

-- ============================================
-- USER SESSIONS TABLE - Active user sessions
-- ============================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255),
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    location_data JSONB, -- city, country, etc.
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_active ON user_sessions(is_active, expires_at);

-- ============================================
-- EMAIL VERIFICATIONS TABLE - Email verification tokens
-- ============================================
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    verification_type verification_type NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_expires_at ON password_reset_tokens(expires_at);

-- ============================================
-- USER ACTIVITY LOG TABLE - Security auditing
-- ============================================
CREATE TABLE user_activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_log_type ON user_activity_log(activity_type);
CREATE INDEX idx_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX idx_activity_log_ip ON user_activity_log(ip_address);

-- ============================================
-- USER PREFERENCES TABLE - User settings
-- ============================================
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, preference_key)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);

-- ============================================
-- OAUTH ACCOUNTS TABLE - Third-party authentication
-- ============================================
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider auth_provider NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_username VARCHAR(255),
    provider_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_user_id);

-- ============================================
-- USER PROFILE VIEWS - For analytics
-- ============================================
CREATE TABLE user_profile_views (
    id BIGSERIAL PRIMARY KEY,
    profile_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profile_views_profile_user ON user_profile_views(profile_user_id);
CREATE INDEX idx_profile_views_viewer_user ON user_profile_views(viewer_user_id);
CREATE INDEX idx_profile_views_created_at ON user_profile_views(created_at);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_accounts_updated_at 
    BEFORE UPDATE ON oauth_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SECURITY FUNCTIONS
-- ============================================

-- Function to hash passwords
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION generate_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is locked
CREATE OR REPLACE FUNCTION is_user_locked(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    lock_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT account_locked_until INTO lock_until
    FROM users 
    WHERE id = user_uuid;
    
    RETURN lock_until IS NOT NULL AND lock_until > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to lock user account
CREATE OR REPLACE FUNCTION lock_user_account(
    user_uuid UUID, 
    lock_duration INTERVAL DEFAULT '30 minutes'
)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        account_locked_until = CURRENT_TIMESTAMP + lock_duration,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to unlock user account
CREATE OR REPLACE FUNCTION unlock_user_account(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        account_locked_until = NULL,
        failed_login_attempts = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    user_uuid UUID,
    activity VARCHAR(50),
    description TEXT DEFAULT NULL,
    ip INET DEFAULT NULL,
    agent TEXT DEFAULT NULL,
    metadata JSONB DEFAULT NULL,
    success BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_log (
        user_id, activity_type, description, ip_address, 
        user_agent, metadata, success
    ) VALUES (
        user_uuid, activity, description, ip, agent, metadata, success
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean expired sessions
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR NOT is_active;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean expired email verifications
    DELETE FROM email_verifications 
    WHERE expires_at < CURRENT_TIMESTAMP AND NOT verified;
    
    -- Clean expired password reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_videos', COALESCE(video_count, 0),
        'total_views', COALESCE(total_views, 0),
        'total_subscribers', COALESCE(subscriber_count, 0),
        'profile_views', COALESCE(profile_views, 0),
        'account_age_days', EXTRACT(DAY FROM CURRENT_TIMESTAMP - u.created_at)
    ) INTO result
    FROM users u
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as video_count,
            SUM(view_count) as total_views
        FROM videos 
        WHERE user_id = user_uuid AND status = 'ready'
        GROUP BY user_id
    ) v ON u.id = v.user_id
    LEFT JOIN (
        SELECT 
            channel_id,
            COUNT(*) as subscriber_count
        FROM subscriptions 
        WHERE channel_id = user_uuid AND is_active = true
        GROUP BY channel_id
    ) s ON u.id = s.channel_id
    LEFT JOIN (
        SELECT 
            profile_user_id,
            COUNT(*) as profile_views
        FROM user_profile_views 
        WHERE profile_user_id = user_uuid
        GROUP BY profile_user_id
    ) pv ON u.id = pv.profile_user_id
    WHERE u.id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active users view
CREATE VIEW active_users AS
SELECT 
    id, username, email, display_name, role, status,
    created_at, last_login, login_count
FROM users 
WHERE status = 'active' 
  AND is_active = true 
  AND deleted_at IS NULL;

-- User profiles view (public information only)
CREATE VIEW user_profiles AS
SELECT 
    id, username, display_name, bio, avatar_url, 
    location, website, created_at,
    CASE WHEN profile_public THEN email ELSE NULL END as public_email
FROM users 
WHERE status = 'active' 
  AND is_active = true 
  AND deleted_at IS NULL
  AND profile_public = true;

-- User session summary
CREATE VIEW user_session_summary AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(s.id) as active_sessions,
    MAX(s.last_activity) as last_session_activity,
    array_agg(DISTINCT s.ip_address) as recent_ips
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = true
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username;

-- ============================================
-- SCHEDULED CLEANUP (requires pg_cron extension)
-- ============================================

-- Schedule token cleanup to run every hour
-- SELECT cron.schedule('cleanup-expired-tokens', '0 * * * *', 'SELECT cleanup_expired_tokens();');

-- Schedule old activity log cleanup (keep 90 days)
-- SELECT cron.schedule('cleanup-old-activity-logs', '0 2 * * *', 
--   'DELETE FROM user_activity_log WHERE created_at < CURRENT_TIMESTAMP - INTERVAL ''90 days'';');

-- SAMPLE DATA INSERTION (disabled for open-source release — do not ship demo passwords)
/*
-- ============================================
-- SAMPLE DATA INSERTION
-- ============================================

-- Insert sample admin user
INSERT INTO users (
    username, email, password_hash, first_name, last_name, 
    role, status, email_verified, profile_public
) VALUES (
    'admin', 
    'admin@videotube.com', 
    hash_password(current_setting('app.seed_password', true)) -- set app.seed_password; do not commit real passwords, 
    'Admin', 
    'User',
    'admin', 
    'active', 
    true, 
    false
);

-- Insert sample regular users
INSERT INTO users (
    username, email, password_hash, first_name, last_name, 
    display_name, bio, role, status, email_verified
) VALUES 
(
    'creator1', 
    'creator@example.com', 
    hash_password(current_setting('app.seed_password', true)) -- set app.seed_password; do not commit real passwords, 
    'Content', 
    'Creator',
    'Content Creator',
    'I create amazing video content!',
    'creator', 
    'active', 
    true
),
(
    'viewer1', 
    'viewer@example.com', 
    hash_password(current_setting('app.seed_password', true)) -- set app.seed_password; do not commit real passwords, 
    'Video', 
    'Viewer',
    'Video Enthusiast',
    'Love watching great content',
    'user', 
    'active', 
    true
);

*/

-- ============================================
-- USEFUL QUERIES FOR COMMON OPERATIONS
-- ============================================

-- Find user by email or username
/*
SELECT * FROM users 
WHERE (email = $1 OR username = $1) 
  AND deleted_at IS NULL;
*/

-- Get user with session info
/*
SELECT 
    u.*, 
    s.last_activity as last_session_activity,
    s.ip_address as last_ip
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = true
WHERE u.id = $1 
  AND u.deleted_at IS NULL
ORDER BY s.last_activity DESC
LIMIT 1;
*/

-- Search users
/*
SELECT id, username, display_name, avatar_url, bio
FROM users 
WHERE to_tsvector('english', 
    COALESCE(username, '') || ' ' || 
    COALESCE(display_name, '') || ' ' || 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '')
) @@ plainto_tsquery('english', $1)
  AND status = 'active' 
  AND is_active = true 
  AND deleted_at IS NULL
  AND profile_public = true
ORDER BY 
    ts_rank(to_tsvector('english', 
        COALESCE(username, '') || ' ' || 
        COALESCE(display_name, '')
    ), plainto_tsquery('english', $1)) DESC
LIMIT 20;
*/

-- Get user activity summary
/*
SELECT 
    activity_type,
    COUNT(*) as count,
    MAX(created_at) as last_occurrence
FROM user_activity_log 
WHERE user_id = $1 
  AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY activity_type
ORDER BY count DESC;
*/