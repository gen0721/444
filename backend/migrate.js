/**
 * Safe migration — adds missing columns without dropping data.
 * Run once after deploy: node backend/migrate.js
 */
require('dotenv').config();
const sequelize = require('./db');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    // Add missing columns safely (IF NOT EXISTS)
    const alterations = [
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isMainAdmin" BOOLEAN DEFAULT false`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isSubAdmin" BOOLEAN DEFAULT false`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN DEFAULT false`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photoUrl" VARCHAR(255)`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalSales" INTEGER DEFAULT 0`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalPurchases" INTEGER DEFAULT 0`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalDeposited" DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalWithdrawn" DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3,2) DEFAULT 5.0`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "frozenBalance" DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "cryptoBotTransferId" VARCHAR(255)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "platform" VARCHAR(100)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "region" VARCHAR(100)`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "deliveryType" VARCHAR(50) DEFAULT 'digital'`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "stock" INTEGER DEFAULT 1`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "sold" INTEGER DEFAULT 0`,
    ];

    for (const sql of alterations) {
      try {
        await sequelize.query(sql);
        console.log('✅', sql.slice(0, 60) + '...');
      } catch (e) {
        // Column might already exist with different syntax — ignore
        console.log('⚠️  Skipped (ok):', e.message.slice(0, 80));
      }
    }

    // Set isMainAdmin = true for the main admin
    const adminTgId = process.env.ADMIN_TELEGRAM_ID;
    if (adminTgId) {
      await sequelize.query(`
        UPDATE "users" 
        SET "isMainAdmin" = true, "isAdmin" = true, "isVerified" = true
        WHERE "telegramId" = '${adminTgId}'
      `);
      console.log('✅ Main admin flagged:', adminTgId);
    }

    console.log('✅ Migration complete! Restart server now.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
