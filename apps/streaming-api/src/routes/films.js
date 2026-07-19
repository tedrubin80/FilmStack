const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');

// Mock films data - replace with database queries in production
const SAMPLE_VIDEOS = [
  'BigBuckBunny.mp4',
  'ElephantsDream.mp4',
  'ForBiggerBlazes.mp4',
  'ForBiggerEscapes.mp4',
  'ForBiggerFun.mp4',
  'ForBiggerJoyrides.mp4',
  'ForBiggerMeltdowns.mp4',
  'Sintel.mp4',
];
const SAMPLE_BASE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';

const mockFilms = [
  {
    id: 1,
    title: "City Dreams",
    thumbnail: "/uploads/thumbnails/sweet-tea.jpg",
    thumbnail_url: "/uploads/thumbnails/sweet-tea.jpg",
    video_url: `${SAMPLE_BASE}${SAMPLE_VIDEOS[0]}`,
    duration: "12:45",
    views: "2.3K views",
    view_count: 2300,
    uploadedAt: "2 days ago",
    channel: "Urban Films",
    channel_name: "Urban Films",
    creator_name: "Urban Films",
    channelAvatar: "https://ui-avatars.com/api/?name=Urban+Films&background=ff6b6b&color=fff",
    verified: true,
    category: "drama",
    genre: "drama",
    description: "A young filmmaker navigates the streets of a changing city, searching for meaning in the chaos of urban life.",
  },
  {
    id: 2,
    title: "Desert Roads - A Journey",
    thumbnail: "/uploads/thumbnails/delta-crossroads.jpg",
    thumbnail_url: "/uploads/thumbnails/delta-crossroads.jpg",
    video_url: `${SAMPLE_BASE}${SAMPLE_VIDEOS[1]}`,
    duration: "18:30",
    views: "1.8K views",
    view_count: 1800,
    uploadedAt: "5 days ago",
    channel: "Delta Films",
    channel_name: "Delta Films",
    creator_name: "Delta Films",
    channelAvatar: "https://ui-avatars.com/api/?name=Delta+Films&background=4ecdc4&color=fff",
    verified: true,
    category: "adventure",
    genre: "adventure",
    description: "Two strangers cross paths on a desert highway, each carrying secrets that could change the other's life.",
  },
  {
    id: 3,
    title: "Jazz Nights: City Lights",
    thumbnail: "/uploads/thumbnails/bourbon-blues.jpg",
    thumbnail_url: "/uploads/thumbnails/bourbon-blues.jpg",
    video_url: `${SAMPLE_BASE}${SAMPLE_VIDEOS[2]}`,
    duration: "15:20",
    views: "3.1K views",
    view_count: 3100,
    uploadedAt: "1 week ago",
    channel: "Music City Productions",
    channel_name: "Music City Productions",
    creator_name: "Music City Productions",
    channelAvatar: "https://ui-avatars.com/api/?name=Music+City&background=95e1d3&color=fff",
    verified: false,
    category: "music",
    genre: "music",
    description: "An intimate portrait of a jazz quartet finding their sound in the neon-lit clubs of a sleepless city.",
  },
  {
    id: 4,
    title: "Open Fields - Rural Life",
    thumbnail: "/uploads/thumbnails/cotton-fields.jpg",
    thumbnail_url: "/uploads/thumbnails/cotton-fields.jpg",
    video_url: `${SAMPLE_BASE}${SAMPLE_VIDEOS[3]}`,
    duration: "22:15",
    views: "1.2K views",
    view_count: 1200,
    uploadedAt: "2 weeks ago",
    channel: "Heritage Films",
    channel_name: "Heritage Films",
    creator_name: "Heritage Films",
    channelAvatar: "https://ui-avatars.com/api/?name=Heritage+Films&background=f38181&color=fff",
    verified: true,
    category: "documentary",
    genre: "documentary",
    description: "A documentary following three generations of a farming family as they adapt to a rapidly changing rural landscape.",
  },
  {
    id: 5,
    title: "Ocean Rhythms",
    thumbnail: "/uploads/thumbnails/charleston-rhythms.jpg",
    thumbnail_url: "/uploads/thumbnails/charleston-rhythms.jpg",
    video_url: `${SAMPLE_BASE}${SAMPLE_VIDEOS[4]}`,
    duration: "9:55",
    views: "2.7K views",
    view_count: 2700,
    uploadedAt: "3 weeks ago",
    channel: "Coastal Cinema",
    channel_name: "Coastal Cinema",
    creator_name: "Coastal Cinema",
    channelAvatar: "https://ui-avatars.com/api/?name=Coastal+Cinema&background=aa96da&color=fff",
    verified: false,
    category: "nature",
    genre: "nature",
    description: "Waves, wind, and memory intertwine in this visual poem set along a windswept Atlantic coastline.",
  },
  {
    id: 6,
    title: "Morning Light - A Love Story",
    thumbnail: "/uploads/thumbnails/magnolia-mornings.jpg",
    thumbnail_url: "/uploads/thumbnails/magnolia-mornings.jpg",
    video_url: `${SAMPLE_BASE}${SAMPLE_VIDEOS[5]}`,
    duration: "14:30",
    views: "1.5K views",
    view_count: 1500,
    uploadedAt: "1 month ago",
    channel: "Romance Films",
    channel_name: "Romance Films",
    creator_name: "Romance Films",
    channelAvatar: "https://ui-avatars.com/api/?name=Romance+Films&background=fcbad3&color=fff",
    verified: true,
    category: "romance",
    genre: "romance",
    description: "Before the city wakes, two people meet at a corner café and discover that some mornings change everything.",
  },
  {
    id: 7,
    title: "Forest Mysteries",
    thumbnail: "/uploads/thumbnails/sweet-tea.jpg",
    thumbnail_url: "/uploads/thumbnails/sweet-tea.jpg",
    video_url: `${SAMPLE_BASE}${SAMPLE_VIDEOS[6]}`,
    duration: "25:10",
    views: "4.2K views",
    view_count: 4200,
    uploadedAt: "1 month ago",
    channel: "Mystery Channel",
    channel_name: "Mystery Channel",
    creator_name: "Mystery Channel",
    channelAvatar: "https://ui-avatars.com/api/?name=Mystery+Channel&background=a8d8ea&color=fff",
    verified: true,
    category: "mystery",
    genre: "mystery",
    description: "A hiker disappears on a familiar trail. What she left behind tells a story no one expected.",
  },
  {
    id: 8,
    title: "Gothic Tales",
    thumbnail: "/uploads/thumbnails/delta-crossroads.jpg",
    thumbnail_url: "/uploads/thumbnails/delta-crossroads.jpg",
    video_url: `${SAMPLE_BASE}${SAMPLE_VIDEOS[7]}`,
    duration: "19:45",
    views: "5.6K views",
    view_count: 5600,
    uploadedAt: "2 months ago",
    channel: "Gothic Productions",
    channel_name: "Gothic Productions",
    creator_name: "Gothic Productions",
    channelAvatar: "https://ui-avatars.com/api/?name=Gothic+Productions&background=aa96da&color=fff",
    verified: false,
    category: "horror",
    genre: "horror",
    description: "In a crumbling manor at the edge of town, a family gathers for a reading of the will — and something else arrives.",
  }
];

// GET /api/films - Get all films
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;

    let films = [...mockFilms];

    // Filter by category
    if (category && category !== 'all') {
      films = films.filter(film => film.category === category);
    }

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase();
      films = films.filter(film =>
        film.title.toLowerCase().includes(searchLower) ||
        film.channel.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedFilms = films.slice(startIndex, endIndex);

    res.json({
      success: true,
      films: paginatedFilms,
      total: films.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching films:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/films/:id - Get single film
router.get('/:id', async (req, res) => {
  try {
    const filmId = parseInt(req.params.id);
    const film = mockFilms.find(f => f.id === filmId);

    if (!film) {
      return res.status(404).json({
        success: false,
        message: 'Film not found'
      });
    }

    res.json({
      success: true,
      film
    });
  } catch (error) {
    console.error('Error fetching film:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/films/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [...new Set(mockFilms.map(film => film.category))];

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/films/user - Get films for authenticated user
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const { query: dbQuery } = require('../config/database');
    const result = await dbQuery(
      `SELECT v.*, c.name as channel_name
       FROM videos v
       JOIN channels c ON v.channel_id = c.id
       WHERE c.user_id = $1
       ORDER BY v.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      films: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching user films:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;