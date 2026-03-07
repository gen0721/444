const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json([
  { id: 'games',     label: 'Игры',      icon: '🎮', subs: ['Аккаунты','Валюта','Предметы','Буст','Услуги'] },
  { id: 'software',  label: 'Программы', icon: '💻', subs: ['Подписки','Лицензии','Ключи активации'] },
  { id: 'social',    label: 'Соцсети',   icon: '📱', subs: ['Instagram','TikTok','YouTube','Telegram','Продвижение'] },
  { id: 'education', label: 'Обучение',  icon: '📚', subs: ['Курсы','Материалы','Консультации'] },
  { id: 'services',  label: 'Услуги',    icon: '⚡', subs: ['Дизайн','Разработка','Маркетинг','SEO'] },
  { id: 'finance',   label: 'Финансы',   icon: '💰', subs: ['Аккаунты','Инструменты'] },
  { id: 'other',     label: 'Другое',    icon: '📦', subs: ['Разное'] }
]));

module.exports = router;
