const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// ─── USER ────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  telegramId: { type: DataTypes.STRING, unique: true, allowNull: true },
  username: { type: DataTypes.STRING, allowNull: true },
  firstName: { type: DataTypes.STRING, allowNull: true },
  lastName: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: true },
  password: { type: DataTypes.STRING, allowNull: true },
  photoUrl: { type: DataTypes.TEXT, allowNull: true },
  balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  frozenBalance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalDeposited: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalWithdrawn: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalSales: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalPurchases: { type: DataTypes.INTEGER, defaultValue: 0 },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 5.0 },
  reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  isSubAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  isMainAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastActive: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'users',
  timestamps: true,
  // This allows null createdAt/updatedAt on existing rows
});

// ─── PRODUCT ─────────────────────────────────────────
const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sellerId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  category: { type: DataTypes.STRING(50), allowNull: false },
  subcategory: { type: DataTypes.STRING(50), allowNull: true },
  images: { type: DataTypes.JSONB, defaultValue: [] },
  tags: { type: DataTypes.JSONB, defaultValue: [] },
  deliveryData: { type: DataTypes.TEXT, allowNull: true },
  game: { type: DataTypes.STRING, allowNull: true },
  server: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('active', 'sold', 'frozen', 'deleted', 'moderation'),
    defaultValue: 'active'
  },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
  isPromoted: { type: DataTypes.BOOLEAN, defaultValue: false },
  promotedUntil: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'products', timestamps: true });

// ─── DEAL ────────────────────────────────────────────
const Deal = sequelize.define('Deal', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  buyerId: { type: DataTypes.UUID, allowNull: false },
  sellerId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  sellerAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  commission: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'frozen', 'completed', 'disputed', 'cancelled', 'refunded'),
    defaultValue: 'frozen'
  },
  messages: { type: DataTypes.JSONB, defaultValue: [] },
  adminNote: { type: DataTypes.TEXT, allowNull: true },
  resolvedById: { type: DataTypes.UUID, allowNull: true },
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
  buyerConfirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
  autoCompleteAt: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'deals', timestamps: true });

// ─── TRANSACTION ─────────────────────────────────────
const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM('deposit','withdrawal','purchase','sale','refund','commission','freeze','unfreeze','adjustment'),
    allowNull: false
  },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'USDT' },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  dealId: { type: DataTypes.UUID, allowNull: true },
  cryptoBotInvoiceId:  { type: DataTypes.STRING, allowNull: true },
  cryptoBotPayUrl:     { type: DataTypes.TEXT,   allowNull: true },
  cryptoBotTransferId: { type: DataTypes.STRING, allowNull: true }, // transfer ID from /transfer endpoint
  cryptoAddress:       { type: DataTypes.STRING, allowNull: true },
  balanceBefore: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  balanceAfter: { type: DataTypes.DECIMAL(12, 2), allowNull: true }
}, { tableName: 'transactions', timestamps: true });

// ─── FAVORITE ────────────────────────────────────────
const Favorite = sequelize.define('Favorite', {
  userId: { type: DataTypes.UUID },
  productId: { type: DataTypes.UUID }
}, { tableName: 'favorites', timestamps: false });

// ─── ASSOCIATIONS ────────────────────────────────────
Product.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
User.hasMany(Product, { foreignKey: 'sellerId', as: 'products' });
Deal.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Deal.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Deal.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Favorite.belongsTo(User, { foreignKey: 'userId' });
Favorite.belongsTo(Product, { foreignKey: 'productId' });

module.exports = { User, Product, Deal, Transaction, Favorite, sequelize };
