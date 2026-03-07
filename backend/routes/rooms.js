const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/auth');

// In-memory rooms store (persists until server restart)
// For production: move to Redis or PostgreSQL
const rooms = new Map();

function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function sanitizeRoom(room, userId) {
  return {
    id:          room.id,
    name:        room.name,
    type:        room.type,        // 'public' | 'private'
    ownerId:     room.ownerId,
    ownerName:   room.ownerName,
    participants: room.participants.map(p => ({ id: p.id, name: p.name, muted: p.muted })),
    count:       room.participants.length,
    createdAt:   room.createdAt,
    // Only reveal PIN to owner
    pin:         (room.type === 'private' && room.ownerId === userId) ? room.pin : undefined,
  };
}

// ── GET /rooms — list ALL rooms (public + private)
// Private rooms are shown in the list but PIN is hidden (only owner sees it)
router.get('/', auth, async (req, res) => {
  const allRooms = Array.from(rooms.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(r => sanitizeRoom(r, req.userId));
  res.json(allRooms);
});

// ── POST /rooms — create room ─────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { name, type = 'public', pin: customPin } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Название обязательно' });
  if (type === 'private') {
    if (!customPin) return res.status(400).json({ error: 'Укажите PIN-код для закрытой комнаты' });
    const pinStr = String(customPin).trim();
    if (pinStr.length < 4 || pinStr.length > 8) return res.status(400).json({ error: 'PIN должен быть от 4 до 8 символов' });
  }

  const id = genId();
  const room = {
    id,
    name:         name.trim(),
    type,
    ownerId:      req.userId,
    ownerName:    req.user.firstName || req.user.username || 'User',
    participants: [],
    pin:          type === 'private' ? String(customPin).trim() : null,
    createdAt:    new Date().toISOString(),
  };
  rooms.set(id, room);
  res.status(201).json(sanitizeRoom(room, req.userId));
});

// ── GET /rooms/:id — get room info ────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });
  res.json(sanitizeRoom(room, req.userId));
});

// ── POST /rooms/:id/join — join room ──────────────────────────────────────
router.post('/:id/join', auth, async (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });

  if (room.type === 'private') {
    const { pin } = req.body;
    if (!pin || pin !== room.pin) return res.status(403).json({ error: 'Неверный PIN-код' });
  }

  // Remove if already in room
  room.participants = room.participants.filter(p => p.id !== req.userId);
  room.participants.push({
    id:    req.userId,
    name:  req.user.firstName || req.user.username || 'User',
    muted: false,
    joinedAt: new Date().toISOString(),
  });

  res.json(sanitizeRoom(room, req.userId));
});

// ── POST /rooms/:id/leave — leave room ────────────────────────────────────
router.post('/:id/leave', auth, async (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Не найдена' });

  room.participants = room.participants.filter(p => p.id !== req.userId);

  // Delete empty rooms (except owner still there)
  if (room.participants.length === 0) {
    rooms.delete(req.params.id);
  }
  res.json({ success: true });
});

// ── DELETE /rooms/:id — delete room (owner only) ──────────────────────────
router.delete('/:id', auth, async (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Не найдена' });
  if (room.ownerId !== req.userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Только владелец может удалить комнату' });
  }
  rooms.delete(req.params.id);
  res.json({ success: true });
});

// Export rooms map for socket.io to access
module.exports = router;
module.exports.rooms = rooms;
module.exports.sanitizeRoom = sanitizeRoom;
