const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { User, Product, Deal, Transaction } = require('../models/index');
const { adminAuth } = require('../middleware/auth');
const { completeDeal } = require('./deals');

// Only main admin can do certain things
const mainAdminOnly = (req, res, next) => {
  if (!req.user.isMainAdmin) return res.status(403).json({ error: 'Main admin only' });
  next();
};

// ── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalDeals, activeDeals, volResult, commResult] = await Promise.all([
      User.count(),
      Product.count({ where: { status: { [Op.ne]: 'deleted' } } }),
      Deal.count(),
      Deal.count({ where: { status: { [Op.in]: ['frozen','disputed'] } } }),
      Transaction.sum('amount', { where: { type: 'sale',   status: 'completed' } }),
      Transaction.sum('amount', { where: { type: 'commission', status: 'completed' } }),
    ]);
    res.json({
      totalUsers, totalProducts, totalDeals, activeDeals,
      totalVolume:     parseFloat(volResult    || 0),
      totalCommission: parseFloat(commResult   || 0),
    });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── List users ────────────────────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { username:  { [Op.iLike]: `%${search}%` } },
      { email:     { [Op.iLike]: `%${search}%` } },
      { firstName: { [Op.iLike]: `%${search}%` } },
      { telegramId:{ [Op.iLike]: `%${search}%` } },
    ];
    const { rows: users, count: total } = await User.findAndCountAll({
      where, order: [['createdAt','DESC']],
      attributes: { exclude: ['password'] },
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    res.json({ users, total });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── Ban user ──────────────────────────────────────────────────────────────
router.post('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.isMainAdmin) return res.status(403).json({ error: 'Cannot ban main admin' });
    if (user.isAdmin && !req.user.isMainAdmin) return res.status(403).json({ error: 'Only main admin can ban admins' });
    await user.update({ isBanned: true });
    res.json({ success: true, isBanned: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Unban user ────────────────────────────────────────────────────────────
router.post('/users/:id/unban', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ isBanned: false });
    res.json({ success: true, isBanned: false });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Verify / unverify ─────────────────────────────────────────────────────
router.post('/users/:id/verify', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ isVerified: !user.isVerified });
    res.json({ success: true, isVerified: user.isVerified });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Adjust balance ────────────────────────────────────────────────────────
router.post('/users/:id/balance', adminAuth, async (req, res) => {
  try {
    const { amount, reason = 'Admin adjustment', absolute } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    const prev   = parseFloat(user.balance);
    const amt    = parseFloat(amount) || 0;
    // absolute=true → set to exact amount; otherwise add/subtract
    const newBal = absolute ? amt : prev + amt;
    if (newBal < 0) return res.status(400).json({ error: 'Balance would be negative' });

    await user.update({ balance: newBal });
    await Transaction.create({
      userId:       user.id,
      type:         'adjustment',
      amount:       newBal - prev,   // actual delta
      status:       'completed',
      description:  `Admin: ${reason}`,
      balanceBefore: prev,
      balanceAfter:  newBal,
    });
    res.json({ success: true, balance: newBal });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── List deals ────────────────────────────────────────────────────────────
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
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    res.json({ deals, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Complete deal (admin) ─────────────────────────────────────────────────
router.post('/deals/:id/complete', adminAuth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    if (!['frozen','disputed'].includes(deal.status)) return res.status(400).json({ error: 'Cannot complete' });
    await completeDeal(deal);
    res.json({ success: true });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── Refund deal (admin) ───────────────────────────────────────────────────
router.post('/deals/:id/refund', adminAuth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    if (!['frozen','disputed'].includes(deal.status)) return res.status(400).json({ error: 'Cannot refund' });

    const buyer = await User.findByPk(deal.buyerId);
    const amt   = parseFloat(deal.amount);
    await buyer.update({
      balance:       parseFloat(buyer.balance)       + amt,
      frozenBalance: Math.max(0, parseFloat(buyer.frozenBalance) - amt),
    });
    await deal.update({ status: 'refunded', resolvedAt: new Date(), resolvedById: req.userId });
    await Product.update({ status: 'active' }, { where: { id: deal.productId } });
    res.json({ success: true });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── List products ─────────────────────────────────────────────────────────
router.get('/products', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { rows: products, count: total } = await Product.findAndCountAll({
      where: { status: { [Op.ne]: 'deleted' } },
      order: [['createdAt','DESC']],
      include: [{ model: User, as: 'seller', attributes: ['id','username','firstName'] }],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    res.json({ products, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Delete product ────────────────────────────────────────────────────────
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    await p.update({ status: 'deleted' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── List transactions ─────────────────────────────────────────────────────
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { rows: transactions, count: total } = await Transaction.findAndCountAll({
      order: [['createdAt','DESC']],
      include: [{ model: User, as: 'user', attributes: ['id','username','firstName'] }],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    res.json({ transactions, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── Subadmin management (main admin only) ────────────────────────────────
router.post('/subadmin/add', adminAuth, mainAdminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isMainAdmin) return res.status(400).json({ error: 'Already main admin' });
    await user.update({ isAdmin: true, isSubAdmin: true });
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

module.exports = router;
