require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./db/init');
const { saveDb } = require('./db/connection');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const leagueRoutes = require('./routes/leagues');
const newsRoutes = require('./routes/news');
const statsRoutes = require('./routes/stats');
const { syncToDb: syncStats } = require('./services/stats.service');
const { startScheduler } = require('./services/scheduler');
const liveRoutes = require('./routes/live');
const { startPolling, stopPolling } = require('./services/liveScoring.service');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust first proxy (Caddy/nginx) for correct IP in rate limiters
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://a.espncdn.com', 'https://static.www.nfl.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// Permissions-Policy — restrict browser APIs not used by this app
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
const ALLOWED_ORIGINS_SET = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')
);
if (process.env.NODE_ENV === 'production' && ALLOWED_ORIGINS_SET.has('http://localhost:5173')) {
  console.warn('[Server] WARNING: ALLOWED_ORIGINS includes localhost in production — set the ALLOWED_ORIGINS environment variable.');
}
app.use(cors({
  origin: (origin, cb) => {
    // In production, reject requests with no Origin (server-to-server bypass)
    if (!origin) {
      if (process.env.NODE_ENV === 'production') return cb(new Error('Origin required'));
      return cb(null, true);
    }
    if (ALLOWED_ORIGINS_SET.has(origin)) cb(null, true);
    else cb(new Error('CORS not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Rate limiting — global + stricter for auth
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Please try again later.' },
});
// Signin limiter counts all attempts including successful ones — prevents credential stuffing
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again later.' },
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again later.' },
});
app.use('/api/', apiLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/signin', signinLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/auth/me', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/live', liveRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Initialize DB and start
async function start() {
  await initDatabase();
  await syncStats();
  const server = app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
  startScheduler();
  startPolling();

  // Graceful shutdown — persist DB then close HTTP server
  const shutdown = (signal) => {
    console.log(`[Server] ${signal} received — shutting down gracefully`);
    stopPolling();
    saveDb();
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
