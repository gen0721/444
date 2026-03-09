const express = require('express');
const notify  = require('../utils/notify');
const router  = express.Router();
const https   = require('https');
const crypto  = require('crypto');
const { User, Transaction } = require('../models/index');
const { auth, verifyCryptoBotWebhook } = require('../middleware/auth');
const sequelize = require('../db');

const CRYPTO_TOKEN = process.env.CRYPTO_BOT_TOKEN || process.env.CRYPTOBOT_TOKEN;

function cryptoBot(method, body = {}) {
  return new Promise((resolve, reject) => {
    const data    = JSON.stringify(body);
    const options = {
      hostname: 'pay.crypt.bot',
      path:     `/api/${method}`,
      method:   'POST',
      headers: {
        'Crypto-Pay-API-Token': CRYPTO_TOKEN,
        'Content-Type':         'application/json',
        'Content-Length':       Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', c  => buf += c);
      res.on('end',  () => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve({ ok: false, error: { code: 0, name: 'ParseError' } }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Helper — insert transaction via raw SQL to avoid ENUM issues
async function insertTx({ userId, type, amount, currency = 'USDT', status = 'pending', description = '', invoiceId = null, payUrl = null, transferId = null, balanceBefore = null, balanceAfter = null, dealId = null }, dbTx) {
  const id = crypto.randomUUID();
  await sequelize.query(
    `INSERT INTO "Transactions"
       (id, "userId", type, amount, currency, status, description,
        "cryptoBotInvoiceId", "cryptoBotPayUrl", "cryptoBotTransferId",
        "balanceBefore", "balanceAfter", "dealId", "createdAt", "updatedAt")
     VALUES
       (:id, :userId, :type, :amount, :currency, :status, :description,
        :invoiceId, :payUrl, :transferId,
        :balanceBefore, :balanceAfter, :dealId, NOW(), NOW())`,
    {
      replacements: { id, userId, type, amount, currency, status, description, invoiceId, payUrl, transferId, balanceBefore, balanceAfter, dealId },
      transaction: dbTx,
    }
  );
  return id;
}

const ASSET_MAP = { USDT: 'USDT', BTC: 'BTC', TON: 'TON', ETH: 'ETH', USDC: 'USDC' };
const MIN_WITHDRAW = 2;

// ─── POST /deposit ────────────────────────────────────────────────────────────
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, currency = 'USDT' } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return res.status(400).json({ error: 'Минимальный депозит — $1' });

    const asset = ASSET_MAP[currency] || 'USDT';
    let payUrl = null, invoiceId = null;

    if (CRYPTO_TOKEN) {
      const inv = await cryptoBot('createInvoice', {
        asset,
        amount:          String(amt.toFixed(2)),
        description:     `GIVIHUB пополнение — ${req.user.username || req.user.firstName || 'User'}`,
        payload:         JSON.stringify({ userId: req.userId, type: 'deposit' }),
        allow_comments:  false,
        allow_anonymous: false,
        expires_in:      3600,
      });
      if (inv.ok) {
        payUrl    = inv.result.bot_invoice_url;
        invoiceId = String(inv.result.invoice_id);
      } else {
        console.error('CryptoBot createInvoice error:', inv.error);
        return res.status(500).json({ error: 'Не удалось создать счёт: ' + (inv.error?.name || 'Unknown') });
      }
    }

    const txId = await insertTx({
      userId:       req.userId,
      type:         'deposit',
      amount:       amt,
      currency:     asset,
      status:       CRYPTO_TOKEN ? 'pending' : 'completed',
      description:  'Deposit via CryptoBot',
      invoiceId,
      payUrl,
      balanceBefore: parseFloat(req.user.balance),
    });

    if (!CRYPTO_TOKEN) {
      // Dev mode — credit immediately
      const t = await sequelize.transaction();
      try {
        const user   = await User.findByPk(req.userId, { transaction: t, lock: true });
        const newBal = parseFloat(user.balance) + amt;
        await user.update({ balance: newBal, totalDeposited: parseFloat(user.totalDeposited || 0) + amt }, { transaction: t });
        await sequelize.query(
          `UPDATE "Transactions" SET status='completed', "balanceAfter"=:after, "updatedAt"=NOW() WHERE id=:id`,
          { replacements: { after: newBal, id: txId }, transaction: t }
        );
        await t.commit();
        notify.notifyDeposit(user, amt, asset).catch(() => {});
        return res.json({ success: true, balance: newBal, txId, devMode: true });
      } catch (e) { await t.rollback(); throw e; }
    }

    res.json({ success: true, payUrl, invoiceId, txId });
  } catch (e) {
    console.error('Deposit error:', e.message);
    res.status(500).json({ error: 'Не удалось создать депозит: ' + e.message });
  }
});

// ─── POST /webhook/cryptobot ──────────────────────────────────────────────────
router.post('/webhook/cryptobot', async (req, res) => {
  try {
    if (!verifyCryptoBotWebhook(req)) {
      console.warn('CryptoBot webhook: invalid signature');
      return res.status(401).json({ ok: false });
    }

    const { update_type, payload } = req.body;
    if (update_type !== 'invoice_paid') return res.json({ ok: true });

    const invoiceId = String(payload.invoice_id);
    const tx        = await Transaction.findOne({ where: { cryptoBotInvoiceId: invoiceId } });
    if (!tx || tx.status === 'completed') return res.json({ ok: true });

    const dbTx = await sequelize.transaction();
    try {
      const user   = await User.findByPk(tx.userId, { transaction: dbTx, lock: true });
      const amt    = parseFloat(tx.amount);
      const newBal = parseFloat(user.balance) + amt;
      await user.update({ balance: newBal, totalDeposited: parseFloat(user.totalDeposited || 0) + amt }, { transaction: dbTx });
      await tx.update({ status: 'completed', balanceAfter: newBal }, { transaction: dbTx });
      await dbTx.commit();
      notify.notifyDeposit(user, amt, tx.currency).catch(() => {});
    } catch (e) { await dbTx.rollback(); throw e; }

    res.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e.message);
    res.json({ ok: true });
  }
});

// ─── POST /withdraw ───────────────────────────────────────────────────────────
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, currency = 'USDT', address } = req.body;
    const amt = parseFloat(amount);
    console.log(`Withdraw request: userId=${req.userId} amount=${amt} currency=${currency} address=${address} userTgId=${req.user?.telegramId}`);
    if (!amt || amt < MIN_WITHDRAW)
      return res.status(400).json({ error: `Минимальный вывод — $${MIN_WITHDRAW}` });

    const asset   = ASSET_MAP[currency] || 'USDT';
    const spendId = `withdraw_${req.userId}_${Date.now()}`;

    const recipientTgId = address
      ? parseInt(address, 10)
      : req.user.telegramId ? parseInt(req.user.telegramId, 10) : null;

    if (!recipientTgId || isNaN(recipientTgId))
      return res.status(400).json({ error: 'Не найден Telegram ID. Войдите через Telegram или укажите Telegram ID.' });

    // Atomic balance deduct
    const dbTx = await sequelize.transaction();
    let txId, prevBal, newBal;
    try {
      const user = await User.findByPk(req.userId, { transaction: dbTx, lock: true });
      prevBal    = parseFloat(user.balance);
      if (prevBal < amt) { await dbTx.rollback(); return res.status(400).json({ error: 'Недостаточно средств' }); }
      newBal = prevBal - amt;
      await user.update({ balance: newBal, totalWithdrawn: parseFloat(user.totalWithdrawn || 0) + amt }, { transaction: dbTx });
      txId = await insertTx({
        userId:        req.userId,
        type:          'withdrawal',
        amount:        -amt,
        currency:      asset,
        status:        'pending',
        description:   `Вывод ${amt} ${asset} на TG ID ${recipientTgId}`,
        balanceBefore: prevBal,
        balanceAfter:  newBal,
      }, dbTx);
      await dbTx.commit();
    } catch (e) { await dbTx.rollback(); throw e; }

    if (CRYPTO_TOKEN) {
      try {
        const transfer = await cryptoBot('transfer', {
          user_id:  recipientTgId,
          asset,
          amount:   String(amt.toFixed(2)),
          spend_id: spendId,
          comment:  `GIVIHUB вывод ${amt} ${asset}`,
          disable_send_notification: false,
        });

        if (transfer.ok) {
          await sequelize.query(
            `UPDATE "Transactions" SET status='completed', "cryptoBotTransferId"=:tid, "updatedAt"=NOW() WHERE id=:id`,
            { replacements: { tid: String(transfer.result?.transfer_id || ''), id: txId } }
          );
          notify.notifyWithdraw(req.user, amt, asset).catch(() => {});
          return res.json({ success: true, balance: newBal, transferId: transfer.result?.transfer_id, message: `✅ ${amt} ${asset} отправлено на ваш Telegram` });
        } else {
          // Rollback balance
          const rollbackTx = await sequelize.transaction();
          try {
            const u = await User.findByPk(req.userId, { transaction: rollbackTx, lock: true });
            await u.update({ balance: parseFloat(u.balance) + amt, totalWithdrawn: Math.max(0, parseFloat(u.totalWithdrawn || 0) - amt) }, { transaction: rollbackTx });
            await sequelize.query(`UPDATE "Transactions" SET status='failed', "balanceAfter"=:prev, "updatedAt"=NOW() WHERE id=:id`, { replacements: { prev: prevBal, id: txId }, transaction: rollbackTx });
            await rollbackTx.commit();
          } catch { await rollbackTx.rollback(); }

          const errName = transfer.error?.name || '';
          const errCode = transfer.error?.code;
          console.error('CryptoBot transfer failed:', JSON.stringify(transfer.error));
          let msg = `Ошибка CryptoBot: ${errName || errCode || 'Unknown'}`;
          if (errName.includes('INSUFFICIENT_FUNDS'))
            msg = 'Недостаточно средств на балансе CryptoBot приложения';
          else if (errName.includes('USER_NOT_FOUND') || errCode === 400)
            msg = 'Пользователь не найден в CryptoBot — откройте @CryptoBot и нажмите /start';
          else if (errName.includes('NOT_ENOUGH_COINS'))
            msg = 'Недостаточно монет на балансе CryptoBot приложения';
          else if (errName.includes('DUPLICATE_SPEND_ID'))
            msg = 'Дублирующий запрос — подождите минуту и попробуйте снова';
          else if (errName.includes('FORBIDDEN') || errCode === 403)
            msg = 'CryptoBot: нет доступа к переводу. Проверьте настройки бота';
          return res.status(400).json({ error: msg });
        }
      } catch (transferErr) {
        const rollbackTx = await sequelize.transaction();
        try {
          const u = await User.findByPk(req.userId, { transaction: rollbackTx, lock: true });
          await u.update({ balance: parseFloat(u.balance) + amt, totalWithdrawn: Math.max(0, parseFloat(u.totalWithdrawn || 0) - amt) }, { transaction: rollbackTx });
          await sequelize.query(`UPDATE "Transactions" SET status='failed', "updatedAt"=NOW() WHERE id=:id`, { replacements: { id: txId }, transaction: rollbackTx });
          await rollbackTx.commit();
        } catch { await rollbackTx.rollback(); }
        return res.status(500).json({ error: 'Ошибка соединения с CryptoBot. Попробуйте позже.' });
      }
    } else {
      await sequelize.query(`UPDATE "Transactions" SET status='completed', "updatedAt"=NOW() WHERE id=:id`, { replacements: { id: txId } });
      notify.notifyWithdraw(req.user, amt, asset).catch(() => {});
      return res.json({ success: true, balance: newBal, message: `[DEV] ${amt} ${asset} отправлено`, devMode: true });
    }
  } catch (e) {
    console.error('Withdraw error:', e.message);
    res.status(500).json({ error: 'Ошибка вывода средств: ' + e.message });
  }
});

// ─── GET /transactions ────────────────────────────────────────────────────────
router.get('/transactions', auth, async (req, res) => {
  try {
    const { type, page = 1, limit = 30 } = req.query;
    const where = { userId: req.userId };
    if (type && type !== 'all') where.type = type;
    const { rows: transactions, count: total } = await Transaction.findAndCountAll({
      where, order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ transactions, total });
  } catch (e) { res.status(500).json({ error: 'Не удалось загрузить транзакции' }); }
});

// ─── GET /balance ─────────────────────────────────────────────────────────────
router.get('/balance', auth, async (req, res) => {
  try {
    const u = await User.findByPk(req.userId);
    res.json({
      balance:        parseFloat(u.balance)        || 0,
      frozenBalance:  parseFloat(u.frozenBalance)  || 0,
      totalDeposited: parseFloat(u.totalDeposited) || 0,
      totalWithdrawn: parseFloat(u.totalWithdrawn) || 0,
    });
  } catch { res.status(500).json({ error: 'Не удалось загрузить баланс' }); }
});

// ─── POST /deposit/lava — create Lava invoice ─────────────────────────────────
router.post('/deposit/lava', auth, async (req, res) => {
  try {
    const lava = require('../utils/lava');
    if (!lava.isConfigured()) return res.status(400).json({ error: 'Lava не подключён' });

    const { amount } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return res.status(400).json({ error: 'Минимальный депозит — $1' });

    // Convert USD → RUB (approximate, Lava works in RUB)
    // Fetch live rate or use fixed fallback
    let rubAmt;
    try {
      const rateRes = await new Promise((resolve, reject) => {
        const r = require('https').get('https://api.exchangerate-api.com/v4/latest/USD', res => {
          let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch { reject(new Error('parse')); } });
        });
        r.on('error', reject);
      });
      const usdRub = rateRes.rates?.RUB || 90;
      rubAmt = Math.ceil(amt * usdRub);
    } catch {
      rubAmt = Math.ceil(amt * 90); // fallback rate
    }

    const orderId  = `lava_${req.userId}_${Date.now()}`;
    const baseUrl  = `https://${req.get('host')}`;
    const hookUrl  = `${baseUrl}/api/wallet/webhook/lava`;
    const successUrl = `${baseUrl}/`;

    const result = await lava.createInvoice({
      amount:     rubAmt,
      orderId,
      comment:    `GIVIHUB пополнение $${amt}`,
      hookUrl,
      successUrl,
    });

    if (!result.ok) {
      console.error('Lava createInvoice error:', result.error);
      return res.status(500).json({ error: 'Ошибка Lava: ' + result.error });
    }

    // Save pending transaction
    const txId = await insertTx({
      userId:      req.userId,
      type:        'deposit',
      amount:      amt,
      currency:    'RUB',
      status:      'pending',
      description: `Lava депозит ${rubAmt}₽ (orderId: ${orderId})`,
      invoiceId:   orderId,
      balanceBefore: parseFloat(req.user.balance),
    });

    res.json({ ok: true, payUrl: result.payUrl, invoiceId: result.invoiceId, orderId, txId });
  } catch (e) {
    console.error('Lava deposit error:', e.message);
    res.status(500).json({ error: 'Ошибка при создании платежа: ' + e.message });
  }
});

// ─── POST /webhook/lava — Lava payment callback ───────────────────────────────
router.post('/webhook/lava', async (req, res) => {
  try {
    const lava      = require('../utils/lava');
    const signature = req.headers['signature'] || req.headers['x-signature'] || '';

    if (!lava.verifyWebhook(req.body, signature)) {
      console.warn('Lava webhook: invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { status, order_id, amount } = req.body;
    console.log('Lava webhook:', status, order_id);

    if (status !== 'success') return res.json({ ok: true });

    // Find transaction by orderId stored in cryptoBotInvoiceId field
    const tx = await Transaction.findOne({ where: { cryptoBotInvoiceId: order_id } });
    if (!tx || tx.status === 'completed') return res.json({ ok: true });

    // Credit user balance
    const dbTx = await sequelize.transaction();
    try {
      const user   = await User.findByPk(tx.userId, { transaction: dbTx, lock: true });
      const amt    = parseFloat(tx.amount);
      const newBal = parseFloat(user.balance) + amt;
      await user.update({
        balance:        newBal,
        totalDeposited: parseFloat(user.totalDeposited || 0) + amt,
      }, { transaction: dbTx });
      await tx.update({ status: 'completed', balanceAfter: newBal }, { transaction: dbTx });
      await dbTx.commit();
      console.log(`✅ Lava payment credited: userId=${tx.userId} amount=${amt}`);

      const notify = require('../utils/notify');
      notify.notifyDeposit(user, amt, 'RUB').catch(() => {});
    } catch (e) { await dbTx.rollback(); throw e; }

    res.json({ ok: true });
  } catch (e) {
    console.error('Lava webhook error:', e.message);
    res.json({ ok: true }); // always 200 to Lava
  }
});

module.exports = router;
