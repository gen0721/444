const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Product, User, Favorite } = require('../models/index');
const { auth } = require('../middleware/auth');

const sellerAttrs = ['id','username','firstName','photoUrl','rating','reviewCount','isVerified','totalSales'];

router.get('/', async (req, res) => {
  try {
    const { category, search, sort='createdAt', page=1, limit=20, minPrice, maxPrice } = req.query;
    const where = { status: 'active' };
    if (category && category !== 'all') where.category = category;
    if (search) where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
    if (minPrice) where.price = { ...(where.price||{}), [Op.gte]: Number(minPrice) };
    if (maxPrice) where.price = { ...(where.price||{}), [Op.lte]: Number(maxPrice) };

    const order = sort==='price_asc' ? [['price','ASC']] :
                  sort==='price_desc' ? [['price','DESC']] :
                  sort==='popular' ? [['views','DESC']] :
                  [['isPromoted','DESC'],['createdAt','DESC']];

    const { rows: products, count: total } = await Product.findAndCountAll({
      where, order,
      include: [{ model: User, as: 'seller', attributes: sellerAttrs }],
      limit: parseInt(limit),
      offset: (parseInt(page)-1)*parseInt(limit)
    });
    res.json({ products, total, pages: Math.ceil(total/limit) });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

router.get('/my/listings', auth, async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { sellerId: req.userId, status: { [Op.ne]: 'deleted' } },
      order: [['createdAt','DESC']]
    });
    res.json(products);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: [...sellerAttrs,'createdAt'] }]
    });
    if (!p) return res.status(404).json({ error: 'Not found' });
    await p.increment('views');
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, price, category, subcategory, game, server, images, tags, deliveryData } = req.body;
    if (!title || !description || !price || !category) return res.status(400).json({ error: 'Missing required fields' });
    const p = await Product.create({
      sellerId: req.userId, title, description,
      price: parseFloat(price), category, subcategory: subcategory||null,
      game: game||null, server: server||null,
      images: images||[], tags: tags||[],
      deliveryData: deliveryData||null
    });
    res.status(201).json(p);
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed to create' }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (p.sellerId !== req.userId && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const allowed = ['title','description','price','category','subcategory','images','tags','status','deliveryData'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await p.update(updates);
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (p.sellerId !== req.userId && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    await p.update({ status: 'deleted' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const ex = await Favorite.findOne({ where: { userId: req.userId, productId: req.params.id } });
    if (ex) { await ex.destroy(); return res.json({ favorited: false }); }
    await Favorite.create({ userId: req.userId, productId: req.params.id });
    res.json({ favorited: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
