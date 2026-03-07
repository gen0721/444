const express = require('express');
const router  = express.Router();
const https   = require('https');
const { User, Transaction } = require('../models/index');
const { auth } = require('../middleware/auth');

// ─── CryptoBot API helper ────────────────────────────────────────────────────
// Docs: https://help.crypt.bot/crypto-pay-api
const CRYPTO_TOKEN = process.env.CRYPTO_BOT_TOKEN || process.env.CRYPTOBOT_TOKEN;

function cryptoBot(method, body = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
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

// ─── Currency to CryptoBot asset map ─────────────────────────────────────────
// CryptoBot supports: USDT, TON, BTC, ETH, LTC, BNB, TRX, USDC
const ASSET_MAP = {
  USDT: 'USDT',
  BTC:  'BTC',
  TON:  'TON',
  ETH:  'ETH',
  USDC: 'USDC',
};

// ─── Minimum withdrawals (in USD equivalent) ─────────────────────────────────
const MIN_WITHDRAW = 2; // $2 minimum

// ─── POST /deposit — create invoice ──────────────────────────────────────────
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
        amount:            String(amt.toFixed(2)),
        description:       `GIVIHUB пополнение — ${req.user.username || req.user.firstName || 'User'}`,
        payload:           JSON.stringify({ userId: req.userId, type: 'deposit' }),
        allow_comments:    false,
        allow_anonymous:   false,
        expires_in:        3600,
      });

      if (inv.ok) {
        payUrl    = inv.result.bot_invoice_url;
        invoiceId = String(inv.result.invoice_id);
      } else {
        console.error('CryptoBot createInvoice error:', inv.error);
        return res.status(500).json({ error: 'Не удалось создать счёт в CryptoBot: ' + (inv.error?.name || 'Unknown') });
      }
    }

    const tx = await Transaction.create({
      userId:              req.userId,
      type:                'deposit',
      amount:              amt,
      currency:            asset,
      status:              CRYPTO_TOKEN ? 'pending' : 'completed',
      description:         'Deposit via CryptoBot',
      cryptoBotInvoiceId:  invoiceId,
      cryptoBotPayUrl:     payUrl,
      balanceBefore:       parseFloat(req.user.balance),
    });

    // Dev mode — credit immediately without CryptoBot
    if (!CRYPTO_TOKEN) {
      const user   = await User.findByPk(req.userId);
      const newBal = parseFloat(user.balance) + amt;
      await user.update({ balance: newBal, totalDeposited: parseFloat(user.totalDeposited) + amt });
      await tx.update({ status: 'completed', balanceAfter: newBal });
      return res.json({ success: true, balance: newBal, tx, devMode: true });
    }

    res.json({ success: true, payUrl, invoiceId, tx });
  } catch (e) {
    console.error('Deposit error:', e.message);
    res.status(500).json({ error: 'Не удалось создать депозит' });
  }
});

// ─── POST /webhook/cryptobot — CryptoBot payment callback ────────────────────
router.post('/webhook/cryptobot', async (req, res) => {
  try {
    const { update_type, payload } = req.body;
    if (update_type !== 'invoice_paid') return res.json({ ok: true });

    const invoiceId = String(payload.invoice_id);
    const tx        = await Transaction.findOne({ where: { cryptoBotInvoiceId: invoiceId } });
    if (!tx || tx.status === 'completed') return res.json({ ok: true });

    const user   = await User.findByPk(tx.userId);
    const amt    = parseFloat(tx.amount);
    const newBal = parseFloat(user.balance) + amt;

    await user.update({
      balance:        newBal,
      totalDeposited: parseFloat(user.totalDeposited) + amt,
    });
    await tx.update({ status: 'completed', balanceAfter: newBal });

    res.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e.message);
    res.json({ ok: true });
  }
});

// ─── POST /withdraw — АВТОМАТИЧЕСКИЙ вывод через CryptoBot transfer ──────────
// CryptoBot API: POST /transfer
// Требования:
//   - spend_id: уникальный ID транзакции (для идемпотентности)
//   - user_id:  Telegram ID получателя (НЕ username, именно числовой ID)
//   - asset:    валюта (USDT, TON, BTC...)
//   - amount:   сумма
//   - comment:  комментарий (отобразится пользователю в боте)
//
// ВАЖНО: пользователь должен сначала запустить @CryptoBot (/start)
// и разрешить получение платежей от приложений.

router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, currency = 'USDT', address } = req.body;
    // address здесь = Telegram ID пользователя (число)
    // Фронтенд должен передавать telegramId пользователя

    const amt = parseFloat(amount);
    if (!amt || amt < MIN_WITHDRAW) {
      return res.status(400).json({ error: `Минимальный вывод — $${MIN_WITHDRAW}` });
    }

    const user = await User.findByPk(req.userId);
    if (parseFloat(user.balance) < amt) {
      return res.status(400).json({ error: 'Недостаточно средств' });
    }

    const asset    = ASSET_MAP[currency] || 'USDT';
    const prevBal  = parseFloat(user.balance);
    const newBal   = prevBal - amt;
    const spendId  = `withdraw_${req.userId}_${Date.now()}`; // уникальный ID

    // Определяем telegramId получателя
    // Если передан address — используем его, иначе берём из профиля
    const recipientTgId = address
      ? parseInt(address, 10)
      : user.telegramId
        ? parseInt(user.telegramId, 10)
        : null;

    if (!recipientTgId || isNaN(recipientTgId)) {
      return res.status(400).json({
        error: 'Не найден Telegram ID. Войдите через Telegram или укажите Telegram ID получателя.',
      });
    }

    // Сначала списываем с баланса (чтобы не было двойного вывода)
    await user.update({
      balance:        newBal,
      totalWithdrawn: parseFloat(user.totalWithdrawn) + amt,
    });

    // Создаём транзакцию со статусом pending
    const tx = await Transaction.create({
      userId:       req.userId,
      type:         'withdrawal',
      amount:       -amt,
      currency:     asset,
      status:       'pending',
      description:  `Вывод ${amt} ${asset} на Telegram ID ${recipientTgId}`,
      balanceBefore: prevBal,
      balanceAfter:  newBal,
    });

    // ── Автоматический перевод через CryptoBot ──
    if (CRYPTO_TOKEN) {
      try {
        const transfer = await cryptoBot('transfer', {
          user_id:  recipientTgId,   // Telegram User ID получателя
          asset,                      // валюта: USDT, TON, BTC...
          amount:   String(amt.toFixed(2)),   // сумма
          spend_id: spendId,          // уникальный ID для идемпотентности
          comment:  `GIVIHUB вывод ${amt} ${asset}`,  // увидит пользователь в боте
          disable_send_notification: false,  // отправить уведомление в Telegram
        });

        if (transfer.ok) {
          // Успешно — обновляем транзакцию
          await tx.update({
            status:            'completed',
            cryptoBotTransferId: String(transfer.result?.transfer_id || ''),
          });

          return res.json({
            success:    true,
            balance:    newBal,
            transferId: transfer.result?.transfer_id,
            message:    `✅ ${amt} ${asset} отправлено на ваш Telegram`,
            tx,
          });
        } else {
          // CryptoBot вернул ошибку — возвращаем деньги
          console.error('CryptoBot transfer error:', transfer.error);

          await user.update({
            balance:        prevBal,  // вернуть баланс
            totalWithdrawn: parseFloat(user.totalWithdrawn) - amt,
          });
          await tx.update({ status: 'failed', balanceAfter: prevBal });

          // Понятные сообщения об ошибках CryptoBot
          const errCode = transfer.error?.code;
          const errName = transfer.error?.name || '';

          let userMessage = 'Не удалось выполнить перевод через CryptoBot';
          if (errCode === 400 || errName.includes('USER_NOT_FOUND')) {
            userMessage = 'Пользователь не найден в CryptoBot. Откройте @CryptoBot и нажмите /start';
          } else if (errName.includes('NOT_ENOUGH_COINS')) {
            userMessage = 'Недостаточно средств на счёте CryptoBot (системная ошибка)';
          } else if (errName.includes('DUPLICATE_SPEND_ID')) {
            userMessage = 'Дублирующий запрос. Попробуйте позже';
          }

          return res.status(400).json({ error: userMessage });
        }
      } catch (transferErr) {
        // Сетевая ошибка — возвращаем деньги
        console.error('CryptoBot transfer network error:', transferErr.message);

        await user.update({
          balance:        prevBal,
          totalWithdrawn: parseFloat(user.totalWithdrawn) - amt,
        });
        await tx.update({ status: 'failed', balanceAfter: prevBal });

        return res.status(500).json({ error: 'Ошибка соединения с CryptoBot. Попробуйте позже.' });
      }
    } else {
      // Dev mode без CryptoBot — просто списываем (имитация)
      await tx.update({ status: 'completed' });
      return res.json({
        success: true,
        balance: newBal,
        message: `[DEV MODE] ${amt} ${asset} отправлено (CryptoBot не настроен)`,
        tx,
        devMode: true,
      });
    }

  } catch (e) {
    console.error('Withdraw error:', e.message);
    res.status(500).json({ error: 'Ошибка вывода средств' });
  }
});

// ─── GET /transactions ────────────────────────────────────────────────────────
router.get('/transactions', auth, async (req, res) => {
  try {
    const { type, page = 1, limit = 30 } = req.query;
    const where = { userId: req.userId };
    if (type && type !== 'all') where.type = type;

    const { rows: transactions, count: total } = await Transaction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({ transactions, total });
  } catch {
    res.status(500).json({ error: 'Не удалось загрузить транзакции' });
  }
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
  } catch {
    res.status(500).json({ error: 'Не удалось загрузить баланс' });
  }
});

module.exports = router;
