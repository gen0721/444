const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// ─── USER ────────────────────────────────────────────
const User = sequelize.define('User', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  telegramId:     { type: DataTypes.STRING, unique: true, allowNull: true },
  username:       { type: DataTypes.STRING, allowNull: true },
  firstName:      { type: DataTypes.STRING, allowNull: true },
  lastName:       { type: DataTypes.STRING, allowNull: true },
  email:          { type: DataTypes.STRING, unique: true, allowNull: true },
  password:       { type: DataTypes.STRING, allowNull: true },
  photoUrl:       { type: DataTypes.TEXT, allowNull: true },
  balance:        { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  frozenBalance:  { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalDeposited: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalWithdrawn: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalSales:     { type: DataTypes.INTEGER, defaultValue: 0 },
  totalPurchases: { type: DataTypes.INTEGER, defaultValue: 0 },
  rating:         { type: DataTypes.DECIMAL(3, 2), defaultValue: 5.0 },
  reviewCount:    { type: DataTypes.INTEGER, defaultValue: 0 },
  isAdmin:        { type: DataTypes.BOOLEAN, defaultValue: false },
  isSubAdmin:     { type: DataTypes.BOOLEAN, defaultValue: false },
  isMainAdmin:    { type: DataTypes.BOOLEAN, defaultValue: false },
  isBanned:       { type: DataTypes.BOOLEAN, defaultValue: false },
  isVerified:     { type: DataTypes.BOOLEAN, defaultValue: false },
  lastActive:     { type: DataTypes.DATE, allowNull: true },
  isOnline:       { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'Users', timestamps: true });

// ─── PRODUCT ─────────────────────────────────────────
const Product = sequelize.define('Product', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sellerId:      { type: DataTypes.UUID, allowNull: false },
  title:         { type: DataTypes.STRING(200), allowNull: false },
  description:   { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  price:         { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  category:      { type: DataTypes.STRING(50), allowNull: false },
  subcategory:   { type: DataTypes.STRING(50), allowNull: true },
  images:        { type: DataTypes.JSONB, defaultValue: [] },
  tags:          { type: DataTypes.JSONB, defaultValue: [] },
  deliveryData:  { type: DataTypes.TEXT, allowNull: true },
  game:          { type: DataTypes.STRING, allowNull: true },
  server:        { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('active', 'sold', 'frozen', 'deleted', 'moderation'),
    defaultValue: 'active',
  },
  views:         { type: DataTypes.INTEGER, defaultValue: 0 },
  platform:      { type: DataTypes.STRING, allowNull: true },
  region:        { type: DataTypes.STRING, allowNull: true },
  deliveryType:  { type: DataTypes.STRING, allowNull: true, defaultValue: 'digital' },
  stock:         { type: DataTypes.INTEGER, defaultValue: 1 },
  sold:          { type: DataTypes.INTEGER, defaultValue: 0 },
  isPromoted:    { type: DataTypes.BOOLEAN, defaultValue: false },
  promotedUntil: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'Products', timestamps: true });

// ─── DEAL ────────────────────────────────────────────
const Deal = sequelize.define('Deal', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  buyerId:        { type: DataTypes.UUID, allowNull: false },
  sellerId:       { type: DataTypes.UUID, allowNull: false },
  productId:      { type: DataTypes.UUID, allowNull: false },
  amount:         { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  sellerAmount:   { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  commission:     { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'frozen', 'completed', 'disputed', 'cancelled', 'refunded'),
    defaultValue: 'frozen',
  },
  messages:        { type: DataTypes.JSONB, defaultValue: [] },
  deliveryData:    { type: DataTypes.TEXT, allowNull: true },
  sellerDelivered: { type: DataTypes.BOOLEAN, defaultValue: false },
  adminNote:      { type: DataTypes.TEXT, allowNull: true },
  resolvedById:   { type: DataTypes.UUID, allowNull: true },
  resolvedAt:     { type: DataTypes.DATE, allowNull: true },
  buyerConfirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
  autoCompleteAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'Deals', timestamps: true });

// ─── TRANSACTION ─────────────────────────────────────
const Transaction = sequelize.define('Transaction', {
  id:     { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM('deposit','withdrawal','purchase','sale','refund','commission','freeze','unfreeze','adjustment'),
    allowNull: false,
  },
  amount:              { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency:            { type: DataTypes.STRING(10), defaultValue: 'USDT' },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending',
  },
  description:         { type: DataTypes.TEXT, allowNull: true },
  dealId:              { type: DataTypes.UUID, allowNull: true },
  cryptoBotInvoiceId:  { type: DataTypes.STRING, allowNull: true },
  cryptoBotPayUrl:     { type: DataTypes.TEXT, allowNull: true },
  cryptoBotTransferId: { type: DataTypes.STRING, allowNull: true },
  cryptoAddress:       { type: DataTypes.STRING, allowNull: true },
  balanceBefore:       { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  balanceAfter:        { type: DataTypes.DECIMAL(12, 2), allowNull: true },
}, { tableName: 'Transactions', timestamps: true });

// ─── FAVORITE ────────────────────────────────────────
const Favorite = sequelize.define('Favorite', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:    { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'Favorites',
  timestamps: false,
  indexes: [{ unique: true, fields: ['userId', 'productId'] }],
});

// ─── BROADCAST ───────────────────────────────────────
const Broadcast = sequelize.define('Broadcast', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  senderId:     { type: DataTypes.UUID, allowNull: false },
  title:        { type: DataTypes.STRING(200), allowNull: false },
  text:         { type: DataTypes.TEXT, allowNull: false },
  targetType:   { type: DataTypes.ENUM('all', 'single', 'admins'), defaultValue: 'all' },
  targetUserId: { type: DataTypes.UUID, allowNull: true },
  sentCount:    { type: DataTypes.INTEGER, defaultValue: 0 },
  status:       { type: DataTypes.ENUM('pending','sent','failed'), defaultValue: 'pending' },
}, { tableName: 'Broadcasts', timestamps: true });


// ─── CHAT ────────────────────────────────────────────
const Chat = sequelize.define('Chat', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  type:        { type: DataTypes.ENUM('public', 'private'), defaultValue: 'public' },
  ownerId:     { type: DataTypes.UUID, allowNull: false },
  ownerName:   { type: DataTypes.STRING(100), allowNull: false },
  password:    { type: DataTypes.STRING(200), allowNull: true },
  memberCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastMessageAt: { type: DataTypes.DATE, allowNull: true },
  lastMessageText: { type: DataTypes.STRING(500), allowNull: true },
  lastMessageUser: { type: DataTypes.STRING(100), allowNull: true },
  deletedAt:   { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'Chats', timestamps: true, paranoid: false });

// ─── CHAT MESSAGE ─────────────────────────────────────
const ChatMessage = sequelize.define('ChatMessage', {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chatId:   { type: DataTypes.UUID, allowNull: false },
  userId:   { type: DataTypes.UUID, allowNull: false },
  userName: { type: DataTypes.STRING(100), allowNull: false },
  text:     { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'ChatMessages', timestamps: true, updatedAt: false });

// ─── CHAT MEMBER ──────────────────────────────────────
const ChatMember = sequelize.define('ChatMember', {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chatId:   { type: DataTypes.UUID, allowNull: false },
  userId:   { type: DataTypes.UUID, allowNull: false },
  joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'ChatMembers', timestamps: false,
  indexes: [{ unique: true, fields: ['chatId', 'userId'] }],
});

// ─── ASSOCIATIONS ────────────────────────────────────
Product.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
User.hasMany(Product, { foreignKey: 'sellerId', as: 'products' });
Deal.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Deal.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Deal.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Favorite.belongsTo(User, { foreignKey: 'userId' });
Favorite.belongsTo(Product, { foreignKey: 'productId' });
Broadcast.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Broadcast.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });

Chat.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Chat.hasMany(ChatMessage, { foreignKey: 'chatId', as: 'messages' });
Chat.hasMany(ChatMember, { foreignKey: 'chatId', as: 'members' });
ChatMessage.belongsTo(Chat, { foreignKey: 'chatId' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'author' });
ChatMember.belongsTo(Chat, { foreignKey: 'chatId' });
ChatMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Product, Deal, Transaction, Favorite, Broadcast, Chat, ChatMessage, ChatMember, sequelize };
