-- Hum It Out Database Schema
-- PostgreSQL database schema for voice-to-music system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table: Authentication and contact information
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    pin VARCHAR(6) UNIQUE NOT NULL,
    phone VARCHAR(20),
    encrypted_phone TEXT,
    name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_pin_check CHECK (pin ~ '^\d{6}$')
);

-- Sessions table: Recording metadata and processing status  
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    call_sid VARCHAR(100),
    original_audio_url VARCHAR(500) NOT NULL,
    transcribed_lyrics TEXT,
    tempo INTEGER,
    detected_key VARCHAR(10),
    mood_tags TEXT[],
    genre_tags TEXT[],
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    audio_duration DECIMAL(8,3),
    audio_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sessions_status_check CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT sessions_tempo_check CHECK (tempo BETWEEN 60 AND 200),
    CONSTRAINT sessions_duration_check CHECK (audio_duration BETWEEN 1 AND 300)
);

-- Generated tracks table: Output files and metadata
CREATE TABLE IF NOT EXISTS generated_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    backing_track_url VARCHAR(500),
    midi_url VARCHAR(500),  
    stems_folder_url VARCHAR(500),
    lyrics_url VARCHAR(500),
    metadata_url VARCHAR(500),
    download_package_url VARCHAR(500),
    generation_params JSONB,
    file_sizes JSONB,
    total_size INTEGER,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    CONSTRAINT generated_tracks_version_check CHECK (version >= 1),
    CONSTRAINT generated_tracks_size_check CHECK (total_size >= 0)
);

-- Call logs table: Security and analytics
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20),
    call_sid VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    success BOOLEAN,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT call_logs_action_check CHECK (action IN ('incoming_call', 'pin_attempt', 'pin_success', 'pin_failure', 'recording_start', 'recording_complete', 'processing_start', 'processing_complete'))
);

-- Processing jobs table: Background job tracking
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'queued',
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    payload JSONB,
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT processing_jobs_status_check CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT processing_jobs_priority_check CHECK (priority BETWEEN 1 AND 10)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(processing_status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_call_sid ON sessions(call_sid) WHERE call_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tracks_session_id ON generated_tracks(session_id);
CREATE INDEX IF NOT EXISTS idx_tracks_version ON generated_tracks(session_id, version);
CREATE INDEX IF NOT EXISTS idx_tracks_expires_at ON generated_tracks(expires_at);

CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON call_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_action ON call_logs(action);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_session_id ON processing_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON processing_jobs(created_at DESC);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sessions_updated_at') THEN
        CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Views for common queries
CREATE OR REPLACE VIEW user_dashboard_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.pin,
    u.phone,
    u.name,
    u.is_active,
    u.is_admin,
    u.created_at as user_created_at,
    u.last_login,
    COUNT(s.id) as total_sessions,
    COUNT(CASE WHEN s.processing_status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN s.processing_status = 'pending' THEN 1 END) as pending_sessions,
    COUNT(CASE WHEN s.processing_status = 'processing' THEN 1 END) as processing_sessions,
    COUNT(CASE WHEN s.processing_status = 'failed' THEN 1 END) as failed_sessions,
    MAX(s.created_at) as last_session_at
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND u.is_active = true
GROUP BY u.id, u.email, u.pin, u.phone, u.name, u.is_active, u.is_admin, u.created_at, u.last_login;

CREATE OR REPLACE VIEW session_details_view AS
SELECT 
    s.*,
    u.email as user_email,
    u.name as user_name,
    COUNT(gt.id) as track_versions,
    MAX(gt.created_at) as latest_track_created_at,
    COALESCE(SUM(gt.download_count), 0) as total_downloads,
    COALESCE(AVG(gt.total_size), 0) as avg_file_size
FROM sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN generated_tracks gt ON s.id = gt.session_id
WHERE u.is_active = true
GROUP BY s.id, u.email, u.name;

-- Sample data for development (only insert if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@humitout.com') THEN
        INSERT INTO users (email, pin, phone, name, password_hash) VALUES 
        ('demo@humitout.com', '123456', '+1234567890', 'Demo User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/0F0C1g2N6'), -- password: 'password'
        ('test@humitout.com', '654321', '+1987654321', 'Test User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/0F0C1g2N6'); -- password: 'password'
    END IF;
END $$;

-- Function to cleanup expired files (run as cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM generated_tracks WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE(
    total_sessions BIGINT,
    completed_sessions BIGINT,
    processing_sessions BIGINT,
    failed_sessions BIGINT,
    total_downloads BIGINT,
    avg_processing_time NUMERIC,
    first_session TIMESTAMP WITH TIME ZONE,
    last_session TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.processing_status = 'completed' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN s.processing_status = 'processing' THEN 1 END) as processing_sessions,
        COUNT(CASE WHEN s.processing_status = 'failed' THEN 1 END) as failed_sessions,
        COALESCE(SUM(gt.download_count), 0) as total_downloads,
        AVG(EXTRACT(EPOCH FROM (s.processing_completed_at - s.processing_started_at))) as avg_processing_time,
        MIN(s.created_at) as first_session,
        MAX(s.created_at) as last_session
    FROM sessions s
    LEFT JOIN generated_tracks gt ON s.id = gt.session_id
    WHERE s.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO humitout_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO humitout_app;
