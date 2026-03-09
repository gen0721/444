const { Op } = require('sequelize');

let _models = null;

function getCompleteDeal() {
  return require('./routes/deals').completeDeal;
}

// ── Auto-complete deals ───────────────────────────────────────────────────────
async function runAutoComplete() {
  try {
    const completeDeal = getCompleteDeal();
    const overdue = await _models.Deal.findAll({
      where: { status: 'frozen', autoCompleteAt: { [Op.lte]: new Date() } },
    });
    for (const deal of overdue) {
      try { await completeDeal(deal); console.log(`⏰ Auto-completed deal ${deal.id}`); }
      catch (e) { console.error(`⚠ Auto-complete failed ${deal.id}:`, e.message); }
    }
  } catch (e) { console.error('Cron auto-complete error:', e.message); }
}

// ── Mark inactive users offline ───────────────────────────────────────────────
async function markOfflineUsers() {
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    await _models.User.update({ isOnline: false }, {
      where: { isOnline: true, lastActive: { [Op.lt]: tenMinAgo } },
    });
  } catch (e) { console.error('Cron offline error:', e.message); }
}

// ── Chat cleanup with warnings ────────────────────────────────────────────────
const warnedChats = new Set();

async function cleanupChats() {
  try {
    const { Chat, ChatMessage, ChatMember } = _models;
    const now   = new Date();
    const chats = await Chat.findAll({ where: { deletedAt: null } });

    for (const chat of chats) {
      const online   = global.chatActiveSockets ? (global.chatActiveSockets.get(chat.id) || 0) : 0;
      if (online > 0) { warnedChats.delete(chat.id); continue; }
      // Never auto-delete deal chats
      if (chat.dealId) { warnedChats.delete(chat.id); continue; }

      const idleMs    = now - new Date(chat.lastMessageAt || chat.createdAt);
      const isPrivate = chat.type === 'private';
      const warnMs    = isPrivate ?  45 * 1000 : 4 * 60 * 1000;
      const deleteMs  = isPrivate ?  60 * 1000 : 5 * 60 * 1000;

      if (idleMs >= warnMs && idleMs < deleteMs && !warnedChats.has(chat.id)) {
        warnedChats.add(chat.id);
        const secs = Math.round((deleteMs - idleMs) / 1000);
        const msg  = isPrivate
          ? `⚠️ Приватный чат удалится через ${secs} сек — все вышли`
          : `⚠️ Чат удалится через ${secs} сек — никого нет онлайн`;
        console.log(`⚠ Warning "${chat.name}" ${secs}s left`);
        global.chatIo?.to(`chat:${chat.id}`).emit('chat:warning', { chatId: chat.id, message: msg, countdown: secs });
      }

      if (idleMs >= deleteMs) {
        warnedChats.delete(chat.id);
        const reason = isPrivate ? 'Приватный чат удалён — все участники покинули его' : 'Публичный чат удалён из-за неактивности (5 мин)';
        console.log(`🗑 Deleting "${chat.name}"`);
        global.chatIo?.to(`chat:${chat.id}`).emit('chat:deleted', { chatId: chat.id, reason });
        await ChatMessage.destroy({ where: { chatId: chat.id } });
        await ChatMember.destroy({ where: { chatId: chat.id } });
        await chat.update({ deletedAt: now, memberCount: 0 });
      }
    }
  } catch (e) { console.error('Chat cleanup error:', e.message); }
}

// ── Start — called from server.js AFTER models are ready ─────────────────────
function startCron(models) {
  _models = models;  // { User, Chat, ChatMessage, ChatMember, Deal }

  setInterval(runAutoComplete,  5 * 60 * 1000);
  setInterval(markOfflineUsers, 2 * 60 * 1000);
  setInterval(cleanupChats,     15 * 1000);

  setTimeout(runAutoComplete,  5_000);
  setTimeout(markOfflineUsers, 5_000);
  setTimeout(cleanupChats,    10_000);

  console.log('⏰ Cron: deals(5min) · offline(2min) · chats(15s)');
}

module.exports = { startCron };
