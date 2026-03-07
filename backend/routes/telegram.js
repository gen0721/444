const express = require('express');
const router = express.Router();

router.get('/bot-info', (req, res) => {
  res.json({
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'YourMarketBot',
    miniAppUrl: process.env.MINI_APP_URL || 'https://your-app.railway.app'
  });
});

module.exports = router;
