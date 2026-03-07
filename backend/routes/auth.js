const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models/index');
const { verifyTelegram, generateToken, auth, ADMIN_TG_ID } = require('../middleware/auth');

const sanitize = (u) => ({
  id: u.id, telegramId: u.telegramId, username: u.username,
  firstName: u.firstName, lastName: u.lastName, email: u.email,
  photoUrl: u.photoUrl, balance: parseFloat(u.balance)||0,
  frozenBalance: parseFloat(u.frozenBalance)||0,
  totalDeposited: parseFloat(u.totalDeposited)||0,
  totalWithdrawn: parseFloat(u.totalWithdrawn)||0,
  totalSales: u.totalSales||0, totalPurchases: u.totalPurchases||0,
  rating: parseFloat(u.rating)||5, reviewCount: u.reviewCount||0,
  isAdmin: u.isAdmin, isSubAdmin: u.isSubAdmin||false, isMainAdmin: u.isMainAdmin||false, isVerified: u.isVerified, createdAt: u.createdAt
});

router.post('/telegram', async (req, res) => {
  try {
    const { initData, initDataUnsafe } = req.body;
    let tgUser;
    // In dev allow mock, in prod verify
    if (process.env.NODE_ENV !== 'production' && initDataUnsafe?.user) {
      tgUser = initDataUnsafe.user;
    } else if (initDataUnsafe?.user && initData) {
      tgUser = verifyTelegram(initData) || initDataUnsafe.user;
    } else {
      return res.status(401).json({ error: 'Invalid Telegram data' });
    }

    const isAdmin = ADMIN_TG_ID && String(tgUser.id) === String(ADMIN_TG_ID);

    const [user] = await User.findOrCreate({
      where: { telegramId: String(tgUser.id) },
      defaults: {
        telegramId: String(tgUser.id),
        username: tgUser.username || null,
        firstName: tgUser.first_name || 'User',
        lastName: tgUser.last_name || null,
        photoUrl: tgUser.photo_url || null,
        isAdmin, isMainAdmin: isAdmin, isVerified: isAdmin
      }
    });

    // Keep admin flags in sync on every login
    const updates = {
      username:   tgUser.username  || user.username,
      firstName:  tgUser.first_name || user.firstName,
      lastActive: new Date(),
    };
    if (isAdmin) {
      updates.isAdmin     = true;
      updates.isMainAdmin = true;
      updates.isVerified  = true;
    }
    await user.update(updates);

    res.json({ token: generateToken(user.id), user: sanitize(user) });
  } catch (e) {
    console.error('Telegram auth error:', e.message);
    res.status(500).json({ error: 'Auth failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      password: hash,
      username: username || email.split('@')[0]
    });
    res.json({ token: generateToken(user.id), user: sanitize(user) });
  } catch (e) { res.status(500).json({ error: 'Registration failed' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Fill all fields' });
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    await user.update({ lastActive: new Date() });
    res.json({ token: generateToken(user.id), user: sanitize(user) });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

router.get('/me', auth, (req, res) => res.json({ user: sanitize(req.user) }));

module.exports = router;
module.exports.sanitize = sanitize;
