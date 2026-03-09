const { Op } = require('sequelize');
const { Deal, User, Chat, ChatMessage, ChatMember } = require('./models/index');
const { completeDeal } = require('./routes/deals');

// ── Auto-complete deals ───────────────────────────────────────────────────────
async function runAutoComplete() {
  try {
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
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    await User.update({ isOnline: false }, { where: { isOnline: true, lastActive: { [Op.lt]: tenMinAgo } } });
  } catch (e) { console.error('Cron offline error:', e.message); }
}

// ── Chat cleanup with warnings ────────────────────────────────────────────────
// Public:  warn at 4min idle → delete at 5min
// Private: warn at 45s idle  → delete at 1min
const warnedChats = new Set(); // chatIds already warned

async function cleanupChats() {
  try {
    const now   = new Date();
    const chats = await Chat.findAll({ where: { deletedAt: null } });

    for (const chat of chats) {
      const online = global.chatActiveSockets
        ? (global.chatActiveSockets.get(chat.id) || 0)
        : 0;

      if (online > 0) {
        // Someone online — reset warn state
        warnedChats.delete(chat.id);
        continue;
      }

      const lastActive = chat.lastMessageAt || chat.createdAt;
      const idleMs     = now - new Date(lastActive);

      // Timers
      const isPrivate   = chat.type === 'private';
      const warnMs      = isPrivate ?  45 * 1000 :  4 * 60 * 1000;
      const deleteMs    = isPrivate ?  60 * 1000 :  5 * 60 * 1000;
      const warnMsg     = isPrivate
        ? '⚠️ Приватный чат будет удалён через 15 секунд — никого нет онлайн'
        : '⚠️ Чат будет удалён через 1 минуту — никого нет онлайн';

      // Warn phase
      if (idleMs >= warnMs && idleMs < deleteMs && !warnedChats.has(chat.id)) {
        warnedChats.add(chat.id);
        console.log(`⚠ Warning "${chat.name}" (idle ${Math.round(idleMs/1000)}s)`);
        if (global.chatIo) {
          global.chatIo.to(`chat:${chat.id}`).emit('chat:warning', {
            chatId:    chat.id,
            message:   warnMsg,
            countdown: Math.round((deleteMs - idleMs) / 1000),
          });
        }
      }

      // Delete phase
      if (idleMs >= deleteMs) {
        warnedChats.delete(chat.id);
        const reason = isPrivate
          ? 'Приватный чат удалён — все участники покинули его'
          : 'Публичный чат удалён из-за неактивности (5 мин)';
        console.log(`🗑 Deleting "${chat.name}" (idle ${Math.round(idleMs/60000)}min)`);
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
  setInterval(cleanupChats,     15 * 1000);   // every 15s for accurate timers

  setTimeout(runAutoComplete,  5000);
  setTimeout(markOfflineUsers, 5000);
  setTimeout(cleanupChats,     8000);

  console.log('⏰ Cron: deals(5min) · offline(2min) · chats(15s)');
}

module.exports = { startCron };
