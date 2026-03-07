const express    = require('express');
const notify     = require('../utils/notify');
const router     = express.Router();
const { Op }     = require('sequelize');
const { Deal, Product, User, Transaction, sequelize } = require('../models/index');
const { auth, adminAuth } = require('../middleware/auth');

const COMMISSION  = 0.05;
const userAttrs   = ['id','username','firstName','photoUrl','rating','totalSales'];

// ─────────────────────────────────────────────────────────────────────────────
// completeDeal — wrapped in DB transaction to prevent race conditions
// ─────────────────────────────────────────────────────────────────────────────
async function completeDeal(deal) {
  await sequelize.transaction(async (t) => {
    // Lock rows for update to prevent double-spend
    const buyer  = await User.findByPk(deal.buyerId,  { lock: t.LOCK.UPDATE, transaction: t });
    const seller = await User.findByPk(deal.sellerId, { lock: t.LOCK.UPDATE, transaction: t });
    const admin  = await User.findOne({ where: { isAdmin: true }, lock: t.LOCK.UPDATE, transaction: t });

    const amt        = parseFloat(deal.amount);
    const sellerAmt  = parseFloat(deal.sellerAmount);
    const commission = parseFloat(deal.commission);

    // Unfreeze buyer's balance
    await buyer.update({
      frozenBalance:  Math.max(0, parseFloat(buyer.frozenBalance) - amt),
      totalPurchases: buyer.totalPurchases + 1,
    }, { transaction: t });

    // Credit seller
    await seller.update({
      balance:    parseFloat((parseFloat(seller.balance) + sellerAmt).toFixed(2)),
      totalSales: seller.totalSales + 1,
    }, { transaction: t });

    // Commission to admin
    if (admin) {
      await admin.update({
        balance: parseFloat((parseFloat(admin.balance) + commission).toFixed(2)),
      }, { transaction: t });
    }

    await deal.update({
      status: 'completed', buyerConfirmed: true, resolvedAt: new Date(),
    }, { transaction: t });

    await Product.update({ status: 'sold' }, { where: { id: deal.productId }, transaction: t });

    await Transaction.bulkCreate([
      {
        userId: deal.buyerId, type: 'purchase', amount: -amt,
        status: 'completed', description: `Покупка подтверждена: ${amt.toFixed(2)}$`,
        dealId: deal.id,
      },
      {
        userId: deal.sellerId, type: 'sale', amount: sellerAmt,
        status: 'completed', description: `Продажа завершена (-5% комиссия): +${sellerAmt.toFixed(2)}$`,
        dealId: deal.id,
      },
    ], { transaction: t });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// refundDeal — return funds to buyer (admin use, disputed deals)
// ─────────────────────────────────────────────────────────────────────────────
async function refundDeal(deal) {
  await sequelize.transaction(async (t) => {
    const buyer = await User.findByPk(deal.buyerId, { lock: t.LOCK.UPDATE, transaction: t });
    const amt   = parseFloat(deal.amount);

    await buyer.update({
      balance:      parseFloat((parseFloat(buyer.balance) + amt).toFixed(2)),
      frozenBalance: Math.max(0, parseFloat(buyer.frozenBalance) - amt),
    }, { transaction: t });

    await deal.update({ status: 'refunded', resolvedAt: new Date() }, { transaction: t });
    await Product.update({ status: 'active' }, { where: { id: deal.productId }, transaction: t });

    await Transaction.create({
      userId: deal.buyerId, type: 'refund', amount: amt,
      status: 'completed', description: `Возврат по спору: +${amt.toFixed(2)}$`,
      dealId: deal.id,
    }, { transaction: t });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /deals — create deal (buyer pays, funds frozen)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findByPk(productId, { include: [{ model: User, as: 'seller' }] });
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    if (product.status !== 'active') return res.status(400).json({ error: 'Товар недоступен для покупки' });
    if (product.sellerId === req.userId) return res.status(400).json({ error: 'Нельзя купить свой товар' });

    const buyer     = await User.findByPk(req.userId);
    const price     = parseFloat(product.price);
    const buyerPays = parseFloat((price * 1.05).toFixed(2));   // buyer pays +5%
    const sellerAmt = parseFloat((price * 0.95).toFixed(2));   // seller gets -5%
    const commission= parseFloat((buyerPays - sellerAmt).toFixed(2));

    if (parseFloat(buyer.balance) < buyerPays)
      return res.status(400).json({
        error: `Недостаточно средств. Нужно $${buyerPays.toFixed(2)} (цена + 5% комиссия сервиса)`
      });

    await buyer.update({
      balance:       parseFloat((parseFloat(buyer.balance) - buyerPays).toFixed(2)),
      frozenBalance: parseFloat((parseFloat(buyer.frozenBalance) + buyerPays).toFixed(2)),
    });

    const deal = await Deal.create({
      buyerId: req.userId, sellerId: product.sellerId, productId,
      amount: buyerPays, sellerAmount: sellerAmt, commission,
      status: 'frozen',
      autoCompleteAt: new Date(Date.now() + 72 * 3600 * 1000),
    });

    await product.update({ status: 'frozen' });

    // Create dedicated deal chat for buyer + seller + admin access
    try {
      const { Chat, ChatMember } = require('../models/index');
      const dealChat = await Chat.create({
        name: `Сделка: ${product.title.slice(0, 40)}`,
        type: 'private',
        ownerId: product.sellerId,
        ownerName: product.seller?.firstName || product.seller?.username || 'Продавец',
        dealId: deal.id,
      });
      await ChatMember.bulkCreate([
        { chatId: dealChat.id, userId: req.userId },
        { chatId: dealChat.id, userId: product.sellerId },
      ], { ignoreDuplicates: true });
      await deal.update({ adminNote: dealChat.id });  // store chatId for reference
    } catch (e) { console.warn('Deal chat creation failed:', e.message); }

    await Transaction.create({
      userId: req.userId, type: 'freeze', amount: -buyerPays, status: 'completed',
      description: `Оплата заморожена: ${product.title} ($${buyerPays.toFixed(2)} вкл. 5% комиссию)`,
      dealId: deal.id,
    });

    // Notify buyer and seller
    notify.notifyPurchase(buyer, product.seller, product.title, buyerPays).catch(() => {});

    const full = await Deal.findByPk(deal.id, {
      include: [
        { model: User,    as: 'buyer',   attributes: userAttrs },
        { model: User,    as: 'seller',  attributes: userAttrs },
        { model: Product, as: 'product' },
      ]
    });
    res.status(201).json(full);
  } catch (e) {
    console.error('Create deal error:', e.message);
    res.status(500).json({ error: 'Не удалось создать сделку' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /deals/my
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const { role = 'all' } = req.query;
    const where =
      role === 'buyer'  ? { buyerId:  req.userId } :
      role === 'seller' ? { sellerId: req.userId } :
      { [Op.or]: [{ buyerId: req.userId }, { sellerId: req.userId }] };

    const deals = await Deal.findAll({
      where, order: [['createdAt', 'DESC']],
      include: [
        { model: User,    as: 'buyer',   attributes: userAttrs },
        { model: User,    as: 'seller',  attributes: userAttrs },
        { model: Product, as: 'product' },
      ]
    });
    res.json(deals);
  } catch { res.status(500).json({ error: 'Ошибка' }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /deals/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id, {
      include: [
        { model: User,    as: 'buyer',   attributes: userAttrs },
        { model: User,    as: 'seller',  attributes: userAttrs },
        { model: Product, as: 'product' },
      ]
    });
    if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
    const isParty = deal.buyerId === req.userId || deal.sellerId === req.userId;
    if (!isParty && !req.user?.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
    res.json(deal);
  } catch { res.status(500).json({ error: 'Ошибка' }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /deals/:id/deliver — seller attaches delivery data (key, account, link)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/deliver', auth, async (req, res) => {
  try {
    const { deliveryData } = req.body;
    if (!deliveryData?.trim())
      return res.status(400).json({ error: 'Введите данные для доставки (ключ, аккаунт, ссылку)' });
    if (deliveryData.trim().length > 2000)
      return res.status(400).json({ error: 'Данные слишком длинные (макс. 2000 символов)' });

    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
    if (deal.sellerId !== req.userId) return res.status(403).json({ error: 'Только продавец может передать данные' });
    if (deal.status !== 'frozen') return res.status(400).json({ error: 'Нельзя передать данные в текущем статусе' });

    // Append system message so buyer sees it in chat
    const systemMsg = {
      senderId: req.userId,
      text: `📦 Продавец передал данные товара. Проверьте и подтвердите получение.`,
      ts: new Date().toISOString(),
      isAdmin: false,
      isSystem: true,
    };
    const messages = [...(deal.messages || []), systemMsg];

    await deal.update({
      deliveryData:    deliveryData.trim(),
      sellerDelivered: true,
      messages,
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Deliver error:', e.message);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /deals/:id/confirm — buyer confirms receipt → money released to seller
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
    if (deal.buyerId !== req.userId)
      return res.status(403).json({ error: 'Только покупатель может подтвердить получение' });
    if (deal.status !== 'frozen')
      return res.status(400).json({ error: 'Нельзя подтвердить в текущем статусе' });

    await completeDeal(deal);
    res.json({ success: true });
  } catch (e) {
    console.error('Confirm error:', e.message);
    res.status(500).json({ error: 'Ошибка при завершении сделки' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /deals/:id/dispute — open dispute
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/dispute', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
    const isParty = deal.buyerId === req.userId || deal.sellerId === req.userId;
    if (!isParty) return res.status(403).json({ error: 'Нет доступа' });
    if (deal.status !== 'frozen') return res.status(400).json({ error: 'Спор можно открыть только для активной сделки' });

    const systemMsg = {
      senderId: req.userId,
      text: `⚠️ Открыт спор${reason ? `: ${reason}` : ''}. Администратор рассмотрит ситуацию.`,
      ts: new Date().toISOString(),
      isAdmin: true,
      isSystem: true,
    };
    const messages = [...(deal.messages || []), systemMsg];

    const dBuyer  = await User.findByPk(deal.buyerId);
    const dSeller = await User.findByPk(deal.sellerId);
    const dProd   = await Product.findByPk(deal.productId);
    await deal.update({ status: 'disputed', messages });
    notify.notifyDealDispute(dBuyer, dSeller, dProd?.title).catch(() => {});
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Ошибка' }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /deals/:id/resolve — admin resolves dispute
// winner: 'buyer' (refund) | 'seller' (complete)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/resolve', adminAuth, async (req, res) => {
  try {
    const { winner, note } = req.body;
    if (!['buyer', 'seller'].includes(winner))
      return res.status(400).json({ error: 'winner должен быть "buyer" или "seller"' });

    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
    if (deal.status !== 'disputed')
      return res.status(400).json({ error: 'Можно решить только спорную сделку' });

    const adminMsg = {
      senderId: req.userId,
      text: `🛡 Администратор решил спор в пользу ${winner === 'buyer' ? 'покупателя' : 'продавца'}${note ? `. ${note}` : ''}`,
      ts: new Date().toISOString(),
      isAdmin: true,
    };
    const messages = [...(deal.messages || []), adminMsg];
    await deal.update({ messages });

    const buyer  = await User.findByPk(deal.buyerId);
    const seller = await User.findByPk(deal.sellerId);
    const product = await Product.findByPk(deal.productId);
    if (winner === 'buyer') {
      await refundDeal(deal);
      notify.notifyDealRefund(buyer, product?.title, deal.amount).catch(() => {});
    } else {
      await completeDeal(deal);
      notify.notifyDealComplete(buyer, seller, product?.title, deal.sellerAmount).catch(() => {});
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Resolve error:', e.message);
    res.status(500).json({ error: 'Ошибка при решении спора' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /deals/:id/message — in-deal chat
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Пустое сообщение' });
    if (text.trim().length > 1000) return res.status(400).json({ error: 'Сообщение слишком длинное' });

    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Не найдено' });
    const isParty = deal.buyerId === req.userId || deal.sellerId === req.userId;
    if (!isParty && !req.user?.isAdmin) return res.status(403).json({ error: 'Нет доступа' });

    const messages = [
      ...(deal.messages || []),
      { senderId: req.userId, text: text.trim(), ts: new Date().toISOString(), isAdmin: req.user?.isAdmin || false },
    ];
    await deal.update({ messages });
    res.json({ success: true, messages });
  } catch { res.status(500).json({ error: 'Ошибка' }); }
});

module.exports = router;
module.exports.completeDeal = completeDeal;
module.exports.refundDeal = refundDeal;
