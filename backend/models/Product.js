const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  subcategory: { type: String },
  images: [{ type: String }],

  // Game specific
  game: { type: String },
  server: { type: String },
  gameAccount: { type: String }, // hidden until deal

  // Status
  status: {
    type: String,
    enum: ['active', 'sold', 'frozen', 'deleted', 'moderation'],
    default: 'active'
  },

  // Stats
  views: { type: Number, default: 0 },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Tags
  tags: [{ type: String }],
  isPromoted: { type: Boolean, default: false },
  promotedUntil: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
