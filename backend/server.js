require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const sequelize = require('./db');
const { User } = require('./models/index');

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/deals',      require('./routes/deals'));
app.use('/api/wallet',     require('./routes/wallet'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/categories', require('./routes/categories'));

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Serve React frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath);
});

async function init() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');

    // Use force:false, no alter — manually handle schema via raw SQL
    await sequelize.sync({ force: false });
    console.log('✅ Tables synced');

    // Ensure admin exists
    const adminTgId = process.env.ADMIN_TELEGRAM_ID;
    if (adminTgId) {
      try {
        const [admin, created] = await User.findOrCreate({
          where: { telegramId: String(adminTgId) },
          defaults: {
            telegramId: String(adminTgId),
            username: 'admin',
            firstName: 'Admin',
            isAdmin: true,
            isVerified: true
          }
        });
        if (!created && !admin.isAdmin) {
          await admin.update({ isAdmin: true, isVerified: true });
        }
        console.log('✅ Admin ready:', adminTgId);
      } catch (e) {
        console.log('⚠ Admin setup skipped:', e.message);
      }
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Server running on port ' + PORT);
    });
  } catch (err) {
    console.error('❌ Init error:', err.message);
    process.exit(1);
  }
}

init();
module.exports = app;
