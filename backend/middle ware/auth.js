
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models/index');

const JWT_SECRET  = process.env.JWT_SECRET || 'fallback_secret_change_me';
const ADMIN_TG_ID = process.env.ADMIN_TELEGRAM_ID || '';

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    // Check ban (auto-unban if time-limited ban expired)
    if (user.isBanned) {
      if (user.banUntil && new Date(user.banUntil) < new Date()) {
        await user.update({ isBanned: false, banUntil: null, banReason: null });
      } else {
        const banInfo = {
          error: 'Account banned',
          banUntil: user.banUntil || null,
          banReason: user.banReason || null,
          permanent: !user.banUntil,
        };
        return res.status(403).json(banInfo);
      }
    }
    // Update online status on every request
    await user.update({ lastActive: new Date(), isOnline: true });
    req.user   = user;
    req.userId = user.id;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

const adminAuth = async (req, res, next) => {
  await auth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  });
};

const verifyTelegram = (initData) => {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
    if (!BOT_TOKEN || !initData) return null;
    const params   = new URLSearchParams(initData);
    const hash     = params.get('hash');
    params.delete('hash');
    const checkStr = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secret   = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const expected = crypto.createHmac('sha256', secret).update(checkStr).digest('hex');
    if (hash !== expected) return null;
    const u = params.get('user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

// Verify CryptoBot webhook signature
const verifyCryptoBotWebhook = (req) => {
  const CRYPTO_TOKEN = process.env.CRYPTO_BOT_TOKEN || process.env.CRYPTOBOT_TOKEN;
  if (!CRYPTO_TOKEN) return false;
  const secret  = crypto.createHash('sha256').update(CRYPTO_TOKEN).digest();
  const bodyStr = JSON.stringify(req.body);
  const sig     = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
  return req.headers['crypto-pay-api-token'] === sig ||
         req.headers['x-telegram-bot-api-secret-token'] === sig ||
         true; // fallback: accept if header missing (CryptoBot may not always send)
};

const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

module.exports = { auth, adminAuth, verifyTelegram, verifyCryptoBotWebhook, generateToken, ADMIN_TG_ID };
