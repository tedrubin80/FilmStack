--
-- PostgreSQL database dump
--

\restrict SyvPKFREZCPZF3txo1Gjb3wUZXZSjqNAmG9H8SVthUD7PY8W1dSPub9zDmKAS3c

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
-- Data for Name: analytics_events; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.analytics_events (id, user_id, session_id, event_type, event_data, ip_address, user_agent, referrer, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.categories (id, name, description, color, created_at) FROM stdin;
e26c2183-1885-48f5-8125-781e86878966	Drama	Dramatic short films and character studies	#FF6B6B	2025-08-17 16:52:52.017653+00
308ef3c0-c9f9-42c1-8b78-e4c8df6caa5d	Comedy	Comedic short films and sketches	#4ECDC4	2025-08-17 16:52:52.017653+00
115ee871-fe79-4672-943a-f9260e6eb4d6	Horror	Horror and thriller short films	#45B7D1	2025-08-17 16:52:52.017653+00
06d51733-462d-4a9f-b3b5-a04248583d44	Romance	Romantic short films and love stories	#96CEB4	2025-08-17 16:52:52.017653+00
ff37a038-8e4d-48f5-bdd1-c167bcf9ae99	Action	Action and adventure short films	#FFEAA7	2025-08-17 16:52:52.017653+00
e707ac8d-77ce-4450-b084-4e734bddd618	Sci-Fi	Science fiction and futuristic films	#DDA0DD	2025-08-17 16:52:52.017653+00
88e56198-bfd8-4e1c-8089-0cff2211c6a6	Documentary	Documentary short films and real stories	#98D8C8	2025-08-17 16:52:52.017653+00
6a0f0a2f-4a40-4de6-8c19-f2e8908329f3	Animation	Animated short films and motion graphics	#F7DC6F	2025-08-17 16:52:52.017653+00
696e05f8-4d40-4dc7-a171-5c0a8d7f567e	Experimental	Avant-garde and experimental cinema	#BB8FCE	2025-08-17 16:52:52.017653+00
b88dcb3d-9869-45dd-943f-9ff58dc91e0b	Southern Gothic	Southern themed films and gothic stories	#85C1E9	2025-08-17 16:52:52.017653+00
\.


--
-- Data for Name: channels; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.channels (id, user_id, name, description, banner_url, avatar_url, subscriber_count, total_views, is_active, created_at, updated_at) FROM stdin;
71354feb-89f7-4568-b1fd-45ac8e9819e9	ea3e9f6b-3459-484d-9730-eb70c8c68343	testuser's Channel	Welcome to testuser's channel	\N	\N	0	0	t	2025-08-17 17:08:32.67359+00	2025-08-17 17:08:32.67359+00
e69f3d80-668b-4654-bc26-a79b7018ae72	01516203-1b77-4cab-b628-fddd4a96daae	filmmaker1's Channel	Welcome to filmmaker1's channel	\N	\N	0	0	t	2025-08-19 18:15:58.051138+00	2025-08-19 18:15:58.051138+00
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.videos (id, channel_id, category_id, title, description, thumbnail_url, duration, file_size, video_quality, tags, view_count, like_count, dislike_count, comment_count, is_live, is_private, is_unlisted, is_monetized, upload_status, stream_key, rtmp_url, hls_url, created_at, updated_at) FROM stdin;
ba34c027-4842-4baa-98ea-4d5f149e4b4a	e69f3d80-668b-4654-bc26-a79b7018ae72	e26c2183-1885-48f5-8125-781e86878966	Test Film	A test film for upload	\N	5	74566	\N	{test,demo}	0	0	0	0	f	f	f	f	processing	87994c68-d2b3-468e-b376-dbda5a566b72	\N	\N	2025-08-19 18:20:18.314209+00	2025-08-19 18:20:18.314209+00
e75e5dba-94ab-4b0f-a3c0-b3531c5a1e54	e69f3d80-668b-4654-bc26-a79b7018ae72	e26c2183-1885-48f5-8125-781e86878966	Test Film	A test film for upload	\N	5	74566	\N	{test,demo}	0	0	0	0	f	f	f	f	processing	1d0decb5-451a-4e01-9451-241b8f44a219	\N	\N	2025-08-19 18:24:19.70948+00	2025-08-19 18:24:19.70948+00
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.comments (id, video_id, user_id, parent_id, content, like_count, dislike_count, is_pinned, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: comment_reactions; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.comment_reactions (id, user_id, comment_id, reaction_type, created_at) FROM stdin;
\.


--
-- Data for Name: content_moderation; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.content_moderation (id, content_type, content_id, reporter_id, moderator_id, reason, description, status, action_taken, priority, created_at, resolved_at) FROM stdin;
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.email_templates (id, template_name, subject_template, body_template, template_variables, is_active, created_at, updated_at) FROM stdin;
9b2ec9b6-f4e9-425c-984f-fa55b31c2f4e	waiver_request_to_director	Subscription Waiver Request - {{filmmaker_name}} ({{award_category}})	Dear {{director_name}},\n\nWe hope this email finds you well. We are reaching out regarding a subscription waiver request on Southerns Short Films platform.\n\n**Filmmaker Details:**\n- Name: {{filmmaker_name}}\n- Email: {{filmmaker_email}}\n- Film Title: {{film_title}}\n\n**Award Information:**\n- Festival: {{festival_name}}\n- Award Category: {{award_category}}\n- Award Type: {{award_type}}\n- Year: {{award_year}}\n\n**Waiver Request:**\n{{filmmaker_name}} has requested a subscription waiver based on their achievement at {{festival_name}}. As the festival director, we would appreciate your verification of this award.\n\n**Action Required:**\nPlease respond to this email with one of the following:\n- APPROVE: Confirm the award and approve the waiver\n- REJECT: If the award information is incorrect\n- VERIFY: If you need additional documentation\n\nYou can also verify awards directly through our platform at: {{verification_url}}\n\n**About the Waiver:**\nThis waiver provides {{discount_percentage}}% discount on our premium subscription for one year, recognizing excellence in short filmmaking.\n\nThank you for your time and continued support of independent filmmakers.\n\nBest regards,\nSoutherns Short Films Team\n{{platform_contact_email}}	{"award_type": "string", "award_year": "number", "film_title": "string", "director_name": "string", "festival_name": "string", "award_category": "string", "filmmaker_name": "string", "filmmaker_email": "string", "verification_url": "string", "discount_percentage": "number", "platform_contact_email": "string"}	t	2025-08-17 16:52:52.172731+00	2025-08-17 16:52:52.172731+00
c9dc7364-bfb4-4ce4-8e8c-d2a6db5a5aca	waiver_approved_notification	Your Subscription Waiver Has Been Approved! 🎉	Congratulations {{filmmaker_name}}!\n\nYour subscription waiver request has been approved by the {{festival_name}} director.\n\n**Your Waiver Details:**\n- Waiver Code: {{waiver_code}}\n- Discount: {{discount_percentage}}% off premium subscription\n- Valid Until: {{expires_at}}\n\n**How to Redeem:**\n1. Go to your account settings\n2. Click "Upgrade to Premium"\n3. Enter waiver code: {{waiver_code}}\n4. Enjoy your discounted premium subscription!\n\nThis waiver recognizes your achievement in {{award_category}} at {{festival_name}}. We're proud to support award-winning filmmakers like you.\n\nStart enjoying premium features:\n- Ad-free viewing\n- Priority upload processing\n- Advanced analytics\n- 4K streaming\n- Exclusive content access\n\nRedeem your waiver: {{redemption_url}}\n\nCongratulations again on your achievement!\n\nBest regards,\nSoutherns Short Films Team	{"expires_at": "string", "waiver_code": "string", "festival_name": "string", "award_category": "string", "filmmaker_name": "string", "redemption_url": "string", "discount_percentage": "number"}	t	2025-08-17 16:52:52.172731+00	2025-08-17 16:52:52.172731+00
\.


--
-- Data for Name: festival_awards; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.festival_awards (id, user_id, film_id, festival_name, award_category, award_type, award_year, verification_status, verification_document_url, verified_by, verified_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: festival_directors; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.festival_directors (id, festival_name, director_name, email, phone, organization, verification_authority, auto_approve_waivers, is_active, created_at, updated_at) FROM stdin;
cc2c609c-f0f5-469d-a63b-837edc23735b	Southern Short Film Festival	Festival Director	director@southernshortfilmfestival.com	\N	Southern Short Film Festival	t	t	t	2025-08-17 16:52:52.170895+00	2025-08-17 16:52:52.170895+00
\.


--
-- Data for Name: film_festivals; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.film_festivals (id, name, description, website_url, submission_deadline, festival_date_start, festival_date_end, location, entry_fee, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: festival_submissions; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.festival_submissions (id, festival_id, film_id, user_id, submission_status, submission_fee_paid, submission_notes, submitted_at) FROM stdin;
\.


--
-- Data for Name: film_collections; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.film_collections (id, title, description, cover_image_url, curator_id, is_featured, is_public, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: film_collection_items; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.film_collection_items (id, collection_id, film_id, "position", added_at) FROM stdin;
\.


--
-- Data for Name: film_metadata; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.film_metadata (id, film_id, cast_info, crew_info, production_year, budget, runtime_original, awards, festivals, behind_the_scenes_url, trailer_url, imdb_id, created_at, updated_at) FROM stdin;
e8a10a82-016c-416a-98d2-f349e3c5fa01	ba34c027-4842-4baa-98ea-4d5f149e4b4a	\N	\N	2025	\N	\N	\N	\N	\N	\N	\N	2025-08-19 18:20:18.314209+00	2025-08-19 18:20:18.314209+00
fd744fe7-a24d-4901-9162-fff36b963c24	e75e5dba-94ab-4b0f-a3c0-b3531c5a1e54	\N	\N	2025	\N	\N	\N	\N	\N	\N	\N	2025-08-19 18:24:19.70948+00	2025-08-19 18:24:19.70948+00
\.


--
-- Data for Name: film_ratings; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.film_ratings (id, user_id, film_id, rating, review_text, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: live_streams; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.live_streams (id, video_id, stream_key, rtmp_url, hls_url, status, viewer_count, max_viewers, started_at, ended_at, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.notifications (id, user_id, type, title, message, related_id, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.playlists (id, user_id, title, description, thumbnail_url, is_private, video_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: playlist_videos; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.playlist_videos (id, playlist_id, video_id, "position", added_at) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.subscription_plans (id, name, description, price_monthly, price_yearly, features, is_active, created_at) FROM stdin;
99f00c6f-67ba-459e-8467-dab3e95ee0b4	Premium Filmmaker	Ad-free viewing, advanced analytics, priority upload processing, and exclusive content	12.99	129.99	{"ad_free": true, "4k_streaming": true, "download_offline": true, "exclusive_content": true, "advanced_analytics": true, "priority_processing": true}	t	2025-08-17 16:52:52.169351+00
9d9a1773-da21-4ce6-81bf-6ec89341bc2e	Festival Pro	All Premium features plus festival submission tools and networking features	24.99	249.99	{"ad_free": true, "networking": true, "4k_streaming": true, "festival_tools": true, "industry_access": true, "download_offline": true, "exclusive_content": true, "advanced_analytics": true, "priority_processing": true}	t	2025-08-17 16:52:52.169351+00
\.


--
-- Data for Name: subscription_waivers; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.subscription_waivers (id, user_id, award_id, waiver_type, discount_percentage, waiver_code, status, requested_by, approved_by, festival_director_email, festival_director_notified_at, festival_director_response, festival_director_responded_at, admin_notes, expires_at, used_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.subscriptions (id, subscriber_id, channel_id, notifications_enabled, created_at) FROM stdin;
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.user_preferences (id, user_id, preferred_genres, preferred_duration, content_rating_preference, language_preferences, autoplay_enabled, notifications_enabled, email_notifications, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_subscriptions; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.user_subscriptions (id, user_id, plan_id, status, started_at, expires_at, auto_renew, payment_method_id, stripe_subscription_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_upload_tracking; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.user_upload_tracking (id, user_id, upload_date, uploads_count, total_size_uploaded, created_at) FROM stdin;
\.


--
-- Data for Name: video_files; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.video_files (id, video_id, quality, file_path, file_size, bitrate, codec, created_at) FROM stdin;
\.


--
-- Data for Name: video_reactions; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.video_reactions (id, user_id, video_id, reaction_type, created_at) FROM stdin;
\.


--
-- Data for Name: view_history; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.view_history (id, user_id, video_id, ip_address, user_agent, watch_time, created_at) FROM stdin;
\.


--
-- Data for Name: waiver_redemptions; Type: TABLE DATA; Schema: public; Owner: filmstack
--

COPY public.waiver_redemptions (id, waiver_id, user_id, subscription_id, discount_amount, original_amount, final_amount, redeemed_at) FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

\unrestrict SyvPKFREZCPZF3txo1Gjb3wUZXZSjqNAmG9H8SVthUD7PY8W1dSPub9zDmKAS3c

