const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const { Product, User, Favorite } = require('../models/index');
const { auth } = require('../middleware/auth');

const sellerAttrs = ['id','username','firstName','photoUrl','rating','reviewCount','isVerified','totalSales'];

// ── GET / — list active products ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, search, sort = 'createdAt', page = 1, limit = 20, minPrice, maxPrice } = req.query;
    const where = { status: 'active' };
    if (category && category !== 'all') where.category = category;
    if (search) where[Op.or] = [
      { title:       { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
    if (minPrice) where.price = { ...(where.price || {}), [Op.gte]: Number(minPrice) };
    if (maxPrice) where.price = { ...(where.price || {}), [Op.lte]: Number(maxPrice) };

    const order = sort === 'price_asc'  ? [['price','ASC']]  :
                  sort === 'price_desc' ? [['price','DESC']] :
                  sort === 'popular'    ? [['views','DESC']]  :
                  [['isPromoted','DESC'],['createdAt','DESC']];

    const { rows: products, count: total } = await Product.findAndCountAll({
      where, order,
      include: [{ model: User, as: 'seller', attributes: sellerAttrs }],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ products, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Failed' }); }
});

// ── GET /my ───────────────────────────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { sellerId: req.userId, status: { [Op.ne]: 'deleted' } },
      order: [['createdAt','DESC']],
    });
    res.json(products);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/my/listings', auth, async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { sellerId: req.userId, status: { [Op.ne]: 'deleted' } },
      order: [['createdAt','DESC']],
    });
    res.json(products);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: [...sellerAttrs,'createdAt'] }],
    });
    if (!p) return res.status(404).json({ error: 'Not found' });
    await p.increment('views');
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── POST / — create product ───────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      title, description, price, category, subcategory,
      game, server, images, tags, deliveryData,
      platform, region, deliveryType, stock,
    } = req.body;

    // Validation
    if (!title || !title.trim())         return res.status(400).json({ error: 'Название обязательно' });
    if (!price || isNaN(parseFloat(price))) return res.status(400).json({ error: 'Укажите корректную цену' });
    if (parseFloat(price) <= 0)           return res.status(400).json({ error: 'Цена должна быть больше 0' });
    if (!category)                        return res.status(400).json({ error: 'Выберите категорию' });
    if (title.trim().length > 200)        return res.status(400).json({ error: 'Название слишком длинное (макс. 200)' });

    const p = await Product.create({
      sellerId:     req.userId,
      title:        title.trim(),
      description:  (description || '').trim(),
      price:        parseFloat(price),
      category,
      subcategory:  subcategory  || null,
      game:         game         || null,
      server:       server       || null,
      images:       Array.isArray(images) ? images.slice(0, 10) : [],
      tags:         Array.isArray(tags)   ? tags.slice(0, 20)   : [],
      deliveryData: deliveryData || null,
      platform:     platform     || null,
      region:       region       || null,
      deliveryType: deliveryType || 'digital',
      stock:        parseInt(stock) || 1,
    });
    res.status(201).json(p);
  } catch (e) {
    console.error('Product create error:', e.message);
    // Handle Sequelize validation errors nicely
    if (e.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: e.errors[0]?.message || 'Ошибка валидации' });
    }
    res.status(500).json({ error: e.message || 'Не удалось создать товар' });
  }
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (p.sellerId !== req.userId && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const allowed = ['title','description','price','category','subcategory','images','tags','status','deliveryData','platform','region','deliveryType','stock'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await p.update(updates);
    res.json(p);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (p.sellerId !== req.userId && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    await p.update({ status: 'deleted' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /:id/favorite ────────────────────────────────────────────────────────
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const ex = await Favorite.findOne({ where: { userId: req.userId, productId: req.params.id } });
    if (ex) { await ex.destroy(); return res.json({ favorited: false }); }
    await Favorite.create({ userId: req.userId, productId: req.params.id });
    res.json({ favorited: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
