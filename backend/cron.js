const { Op } = require('sequelize');

// Models accessed via sequelize.models — always available after models/index.js loads
// We require db (sequelize instance) lazily inside each function to avoid circular deps
function M(name) {
  const seq = require('./db');
  const m = seq.models[name];
  if (!m) throw new Error(`Model "${name}" not found in sequelize.models`);
  return m;
}
function getCompleteDeal() {
  return require('./routes/deals').completeDeal;
}

// ── Auto-complete deals ───────────────────────────────────────────────────────
async function runAutoComplete() {
  try {
    const Deal        = M('Deal');
    const completeDeal = getCompleteDeal();
    const overdue = await Deal.findAll({
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
    const User      = M('User');
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    await User.update({ isOnline: false }, {
      where: { isOnline: true, lastActive: { [Op.lt]: tenMinAgo } },
    });
  } catch (e) { console.error('Cron offline error:', e.message); }
}

// ── Chat cleanup with warnings ────────────────────────────────────────────────
// Public:  warn at 4 min → delete at 5 min
// Private: warn at 45 s  → delete at 60 s
const warnedChats = new Set();

async function cleanupChats() {
  try {
    const Chat        = M('Chat');
    const ChatMessage = M('ChatMessage');
    const ChatMember  = M('ChatMember');
    const now   = new Date();
    const chats = await Chat.findAll({ where: { deletedAt: null } });

    for (const chat of chats) {
      const online = global.chatActiveSockets
        ? (global.chatActiveSockets.get(chat.id) || 0)
        : 0;

      if (online > 0) { warnedChats.delete(chat.id); continue; }

      const lastActive = chat.lastMessageAt || chat.createdAt;
      const idleMs     = now - new Date(lastActive);
      const isPrivate  = chat.type === 'private';
      const warnMs     = isPrivate ?  45 * 1000 : 4 * 60 * 1000;
      const deleteMs   = isPrivate ?  60 * 1000 : 5 * 60 * 1000;

      // Warn
      if (idleMs >= warnMs && idleMs < deleteMs && !warnedChats.has(chat.id)) {
        warnedChats.add(chat.id);
        const secsLeft = Math.round((deleteMs - idleMs) / 1000);
        const msg = isPrivate
          ? `⚠️ Приватный чат будет удалён через ${secsLeft} сек — все участники покинули его`
          : `⚠️ Чат будет удалён через ${secsLeft} сек — никого нет онлайн`;
        console.log(`⚠ Warning "${chat.name}" idle=${Math.round(idleMs/1000)}s`);
        if (global.chatIo) {
          global.chatIo.to(`chat:${chat.id}`).emit('chat:warning', {
            chatId: chat.id, message: msg, countdown: secsLeft,
          });
        }
      }

      // Delete
      if (idleMs >= deleteMs) {
        warnedChats.delete(chat.id);
        const reason = isPrivate
          ? 'Приватный чат удалён — все участники покинули его'
          : 'Публичный чат удалён из-за неактивности (5 мин)';
        console.log(`🗑 Deleting "${chat.name}" idle=${Math.round(idleMs/60000)}min`);
        if (global.chatIo) {
          global.chatIo.to(`chat:${chat.id}`).emit('chat:deleted', { chatId: chat.id, reason });
        }
        await ChatMessage.destroy({ where: { chatId: chat.id } });
        await ChatMember.destroy({ where: { chatId: chat.id } });
        await chat.update({ deletedAt: now, memberCount: 0 });
      }
    }
  } catch (e) { console.error('Chat cleanup error:', e.message); }
}

function startCron() {
  setInterval(runAutoComplete,  5 * 60 * 1000);
  setInterval(markOfflineUsers, 2 * 60 * 1000);
  setInterval(cleanupChats,     15 * 1000);

  setTimeout(runAutoComplete,  5_000);
  setTimeout(markOfflineUsers, 5_000);
  setTimeout(cleanupChats,    10_000);

  console.log('⏰ Cron: deals(5min) · offline(2min) · chats(15s)');
}

module.exports = { startCron };
