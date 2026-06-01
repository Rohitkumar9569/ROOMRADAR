const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const { Server } = require('socket.io');

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const chatRoutes = require('./routes/chatRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const apiProxyRoutes = require('./routes/apiProxyRoutes');
const landlordRoutes = require('./routes/landlordRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const enhancedSearchRoutes = require('./routes/enhancedSearchRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const supportRoutes = require('./routes/supportRoutes');
const usageRoutes = require('./routes/usageRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { createRateLimiter } = require('./middleware/rateLimiter');

const isProduction = process.env.NODE_ENV === 'production';
const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length) {
  process.stderr.write(`Missing required environment variables: ${missingEnv.join(', ')}\n`);
  process.exit(1);
}

// Controllers build Mongo operators explicitly; global sanitizeFilter converts those
// server-side filters into literals and breaks room/search/chat queries.
mongoose.set('sanitizeFilter', false);
mongoose.set('strictQuery', true);

const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);

server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 65000);
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS || 66000);
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 120000);

const parseOrigins = (...values) => values
  .flatMap((value) => String(value || '').split(','))
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const configuredOrigins = parseOrigins(
  process.env.CLIENT_URL,
  process.env.PUBLIC_APP_URL,
  process.env.ALLOWED_ORIGINS
);

const productionClientOrigins = [
  'https://roomradarindia.vercel.app',
  'https://roomradar-three.vercel.app',
];

const developmentOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const defaultAllowedOrigins = isProduction
  ? productionClientOrigins
  : developmentOrigins.concat(productionClientOrigins);

const allowedOrigins = new Set(defaultAllowedOrigins.concat(configuredOrigins));

const checkOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);

  const normalizedOrigin = String(origin).trim().replace(/\/+$/, '');
  if (allowedOrigins.has(normalizedOrigin)) {
    return callback(null, true);
  }

  return callback(new Error('Not allowed by CORS'));
};

const corsOptions = {
  origin: checkOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=(self)');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  }

  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(compression());

const globalApiRateLimiter = createRateLimiter({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.API_RATE_LIMIT_MAX || 900),
  scope: 'global-api',
  message: 'Too many requests. Please wait a moment and try again.',
});

const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'roomradar-api',
    uptime: Math.round(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'not_connected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', globalApiRateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/geocode', apiProxyRoutes);
app.use('/api/landlords', landlordRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/enhanced-search', enhancedSearchRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/usage', usageRoutes);

app.use(notFound);
app.use(errorHandler);

let onlineUsers = [];

app.set('getOnlineUsers', () => onlineUsers);

const addUser = (userId, socketId) => {
  const normalizedUserId = userId?.toString();
  if (!normalizedUserId) return;

  onlineUsers = onlineUsers.filter((user) => user.userId !== normalizedUserId);
  onlineUsers.push({ userId: normalizedUserId, socketId });
};

const removeUser = (socketId) => {
  onlineUsers = onlineUsers.filter((user) => user.socketId !== socketId);
};

const broadcastOnlineUsers = () => {
  io.emit('getUsers', onlineUsers.map((user) => user.userId));
};

io.on('connection', (socket) => {
  socket.on('setup', (userId) => {
    if (userId) {
      socket.join(userId.toString());
    }
  });

  socket.on('addUser', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      addUser(userId, socket.id);
      broadcastOnlineUsers();
    }
  });

  socket.on('sendMessage', ({ senderId, receiverId, text, conversationId, senderName, senderAvatarUrl, roomTitle, messageType = 'text' }) => {
    const payload = {
      senderId,
      senderName,
      senderAvatarUrl,
      roomTitle,
      text: typeof text === 'string' ? text : '',
      messageType,
      conversationId,
      createdAt: new Date(),
    };

    if (receiverId) {
      io.to(receiverId.toString()).emit('getMessage', payload);
    }
  });

  socket.on('disconnect', () => {
    removeUser(socket.id);
    broadcastOnlineUsers();
  });
});

module.exports.io = io;

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const startServer = (port, attempt = 0) => {
  const numericPort = Number(port);

  server.once('error', (error) => {
    if (!isProduction && error.code === 'EADDRINUSE' && attempt < 10) {
      const nextPort = numericPort + 1;
      process.stdout.write(`Port ${numericPort} is already in use. Trying ${nextPort}...\n`);
      startServer(nextPort, attempt + 1);
      return;
    }

    process.stderr.write(`Server failed to start: ${error.message}\n`);
    process.exit(1);
  });

  server.listen(numericPort, () => process.stdout.write(`Server running on port ${numericPort}\n`));
};

mongoose.connect(MONGO_URI)
  .then(() => {
    process.stdout.write('MongoDB connected successfully.\n');
    startServer(PORT);
  })
  .catch((err) => {
    process.stderr.write(`Failed to connect to MongoDB: ${err.message}\n`);
    process.exit(1);
  });

const shutdown = (signal) => {
  process.stdout.write(`${signal} received. Closing RoomRadar server...\n`);
  server.close(() => {
    mongoose.connection.close(false).finally(() => process.exit(0));
  });

  setTimeout(() => process.exit(1), 10000).unref();
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
