const express = require('express');
const router = express.Router();
const { User, Product } = require('../models/index');
const { auth } = require('../middleware/auth');

router.get('/:id', async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(u);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id/products', async (req, res) => {
  try {
    const p = await Product.findAll({ where: { sellerId: req.params.id, status: 'active' }, order: [['createdAt','DESC']] });
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (username) await req.user.update({ username });
    res.json(req.user);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
