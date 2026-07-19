-- Migration: Watermark System
-- Description: Add watermark settings for channels and videos

-- Add watermark settings to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT true;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS watermark_type VARCHAR(20) DEFAULT 'text' CHECK (watermark_type IN ('text', 'logo', 'combined', 'timestamp', 'none'));
ALTER TABLE channels ADD COLUMN IF NOT EXISTS watermark_text VARCHAR(100) DEFAULT NULL;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS watermark_logo_url TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS watermark_position VARCHAR(20) DEFAULT 'bottom-right' CHECK (watermark_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'top-center', 'bottom-center'));
ALTER TABLE channels ADD COLUMN IF NOT EXISTS watermark_opacity DECIMAL(3,2) DEFAULT 0.70 CHECK (watermark_opacity >= 0 AND watermark_opacity <= 1);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS watermark_timestamp BOOLEAN DEFAULT false;

-- Add watermark tracking to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS has_watermark BOOLEAN DEFAULT false;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS watermark_applied_at TIMESTAMP WITH TIME ZONE;

-- Create watermark templates table (for reusable watermarks)
CREATE TABLE IF NOT EXISTS watermark_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'logo', 'combined', 'timestamp')),

    -- Template settings
    text_content VARCHAR(100),
    logo_url TEXT,
    position VARCHAR(20) DEFAULT 'bottom-right',
    opacity DECIMAL(3,2) DEFAULT 0.70,
    font_size INTEGER DEFAULT 24,
    font_color VARCHAR(20) DEFAULT 'white',

    -- Ownership
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_watermark_templates_public ON watermark_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_watermark_templates_created_by ON watermark_templates(created_by);

-- Create channel_watermark_templates junction table
CREATE TABLE IF NOT EXISTS channel_watermark_templates (
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES watermark_templates(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, template_id)
);

-- Insert default public watermark templates
INSERT INTO watermark_templates (name, description, type, text_content, position, opacity, font_size, is_public)
VALUES
    ('ReelShorts Brand', 'Standard ReelShorts.live branding', 'text', 'ReelShorts.live', 'bottom-right', 0.70, 20, true),
    ('ReelShorts + Timestamp', 'ReelShorts branding with timestamp', 'timestamp', NULL, 'top-left', 0.80, 16, true),
    ('Minimal Text', 'Small minimal text watermark', 'text', 'ReelShorts', 'bottom-right', 0.50, 16, true),
    ('Center Brand', 'Center-positioned branding (for trailers)', 'text', 'ReelShorts.live', 'center', 0.30, 32, true)
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN channels.watermark_enabled IS 'Whether watermarking is enabled for this channel';
COMMENT ON COLUMN channels.watermark_type IS 'Type of watermark: text, logo, combined, timestamp, none';
COMMENT ON COLUMN channels.watermark_text IS 'Custom text to display in watermark';
COMMENT ON COLUMN videos.has_watermark IS 'Whether this video has been watermarked';
COMMENT ON TABLE watermark_templates IS 'Reusable watermark templates for creators';
