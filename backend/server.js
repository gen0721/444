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
  pingTimeout:  60000,
  pingInterval: 25000,
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

const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io — WebRTC signaling for voice rooms
// ─────────────────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const socketMeta = new Map(); // socketId → { userId, roomId, userName }

// Auth middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
      || socket.handshake.query?.token;
    if (!token) return next(new Error('No auth token'));
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(userId);
    if (!user) return next(new Error('User not found'));
    socket.userId   = String(userId);
    socket.userName = user.firstName || user.username || 'User';
    next();
  } catch (e) {
    next(new Error('Invalid token: ' + e.message));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 ${socket.userName} connected [${socket.id}]`);

  // ── join-room ─────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, pin }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room-error', { message: 'Комната не найдена' });
      return;
    }

    // PIN check for private rooms
    if (room.type === 'private' && String(pin || '') !== String(room.pin || '')) {
      socket.emit('room-error', { message: 'Неверный PIN' });
      return;
    }

    // Leave any previous room first
    const prev = socketMeta.get(socket.id);
    if (prev?.roomId && prev.roomId !== roomId) {
      _leaveRoom(socket, prev.roomId);
    }

    socket.join(roomId);
    socketMeta.set(socket.id, { userId: socket.userId, roomId, userName: socket.userName });

    // Upsert into participants list
    const existing = room.participants.find(p => p.id === socket.userId);
    if (existing) {
      existing.socketId = socket.id; // reconnect: update socketId
    } else {
      room.participants.push({
        id: socket.userId, name: socket.userName,
        muted: false, socketId: socket.id,
      });
    }

    // 1. Send existing participants to the joiner so they can initiate offers
    const others = room.participants
      .filter(p => p.socketId !== socket.id)
      .map(p => ({ socketId: p.socketId, userId: p.id, userName: p.name, muted: p.muted }));

    socket.emit('room-joined', { roomId, participants: others });

    // 2. Notify everyone else that a new peer arrived (they do NOT initiate — joiner does)
    socket.to(roomId).emit('peer-joined', {
      peerId:   socket.id,
      userId:   socket.userId,
      userName: socket.userName,
    });

    _broadcastUpdate(roomId);
    console.log(`  → ${socket.userName} joined room "${room.name}" (${room.participants.length} total)`);
  });

  // ── WebRTC signaling ──────────────────────────────────────────────────
  // ONLY joiner sends offers TO existing peers
  socket.on('offer', ({ targetSocketId, sdp }) => {
    if (!sdp) return;
    io.to(targetSocketId).emit('offer', {
      fromSocketId: socket.id,
      userName:     socket.userName,
      sdp,
    });
  });

  socket.on('answer', ({ targetSocketId, sdp }) => {
    if (!sdp) return;
    io.to(targetSocketId).emit('answer', {
      fromSocketId: socket.id,
      sdp,
    });
  });

  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    if (!candidate || !targetSocketId) return;
    io.to(targetSocketId).emit('ice-candidate', {
      fromSocketId: socket.id,
      candidate,
    });
  });

  // ── Mute toggle ───────────────────────────────────────────────────────
  socket.on('toggle-mute', ({ muted }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.roomId) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const p = room.participants.find(p => p.socketId === socket.id);
    if (p) p.muted = Boolean(muted);
    socket.to(meta.roomId).emit('peer-muted', {
      socketId: socket.id,
      userId:   socket.userId,
      muted:    Boolean(muted),
    });
    _broadcastUpdate(meta.roomId);
  });

  // ── Leave room ────────────────────────────────────────────────────────
  socket.on('leave-room', () => {
    const meta = socketMeta.get(socket.id);
    if (meta?.roomId) _leaveRoom(socket, meta.roomId);
  });

  // ── Disconnect ────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const meta = socketMeta.get(socket.id);
    if (meta?.roomId) _leaveRoom(socket, meta.roomId);
    socketMeta.delete(socket.id);
    console.log(`🔌 ${socket.userName} disconnected [${socket.id}] reason: ${reason}`);
  });
});

function _leaveRoom(socket, roomId) {
  socket.leave(roomId);
  const room = rooms.get(roomId);
  if (!room) return;

  room.participants = room.participants.filter(p => p.socketId !== socket.id);

  // Tell remaining peers this socket left
  socket.to(roomId).emit('peer-left', {
    socketId: socket.id,
    userId:   socket.userId,
  });

  if (room.participants.length === 0) {
    rooms.delete(roomId);
    console.log(`🗑  Room deleted (empty): ${roomId}`);
  } else {
    _broadcastUpdate(roomId);
  }
}

function _broadcastUpdate(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room-updated', {
    count: room.participants.length,
    participants: room.participants.map(p => ({
      socketId: p.socketId,
      userId:   p.id,
      userName: p.name,
      muted:    p.muted,
    })),
  });
}

// ── DB + start ────────────────────────────────────────────────────────────────
async function init() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');
    await sequelize.sync({ force: false });
    console.log('✅ Tables synced');

    // Auto-migrate: add any missing columns (safe - IF NOT EXISTS)
    try {
      const q = sequelize.getQueryInterface();
      const cols = [
        // Products
        [`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "platform" VARCHAR(100)`, []],
        [`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "region" VARCHAR(100)`, []],
        [`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "deliveryType" VARCHAR(50) DEFAULT 'digital'`, []],
        [`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "stock" INTEGER DEFAULT 1`, []],
        [`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "sold" INTEGER DEFAULT 0`, []],
        // Users
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isMainAdmin" BOOLEAN DEFAULT false`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isSubAdmin" BOOLEAN DEFAULT false`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN DEFAULT false`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalSales" INTEGER DEFAULT 0`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalPurchases" INTEGER DEFAULT 0`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalDeposited" FLOAT DEFAULT 0`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalWithdrawn" FLOAT DEFAULT 0`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "rating" FLOAT DEFAULT 5`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0`, []],
        [`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "frozenBalance" FLOAT DEFAULT 0`, []],
        // Transactions
        [`ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "cryptoBotTransferId" VARCHAR(100)`, []],
        [`ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "balanceBefore" FLOAT`, []],
        [`ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "balanceAfter" FLOAT`, []],
      ];
      for (const [sql] of cols) {
        try { await sequelize.query(sql); } catch {}
      }
      console.log('✅ Auto-migration done');
    } catch (e) { console.log('⚠ Migration warning:', e.message); }

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
