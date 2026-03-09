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
  cors: { origin: '*', methods: ['GET','POST'], credentials: true },
  transports: ['websocket','polling'],
  pingTimeout:  30000,
  pingInterval: 10000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true,
});

const sequelize = require('./db');
const { User, Deal, Chat, ChatMessage, ChatMember } = require('./models/index');
const { rooms, sanitizeRoom } = require('./routes/rooms');
const { startCron } = require('./cron');

global.io = io; // available to routes
// Expose io + active-socket tracker to cron
global.chatIo            = io;
global.chatActiveSockets = new Map(); // chatId → online count (integer)

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
app.use('/api/rooms',      require('./routes/rooms').router || require('./routes/rooms'));
app.use('/api/telegram',   require('./routes/telegram'));
app.use('/api/chats',      require('./routes/chats'));

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Lava domain verification
app.get('/lava-verify_ac8a22137e7e05e2.html', (req, res) => {
  res.send('lava-verify=ac8a22137e7e05e2');
});

// Enot.io domain verification
app.get('/enot_e342b96a.html', (req, res) => {
  res.send('enot=e342b96a');
});

const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io
// ─────────────────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const socketMeta = new Map(); // socketId → { userId, roomId, userName }
const chatUsers  = new Map(); // socketId → { userId, userName, chatId }

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('No auth token'));
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(userId);
    if (!user) return next(new Error('User not found'));
    if (user.isBanned) return next(new Error('Account banned'));
    socket.userId   = String(userId);
    socket.userName = user.firstName || user.username || 'User';
    await user.update({ isOnline: true, lastActive: new Date() });
    next();
  } catch (e) {
    next(new Error('Invalid token: ' + e.message));
  }
});

// ── Active socket counter helpers ─────────────────────────────────────────────
function chatIncrement(chatId) {
  global.chatActiveSockets.set(chatId, (global.chatActiveSockets.get(chatId) || 0) + 1);
}
function chatDecrement(chatId) {
  const n = Math.max(0, (global.chatActiveSockets.get(chatId) || 1) - 1);
  if (n === 0) global.chatActiveSockets.delete(chatId);
  else global.chatActiveSockets.set(chatId, n);
}

io.on('connection', (socket) => {
  console.log(`🔌 ${socket.userName} connected [${socket.id}]`);

  // ── Voice: join-room ────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, pin }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('room-error', { message: 'Комната не найдена' }); return; }
    if (room.type === 'private' && String(pin || '') !== String(room.pin || '')) {
      socket.emit('room-error', { message: 'Неверный PIN' }); return;
    }
    const prev = socketMeta.get(socket.id);
    if (prev?.roomId && prev.roomId !== roomId) _leaveRoom(socket, prev.roomId);
    socket.join(roomId);
    socketMeta.set(socket.id, { userId: socket.userId, roomId, userName: socket.userName });
    const existing = room.participants.find(p => p.id === socket.userId);
    if (existing) existing.socketId = socket.id;
    else room.participants.push({ id: socket.userId, name: socket.userName, muted: false, socketId: socket.id });
    const others = room.participants
      .filter(p => p.socketId !== socket.id)
      .map(p => ({ socketId: p.socketId, userId: p.id, userName: p.name, muted: p.muted }));
    socket.emit('room-joined', { roomId, participants: others });
    socket.to(roomId).emit('peer-joined', { peerId: socket.id, userId: socket.userId, userName: socket.userName });
    _broadcastUpdate(roomId);
  });

  // ── Voice: WebRTC signaling ─────────────────────────────────────────────
  socket.on('offer',         ({ targetSocketId, sdp }) => { if (sdp && targetSocketId) io.to(targetSocketId).emit('offer',         { fromSocketId: socket.id, userName: socket.userName, sdp }); });
  socket.on('answer',        ({ targetSocketId, sdp }) => { if (sdp && targetSocketId) io.to(targetSocketId).emit('answer',        { fromSocketId: socket.id, sdp }); });
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => { if (candidate && targetSocketId) io.to(targetSocketId).emit('ice-candidate', { fromSocketId: socket.id, candidate }); });
  socket.on('toggle-mute',   ({ muted }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.roomId) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const p = room.participants.find(p => p.socketId === socket.id);
    if (p) p.muted = Boolean(muted);
    socket.to(meta.roomId).emit('peer-muted', { socketId: socket.id, userId: socket.userId, muted: Boolean(muted) });
    _broadcastUpdate(meta.roomId);
  });
  socket.on('leave-room', () => {
    const meta = socketMeta.get(socket.id);
    if (meta?.roomId) _leaveRoom(socket, meta.roomId);
  });

  // ── Chat: join ──────────────────────────────────────────────────────────
  socket.on('chat:join', async ({ chatId, password }) => {
    try {
      const chat = await Chat.findOne({ where: { id: chatId, deletedAt: null } });
      if (!chat) { socket.emit('chat:error', { message: 'Чат не найден' }); return; }

      // Check if user is admin (bypass password)
      const socketUser = await User.findByPk(socket.userId);
      const isAdmin = socketUser?.isAdmin || false;

      if (chat.type === 'private' && !isAdmin) {
        const isAlreadyMember = await ChatMember.findOne({ where: { chatId, userId: socket.userId } });
        if (!isAlreadyMember && password !== chat.password) {
          socket.emit('chat:error', { message: 'Неверный пароль' }); return;
        }
      }

      // Leave previous chat
      const prev = chatUsers.get(socket.id);
      if (prev?.chatId && prev.chatId !== chatId) {
        socket.leave(`chat:${prev.chatId}`);
        chatDecrement(prev.chatId);
        socket.to(`chat:${prev.chatId}`).emit('chat:user-left', {
          userId: socket.userId, userName: socket.userName,
        });
      }

      socket.join(`chat:${chatId}`);
      chatUsers.set(socket.id, { userId: socket.userId, userName: socket.userName, chatId, isAdmin });
      chatIncrement(chatId);

      // Upsert member in DB (admins don't count as members)
      if (!isAdmin) {
        await ChatMember.findOrCreate({ where: { chatId, userId: socket.userId } });
      }
      const memberCount = await ChatMember.count({ where: { chatId } });
      await chat.update({ memberCount });

      // Send last 100 messages from DB
      const msgs = await ChatMessage.findAll({
        where: { chatId }, order: [['createdAt', 'ASC']], limit: 100,
      });

      socket.emit('chat:joined', {
        chatId,
        isClosed: chat.isClosed || false,
        closedReason: chat.closedReason || null,
        messages: msgs.map(m => ({
          id: m.id, chatId: m.chatId, userId: m.userId, userName: m.userName,
          text: m.text, ts: m.createdAt, isAdmin: m.isAdmin || false, isSystem: m.isSystem || false,
        })),
        memberCount,
      });

      socket.to(`chat:${chatId}`).emit('chat:user-joined', {
        userId: socket.userId, userName: socket.userName, memberCount,
      });
    } catch (e) {
      console.error('chat:join error:', e.message);
      socket.emit('chat:error', { message: 'Ошибка подключения к чату' });
    }
  });

  // ── Chat: leave ─────────────────────────────────────────────────────────
  socket.on('chat:leave', () => _leaveChat(socket));

  // ── Chat: message ───────────────────────────────────────────────────────
  socket.on('chat:message', async ({ chatId, text }) => {
    if (!text?.trim() || text.trim().length > 2000) return;
    const meta = chatUsers.get(socket.id);
    if (!meta || meta.chatId !== chatId) return;

    try {
      const chat = await Chat.findOne({ where: { id: chatId, deletedAt: null } });
      if (!chat) return;

      // Block messages in closed chats (unless admin)
      if (chat.isClosed && !meta.isAdmin) {
        socket.emit('chat:error', { message: 'Чат закрыт администратором' }); return;
      }

      // Persist to DB
      const msg = await ChatMessage.create({
        chatId, userId: socket.userId, userName: socket.userName,
        text: text.trim(), isAdmin: meta.isAdmin || false,
      });

      // Update chat last message
      await chat.update({
        lastMessageAt:   msg.createdAt,
        lastMessageText: text.trim().slice(0, 100),
        lastMessageUser: socket.userName,
      });

      const out = {
        id: msg.id, chatId, userId: msg.userId, userName: msg.userName,
        text: msg.text, ts: msg.createdAt, isAdmin: msg.isAdmin || false, isSystem: false,
      };
      io.to(`chat:${chatId}`).emit('chat:message', out);
    } catch (e) {
      console.error('chat:message error:', e.message);
    }
  });

  // ── Chat: typing ────────────────────────────────────────────────────────
  socket.on('chat:typing', ({ chatId, typing }) => {
    const meta = chatUsers.get(socket.id);
    if (!meta || meta.chatId !== chatId) return;
    socket.to(`chat:${chatId}`).emit('chat:typing', {
      userId: socket.userId, userName: socket.userName, typing,
    });
  });

  // ── Disconnect ──────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const voiceMeta = socketMeta.get(socket.id);
    if (voiceMeta?.roomId) _leaveRoom(socket, voiceMeta.roomId);
    socketMeta.delete(socket.id);
    _leaveChat(socket);
    console.log(`🔌 ${socket.userName} disconnected [${reason}]`);
  });
});

// ── Helper: leave chat ────────────────────────────────────────────────────────
function _leaveChat(socket) {
  const meta = chatUsers.get(socket.id);
  if (!meta?.chatId) return;
  socket.leave(`chat:${meta.chatId}`);
  chatDecrement(meta.chatId);
  socket.to(`chat:${meta.chatId}`).emit('chat:user-left', {
    userId: socket.userId, userName: socket.userName,
  });
  chatUsers.delete(socket.id);
}

// ── Voice helpers ─────────────────────────────────────────────────────────────
function _leaveRoom(socket, roomId) {
  socket.leave(roomId);
  const room = rooms.get(roomId);
  if (!room) return;
  room.participants = room.participants.filter(p => p.socketId !== socket.id);
  socket.to(roomId).emit('peer-left', { socketId: socket.id, userId: socket.userId });
  if (room.participants.length === 0) { rooms.delete(roomId); console.log(`🗑  Room deleted: ${roomId}`); }
  else _broadcastUpdate(roomId);
}

function _broadcastUpdate(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room-updated', {
    count: room.participants.length,
    participants: room.participants.map(p => ({ socketId: p.socketId, userId: p.id, userName: p.name, muted: p.muted })),
  });
}

// ── DB + start ────────────────────────────────────────────────────────────────
async function init() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');

    // Run all migrations via raw SQL — no Sequelize sync to avoid ENUM conflicts
    const migrations = [
      // Drop problematic FK constraints (safe — errors ignored if not exist)
      `ALTER TABLE "Transactions" DROP CONSTRAINT IF EXISTS "Transactions_userId_fkey"`,
      `ALTER TABLE "Transactions" DROP CONSTRAINT IF EXISTS "Transactions_dealId_fkey"`,
      `ALTER TABLE "Deals" DROP CONSTRAINT IF EXISTS "Deals_buyerId_fkey"`,
      `ALTER TABLE "Deals" DROP CONSTRAINT IF EXISTS "Deals_sellerId_fkey"`,
      `ALTER TABLE "Deals" DROP CONSTRAINT IF EXISTS "Deals_productId_fkey"`,
      `ALTER TABLE "Products" DROP CONSTRAINT IF EXISTS "Products_sellerId_fkey"`,
      `ALTER TABLE "ChatMessages" DROP CONSTRAINT IF EXISTS "ChatMessages_chatId_fkey"`,
      `ALTER TABLE "ChatMessages" DROP CONSTRAINT IF EXISTS "ChatMessages_userId_fkey"`,
      `ALTER TABLE "ChatMembers" DROP CONSTRAINT IF EXISTS "ChatMembers_chatId_fkey"`,
      `ALTER TABLE "ChatMembers" DROP CONSTRAINT IF EXISTS "ChatMembers_userId_fkey"`,

      // Core tables
      `CREATE TABLE IF NOT EXISTS "Users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "telegramId" VARCHAR(100) UNIQUE,
        "username" VARCHAR(100),
        "firstName" VARCHAR(100),
        "lastName" VARCHAR(100),
        "email" VARCHAR(200) UNIQUE,
        "password" TEXT,
        "balance" DECIMAL(12,2) DEFAULT 0,
        "isAdmin" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "Products" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "sellerId" UUID NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "description" TEXT DEFAULT '',
        "price" DECIMAL(12,2) NOT NULL,
        "category" VARCHAR(50) NOT NULL,
        "subcategory" VARCHAR(50),
        "images" JSONB DEFAULT '[]',
        "tags" JSONB DEFAULT '[]',
        "status" VARCHAR(30) DEFAULT 'active',
        "views" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "Deals" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "buyerId" UUID NOT NULL,
        "sellerId" UUID NOT NULL,
        "productId" UUID NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "sellerAmount" DECIMAL(12,2) NOT NULL,
        "commission" DECIMAL(12,2) NOT NULL,
        "status" VARCHAR(30) DEFAULT 'frozen',
        "messages" JSONB DEFAULT '[]',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "Transactions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "type" VARCHAR(30) NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "currency" VARCHAR(10) DEFAULT 'USDT',
        "status" VARCHAR(20) DEFAULT 'pending',
        "description" TEXT,
        "dealId" UUID,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "Favorites" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "productId" UUID NOT NULL,
        UNIQUE("userId","productId")
      )`,
      `CREATE TABLE IF NOT EXISTS "Broadcasts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "senderId" UUID NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "text" TEXT NOT NULL,
        "targetType" VARCHAR(20) DEFAULT 'all',
        "targetUserId" UUID,
        "sentCount" INTEGER DEFAULT 0,
        "status" VARCHAR(20) DEFAULT 'pending',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "Chats" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "type" VARCHAR(20) DEFAULT 'public',
        "ownerId" UUID NOT NULL,
        "ownerName" VARCHAR(100) NOT NULL,
        "password" VARCHAR(200),
        "memberCount" INTEGER DEFAULT 0,
        "lastMessageAt" TIMESTAMPTZ,
        "lastMessageText" VARCHAR(500),
        "lastMessageUser" VARCHAR(100),
        "deletedAt" TIMESTAMPTZ,
        "dealId" UUID,
        "isClosed" BOOLEAN DEFAULT false,
        "closedReason" VARCHAR(300),
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "ChatMessages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "chatId" UUID NOT NULL,
        "userId" UUID NOT NULL,
        "userName" VARCHAR(100) NOT NULL,
        "text" TEXT NOT NULL,
        "isAdmin" BOOLEAN DEFAULT false,
        "isSystem" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "ChatMembers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "chatId" UUID NOT NULL,
        "userId" UUID NOT NULL,
        "joinedAt" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE("chatId","userId")
      )`,

      // Ensure ENUM values exist (safe — errors ignored)
      `DO $$ BEGIN ALTER TYPE "enum_Transactions_type" ADD VALUE IF NOT EXISTS 'adjustment'; EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TYPE "enum_Transactions_type" ADD VALUE IF NOT EXISTS 'freeze'; EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TYPE "enum_Transactions_type" ADD VALUE IF NOT EXISTS 'unfreeze'; EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TYPE "enum_Transactions_type" ADD VALUE IF NOT EXISTS 'commission'; EXCEPTION WHEN others THEN NULL; END $$`,

      // Convert ENUM columns to VARCHAR so Sequelize doesn't conflict with existing ENUMs
      `DO $$ BEGIN ALTER TABLE "Products"     ALTER COLUMN "status" TYPE VARCHAR(30); EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Deals"        ALTER COLUMN "status" TYPE VARCHAR(30); EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Transactions" ALTER COLUMN "type"   TYPE VARCHAR(30); EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Transactions" ALTER COLUMN "status" TYPE VARCHAR(20); EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Chats"        ALTER COLUMN "type"   TYPE VARCHAR(20); EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Broadcasts"   ALTER COLUMN "targetType" TYPE VARCHAR(20); EXCEPTION WHEN others THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Broadcasts"   ALTER COLUMN "status"     TYPE VARCHAR(20); EXCEPTION WHEN others THEN NULL; END $$`,

      // Indexes
      `CREATE INDEX IF NOT EXISTS "idx_chatmsg_chatid" ON "ChatMessages"("chatId","createdAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "idx_chatmember_chatid" ON "ChatMembers"("chatId")`,
      `CREATE INDEX IF NOT EXISTS "idx_products_seller" ON "Products"("sellerId")`,
      `CREATE INDEX IF NOT EXISTS "idx_deals_buyer" ON "Deals"("buyerId")`,
      `CREATE INDEX IF NOT EXISTS "idx_deals_seller" ON "Deals"("sellerId")`,
      `CREATE INDEX IF NOT EXISTS "idx_tx_user" ON "Transactions"("userId")`,

      // Users — all columns
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoUrl"        TEXT`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "frozenBalance"   DECIMAL(12,2) DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalDeposited"  DECIMAL(12,2) DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalWithdrawn"  DECIMAL(12,2) DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalSales"      INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalPurchases"  INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "rating"          DECIMAL(3,2) DEFAULT 5`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "reviewCount"     INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isSubAdmin"      BOOLEAN DEFAULT false`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isMainAdmin"     BOOLEAN DEFAULT false`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isBanned"        BOOLEAN DEFAULT false`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "banUntil"        TIMESTAMPTZ`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "banReason"       VARCHAR(500)`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isVerified"      BOOLEAN DEFAULT false`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastActive"      TIMESTAMPTZ`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isOnline"        BOOLEAN DEFAULT false`,

      // Products — all columns
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "game"         VARCHAR(100)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "server"       VARCHAR(100)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "platform"     VARCHAR(100)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "region"       VARCHAR(100)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "deliveryType" VARCHAR(50) DEFAULT 'digital'`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "deliveryData" TEXT`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "stock"        INTEGER DEFAULT 1`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "sold"         INTEGER DEFAULT 0`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "isPromoted"   BOOLEAN DEFAULT false`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "promotedUntil" TIMESTAMPTZ`,

      // Deals — all columns
      `ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "deliveryData"    TEXT`,
      `ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "sellerDelivered" BOOLEAN DEFAULT false`,
      `ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "adminNote"       TEXT`,
      `ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "resolvedById"    UUID`,
      `ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "resolvedAt"      TIMESTAMPTZ`,
      `ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "buyerConfirmed"  BOOLEAN DEFAULT false`,
      `ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "autoCompleteAt"  TIMESTAMPTZ`,

      // Transactions — all columns
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "cryptoBotInvoiceId"  VARCHAR(200)`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "cryptoBotPayUrl"     TEXT`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "cryptoBotTransferId" VARCHAR(200)`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "cryptoAddress"       VARCHAR(200)`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "balanceBefore"       DECIMAL(12,2)`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "balanceAfter"        DECIMAL(12,2)`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "dealId"              UUID`,

      // Chats — extra columns (safe even if table created above already has them)
      `ALTER TABLE "Chats" ADD COLUMN IF NOT EXISTS "dealId"          UUID`,
      `ALTER TABLE "Chats" ADD COLUMN IF NOT EXISTS "isClosed"        BOOLEAN DEFAULT false`,
      `ALTER TABLE "Chats" ADD COLUMN IF NOT EXISTS "closedReason"    VARCHAR(300)`,

      // ChatMessages — extra columns
      `ALTER TABLE "ChatMessages" ADD COLUMN IF NOT EXISTS "isAdmin"  BOOLEAN DEFAULT false`,
      `ALTER TABLE "ChatMessages" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN DEFAULT false`,
    ];

    let migrationErrors = 0;
    for (const sql of migrations) {
      try {
        await sequelize.query(sql);
      } catch (e) {
        migrationErrors++;
        console.warn('⚠ Migration skipped:', e.message.slice(0, 200));
      }
    }

    // Force-add critical columns — DO $$ never throws, raw:true bypasses Sequelize parser
    const forceCols = [
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "platform"      VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "region"        VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "game"          VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "server"        VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "deliveryType"  VARCHAR(50) DEFAULT 'digital'; EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "deliveryData"  TEXT;         EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "stock"         INTEGER DEFAULT 1;     EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "sold"          INTEGER DEFAULT 0;     EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "isPromoted"    BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Products" ADD COLUMN "promotedUntil" TIMESTAMPTZ;           EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Transactions" ADD COLUMN "cryptoBotInvoiceId"  VARCHAR(200); EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Transactions" ADD COLUMN "cryptoBotPayUrl"     TEXT;         EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Transactions" ADD COLUMN "cryptoBotTransferId" VARCHAR(200); EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Transactions" ADD COLUMN "balanceBefore"       DECIMAL(12,2); EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Transactions" ADD COLUMN "balanceAfter"        DECIMAL(12,2); EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "Transactions" ADD COLUMN "dealId"              UUID;          EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
    ];
    for (const sql of forceCols) {
      try { await sequelize.query(sql, { raw: true }); }
      catch (e) { console.warn('⚠ Force-col failed:', e.message.slice(0, 150)); }
    }
    // Verify platform column exists
    const cols = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name='Products' AND column_name='platform'`, { raw: true });
    console.log('✅ platform column check:', cols[0].length > 0 ? 'EXISTS' : 'MISSING!');
    console.log(`✅ Migrations done (${migrationErrors} skipped/already exist)`);

    // Ensure admin
    const adminTgId = process.env.ADMIN_TELEGRAM_ID;
    if (adminTgId) {
      try {
        const [admin, created] = await User.findOrCreate({
          where:    { telegramId: String(adminTgId) },
          defaults: { telegramId: String(adminTgId), username: 'admin', firstName: 'Admin', isAdmin: true, isMainAdmin: true, isVerified: true },
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

    startCron({ User, Deal, Chat, ChatMessage, ChatMember });
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
  } catch (err) {
    console.error('❌ Init error:', err.message);
    process.exit(1);
  }
}

init();
module.exports = app;
