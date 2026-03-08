const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { User, Product, Deal, Transaction, Broadcast, Chat, ChatMember } = require('../models/index');
const { adminAuth } = require('../middleware/auth');
const { completeDeal, refundDeal } = require('./deals');
const sequelize = require('../db');
const notify = require('../utils/notify');

const mainAdminOnly = (req, res, next) => {
  if (!req.user.isMainAdmin) return res.status(403).json({ error: 'Main admin only' });
  next();
};

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [totalUsers, totalProducts, totalDeals, activeDeals, onlineUsers, volResult, commResult] = await Promise.all([
      User.count(),
      Product.count({ where: { status: { [Op.ne]: 'deleted' } } }),
      Deal.count(),
      Deal.count({ where: { status: { [Op.in]: ['frozen','disputed'] } } }),
      User.count({ where: { lastActive: { [Op.gte]: fiveMinAgo } } }),
      Transaction.sum('amount', { where: { type: 'sale',       status: 'completed' } }),
      Transaction.sum('amount', { where: { type: 'commission', status: 'completed' } }),
    ]);
    res.json({
      totalUsers, totalProducts, totalDeals, activeDeals, onlineUsers,
      totalVolume:     parseFloat(volResult    || 0),
      totalCommission: parseFloat(commResult   || 0),
    });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── Online users ───────────────────────────────────────────────────────────────
router.get('/online', adminAuth, async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const users = await User.findAll({
      where: { lastActive: { [Op.gte]: fiveMinAgo } },
      attributes: ['id','username','firstName','photoUrl','telegramId','lastActive','isAdmin','isVerified'],
      order: [['lastActive','DESC']],
      limit: 100,
    });
    res.json({ users, count: users.length });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ── List users ────────────────────────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { username:   { [Op.iLike]: `%${search}%` } },
      { email:      { [Op.iLike]: `%${search}%` } },
      { firstName:  { [Op.iLike]: `%${search}%` } },
      { telegramId: { [Op.iLike]: `%${search}%` } },
    ];
    const { rows: users, count: total } = await User.findAndCountAll({
      where, order: [['createdAt','DESC']],
      attributes: { exclude: ['password'] },
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ users, total });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── Ban ───────────────────────────────────────────────────────────────────────
// body: { type: 'permanent'|'timed'|'date', duration?: number, unit?: 'hours'|'days', until?: ISO-date, reason?: string }
router.post('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.isMainAdmin) return res.status(403).json({ error: 'Cannot ban main admin' });
    if (user.isAdmin && !req.user.isMainAdmin) return res.status(403).json({ error: 'Only main admin can ban admins' });

    const { type = 'permanent', duration, unit = 'days', until, reason } = req.body;

    let banUntil = null;
    if (type === 'timed' && duration) {
      const ms = unit === 'hours' ? duration * 3600000 : duration * 86400000;
      banUntil = new Date(Date.now() + ms);
    } else if (type === 'date' && until) {
      banUntil = new Date(until);
      if (isNaN(banUntil.getTime())) return res.status(400).json({ error: 'Неверная дата' });
    }
    // type === 'permanent' → banUntil = null

    await user.update({ isBanned: true, banUntil, banReason: reason || null });

    // Notify via Telegram
    if (user.telegramId) {
      notify.notifyBanned(user, banUntil, reason).catch(e => console.warn('Ban notify failed:', e.message));
    } else {
      console.warn('Ban notify skipped: no telegramId for user', user.id);
    }

    res.json({ success: true, isBanned: true, banUntil, banReason: reason });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

router.post('/users/:id/unban', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ isBanned: false, banUntil: null, banReason: null });
    notify.notifyUnbanned(user).catch(() => {});
    res.json({ success: true, isBanned: false });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Verify ────────────────────────────────────────────────────────────────────
router.post('/users/:id/verify', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ isVerified: !user.isVerified });
    res.json({ success: true, isVerified: user.isVerified });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Adjust balance ─────────────────────────────────────────────────────────────
router.post('/users/:id/balance', adminAuth, async (req, res) => {
  try {
    const { amount, reason = 'Admin adjustment', absolute } = req.body;
    if (amount === undefined || amount === '' || isNaN(parseFloat(amount)))
      return res.status(400).json({ error: 'Укажите сумму' });

    const dbTx = await sequelize.transaction();
    try {
      const user = await User.findByPk(req.params.id, { transaction: dbTx, lock: true });
      if (!user) { await dbTx.rollback(); return res.status(404).json({ error: 'Not found' }); }

      const prev   = parseFloat(user.balance);
      const amt    = parseFloat(amount) || 0;
      const newBal = absolute ? amt : prev + amt;
      if (newBal < 0) { await dbTx.rollback(); return res.status(400).json({ error: 'Баланс не может быть отрицательным' }); }

      await user.update({ balance: newBal }, { transaction: dbTx });
      await Transaction.create({
        userId:       user.id,
        type:         'adjustment',
        amount:       newBal - prev,
        status:       'completed',
        description:  `Admin: ${reason}`,
        balanceBefore: prev,
        balanceAfter:  newBal,
      }, { transaction: dbTx });
      await dbTx.commit();

      notify.notifyBalanceAdjust(user, newBal - prev, reason).catch(() => {});

      res.json({ success: true, balance: newBal });
    } catch (e) { await dbTx.rollback(); throw e; }
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── List / manage deals ────────────────────────────────────────────────────────
router.get('/deals', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const where = status ? { status } : {};
    const { rows: deals, count: total } = await Deal.findAndCountAll({
      where, order: [['createdAt','DESC']],
      include: [
        { model: User,    as: 'buyer',   attributes: ['id','username','firstName'] },
        { model: User,    as: 'seller',  attributes: ['id','username','firstName'] },
        { model: Product, as: 'product', attributes: ['id','title','price'] },
      ],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ deals, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/deals/:id/complete', adminAuth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id, {
      include: [
        { model: User, as: 'buyer' },
        { model: User, as: 'seller' },
        { model: Product, as: 'product' },
      ]
    });
    if (!deal) return res.status(404).json({ error: 'Not found' });
    if (!['frozen','disputed'].includes(deal.status)) return res.status(400).json({ error: 'Cannot complete' });
    await completeDeal(deal);
    notify.notifyDealComplete(deal.buyer, deal.seller, deal.product?.title, deal.sellerAmount).catch(() => {});
    res.json({ success: true });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

router.post('/deals/:id/refund', adminAuth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id, {
      include: [
        { model: User, as: 'buyer' },
        { model: Product, as: 'product' },
      ]
    });
    if (!deal) return res.status(404).json({ error: 'Not found' });
    if (!['frozen','disputed'].includes(deal.status)) return res.status(400).json({ error: 'Cannot refund' });
    await refundDeal(deal);
    notify.notifyDealRefund(deal.buyer, deal.product?.title, deal.amount).catch(() => {});
    res.json({ success: true });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── Products ───────────────────────────────────────────────────────────────────
router.get('/products', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { rows: products, count: total } = await Product.findAndCountAll({
      where: { status: { [Op.ne]: 'deleted' } },
      order: [['createdAt','DESC']],
      include: [{ model: User, as: 'seller', attributes: ['id','username','firstName'] }],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ products, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    await p.update({ status: 'deleted' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Transactions ───────────────────────────────────────────────────────────────
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { rows: transactions, count: total } = await Transaction.findAndCountAll({
      order: [['createdAt','DESC']],
      include: [{ model: User, as: 'user', attributes: ['id','username','firstName'] }],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ transactions, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Sub-admin management ───────────────────────────────────────────────────────
router.post('/subadmin/add', adminAuth, mainAdminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isMainAdmin) return res.status(400).json({ error: 'Already main admin' });
    await user.update({ isAdmin: true, isSubAdmin: true });
    notify.notifySubAdminAdded(user).catch(() => {});
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/subadmin/remove', adminAuth, mainAdminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isMainAdmin) return res.status(403).json({ error: 'Cannot remove main admin' });
    await user.update({ isAdmin: false, isSubAdmin: false });
    notify.notifySubAdminRemoved(user).catch(() => {});
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/subadmins', adminAuth, async (req, res) => {
  try {
    const admins = await User.findAll({
      where: { isAdmin: true, isMainAdmin: false },
      attributes: { exclude: ['password'] },
    });
    res.json(admins);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Close / reopen chat ────────────────────────────────────────────────────────
router.post('/chats/:id/close', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const chat = await Chat.findByPk(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    await chat.update({ isClosed: true, closedReason: reason || 'Закрыто администратором' });

    // Notify all members
    const members = await ChatMember.findAll({ where: { chatId: chat.id }, include: [{ model: User, as: 'user' }] });
    for (const m of members) {
      if (m.user?.telegramId) notify.notifyChatClosed(m.user, chat.name).catch(() => {});
    }

    // Emit socket event if io available
    if (global.io) {
      global.io.to(`chat:${chat.id}`).emit('chat:closed', { chatId: chat.id, reason: reason || 'Закрыто администратором' });
    }

    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

router.post('/chats/:id/reopen', adminAuth, async (req, res) => {
  try {
    const chat = await Chat.findByPk(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    await chat.update({ isClosed: false, closedReason: null });
    if (global.io) global.io.to(`chat:${chat.id}`).emit('chat:reopened', { chatId: chat.id });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/chats', adminAuth, async (req, res) => {
  try {
    const chats = await Chat.findAll({
      where: { deletedAt: null },
      order: [['createdAt', 'DESC']],
      limit: 100,
      attributes: ['id','name','type','ownerId','ownerName','memberCount','lastMessageAt','isClosed','closedReason','dealId','createdAt'],
    });
    res.json(chats.map(c => c.toJSON()));
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── BROADCAST ──────────────────────────────────────────────────────────────────
router.post('/broadcast', adminAuth, async (req, res) => {
  try {
    const { title, text, targetType = 'all', targetUserId } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Укажите заголовок' });
    if (!text?.trim())  return res.status(400).json({ error: 'Укажите текст сообщения' });
    if (!['all','single','admins'].includes(targetType))
      return res.status(400).json({ error: 'Неверный тип рассылки' });
    if (targetType === 'single' && !targetUserId)
      return res.status(400).json({ error: 'Укажите пользователя для личной рассылки' });

    const broadcast = await Broadcast.create({
      senderId:     req.userId,
      title:        title.trim(),
      text:         text.trim(),
      targetType,
      targetUserId: targetType === 'single' ? targetUserId : null,
      status:       'pending',
    });

    let whereClause = {};
    if (targetType === 'single')  whereClause = { id: targetUserId };
    else if (targetType === 'admins') whereClause = { isAdmin: true };

    const recipients = await User.findAll({
      where: whereClause,
      attributes: ['id','username','firstName','telegramId'],
    });

    await broadcast.update({ sentCount: recipients.length, status: 'sent' });

    let telegramSent = 0;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
    if (BOT_TOKEN) {
      const msgText = `📢 <b>${title.trim()}</b>

${text.trim()}`;
      for (const u of recipients) {
        if (u.telegramId) {
          await notify.sendTg(u.telegramId, msgText);
          telegramSent++;
        }
      }
    }

    res.json({ success: true, sentCount: recipients.length, telegramSent, broadcast });
  } catch (e) { console.error('Broadcast error:', e.message); res.status(500).json({ error: 'Failed' }); }
});

router.get('/broadcasts', adminAuth, async (req, res) => {
  try {
    const broadcasts = await Broadcast.findAll({
      order: [['createdAt','DESC']],
      limit: 50,
      include: [
        { model: User, as: 'sender',     attributes: ['id','username','firstName'] },
        { model: User, as: 'targetUser', attributes: ['id','username','firstName'], required: false },
      ],
    });
    res.json(broadcasts);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
