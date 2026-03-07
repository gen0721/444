const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Product, Deal, Transaction } = require('../models/index');
const { adminAuth } = require('../middleware/auth');
const { completeDeal } = require('./deals');

// Stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [users, products, deals, depositSum, salesSum] = await Promise.all([
      User.count(), Product.count({ where: { status: 'active' } }), Deal.count(),
      Transaction.sum('amount', { where: { type: 'deposit', status: 'completed' } }),
      Transaction.sum('amount', { where: { type: 'sale', status: 'completed' } })
    ]);
    const disputedDeals = await Deal.count({ where: { status: 'disputed' } });
    const recentDeals = await Deal.findAll({
      order: [['createdAt','DESC']], limit: 10,
      include: [
        { model: User, as: 'buyer', attributes: ['username','firstName'] },
        { model: User, as: 'seller', attributes: ['username','firstName'] },
        { model: Product, as: 'product', attributes: ['title','price'] }
      ]
    });
    res.json({ stats: { totalUsers: users, activeProducts: products, totalDeals: deals, disputedDeals, totalDeposited: depositSum||0, totalSalesVolume: salesSum||0 }, recentDeals });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// List users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page=1, limit=20, search } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { username: { [Op.iLike]: `%${search}%` } }, { email: { [Op.iLike]: `%${search}%` } },
      { firstName: { [Op.iLike]: `%${search}%` } }, { telegramId: { [Op.iLike]: `%${search}%` } }
    ];
    const { rows: users, count: total } = await User.findAndCountAll({
      where, order: [['createdAt','DESC']], attributes: { exclude: ['password'] },
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit)
    });
    res.json({ users, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Ban / unban
router.post('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.isAdmin && !req.user.isMainAdmin) return res.status(403).json({ error: 'Cannot modify admin' });
    if (user.isMainAdmin) return res.status(403).json({ error: 'Cannot modify main admin' });
    await user.update({ isBanned: !user.isBanned });
    res.json({ success: true, isBanned: user.isBanned });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Verify / unverify
router.post('/users/:id/verify', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ isVerified: !user.isVerified });
    res.json({ success: true, isVerified: user.isVerified });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Adjust balance (positive = add, negative = subtract, absolute = reset to 0)
router.post('/users/:id/balance', adminAuth, async (req, res) => {
  try {
    const { amount, reason = 'Admin adjustment', absolute } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const prev = parseFloat(user.balance);
    const newBal = absolute ? 0 : prev + parseFloat(amount);
    if (newBal < 0) return res.status(400).json({ error: 'Balance cannot be negative' });
    await user.update({ balance: newBal });
    await Transaction.create({
      userId: user.id, type: 'adjustment', amount: absolute ? -prev : parseFloat(amount),
      status: 'completed', description: `Admin: ${reason}`,
      balanceBefore: prev, balanceAfter: newBal
    });
    res.json({ success: true, balance: newBal });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// List deals
router.get('/deals', adminAuth, async (req, res) => {
  try {
    const { status, page=1, limit=20 } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    const { rows: deals, count: total } = await Deal.findAndCountAll({
      where, order: [['createdAt','DESC']],
      include: [
        { model: User, as: 'buyer', attributes: ['id','username','firstName','photoUrl'] },
        { model: User, as: 'seller', attributes: ['id','username','firstName','photoUrl'] },
        { model: Product, as: 'product', attributes: ['id','title','price','category'] }
      ],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit)
    });
    res.json({ deals, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Complete deal
router.post('/deals/:id/complete', adminAuth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    if (!['frozen','disputed'].includes(deal.status)) return res.status(400).json({ error: 'Cannot complete' });
    await completeDeal(deal);
    res.json({ success: true });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// Refund deal
router.post('/deals/:id/refund', adminAuth, async (req, res) => {
  try {
    const { reason = 'Admin refund' } = req.body;
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    if (!['frozen','disputed'].includes(deal.status)) return res.status(400).json({ error: 'Cannot refund' });
    const buyer = await User.findByPk(deal.buyerId);
    const amt = parseFloat(deal.amount);
    await buyer.update({ frozenBalance: Math.max(0, parseFloat(buyer.frozenBalance)-amt), balance: parseFloat(buyer.balance)+amt });
    await deal.update({ status: 'refunded', adminNote: reason, resolvedById: req.userId, resolvedAt: new Date() });
    await Product.update({ status: 'active' }, { where: { id: deal.productId } });
    await Transaction.create({ userId: deal.buyerId, type: 'refund', amount: amt, status: 'completed', description: `Refund: ${reason}`, dealId: deal.id });
    res.json({ success: true });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// List products
router.get('/products', adminAuth, async (req, res) => {
  try {
    const { status, page=1, limit=20 } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    const { rows: products, count: total } = await Product.findAndCountAll({
      where, order: [['createdAt','DESC']],
      include: [{ model: User, as: 'seller', attributes: ['username','firstName'] }],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit)
    });
    res.json({ products, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Delete product
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    await Product.update({ status: 'deleted' }, { where: { id: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// List transactions
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { type, page=1, limit=30 } = req.query;
    const where = {};
    if (type && type !== 'all') where.type = type;
    const { rows: transactions, count: total } = await Transaction.findAndCountAll({
      where, order: [['createdAt','DESC']],
      include: [{ model: User, as: 'user', attributes: ['username','firstName','telegramId'] }],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit)
    });
    res.json({ transactions, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;

// ─── SUB-ADMIN MANAGEMENT ───────────────────────────────────────────────
const { ADMIN_TG_ID } = require('../middleware/auth');

// Only main admin can manage sub-admins
const mainAdminOnly = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (String(req.user.telegramId) !== String(ADMIN_TG_ID) && !req.user.isMainAdmin) {
    return res.status(403).json({ error: 'Only main admin can manage sub-admins' });
  }
  next();
};

// Add sub-admin
router.post('/subadmin/add', adminAuth, mainAdminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (String(user.telegramId) === String(ADMIN_TG_ID)) return res.status(400).json({ error: 'Cannot modify main admin' });
    await user.update({ isSubAdmin: true, isAdmin: true });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Remove sub-admin
router.post('/subadmin/remove', adminAuth, mainAdminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (String(user.telegramId) === String(ADMIN_TG_ID)) return res.status(400).json({ error: 'Cannot modify main admin' });
    await user.update({ isSubAdmin: false, isAdmin: false });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// List sub-admins
router.get('/subadmins', adminAuth, async (req, res) => {
  try {
    const admins = await User.findAll({
      where: { isAdmin: true },
      attributes: { exclude: ['password'] }
    });
    res.json(admins);
  } catch { res.status(500).json({ error: 'Failed' }); }
});
