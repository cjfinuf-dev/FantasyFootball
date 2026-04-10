require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./db/init');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const leagueRoutes = require('./routes/leagues');
const newsRoutes = require('./routes/news');
const statsRoutes = require('./routes/stats');
const { syncToDb: syncStats } = require('./services/stats.service');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
if (process.env.NODE_ENV === 'production' && ALLOWED_ORIGINS.includes('http://localhost:5173')) {
  console.warn('[Server] WARNING: ALLOWED_ORIGINS is using localhost defaults in production — set the ALLOWED_ORIGINS environment variable.');
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error('CORS not allowed'));
  },
  credentials: true,
}));
app.use(express.json());

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
app.use('/api/', apiLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/signin', signinLimiter);
app.use('/api/auth/me', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/stats', statsRoutes);

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
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
  startScheduler();
}

start().catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
