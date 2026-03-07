/**
 * Background jobs — run inside the same process as the server
 */
const { Op } = require('sequelize');
const { Deal, User, Chat, ChatMessage, ChatMember } = require('./models/index');
const { completeDeal } = require('./routes/deals');

// ── Auto-complete frozen deals past autoCompleteAt ────────────────────────────
async function runAutoComplete() {
  try {
    const overdue = await Deal.findAll({
      where: { status: 'frozen', autoCompleteAt: { [Op.lte]: new Date() } },
    });
    for (const deal of overdue) {
      try { await completeDeal(deal); console.log(`⏰ Auto-completed deal ${deal.id}`); }
      catch (e) { console.error(`⚠ Auto-complete failed for deal ${deal.id}:`, e.message); }
    }
    if (overdue.length > 0) console.log(`✅ Auto-completed ${overdue.length} deal(s)`);
  } catch (e) { console.error('Cron auto-complete error:', e.message); }
}

// ── Mark inactive users as offline ───────────────────────────────────────────
async function markOfflineUsers() {
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [count] = await User.update(
      { isOnline: false },
      { where: { isOnline: true, lastActive: { [Op.lt]: tenMinAgo } } }
    );
    if (count > 0) console.log(`🔴 Marked ${count} user(s) offline`);
  } catch (e) { console.error('Cron offline marker error:', e.message); }
}

// ── Chat cleanup ──────────────────────────────────────────────────────────────
// Public chat:  deleted after 15 min with 0 online members
// Private chat: deleted after 1  min with 0 online members
async function cleanupChats() {
  try {
    const now  = new Date();
    const chats = await Chat.findAll({ where: { deletedAt: null } });

    for (const chat of chats) {
      // Real-time online count tracked in global.chatActiveSockets by server.js
      const onlineCount = global.chatActiveSockets
        ? (global.chatActiveSockets.get(chat.id) || 0)
        : 0;

      if (onlineCount > 0) continue; // someone is online — keep alive

      const gracePeriod = chat.type === 'private'
        ? 1  * 60 * 1000   // 1 min for private
        : 15 * 60 * 1000;  // 15 min for public

      const lastActive = chat.lastMessageAt || chat.createdAt;
      const idleMs     = now - new Date(lastActive);

      if (idleMs >= gracePeriod) {
        console.log(`🗑 Auto-deleting ${chat.type} chat "${chat.name}" (idle ${Math.round(idleMs/60000)}min)`);

        // Notify connected sockets BEFORE deleting
        if (global.chatIo) {
          global.chatIo.to(`chat:${chat.id}`).emit('chat:deleted', {
            chatId: chat.id,
            reason: chat.type === 'private'
              ? 'Приватный чат удалён — все участники покинули его'
              : 'Чат удалён из-за неактивности (15 мин)',
          });
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
  setInterval(cleanupChats,     60 * 1000);      // every 1 min for fast private-chat detection

  setTimeout(runAutoComplete,  5_000);
  setTimeout(markOfflineUsers, 5_000);
  setTimeout(cleanupChats,    10_000);

  console.log('⏰ Cron started: deals(5min) · offline(2min) · chat-cleanup(1min)');
}

module.exports = { startCron };
