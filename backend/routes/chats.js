const express  = require('express');
const router   = express.Router();
const { Op }   = require('sequelize');
const { Chat, ChatMessage, ChatMember, User } = require('../models/index');
const { auth } = require('../middleware/auth');

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getMemberIds(chatId) {
  const members = await ChatMember.findAll({ where: { chatId }, attributes: ['userId'] });
  return members.map(m => m.userId);
}

async function isMember(chatId, userId) {
  const m = await ChatMember.findOne({ where: { chatId, userId } });
  return !!m;
}

function sanitize(chat, userId) {
  const plain = chat.toJSON ? chat.toJSON() : chat;
  return {
    id:              plain.id,
    name:            plain.name,
    type:            plain.type,
    ownerId:         plain.ownerId,
    ownerName:       plain.ownerName,
    memberCount:     plain.memberCount || 0,
    lastMessageAt:   plain.lastMessageAt,
    lastMessageText: plain.lastMessageText,
    lastMessageUser: plain.lastMessageUser,
    hasPassword:     plain.type === 'private',
    isClosed:        plain.isClosed || false,
    closedReason:    plain.closedReason || null,
    dealId:          plain.dealId || null,
    createdAt:       plain.createdAt,
  };
}

// ─── GET /chats/:id — single chat ────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    const isMemberResult = await ChatMember.findOne({ where: { chatId: chat.id, userId: req.userId } });
    if (!isMemberResult && !req.user?.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
    res.json(sanitize(chat, req.userId));
  } catch { res.status(500).json({ error: 'Ошибка' }); }
});

// ─── GET /chats ───────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const chats = await Chat.findAll({
    where: { deletedAt: null },
    order: [
      ['lastMessageAt', 'DESC NULLS LAST'],
      ['createdAt', 'DESC'],
    ],
  });
  res.json(chats.map(c => sanitize(c, req.userId)));
});

// ─── POST /chats — create ─────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { name, type = 'public', password } = req.body;

  if (!name?.trim())
    return res.status(400).json({ error: 'Введите название чата' });
  if (name.trim().length > 60)
    return res.status(400).json({ error: 'Название не более 60 символов' });
  if (type === 'private') {
    if (!password?.trim())
      return res.status(400).json({ error: 'Укажите пароль для закрытого чата' });
    if (password.trim().length < 4)
      return res.status(400).json({ error: 'Пароль минимум 4 символа' });
  }

  const chat = await Chat.create({
    name:        name.trim(),
    type,
    ownerId:     req.userId,
    ownerName:   req.user.firstName || req.user.username || 'User',
    password:    type === 'private' ? password.trim() : null,
    memberCount: 0,
  });

  await ChatMember.create({ chatId: chat.id, userId: req.userId });
  await chat.update({ memberCount: 1 });

  res.status(201).json(sanitize(chat, req.userId));
});

// ─── POST /chats/:id/join — verify password & add member ─────────────────────
router.post('/:id/join', auth, async (req, res) => {
  const chat = await Chat.findOne({ where: { id: req.params.id, deletedAt: null } });
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });

  if (chat.type === 'private') {
    const { password } = req.body;
    if (!password || password !== chat.password)
      return res.status(403).json({ error: 'Неверный пароль' });
  }

  await ChatMember.findOrCreate({ where: { chatId: chat.id, userId: req.userId } });
  const count = await ChatMember.count({ where: { chatId: chat.id } });
  await chat.update({ memberCount: count });

  res.json(sanitize(chat, req.userId));
});

// ─── GET /chats/:id/messages ──────────────────────────────────────────────────
router.get('/:id/messages', auth, async (req, res) => {
  const chat = await Chat.findOne({ where: { id: req.params.id, deletedAt: null } });
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });

  const messages = await ChatMessage.findAll({
    where: { chatId: chat.id },
    order: [['createdAt', 'ASC']],
    limit: 100,
  });

  res.json(messages.map(m => ({
    id:       m.id,
    chatId:   m.chatId,
    userId:   m.userId,
    userName: m.userName,
    text:     m.text,
    isAdmin:  m.isAdmin || false,
    isSystem: m.isSystem || false,
    ts:       m.createdAt,
  })));
});

// ─── DELETE /chats/:id — owner or admin delete ────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  const chat = await Chat.findOne({ where: { id: req.params.id, deletedAt: null } });
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });
  if (chat.ownerId !== req.userId && !req.user?.isAdmin)
    return res.status(403).json({ error: 'Только владелец может удалить чат' });

  await ChatMessage.destroy({ where: { chatId: chat.id } });
  await ChatMember.destroy({ where: { chatId: chat.id } });
  await chat.update({ deletedAt: new Date() });

  if (global.io) {
    global.io.to(`chat:${chat.id}`).emit('chat:deleted', { chatId: chat.id, reason: 'Чат удалён' });
  }

  res.json({ success: true });
});

module.exports = router;
