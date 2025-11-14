const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config({ path: './.env' });
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// --- Routes Imports ---
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const chatRoutes = require('./routes/chatRoutes');
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

const app = express();
const server = http.createServer(app);


const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// --- Socket.io Server Setup ---
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL, 
    methods: ["GET", "POST"]
  }
});

// --- Middleware ---

app.use(cors({
  origin: CLIENT_URL, 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 
  credentials: true
}));

app.use(express.json());
app.use(compression());

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/chat', chatRoutes);
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

// --- Socket.IO Logic ---
let onlineUsers = [];

const addUser = (userId, socketId) => {
  !onlineUsers.some(user => user.userId === userId) &&
    onlineUsers.push({ userId, socketId });
};

const removeUser = (socketId) => {
  onlineUsers = onlineUsers.filter(user => user.socketId !== socketId);
};

const getUser = (userId) => {
  return onlineUsers.find(user => user.userId === userId);
};

io.on("connection", (socket) => {
  console.log(`✅ User Connected: ${socket.id}`);

  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    console.log("Online Users:", onlineUsers);
  });

  socket.on("sendMessage", ({ senderId, receiverId, text, conversationId }) => {
    console.log(`📩 Message from ${senderId} to ${receiverId}`);
    const receiver = getUser(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit("getMessage", {
        senderId,
        text,
        conversationId,
        createdAt: new Date(),
      });
      console.log(`🚀 Message sent to socket: ${receiver.socketId}`);
    } else {
      console.log(`❌ Receiver ${receiverId} is not online.`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 User Disconnected: ${socket.id}`);
    removeUser(socket.id);
    console.log("Online Users:", onlineUsers);
  });
});

// --- Server & DB Connection ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully!');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Failed to connect to MongoDB', err));