/**
 * Telegram Bot notifications utility
 * Sends messages to users via bot when key events happen
 */
const https = require('https');

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';

function sendTg(chatId, text) {
  const token = BOT_TOKEN();
  if (!token || !chatId) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const opts = {
      hostname: 'api.telegram.org',
      path:     `/bot${token}/sendMessage`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(opts, (r) => { r.resume(); resolve(); });
    req.on('error', () => resolve());
    req.setTimeout(5000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function name(user) {
  return user?.firstName || user?.username || `ID:${user?.telegramId || '?'}`;
}

function banExpiry(bannedUntil) {
  if (!bannedUntil) return 'навсегда';
  return `до ${new Date(bannedUntil).toLocaleString('ru', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}`;
}

// ── Notifications ─────────────────────────────────────────────────────────────

async function notifyBanned(user, bannedUntil, reason) {
  const exp = banExpiry(bannedUntil);
  const msg = bannedUntil
    ? `🚫 <b>Ваш аккаунт заблокирован</b>\n\nСрок: <b>${exp}</b>${reason ? `\nПричина: ${reason}` : ''}\n\nПосле окончания срока доступ будет восстановлен.`
    : `🚫 <b>Ваш аккаунт заблокирован навсегда</b>${reason ? `\nПричина: ${reason}` : ''}\n\nОбратитесь в поддержку если считаете это ошибкой.`;
  await sendTg(user.telegramId, msg);
}

async function notifyUnbanned(user) {
  await sendTg(user.telegramId, `✅ <b>Ваш аккаунт разблокирован</b>\n\nДобро пожаловать обратно!`);
}

async function notifyDeposit(user, amount, currency) {
  await sendTg(user.telegramId, `💰 <b>Пополнение баланса</b>\n\nЗачислено: <b>+$${parseFloat(amount).toFixed(2)} ${currency || 'USDT'}</b>\nТекущий баланс: $${parseFloat(user.balance || 0).toFixed(2)}`);
}

async function notifyWithdraw(user, amount, currency) {
  await sendTg(user.telegramId, `📤 <b>Вывод средств</b>\n\nСписано: <b>-$${parseFloat(amount).toFixed(2)} ${currency || 'USDT'}</b>\nДеньги отправлены в @CryptoBot`);
}

async function notifyPurchase(buyer, seller, productTitle, amount) {
  await Promise.all([
    sendTg(buyer.telegramId,  `🛒 <b>Покупка оформлена</b>\n\nТовар: ${productTitle}\nСумма: $${parseFloat(amount).toFixed(2)}\n\nОжидайте передачи товара от продавца.`),
    sendTg(seller.telegramId, `📦 <b>Новая продажа!</b>\n\nТовар: ${productTitle}\nСумма: $${parseFloat(amount).toFixed(2)}\nПокупатель: ${name(buyer)}\n\nПередайте товар покупателю в сделке.`),
  ]);
}

async function notifyDealComplete(buyer, seller, productTitle, sellerAmount) {
  await Promise.all([
    sendTg(buyer.telegramId,  `✅ <b>Сделка завершена</b>\n\nТовар: ${productTitle}\nСделка успешно закрыта.`),
    sendTg(seller.telegramId, `✅ <b>Деньги зачислены</b>\n\nТовар: ${productTitle}\nЗачислено: <b>+$${parseFloat(sellerAmount).toFixed(2)}</b> (после комиссии 5%)`),
  ]);
}

async function notifyDealRefund(buyer, productTitle, amount) {
  await sendTg(buyer.telegramId, `↩️ <b>Возврат средств</b>\n\nТовар: ${productTitle}\nВозвращено: <b>+$${parseFloat(amount).toFixed(2)}</b>`);
}

async function notifyDealDispute(buyer, seller, productTitle) {
  await Promise.all([
    sendTg(buyer.telegramId,  `⚠️ <b>Спор открыт</b>\n\nТовар: ${productTitle}\nАдмин рассмотрит спор и вынесет решение.`),
    sendTg(seller.telegramId, `⚠️ <b>Покупатель открыл спор</b>\n\nТовар: ${productTitle}\nАдмин рассмотрит спор и вынесет решение.`),
  ]);
}

async function notifySubAdminAdded(user) {
  await sendTg(user.telegramId, `👑 <b>Вы назначены субадмином</b>\n\nУ вас теперь есть расширенные права модератора.`);
}

async function notifySubAdminRemoved(user) {
  await sendTg(user.telegramId, `ℹ️ <b>Права субадмина сняты</b>\n\nВаши права модератора были отозваны.`);
}

async function notifyBalanceAdjust(user, amount, reason) {
  const sign = amount >= 0 ? '+' : '';
  await sendTg(user.telegramId, `⚡ <b>Корректировка баланса</b>\n\n${sign}$${parseFloat(amount).toFixed(2)}\nПричина: ${reason || 'Admin adjustment'}`);
}

async function notifyChatClosed(user, chatName) {
  await sendTg(user.telegramId, `🔒 <b>Чат закрыт администратором</b>\n\nЧат «${chatName}» был закрыт.`);
}

module.exports = {
  sendTg,
  notifyBanned,
  notifyUnbanned,
  notifyDeposit,
  notifyWithdraw,
  notifyPurchase,
  notifyDealComplete,
  notifyDealRefund,
  notifyDealDispute,
  notifySubAdminAdded,
  notifySubAdminRemoved,
  notifyBalanceAdjust,
  notifyChatClosed,
};
