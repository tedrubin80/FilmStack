/**
 * Festival Bridge Routes
 *
 * The key ecosystem connector: allows streaming platform users to submit
 * their uploaded videos to film festivals managed on the festival platform.
 *
 * This is what makes FilmStack more than two separate products.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

const FESTIVAL_API_BASE = (process.env.FESTIVAL_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');

function festivalApi(path) {
  return `${FESTIVAL_API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * GET /api/festivals/available
 * List festivals accepting submissions (proxied from festival-api)
 */
router.get('/available', async (req, res) => {
  try {
    const response = await fetch(festivalApi('/bridge/festivals/accepting'));
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch festivals:', error.message);
    res.status(502).json({ error: 'Festival service unavailable' });
  }
});

/**
 * POST /api/festivals/submit
 * Submit a video to a festival
 * Creates a record on both sides: marks the video as submitted on streaming,
 * and creates a film submission on the festival side.
 */
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { videoId, festivalId, contactEmail, synopsis, director, mockTitle, mockDuration, mockDescription } = req.body;
    const userId = req.user.id;

    if (!festivalId) {
      return res.status(400).json({ error: 'festivalId is required' });
    }

    // Demo/mock film submission (numeric catalog IDs without a DB video record)
    if (!videoId && mockTitle) {
      const notifyRes = await fetch(festivalApi('/bridge/submission-notify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: `mock-${Date.now()}`,
          videoId: `mock-${Date.now()}`,
          videoTitle: mockTitle,
          videoDuration: mockDuration || null,
          festivalId,
          submitterEmail: contactEmail || req.user.email,
          director: director || req.user.displayName || req.user.username,
          synopsis: mockDescription || synopsis,
        }),
      });

      if (!notifyRes.ok) {
        const err = await notifyRes.json().catch(() => ({}));
        return res.status(502).json({ error: err.error || 'Festival service unavailable' });
      }

      return res.status(201).json({
        success: true,
        message: `"${mockTitle}" submitted to festival successfully`,
      });
    }

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    // 1. Verify the video exists and belongs to this user
    const videoResult = await query(
      `SELECT v.id, v.title, v.description, v.duration, c.user_id
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       WHERE v.id = $1`,
      [videoId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];
    if (video.user_id !== userId) {
      return res.status(403).json({ error: 'You can only submit your own videos' });
    }

    // 2. Check for duplicate submission
    const existingResult = await query(
      `SELECT id FROM festival_submissions
       WHERE video_id = $1 AND festival_id = $2`,
      [videoId, festivalId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Video already submitted to this festival' });
    }

    // 3. Create submission record (local)
    const submissionResult = await query(
      `INSERT INTO festival_submissions (video_id, festival_id, submitter_id, status, director, synopsis, contact_email, submitted_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, NOW())
       RETURNING *`,
      [videoId, festivalId, userId, director || null, synopsis || video.description, contactEmail || req.user.email]
    );

    const submission = submissionResult.rows[0];

    // 4. Notify the festival-api about the new submission (fire-and-forget)
    fetch(festivalApi('/bridge/submission-notify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: submission.id,
        videoId,
        videoTitle: video.title,
        videoDuration: video.duration,
        festivalId,
        submitterEmail: contactEmail || req.user.email,
        director: director || req.user.displayName || req.user.username,
      }),
    }).catch((err) => console.error('Festival notification failed:', err.message));

    res.status(201).json({
      success: true,
      data: submission,
      message: `"${video.title}" submitted to festival successfully`,
    });
  } catch (error) {
    console.error('Festival submission error:', error);
    res.status(500).json({ error: 'Failed to submit to festival' });
  }
});

/**
 * GET /api/festivals/my-submissions
 * List all festival submissions for the current user
 */
router.get('/my-submissions', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT fs.*, v.title as video_title, v.thumbnail_url
       FROM festival_submissions fs
       JOIN videos v ON fs.video_id = v.id
       WHERE fs.submitter_id = $1
       ORDER BY fs.submitted_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/festivals/awards/:videoId
 * Get any festival awards for a video (shown as badges on the video page)
 */
router.get('/awards/:videoId', async (req, res) => {
  try {
    const response = await fetch(festivalApi(`/bridge/festival-awards/${req.params.videoId}`));
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch festival awards:', error.message);
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
