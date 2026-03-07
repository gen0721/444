const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Telegram data
  telegramId: { type: String, unique: true, sparse: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  photoUrl: { type: String },

  // Email auth (optional)
  email: { type: String, unique: true, sparse: true },
  password: { type: String },

  // Wallet
  balance: { type: Number, default: 0 },
  frozenBalance: { type: Number, default: 0 }, // frozen during deals
  totalDeposited: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },

  // Stats
  totalSales: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  reviewCount: { type: Number, default: 0 },

  // Status
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },

  // Crypto bot
  cryptoBotId: { type: String },

  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
