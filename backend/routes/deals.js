const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Deal, Product, User, Transaction } = require('../models/index');
const { auth } = require('../middleware/auth');

const COMMISSION = 0.05;
const userAttrs = ['id','username','firstName','photoUrl','rating','totalSales'];

async function completeDeal(deal) {
  const [buyer, seller] = await Promise.all([User.findByPk(deal.buyerId), User.findByPk(deal.sellerId)]);
  const admin = await User.findOne({ where: { isAdmin: true } });
  const amt = parseFloat(deal.amount);
  const sellerAmt = parseFloat(deal.sellerAmount);
  const commission = parseFloat(deal.commission);

  await buyer.update({ frozenBalance: Math.max(0, parseFloat(buyer.frozenBalance)-amt), totalPurchases: buyer.totalPurchases+1 });
  await seller.update({ balance: parseFloat(seller.balance)+sellerAmt, totalSales: seller.totalSales+1 });
  if (admin) await admin.update({ balance: parseFloat(admin.balance)+commission });

  await deal.update({ status: 'completed', buyerConfirmed: true, resolvedAt: new Date() });
  await Product.update({ status: 'sold' }, { where: { id: deal.productId } });
  await Transaction.bulkCreate([
    { userId: deal.buyerId, type: 'purchase', amount: -amt, status: 'completed', description: 'Purchase completed', dealId: deal.id },
    { userId: deal.sellerId, type: 'sale', amount: sellerAmt, status: 'completed', description: `Sale (5% fee deducted)`, dealId: deal.id }
  ]);
}

router.post('/', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findByPk(productId, { include: [{ model: User, as: 'seller' }] });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.status !== 'active') return res.status(400).json({ error: 'Product not available' });
    if (product.sellerId === req.userId) return res.status(400).json({ error: 'Cannot buy your own product' });

    const buyer = await User.findByPk(req.userId);
    const price = parseFloat(product.price);
    if (parseFloat(buyer.balance) < price) return res.status(400).json({ error: 'Insufficient balance' });

    const commission = price * COMMISSION;
    const sellerAmount = price - commission;

    await buyer.update({
      balance: parseFloat(buyer.balance) - price,
      frozenBalance: parseFloat(buyer.frozenBalance) + price
    });

    const deal = await Deal.create({
      buyerId: req.userId, sellerId: product.sellerId, productId,
      amount: price, sellerAmount, commission, status: 'frozen',
      autoCompleteAt: new Date(Date.now() + 72*3600*1000)
    });

    await product.update({ status: 'frozen' });
    await Transaction.create({
      userId: req.userId, type: 'freeze', amount: -price,
      status: 'completed', description: `Frozen: ${product.title}`, dealId: deal.id
    });

    const full = await Deal.findByPk(deal.id, {
      include: [
        { model: User, as: 'buyer', attributes: userAttrs },
        { model: User, as: 'seller', attributes: userAttrs },
        { model: Product, as: 'product' }
      ]
    });
    res.status(201).json(full);
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed to create deal' }); }
});

router.get('/my', auth, async (req, res) => {
  try {
    const { role='all' } = req.query;
    let where = role==='buyer' ? { buyerId: req.userId } :
                role==='seller' ? { sellerId: req.userId } :
                { [Op.or]: [{ buyerId: req.userId }, { sellerId: req.userId }] };
    const deals = await Deal.findAll({
      where, order: [['createdAt','DESC']],
      include: [
        { model: User, as: 'buyer', attributes: userAttrs },
        { model: User, as: 'seller', attributes: userAttrs },
        { model: Product, as: 'product' }
      ]
    });
    res.json(deals);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id, {
      include: [
        { model: User, as: 'buyer', attributes: userAttrs },
        { model: User, as: 'seller', attributes: userAttrs },
        { model: Product, as: 'product' }
      ]
    });
    if (!deal) return res.status(404).json({ error: 'Not found' });
    const isParty = deal.buyerId===req.userId || deal.sellerId===req.userId;
    if (!isParty && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    res.json(deal);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    if (deal.buyerId !== req.userId) return res.status(403).json({ error: 'Only buyer can confirm' });
    if (deal.status !== 'frozen') return res.status(400).json({ error: 'Cannot confirm in current state' });
    await completeDeal(deal);
    res.json({ success: true });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/dispute', auth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    const isParty = deal.buyerId===req.userId || deal.sellerId===req.userId;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });
    if (deal.status !== 'frozen') return res.status(400).json({ error: 'Cannot dispute' });
    await deal.update({ status: 'disputed' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/message', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Empty message' });
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    const isParty = deal.buyerId===req.userId || deal.sellerId===req.userId;
    if (!isParty && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const messages = [...(deal.messages||[]), { senderId: req.userId, text: text.trim(), ts: new Date().toISOString(), isAdmin: req.user.isAdmin || false }];
    await deal.update({ messages });
    res.json({ success: true, messages });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
module.exports.completeDeal = completeDeal;
