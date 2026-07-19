--
-- PostgreSQL database dump
--

\restrict P8mdXMJ53R570QF19IQyuviD6OVl2hWjgZMD2OYu2xkUb081tvBm5YY5yCgC0Fc

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_video_reaction_counts(); Type: FUNCTION; Schema: public; Owner: filmstack
--

CREATE FUNCTION public.update_video_reaction_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_video_reaction_counts() OWNER TO filmstack;

--
-- Name: update_video_view_count(); Type: FUNCTION; Schema: public; Owner: filmstack
--

CREATE FUNCTION public.update_video_view_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_video_view_count() OWNER TO filmstack;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.analytics_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    event_type character varying(50) NOT NULL,
    event_data jsonb,
    ip_address inet,
    user_agent text,
    referrer text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.analytics_events OWNER TO filmstack;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    color character varying(7),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO filmstack;

--
-- Name: channels; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.channels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    banner_url text,
    avatar_url text,
    subscriber_count integer DEFAULT 0,
    total_views bigint DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.channels OWNER TO filmstack;

--
-- Name: comment_reactions; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.comment_reactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    comment_id uuid NOT NULL,
    reaction_type character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comment_reactions_reaction_type_check CHECK (((reaction_type)::text = ANY ((ARRAY['like'::character varying, 'dislike'::character varying])::text[])))
);


ALTER TABLE public.comment_reactions OWNER TO filmstack;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    video_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_id uuid,
    content text NOT NULL,
    like_count integer DEFAULT 0,
    dislike_count integer DEFAULT 0,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comments OWNER TO filmstack;

--
-- Name: content_moderation; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.content_moderation (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    content_type character varying(20) NOT NULL,
    content_id uuid NOT NULL,
    reporter_id uuid,
    moderator_id uuid,
    reason character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    action_taken character varying(100),
    priority integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp with time zone
);


ALTER TABLE public.content_moderation OWNER TO filmstack;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_name character varying(100) NOT NULL,
    subject_template text NOT NULL,
    body_template text NOT NULL,
    template_variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_templates OWNER TO filmstack;

--
-- Name: festival_awards; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.festival_awards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    film_id uuid,
    festival_name character varying(255) NOT NULL,
    award_category character varying(255) NOT NULL,
    award_type character varying(100) NOT NULL,
    award_year integer NOT NULL,
    verification_status character varying(20) DEFAULT 'pending'::character varying,
    verification_document_url text,
    verified_by uuid,
    verified_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.festival_awards OWNER TO filmstack;

--
-- Name: festival_directors; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.festival_directors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    festival_name character varying(255) NOT NULL,
    director_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    organization character varying(255),
    verification_authority boolean DEFAULT false,
    auto_approve_waivers boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.festival_directors OWNER TO filmstack;

--
-- Name: festival_submissions; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.festival_submissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    festival_id uuid NOT NULL,
    film_id uuid NOT NULL,
    user_id uuid NOT NULL,
    submission_status character varying(20) DEFAULT 'pending'::character varying,
    submission_fee_paid numeric(10,2),
    submission_notes text,
    submitted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.festival_submissions OWNER TO filmstack;

--
-- Name: film_collection_items; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.film_collection_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    collection_id uuid NOT NULL,
    film_id uuid NOT NULL,
    "position" integer NOT NULL,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.film_collection_items OWNER TO filmstack;

--
-- Name: film_collections; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.film_collections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    cover_image_url text,
    curator_id uuid,
    is_featured boolean DEFAULT false,
    is_public boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.film_collections OWNER TO filmstack;

--
-- Name: film_festivals; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.film_festivals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    website_url text,
    submission_deadline date,
    festival_date_start date,
    festival_date_end date,
    location character varying(255),
    entry_fee numeric(10,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.film_festivals OWNER TO filmstack;

--
-- Name: film_metadata; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.film_metadata (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    film_id uuid NOT NULL,
    cast_info text,
    crew_info text,
    production_year integer,
    budget numeric(12,2),
    runtime_original integer,
    awards text,
    festivals text[],
    behind_the_scenes_url text,
    trailer_url text,
    imdb_id character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.film_metadata OWNER TO filmstack;

--
-- Name: film_ratings; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.film_ratings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    film_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT film_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.film_ratings OWNER TO filmstack;

--
-- Name: live_streams; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.live_streams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    video_id uuid NOT NULL,
    stream_key character varying(255) NOT NULL,
    rtmp_url text NOT NULL,
    hls_url text,
    status character varying(20) DEFAULT 'waiting'::character varying,
    viewer_count integer DEFAULT 0,
    max_viewers integer DEFAULT 0,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.live_streams OWNER TO filmstack;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    related_id uuid,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO filmstack;

--
-- Name: playlist_videos; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.playlist_videos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    playlist_id uuid NOT NULL,
    video_id uuid NOT NULL,
    "position" integer NOT NULL,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.playlist_videos OWNER TO filmstack;

--
-- Name: playlists; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.playlists (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    thumbnail_url text,
    is_private boolean DEFAULT false,
    video_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.playlists OWNER TO filmstack;

--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price_monthly numeric(10,2) NOT NULL,
    price_yearly numeric(10,2),
    features jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscription_plans OWNER TO filmstack;

--
-- Name: subscription_waivers; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.subscription_waivers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    award_id uuid NOT NULL,
    waiver_type character varying(50) NOT NULL,
    discount_percentage integer DEFAULT 100,
    waiver_code character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_by uuid NOT NULL,
    approved_by uuid,
    festival_director_email character varying(255),
    festival_director_notified_at timestamp with time zone,
    festival_director_response text,
    festival_director_responded_at timestamp with time zone,
    admin_notes text,
    expires_at timestamp with time zone,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscription_waivers OWNER TO filmstack;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    subscriber_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    notifications_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscriptions OWNER TO filmstack;

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    preferred_genres uuid[],
    preferred_duration character varying(20),
    content_rating_preference character varying(10),
    language_preferences character varying(10)[],
    autoplay_enabled boolean DEFAULT true,
    notifications_enabled boolean DEFAULT true,
    email_notifications boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_preferences OWNER TO filmstack;

--
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.user_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    auto_renew boolean DEFAULT true,
    payment_method_id character varying(255),
    stripe_subscription_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_subscriptions OWNER TO filmstack;

--
-- Name: user_upload_tracking; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.user_upload_tracking (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    upload_date date NOT NULL,
    uploads_count integer DEFAULT 0,
    total_size_uploaded bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_upload_tracking OWNER TO filmstack;

--
-- Name: users; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    display_name character varying(100),
    avatar_url text,
    bio text,
    verified boolean DEFAULT false,
    subscriber_count integer DEFAULT 0,
    total_views bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO filmstack;

--
-- Name: video_files; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.video_files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    video_id uuid NOT NULL,
    quality character varying(10) NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    bitrate integer,
    codec character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.video_files OWNER TO filmstack;

--
-- Name: video_reactions; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.video_reactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    reaction_type character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT video_reactions_reaction_type_check CHECK (((reaction_type)::text = ANY ((ARRAY['like'::character varying, 'dislike'::character varying])::text[])))
);


ALTER TABLE public.video_reactions OWNER TO filmstack;

--
-- Name: videos; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.videos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    channel_id uuid NOT NULL,
    category_id uuid,
    title character varying(255) NOT NULL,
    description text,
    thumbnail_url text,
    duration integer,
    file_size bigint,
    video_quality jsonb,
    tags text[],
    view_count bigint DEFAULT 0,
    like_count integer DEFAULT 0,
    dislike_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    is_live boolean DEFAULT false,
    is_private boolean DEFAULT false,
    is_unlisted boolean DEFAULT false,
    is_monetized boolean DEFAULT false,
    upload_status character varying(20) DEFAULT 'processing'::character varying,
    stream_key character varying(255),
    rtmp_url text,
    hls_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.videos OWNER TO filmstack;

--
-- Name: view_history; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.view_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    video_id uuid NOT NULL,
    ip_address inet,
    user_agent text,
    watch_time integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.view_history OWNER TO filmstack;

--
-- Name: waiver_redemptions; Type: TABLE; Schema: public; Owner: filmstack
--

CREATE TABLE public.waiver_redemptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    waiver_id uuid NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    discount_amount numeric(10,2) NOT NULL,
    original_amount numeric(10,2) NOT NULL,
    final_amount numeric(10,2) NOT NULL,
    redeemed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.waiver_redemptions OWNER TO filmstack;

--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: comment_reactions comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_pkey PRIMARY KEY (id);


--
-- Name: comment_reactions comment_reactions_user_id_comment_id_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_user_id_comment_id_key UNIQUE (user_id, comment_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: content_moderation content_moderation_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.content_moderation
    ADD CONSTRAINT content_moderation_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_template_name_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_template_name_key UNIQUE (template_name);


--
-- Name: festival_awards festival_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_awards
    ADD CONSTRAINT festival_awards_pkey PRIMARY KEY (id);


--
-- Name: festival_directors festival_directors_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_directors
    ADD CONSTRAINT festival_directors_pkey PRIMARY KEY (id);


--
-- Name: festival_submissions festival_submissions_festival_id_film_id_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_submissions
    ADD CONSTRAINT festival_submissions_festival_id_film_id_key UNIQUE (festival_id, film_id);


--
-- Name: festival_submissions festival_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_submissions
    ADD CONSTRAINT festival_submissions_pkey PRIMARY KEY (id);


--
-- Name: film_collection_items film_collection_items_collection_id_film_id_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_collection_items
    ADD CONSTRAINT film_collection_items_collection_id_film_id_key UNIQUE (collection_id, film_id);


--
-- Name: film_collection_items film_collection_items_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_collection_items
    ADD CONSTRAINT film_collection_items_pkey PRIMARY KEY (id);


--
-- Name: film_collections film_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_collections
    ADD CONSTRAINT film_collections_pkey PRIMARY KEY (id);


--
-- Name: film_festivals film_festivals_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_festivals
    ADD CONSTRAINT film_festivals_pkey PRIMARY KEY (id);


--
-- Name: film_metadata film_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_metadata
    ADD CONSTRAINT film_metadata_pkey PRIMARY KEY (id);


--
-- Name: film_ratings film_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_ratings
    ADD CONSTRAINT film_ratings_pkey PRIMARY KEY (id);


--
-- Name: film_ratings film_ratings_user_id_film_id_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_ratings
    ADD CONSTRAINT film_ratings_user_id_film_id_key UNIQUE (user_id, film_id);


--
-- Name: live_streams live_streams_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_pkey PRIMARY KEY (id);


--
-- Name: live_streams live_streams_stream_key_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_stream_key_key UNIQUE (stream_key);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: playlist_videos playlist_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.playlist_videos
    ADD CONSTRAINT playlist_videos_pkey PRIMARY KEY (id);


--
-- Name: playlist_videos playlist_videos_playlist_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.playlist_videos
    ADD CONSTRAINT playlist_videos_playlist_id_video_id_key UNIQUE (playlist_id, video_id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_waivers subscription_waivers_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscription_waivers
    ADD CONSTRAINT subscription_waivers_pkey PRIMARY KEY (id);


--
-- Name: subscription_waivers subscription_waivers_waiver_code_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscription_waivers
    ADD CONSTRAINT subscription_waivers_waiver_code_key UNIQUE (waiver_code);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_subscriber_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_subscriber_id_channel_id_key UNIQUE (subscriber_id, channel_id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_upload_tracking user_upload_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.user_upload_tracking
    ADD CONSTRAINT user_upload_tracking_pkey PRIMARY KEY (id);


--
-- Name: user_upload_tracking user_upload_tracking_user_id_upload_date_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.user_upload_tracking
    ADD CONSTRAINT user_upload_tracking_user_id_upload_date_key UNIQUE (user_id, upload_date);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: video_files video_files_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.video_files
    ADD CONSTRAINT video_files_pkey PRIMARY KEY (id);


--
-- Name: video_reactions video_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.video_reactions
    ADD CONSTRAINT video_reactions_pkey PRIMARY KEY (id);


--
-- Name: video_reactions video_reactions_user_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.video_reactions
    ADD CONSTRAINT video_reactions_user_id_video_id_key UNIQUE (user_id, video_id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: videos videos_stream_key_key; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_stream_key_key UNIQUE (stream_key);


--
-- Name: view_history view_history_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.view_history
    ADD CONSTRAINT view_history_pkey PRIMARY KEY (id);


--
-- Name: waiver_redemptions waiver_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.waiver_redemptions
    ADD CONSTRAINT waiver_redemptions_pkey PRIMARY KEY (id);


--
-- Name: idx_comments_parent_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_id);


--
-- Name: idx_comments_user_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_comments_user_id ON public.comments USING btree (user_id);


--
-- Name: idx_comments_video_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_comments_video_id ON public.comments USING btree (video_id);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_subscriptions_channel_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_subscriptions_channel_id ON public.subscriptions USING btree (channel_id);


--
-- Name: idx_subscriptions_subscriber_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_subscriptions_subscriber_id ON public.subscriptions USING btree (subscriber_id);


--
-- Name: idx_video_reactions_user_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_video_reactions_user_id ON public.video_reactions USING btree (user_id);


--
-- Name: idx_video_reactions_video_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_video_reactions_video_id ON public.video_reactions USING btree (video_id);


--
-- Name: idx_videos_category_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_videos_category_id ON public.videos USING btree (category_id);


--
-- Name: idx_videos_channel_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_videos_channel_id ON public.videos USING btree (channel_id);


--
-- Name: idx_videos_created_at; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_videos_created_at ON public.videos USING btree (created_at);


--
-- Name: idx_videos_is_live; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_videos_is_live ON public.videos USING btree (is_live);


--
-- Name: idx_videos_tags; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_videos_tags ON public.videos USING gin (tags);


--
-- Name: idx_videos_title_search; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_videos_title_search ON public.videos USING gin (to_tsvector('english'::regconfig, (title)::text));


--
-- Name: idx_videos_view_count; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_videos_view_count ON public.videos USING btree (view_count);


--
-- Name: idx_view_history_created_at; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_view_history_created_at ON public.view_history USING btree (created_at);


--
-- Name: idx_view_history_user_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_view_history_user_id ON public.view_history USING btree (user_id);


--
-- Name: idx_view_history_video_id; Type: INDEX; Schema: public; Owner: filmstack
--

CREATE INDEX idx_view_history_video_id ON public.view_history USING btree (video_id);


--
-- Name: video_reactions trigger_update_video_reaction_counts; Type: TRIGGER; Schema: public; Owner: filmstack
--

CREATE TRIGGER trigger_update_video_reaction_counts AFTER INSERT OR DELETE OR UPDATE ON public.video_reactions FOR EACH ROW EXECUTE FUNCTION public.update_video_reaction_counts();


--
-- Name: view_history trigger_update_video_view_count; Type: TRIGGER; Schema: public; Owner: filmstack
--

CREATE TRIGGER trigger_update_video_view_count AFTER INSERT ON public.view_history FOR EACH ROW EXECUTE FUNCTION public.update_video_view_count();


--
-- Name: analytics_events analytics_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: channels channels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comment_reactions comment_reactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_reactions comment_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.comment_reactions
    ADD CONSTRAINT comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id);


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: content_moderation content_moderation_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.content_moderation
    ADD CONSTRAINT content_moderation_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: content_moderation content_moderation_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.content_moderation
    ADD CONSTRAINT content_moderation_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: festival_awards festival_awards_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_awards
    ADD CONSTRAINT festival_awards_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.videos(id) ON DELETE SET NULL;


--
-- Name: festival_awards festival_awards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_awards
    ADD CONSTRAINT festival_awards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: festival_awards festival_awards_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_awards
    ADD CONSTRAINT festival_awards_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: festival_submissions festival_submissions_festival_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_submissions
    ADD CONSTRAINT festival_submissions_festival_id_fkey FOREIGN KEY (festival_id) REFERENCES public.film_festivals(id) ON DELETE CASCADE;


--
-- Name: festival_submissions festival_submissions_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_submissions
    ADD CONSTRAINT festival_submissions_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: festival_submissions festival_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.festival_submissions
    ADD CONSTRAINT festival_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: film_collection_items film_collection_items_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_collection_items
    ADD CONSTRAINT film_collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.film_collections(id) ON DELETE CASCADE;


--
-- Name: film_collection_items film_collection_items_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_collection_items
    ADD CONSTRAINT film_collection_items_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: film_collections film_collections_curator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_collections
    ADD CONSTRAINT film_collections_curator_id_fkey FOREIGN KEY (curator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: film_metadata film_metadata_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_metadata
    ADD CONSTRAINT film_metadata_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: film_ratings film_ratings_film_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_ratings
    ADD CONSTRAINT film_ratings_film_id_fkey FOREIGN KEY (film_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: film_ratings film_ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.film_ratings
    ADD CONSTRAINT film_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: live_streams live_streams_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: playlist_videos playlist_videos_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.playlist_videos
    ADD CONSTRAINT playlist_videos_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- Name: playlist_videos playlist_videos_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.playlist_videos
    ADD CONSTRAINT playlist_videos_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: playlists playlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscription_waivers subscription_waivers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscription_waivers
    ADD CONSTRAINT subscription_waivers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: subscription_waivers subscription_waivers_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscription_waivers
    ADD CONSTRAINT subscription_waivers_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.festival_awards(id) ON DELETE CASCADE;


--
-- Name: subscription_waivers subscription_waivers_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscription_waivers
    ADD CONSTRAINT subscription_waivers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: subscription_waivers subscription_waivers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscription_waivers
    ADD CONSTRAINT subscription_waivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_subscriber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_subscriptions user_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: user_subscriptions user_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_upload_tracking user_upload_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.user_upload_tracking
    ADD CONSTRAINT user_upload_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: video_files video_files_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.video_files
    ADD CONSTRAINT video_files_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: video_reactions video_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.video_reactions
    ADD CONSTRAINT video_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: video_reactions video_reactions_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.video_reactions
    ADD CONSTRAINT video_reactions_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: videos videos_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: videos videos_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: view_history view_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.view_history
    ADD CONSTRAINT view_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: view_history view_history_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.view_history
    ADD CONSTRAINT view_history_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: waiver_redemptions waiver_redemptions_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.waiver_redemptions
    ADD CONSTRAINT waiver_redemptions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.user_subscriptions(id) ON DELETE CASCADE;


--
-- Name: waiver_redemptions waiver_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.waiver_redemptions
    ADD CONSTRAINT waiver_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: waiver_redemptions waiver_redemptions_waiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: filmstack
--

ALTER TABLE ONLY public.waiver_redemptions
    ADD CONSTRAINT waiver_redemptions_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES public.subscription_waivers(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict P8mdXMJ53R570QF19IQyuviD6OVl2hWjgZMD2OYu2xkUb081tvBm5YY5yCgC0Fc

