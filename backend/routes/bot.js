/**
 * Telegram Bot Webhook
 * Обрабатывает /start и другие команды
 * Показывает описание платформы и кнопку открытия Mini App
 */
const express = require('express');
const router  = express.Router();
const https   = require('https');

const TOKEN   = () => process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
const APP_URL = () => process.env.MINI_APP_URL || process.env.FRONTEND_URL || '';
const SUPPORT = process.env.SUPPORT_USERNAME || 'givi_hu';

// ── Send message helper ───────────────────────────────────────────
function sendMessage(chatId, text, extra = {}) {
  const token = TOKEN();
  if (!token || !chatId) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra });
    const req = https.request({
      hostname: 'api.telegram.org',
      path:     `/bot${token}/sendMessage`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (r) => { r.resume(); resolve(); });
    req.on('error', () => resolve());
    req.setTimeout(8000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── Webhook endpoint ──────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // ответить сразу

  try {
    const update = req.body;
    const msg    = update?.message;
    if (!msg) return;

    const chatId = msg.chat?.id;
    const text   = msg.text || '';
    const name   = msg.from?.first_name || 'Пользователь';

    // ── /start ────────────────────────────────────────────────────
    if (text.startsWith('/start')) {
      const appUrl = APP_URL();
      const welcome =
`🎮 <b>Добро пожаловать в GIVIHUB, ${name}!</b>

GIVIHUB — безопасный маркетплейс цифровых товаров и услуг.

<b>Что можно купить:</b>
🕹 <b>Игры и аккаунты</b> — Steam, Epic Games, PlayStation, Xbox
💻 <b>Программы и ПО</b> — лицензионные ключи активации
📱 <b>Аккаунты соцсетей</b> — Instagram, TikTok, YouTube, Telegram
⚡ <b>Услуги и буст</b> — прокачка, рейтинг, задания в игре
💎 <b>Игровая валюта</b> — V-Bucks, Robux, UC и другое

<b>Как это работает:</b>
1️⃣ Найди нужный товар в каталоге
2️⃣ Оплати удобным способом
3️⃣ Получи товар мгновенно

🔒 <b>Все сделки защищены эскроу</b> — деньги замораживаются до подтверждения получения товара.

💳 <b>Способы оплаты:</b> карты РФ, СБП, USDT, TON

📞 <b>Поддержка:</b> @${SUPPORT}`;

      const keyboard = appUrl ? {
        inline_keyboard: [[
          { text: '🛒 Открыть маркетплейс', web_app: { url: appUrl } }
        ], [
          { text: '📞 Поддержка', url: `https://t.me/${SUPPORT}` },
          { text: '📄 Документы', url: `${appUrl}/legal/privacy` },
        ]]
      } : {
        inline_keyboard: [[
          { text: '📞 Поддержка', url: `https://t.me/${SUPPORT}` }
        ]]
      };

      await sendMessage(chatId, welcome, { reply_markup: keyboard });
      return;
    }

    // ── /help ─────────────────────────────────────────────────────
    if (text === '/help' || text === '/support') {
      await sendMessage(chatId,
`❓ <b>Помощь и поддержка</b>

По всем вопросам обращайтесь:
👤 Telegram: @${SUPPORT}
📧 Email: anvarikromov778@gmail.com

⏰ Время работы поддержки: ежедневно 9:00–23:00 МСК

<b>Частые вопросы:</b>
• <b>Как пополнить баланс?</b> — Раздел «Кошелёк» → Пополнить
• <b>Как вывести деньги?</b> — Раздел «Кошелёк» → Вывести
• <b>Как открыть спор?</b> — В активной сделке → «Открыть спор»
• <b>Сколько комиссия?</b> — 5% с каждой продажи`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '💬 Написать поддержке', url: `https://t.me/${SUPPORT}` }
            ]]
          }
        }
      );
      return;
    }

    // ── /docs — документы ─────────────────────────────────────────
    if (text === '/docs') {
      const base = APP_URL();
      await sendMessage(chatId,
`📄 <b>Документы платформы</b>

Все юридические документы GIVIHUB:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔒 Политика конфиденциальности', web_app: base ? { url: `${base}/legal/privacy` } : undefined, url: base ? undefined : `https://t.me/${SUPPORT}` }],
              [{ text: '📋 Договор оферты', web_app: base ? { url: `${base}/legal/offer` } : undefined, url: base ? undefined : `https://t.me/${SUPPORT}` }],
              [{ text: '↩️ Условия возврата', web_app: base ? { url: `${base}/legal/refund` } : undefined, url: base ? undefined : `https://t.me/${SUPPORT}` }],
            ]
          }
        }
      );
      return;
    }

    // ── callback_query — кнопка "Документы" ─────────────────────────
    if (update?.callback_query?.data === 'docs') {
      const cbChatId = update.callback_query.message?.chat?.id;
      const base = APP_URL();
      if (cbChatId) {
        await sendMessage(cbChatId,
`📄 <b>Документы GIVIHUB</b>\n\n🔗 ${base}/legal/privacy — Политика конфиденциальности\n🔗 ${base}/legal/offer — Договор оферты\n🔗 ${base}/legal/refund — Условия возврата`
        );
      }
      // Answer callback to remove loading
      const cbToken = TOKEN();
      if (cbToken) {
        const body = JSON.stringify({ callback_query_id: update.callback_query.id });
        const req = https.request({
          hostname: 'api.telegram.org',
          path: `/bot${cbToken}/answerCallbackQuery`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, r => { r.resume(); });
        req.on('error', () => {});
        req.write(body); req.end();
      }
      return;
    }

  } catch (e) {
    console.error('Bot webhook error:', e.message);
  }
});

// ── Register webhook ──────────────────────────────────────────────
router.get('/set-webhook', async (req, res) => {
  const token   = TOKEN();
  const appUrl  = APP_URL();
  if (!token) return res.status(500).json({ error: 'BOT_TOKEN not set' });
  if (!appUrl) return res.status(500).json({ error: 'MINI_APP_URL not set' });

  const webhookUrl = `${appUrl}/api/bot/webhook`;
  const body = JSON.stringify({ url: webhookUrl, allowed_updates: ['message','callback_query'] });

  const result = await new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path:     `/bot${token}/setWebhook`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.write(body); req.end();
  });

  res.json({ webhookUrl, result });
});

// ── Get webhook info ──────────────────────────────────────────────
router.get('/webhook-info', async (req, res) => {
  const token = TOKEN();
  if (!token) return res.status(500).json({ error: 'BOT_TOKEN not set' });
  const result = await new Promise((resolve) => {
    https.get(`https://api.telegram.org/bot${token}/getWebhookInfo`, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    }).on('error', e => resolve({ error: e.message }));
  });
  res.json(result);
});

module.exports = router;
