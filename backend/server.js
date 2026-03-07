require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const http       = require('http');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
  transports: ['websocket','polling'],
});

const sequelize = require('./db');
const { User }  = require('./models/index');
const { rooms, sanitizeRoom } = require('./routes/rooms');

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/deals',      require('./routes/deals'));
app.use('/api/wallet',     require('./routes/wallet'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/rooms',      require('./routes/rooms'));

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Serve React frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));

// ── Socket.io — WebRTC signaling for voice rooms ──────────────────────────
// Flow: users join a room → exchange SDP offers/answers + ICE candidates via socket
// WebRTC peer connections are established client-side (p2p)

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';

// socket.id → { userId, roomId, userName }
const socketMeta = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('No auth token'));
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(userId);
    if (!user) return next(new Error('User not found'));
    socket.userId   = userId;
    socket.userName = user.firstName || user.username || 'User';
    next();
  } catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id} (${socket.userName})`);

  // ── join-room: user enters a voice room ──────────────────────────────
  socket.on('join-room', ({ roomId, pin }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('error', { message: 'Комната не найдена' });

    if (room.type === 'private' && pin !== room.pin) {
      return socket.emit('error', { message: 'Неверный PIN' });
    }

    // Leave previous room
    const prev = socketMeta.get(socket.id);
    if (prev?.roomId) leaveRoom(socket, prev.roomId);

    socket.join(roomId);
    socketMeta.set(socket.id, { userId: socket.userId, roomId, userName: socket.userName });

    // Update participant list
    const alreadyIn = room.participants.find(p => p.id === socket.userId);
    if (!alreadyIn) {
      room.participants.push({ id: socket.userId, name: socket.userName, muted: false, socketId: socket.id });
    } else {
      alreadyIn.socketId = socket.id;
    }

    // Tell everyone else in room: new peer joined (they initiate offer)
    socket.to(roomId).emit('peer-joined', {
      peerId:   socket.id,
      userId:   socket.userId,
      userName: socket.userName,
    });

    // Send current participant list to joiner
    socket.emit('room-joined', {
      roomId,
      participants: room.participants
        .filter(p => p.id !== socket.userId)
        .map(p => ({ socketId: p.socketId, userId: p.id, userName: p.name, muted: p.muted })),
    });

    broadcastRoomUpdate(roomId);
  });

  // ── WebRTC signaling: offer ───────────────────────────────────────────
  socket.on('offer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('offer', { fromSocketId: socket.id, userName: socket.userName, sdp });
  });

  // ── WebRTC signaling: answer ──────────────────────────────────────────
  socket.on('answer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('answer', { fromSocketId: socket.id, sdp });
  });

  // ── WebRTC signaling: ICE candidate ──────────────────────────────────
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', { fromSocketId: socket.id, candidate });
  });

  // ── Toggle mute ───────────────────────────────────────────────────────
  socket.on('toggle-mute', ({ muted }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const p = room.participants.find(p => p.id === meta.userId);
    if (p) p.muted = muted;
    socket.to(meta.roomId).emit('peer-muted', { socketId: socket.id, userId: meta.userId, muted });
    broadcastRoomUpdate(meta.roomId);
  });

  // ── Leave room ────────────────────────────────────────────────────────
  socket.on('leave-room', () => {
    const meta = socketMeta.get(socket.id);
    if (meta?.roomId) leaveRoom(socket, meta.roomId);
  });

  // ── Disconnect ────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    if (meta?.roomId) leaveRoom(socket, meta.roomId);
    socketMeta.delete(socket.id);
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

function leaveRoom(socket, roomId) {
  socket.leave(roomId);
  const room = rooms.get(roomId);
  if (!room) return;
  room.participants = room.participants.filter(p => p.socketId !== socket.id);
  socket.to(roomId).emit('peer-left', { socketId: socket.id, userId: socket.userId });
  if (room.participants.length === 0) {
    rooms.delete(roomId);
    console.log(`🗑 Room deleted (empty): ${roomId}`);
  } else {
    broadcastRoomUpdate(roomId);
  }
}

function broadcastRoomUpdate(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room-updated', {
    count:        room.participants.length,
    participants: room.participants.map(p => ({ socketId: p.socketId, userId: p.id, userName: p.name, muted: p.muted })),
  });
}

// ── DB + Server init ──────────────────────────────────────────────────────
async function init() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');
    await sequelize.sync({ force: false });
    console.log('✅ Tables synced');

    const adminTgId = process.env.ADMIN_TELEGRAM_ID;
    if (adminTgId) {
      try {
        const [admin, created] = await User.findOrCreate({
          where:    { telegramId: String(adminTgId) },
          defaults: { telegramId: String(adminTgId), username:'admin', firstName:'Admin', isAdmin:true, isMainAdmin:true, isVerified:true },
        });
        if (!created) {
          const u = {};
          if (!admin.isAdmin)     u.isAdmin     = true;
          if (!admin.isMainAdmin) u.isMainAdmin = true;
          if (!admin.isVerified)  u.isVerified  = true;
          if (Object.keys(u).length) await admin.update(u);
        }
        console.log('✅ Admin ready:', adminTgId);
      } catch (e) { console.log('⚠ Admin setup:', e.message); }
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
  } catch (err) {
    console.error('❌ Init error:', err.message);
    process.exit(1);
  }
}

init();
module.exports = app;
