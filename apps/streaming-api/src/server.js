const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const requestIdMiddleware = require('./middleware/requestId');
const { csrfProtection, csrfTokenEndpoint } = require('./middleware/csrf');
const { initializeDatabase } = require('./config/database');
const { initializeRedis } = require('./config/redis');
const ProgressTracker = require('./services/progressTracker');

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const waiverRoutes = require('./routes/waivers');
const monitoringRoutes = require('./routes/monitoring');
const filmsRoutes = require('./routes/films');
const videosRoutes = require('./routes/videos');
const commentsRoutes = require('./routes/comments');
const ratingsRoutes = require('./routes/ratings');
const profileRoutes = require('./routes/profile');
const subscriptionsRoutes = require('./routes/subscriptions');
const historyRoutes = require('./routes/history');
const playlistsRoutes = require('./routes/playlists');
const notificationsRoutes = require('./routes/notifications');
const shareRoutes = require('./routes/share');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const recommendationsRoutes = require('./routes/recommendations');
const cdnRoutes = require('./routes/cdn');
const festivalBridgeRoutes = require('./routes/festivalBridge');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.STREAMING_URL,
  'http://localhost:3003',
  'http://127.0.0.1:3003',
].filter(Boolean);

const io = socketIo(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

// Middleware
app.use(requestIdMiddleware);
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// Cache headers for static assets
app.use((req, res, next) => {
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'streaming-api', timestamp: new Date().toISOString() });
});

// CSRF
app.get('/api/csrf-token', csrfTokenEndpoint);
app.use(csrfProtection);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/waivers', waiverRoutes);
apiRouter.use('/monitoring', monitoringRoutes);
apiRouter.use('/films', filmsRoutes);
apiRouter.use('/videos', videosRoutes);
apiRouter.use('/comments', commentsRoutes);
apiRouter.use('/ratings', ratingsRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/subscriptions', subscriptionsRoutes);
apiRouter.use('/history', historyRoutes);
apiRouter.use('/playlists', playlistsRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/share', shareRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/recommendations', recommendationsRoutes);
apiRouter.use('/cdn', cdnRoutes);
apiRouter.use('/festivals', festivalBridgeRoutes);

app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// Socket.io auth
io.use((socket, next) => {
  const token =
    socket.handshake.auth.token ||
    (socket.handshake.headers.authorization && socket.handshake.headers.authorization.replace('Bearer ', ''));
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-user', (userId) => {
    if (socket.user.userId !== userId) return;
    socket.join(`user-${userId}`);
  });

  socket.on('join-stream', (streamId) => {
    socket.join(`stream-${streamId}`);
    socket.to(`stream-${streamId}`).emit('user-joined', socket.id);
  });

  socket.on('leave-stream', (streamId) => {
    socket.leave(`stream-${streamId}`);
    socket.to(`stream-${streamId}`).emit('user-left', socket.id);
  });

  socket.on('chat-message', (data) => {
    const { streamId, message, username } = data;
    const sanitize = (str) =>
      String(str || '')
        .replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]))
        .substring(0, 500);
    io.to(`stream-${streamId}`).emit('chat-message', {
      username: sanitize(username),
      message: sanitize(message),
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handlers
app.use((err, req, res, _next) => {
  console.error(`[${req.id}]`, err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start
let progressTracker;

async function startServer() {
  try {
    await initializeDatabase();
    await initializeRedis();
    progressTracker = new ProgressTracker(io);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Streaming API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start streaming API:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down streaming-api...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', async () => {
  console.log('Shutting down streaming-api...');
  server.close(() => process.exit(0));
});

startServer();

module.exports = { app, io };
