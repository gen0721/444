const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const { Op }   = require('sequelize');
const { Chat, ChatMessage, ChatMember, User, sequelize } = require('../models/index');
const { auth } = require('../middleware/auth');

function sanitize(chat) {
  const p = chat.toJSON ? chat.toJSON() : chat;
  return {
    id:              p.id,
    name:            p.name,
    type:            p.type,
    ownerId:         p.ownerId,
    ownerName:       p.ownerName,
    memberCount:     p.memberCount || 0,
    lastMessageAt:   p.lastMessageAt,
    lastMessageText: p.lastMessageText,
    lastMessageUser: p.lastMessageUser,
    hasPassword:     p.type === 'private',
    isClosed:        p.isClosed || false,
    closedReason:    p.closedReason || null,
    dealId:          p.dealId || null,
    createdAt:       p.createdAt,
  };
}

// GET /chats
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.findAll({
      where: { deletedAt: null },
      order: [['lastMessageAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']],
    });
    res.json(chats.map(sanitize));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /chats/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    res.json(sanitize(chat));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /chats — create via raw SQL to avoid ENUM issues
router.post('/', auth, async (req, res) => {
  try {
    const { name, type = 'public', password } = req.body;
    if (!name?.trim())          return res.status(400).json({ error: 'Введите название чата' });
    if (name.trim().length > 60) return res.status(400).json({ error: 'Название не более 60 символов' });
    if (type === 'private') {
      if (!password?.trim())            return res.status(400).json({ error: 'Укажите пароль' });
      if (password.trim().length < 4)   return res.status(400).json({ error: 'Пароль минимум 4 символа' });
    }

    const chatId    = crypto.randomUUID();
    const ownerName = req.user.firstName || req.user.username || 'User';
    const pw        = type === 'private' ? password.trim() : null;

    await sequelize.query(
      `INSERT INTO "Chats" (id, name, type, "ownerId", "ownerName", password, "memberCount", "deletedAt", "isClosed", "createdAt", "updatedAt")
       VALUES (:id, :name, :type, :ownerId, :ownerName, :password, 1, NULL, false, NOW(), NOW())`,
      { replacements: { id: chatId, name: name.trim(), type, ownerId: req.userId, ownerName, password: pw } }
    );

    await sequelize.query(
      `INSERT INTO "ChatMembers" (id, "chatId", "userId", "joinedAt") VALUES (:id, :chatId, :userId, NOW()) ON CONFLICT DO NOTHING`,
      { replacements: { id: crypto.randomUUID(), chatId, userId: req.userId } }
    );

    const chat = await Chat.findByPk(chatId);
    res.status(201).json(sanitize(chat));
  } catch (e) { console.error('Create chat error:', e.message); res.status(500).json({ error: e.message }); }
});

// POST /chats/:id/join
router.post('/:id/join', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    if (chat.type === 'private') {
      const { password } = req.body;
      if (!password || password !== chat.password)
        return res.status(403).json({ error: 'Неверный пароль' });
    }
    await sequelize.query(
      `INSERT INTO "ChatMembers" (id, "chatId", "userId", "joinedAt") VALUES (:id, :chatId, :userId, NOW()) ON CONFLICT DO NOTHING`,
      { replacements: { id: crypto.randomUUID(), chatId: chat.id, userId: req.userId } }
    );
    const count = await ChatMember.count({ where: { chatId: chat.id } });
    await chat.update({ memberCount: count });
    res.json(sanitize(chat));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /chats/:id/messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    const messages = await ChatMessage.findAll({
      where: { chatId: chat.id },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });
    res.json(messages.map(m => ({
      id: m.id, chatId: m.chatId, userId: m.userId,
      userName: m.userName, text: m.text,
      isAdmin: m.isAdmin || false, isSystem: m.isSystem || false, ts: m.createdAt,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /chats/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    if (chat.ownerId !== req.userId && !req.user?.isAdmin)
      return res.status(403).json({ error: 'Только владелец может удалить чат' });
    await ChatMessage.destroy({ where: { chatId: chat.id } });
    await ChatMember.destroy({ where: { chatId: chat.id } });
    await chat.update({ deletedAt: new Date() });
    global.io?.to(`chat:${chat.id}`).emit('chat:deleted', { chatId: chat.id, reason: 'Чат удалён владельцем' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
