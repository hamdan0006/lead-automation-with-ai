require('dotenv').config(); // Must be FIRST — db.js reads process.env.DATABASE_URL at module load time
const express = require('express');
const cors = require('cors');

// Import utilities and configurations
const logger = require('./utils/logger');
const { connectDB } = require('./config/db');
require('./config/redis'); // Triggers connection to Redis immediately

// Import App Routes
const healthRoutes = require('./Routes/health.route');
const scraperRoutes = require('./Routes/scraper.route');
const authRoutes = require('./Routes/auth.route');

// Import Workers
const { startEmailWorker } = require('./Worker/email.worker');
const { startMailWorker } = require('./Worker/mail.worker');
const { startMapsWorker } = require('./Worker/maps.worker');
const { startReplyWorker } = require('./Worker/reply.worker');

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// Middlewares
// =======================
app.use(cors());
app.use(express.json());

// Pino Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[${req.method}] ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// =======================
// Route Mounting
// =======================
app.use('/health', healthRoutes);
app.use('/scraper', scraperRoutes);
app.use('/api/auth', authRoutes);

// Fallback Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the BizBuilder API. Try /health' });
});

// =======================
// Initialize App & Servers
// =======================
const startServer = async () => {
  // Wait for DB Connection before accepting requests
  await connectDB();
  
  // Start BullMQ Workers
  startEmailWorker();
  startMailWorker();
  startMapsWorker();
  startReplyWorker();

  app.listen(PORT, () => {
    logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startServer();


