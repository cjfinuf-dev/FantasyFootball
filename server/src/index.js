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
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again later.' },
});
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/signin', authLimiter);

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
