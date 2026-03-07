const express = require('express');
const router = express.Router();
const https = require('https');
const { User, Transaction } = require('../models/index');
const { auth } = require('../middleware/auth');

const CRYPTO_TOKEN = process.env.CRYPTO_BOT_TOKEN;

function cryptoBot(method, body = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'pay.crypt.bot',
      path: `/api/${method}`,
      method: 'POST',
      headers: {
        'Crypto-Pay-API-Token': CRYPTO_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Create deposit
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, currency = 'USDT' } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return res.status(400).json({ error: 'Minimum deposit is $1' });

    let payUrl = null, invoiceId = null;

    if (CRYPTO_TOKEN) {
      const inv = await cryptoBot('createInvoice', {
        asset: currency,
        amount: amt.toFixed(2),
        description: `Market deposit — ${req.user.username || req.user.firstName || 'User'}`,
        payload: JSON.stringify({ userId: req.userId, type: 'deposit' }),
        allow_comments: false,
        allow_anonymous: false,
        expires_in: 3600
      });
      if (inv.ok) {
        payUrl = inv.result.bot_invoice_url;
        invoiceId = String(inv.result.invoice_id);
      }
    }

    const tx = await Transaction.create({
      userId: req.userId, type: 'deposit', amount: amt,
      currency, status: CRYPTO_TOKEN ? 'pending' : 'completed',
      description: 'Deposit via CryptoBot',
      cryptoBotInvoiceId: invoiceId, cryptoBotPayUrl: payUrl,
      balanceBefore: parseFloat(req.user.balance)
    });

    // Dev mode without CryptoBot — credit immediately
    if (!CRYPTO_TOKEN) {
      const user = await User.findByPk(req.userId);
      const newBal = parseFloat(user.balance) + amt;
      await user.update({ balance: newBal, totalDeposited: parseFloat(user.totalDeposited) + amt });
      await tx.update({ balanceAfter: newBal });
      return res.json({ success: true, balance: newBal, tx, devMode: true });
    }

    res.json({ success: true, payUrl, invoiceId, tx });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed to create invoice' }); }
});

// CryptoBot webhook
router.post('/webhook/cryptobot', async (req, res) => {
  try {
    const { update_type, payload } = req.body;
    if (update_type !== 'invoice_paid') return res.json({ ok: true });
    const invoiceId = String(payload.invoice_id);
    const tx = await Transaction.findOne({ where: { cryptoBotInvoiceId: invoiceId } });
    if (!tx || tx.status === 'completed') return res.json({ ok: true });
    const user = await User.findByPk(tx.userId);
    const amt = parseFloat(tx.amount);
    const newBal = parseFloat(user.balance) + amt;
    await user.update({ balance: newBal, totalDeposited: parseFloat(user.totalDeposited) + amt });
    await tx.update({ status: 'completed', balanceAfter: newBal });
    res.json({ ok: true });
  } catch (e) { console.error(e.message); res.json({ ok: true }); }
});

// Withdraw
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, currency = 'USDT' } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt < 5) return res.status(400).json({ error: 'Minimum withdrawal is $5' });
    const user = await User.findByPk(req.userId);
    if (parseFloat(user.balance) < amt) return res.status(400).json({ error: 'Insufficient balance' });

    const prevBal = parseFloat(user.balance);
    const newBal = prevBal - amt;
    await user.update({ balance: newBal, totalWithdrawn: parseFloat(user.totalWithdrawn) + amt });

    const tx = await Transaction.create({
      userId: req.userId, type: 'withdrawal', amount: -amt,
      currency, status: 'completed',
      description: `Withdrawal via CryptoBot`,
      balanceBefore: prevBal, balanceAfter: newBal
    });
    res.json({ success: true, balance: newBal, tx });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Withdrawal failed' }); }
});

// Transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const { type, page=1, limit=30 } = req.query;
    const where = { userId: req.userId };
    if (type && type !== 'all') where.type = type;
    const { rows: transactions, count: total } = await Transaction.findAndCountAll({
      where, order: [['createdAt','DESC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit)
    });
    res.json({ transactions, total });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Balance
router.get('/balance', auth, async (req, res) => {
  try {
    const u = await User.findByPk(req.userId);
    res.json({
      balance: parseFloat(u.balance)||0,
      frozenBalance: parseFloat(u.frozenBalance)||0,
      totalDeposited: parseFloat(u.totalDeposited)||0,
      totalWithdrawn: parseFloat(u.totalWithdrawn)||0
    });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
