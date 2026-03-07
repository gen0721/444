# 🚀 MARKET — Telegram Mini App Marketplace

Полноценный маркетплейс для цифровых товаров с эскроу-системой, CryptoBot оплатой и панелью администратора.

---

## ✅ Что уже настроено

- **База данных**: PostgreSQL Railway (`trolley.proxy.rlwy.net`)
- **Telegram Bot**: `8793467306:AAH_GFfpjkZhAdvqop0JareQY0XT6-Uf1Ww`
- **CryptoBot**: `524421:AAVjenXctSVPrksUTaevGFjJkBrwZN9fMhf`
- **Администратор**: Telegram ID `7750512181` (только вы)
- **Комиссия**: 5% с каждой сделки → на счёт администратора

---

## 🚀 Деплой на Railway

### Шаг 1: Загрузите на GitHub
```bash
cd marketplace
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/marketplace
git push -u origin main
```

### Шаг 2: Создайте проект на Railway
1. Зайдите на [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Выберите ваш репозиторий

### Шаг 3: Добавьте переменные окружения в Railway
В разделе **Variables** добавьте:
```
DATABASE_URL=postgresql://postgres:xYrYZSSfOWAILnnAzsiKLZzmEqhgNufb@trolley.proxy.rlwy.net:19702/railway
JWT_SECRET=mkt_s3cr3t_k3y_7750512181_ultra_secure_2025
TELEGRAM_BOT_TOKEN=8793467306:AAH_GFfpjkZhAdvqop0JareQY0XT6-Uf1Ww
CRYPTO_BOT_TOKEN=524421:AAVjenXctSVPrksUTaevGFjJkBrwZN9fMhf
ADMIN_TELEGRAM_ID=7750512181
NODE_ENV=production
MINI_APP_URL=https://YOUR-APP.up.railway.app
FRONTEND_URL=https://YOUR-APP.up.railway.app
```

### Шаг 4: После деплоя — настройте Telegram Bot
```
1. Откройте @BotFather в Telegram
2. /setmenubutton — выберите ваш бот
3. Введите URL вашего Railway приложения
4. Название кнопки: "Открыть Market"
```

### Шаг 5: CryptoBot Webhook
В @CryptoBot:
```
/pay → Настройки приложения
Webhook URL: https://YOUR-APP.up.railway.app/api/wallet/webhook/cryptobot
```

---

## 🎮 Функции

### Покупатели
- 📱 Telegram Mini App (автологин)
- 🛒 Каталог с поиском и фильтрами по категориям
- 💎 Безопасная покупка с заморозкой средств
- 💬 Чат с продавцом в рамках сделки
- ✅ Подтверждение получения / открытие спора
- 💰 Пополнение через CryptoBot (USDT, BTC, TON...)
- ⬇ Вывод средств

### Продавцы
- 📦 Создание объявлений в 4 шага
- 🗂 8 категорий с подкатегориями
- 📊 Статистика продаж
- 🔒 Данные для покупателя показываются только после сделки

### Администратор (только вы — ID 7750512181)
- 📊 Дашборд со статистикой
- 👥 Управление пользователями (бан, корректировка баланса)
- 🤝 Все сделки (завершить или вернуть деньги)
- 📦 Все товары (удалить)
- 💳 Все транзакции
- 💰 Комиссия 5% автоматически идёт на ваш счёт

### Дизайн
- 🌙 Автоматическая ночная тема (18:00 — 7:00)
- ☀️ Дневная тема (7:00 — 18:00)
- ✨ Мигающие анимации, ambient glow, scanlines
- 🎨 Фиолетово-циановая гамма

---

## 📁 Структура проекта

```
marketplace/
├── backend/
│   ├── server.js          # Express сервер
│   ├── db.js              # PostgreSQL подключение
│   ├── .env               # Ваши токены (уже настроены)
│   ├── models/index.js    # Sequelize модели
│   ├── middleware/auth.js  # JWT + Telegram auth
│   └── routes/
│       ├── auth.js        # Авторизация
│       ├── products.js    # Товары
│       ├── deals.js       # Сделки + эскроу
│       ├── wallet.js      # Кошелёк + CryptoBot
│       ├── admin.js       # Админ панель
│       └── categories.js  # Категории
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Роутинг + инициализация
│   │   ├── store.js       # Zustand state
│   │   ├── styles/        # CSS темы
│   │   ├── components/    # Layout + навбар
│   │   └── pages/
│   │       ├── HomePage.jsx       # Каталог
│   │       ├── ProductPage.jsx    # Товар + покупка
│   │       ├── CreateProductPage  # 4-шаговая форма продажи
│   │       ├── WalletPage.jsx     # Кошелёк
│   │       ├── ProfilePage.jsx    # Профиль + история
│   │       ├── DealPage.jsx       # Сделка + чат
│   │       ├── AdminPage.jsx      # Панель админа
│   │       └── AuthPage.jsx       # Email auth
├── railway.toml
├── nixpacks.toml
└── README.md
```

---

## 💡 Технологии

- **Backend**: Node.js, Express, Sequelize ORM, PostgreSQL
- **Frontend**: React 18, React Router, Zustand, Framer Motion
- **Auth**: JWT + Telegram WebApp + Email/Password
- **Payments**: CryptoBot API (USDT, BTC, TON, ETH...)
- **Deploy**: Railway (auto-deploy from GitHub)

---

> ⚠️ Файл `.env` содержит секретные данные. Не публикуйте его в открытых репозиториях.
