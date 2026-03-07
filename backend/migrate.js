/**
 * Manual migration script — run once if needed
 * Usage: node migrate.js
 */
require('dotenv').config();
const sequelize = require('./db');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected');

    const migrations = [
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isMainAdmin" BOOLEAN DEFAULT false`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isSubAdmin"  BOOLEAN DEFAULT false`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isVerified"  BOOLEAN DEFAULT false`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isBanned"    BOOLEAN DEFAULT false`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoUrl"    TEXT`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalSales"  INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalPurchases" INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalDeposited" FLOAT DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "totalWithdrawn"  FLOAT DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "rating"      FLOAT DEFAULT 5`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "frozenBalance" FLOAT DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isOnline"    BOOLEAN DEFAULT false`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "platform"     VARCHAR(100)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "region"       VARCHAR(100)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "deliveryType" VARCHAR(50) DEFAULT 'digital'`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "stock"        INTEGER DEFAULT 1`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "sold"         INTEGER DEFAULT 0`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "description"  TEXT DEFAULT ''`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "cryptoBotTransferId" VARCHAR(100)`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "balanceBefore" FLOAT`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "balanceAfter"  FLOAT`,
      `CREATE TABLE IF NOT EXISTS "Broadcasts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "senderId" UUID NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "text" TEXT NOT NULL,
        "targetType" VARCHAR(20) DEFAULT 'all',
        "targetUserId" UUID,
        "sentCount" INTEGER DEFAULT 0,
        "status" VARCHAR(20) DEFAULT 'pending',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS "Chats" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "type" VARCHAR(20) DEFAULT 'public',
        "ownerId" UUID NOT NULL,
        "ownerName" VARCHAR(100) NOT NULL,
        "password" VARCHAR(200),
        "memberCount" INTEGER DEFAULT 0,
        "lastMessageAt" TIMESTAMPTZ,
        "lastMessageText" VARCHAR(500),
        "lastMessageUser" VARCHAR(100),
        "deletedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "ChatMessages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "chatId" UUID NOT NULL REFERENCES "Chats"("id") ON DELETE CASCADE,
        "userId" UUID NOT NULL,
        "userName" VARCHAR(100) NOT NULL,
        "text" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "ChatMembers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "chatId" UUID NOT NULL REFERENCES "Chats"("id") ON DELETE CASCADE,
        "userId" UUID NOT NULL,
        "joinedAt" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE("chatId", "userId")
      )`,
      `CREATE INDEX IF NOT EXISTS "idx_chat_messages_chatId" ON "ChatMessages"("chatId", "createdAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "idx_chat_members_chatId" ON "ChatMembers"("chatId")`,

      \`ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "deliveryData"    TEXT\`,
      \`ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "sellerDelivered" BOOLEAN DEFAULT false\`,
    ];

    for (const sql of migrations) {
      try {
        await sequelize.query(sql);
        console.log('✅', sql.slice(0, 60));
      } catch (e) {
        console.log('⚠ Skip:', e.message.slice(0, 80));
      }
    }

    console.log('✅ Migration complete');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

migrate();
// Run this manually: node migrate.js
// New columns added in v5:
//   ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "deliveryData" TEXT;
//   ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "sellerDelivered" BOOLEAN DEFAULT false;
