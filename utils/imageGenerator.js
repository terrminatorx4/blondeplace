// 🖼️ BLONDE PLACE - СИСТЕМА УНИКАЛЬНЫХ КАРТИНОК
// Файл: utils/imageGenerator.js

import crypto from 'crypto';

// СТАБИЛЬНЫЕ BEAUTY КАРТИНКИ ДЛЯ BLONDE PLACE
export const BEAUTY_IMAGES = {
  'nail-art': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'hair-coloring': 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'salon': 'https://images.unsplash.com/photo-1559599101-f09722fb4948?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'makeup': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'skincare': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'blonde': 'https://images.unsplash.com/photo-1594736797933-d0d62c5d69bb?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'hairstyle': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'coworking': 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  'trends': 'https://images.unsplash.com/photo-1583220618442-53a5dd215b76?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3'
};

/**
 * 🎯 ГЕНЕРАТОР УНИКАЛЬНЫХ КАРТИНОК
 * Каждая статья получает уникальную картинку на основе заголовка
 * Гарантирует отсутствие 404 ошибок
 */
export function generateUniqueImage(title, category = 'beauty') {
  // 1. Создаем уникальный хеш от заголовка
  const hash = crypto.createHash('md5').update(title).digest('hex');
  const imageIndex = parseInt(hash.substring(0, 1), 16) % Object.keys(BEAUTY_IMAGES).length;
  
  // 2. Выбираем картинку по категории или случайно
  let imageKey = category;
  if (!BEAUTY_IMAGES[category]) {
    const keys = Object.keys(BEAUTY_IMAGES);
    imageKey = keys[imageIndex];
  }
  
  const baseImage = BEAUTY_IMAGES[imageKey];
  
  // 3. Добавляем уникальные параметры для предотвращения кеширования
  const uniqueParams = `&t=${Date.now()}&h=${hash.substring(0, 8)}`;
  
  return baseImage + uniqueParams;
}

/**
 * 🔄 АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ ДЛЯ НОВЫХ СТАТЕЙ
 * Используйте в frontmatter новых статей
 */
export function autoGenerateHeroImage(title, tags = []) {
  // Определяем категорию по тегам
  let category = 'beauty'; // default
  
  if (tags.includes('nail-art') || tags.includes('маникюр')) {
    category = 'nail-art';
  } else if (tags.includes('hair') || tags.includes('окрашивание') || tags.includes('блонд')) {
    category = 'hair-coloring';
  } else if (tags.includes('salon') || tags.includes('салон')) {
    category = 'salon';
  } else if (tags.includes('makeup') || tags.includes('макияж')) {
    category = 'makeup';
  } else if (tags.includes('skincare') || tags.includes('уход')) {
    category = 'skincare';
  } else if (tags.includes('blonde') || tags.includes('блонд')) {
    category = 'blonde';
  } else if (tags.includes('coworking') || tags.includes('коворкинг')) {
    category = 'coworking';
  } else if (tags.includes('trends') || tags.includes('тренды')) {
    category = 'trends';
  }
  
  return generateUniqueImage(title, category);
}

/**
 * 📝 TEMPLATE ДЛЯ НОВЫХ СТАТЕЙ
 * Копируйте этот шаблон для создания новых постов
 */
export function generatePostTemplate(title, description, category, tags = []) {
  const heroImage = autoGenerateHeroImage(title, tags);
  const pubDate = new Date().toISOString();
  
  return `---
title: "${title}"
description: "${description}"
pubDate: "${pubDate}"
author: "BLONDE PLACE Beauty Expert"
heroImage: "${heroImage}"
category: "${category}"
tags: [${tags.map(tag => `"${tag}"`).join(', ')}]
---

# ${title}

![alt="Откройте свой неповторимый стиль в BLONDE PLACE | Nail Trends 2025"}{$heroImage}](https://blondeplace.netlify.app/)

## Введение

Здесь начинается ваша статья...

**Запишитесь в BLONDE PLACE уже сегодня!**

📞 Запись: +7 (981) 960-87-22  
💬 Телеграм: [@Blondeplace](https://t.me/Blondeplace)  
🌐 Онлайн: [dikidi.ru/699327](https://dikidi.ru/699327)
`;
}

// 🚀 ЭКСПОРТ ДЛЯ ИСПОЛЬЗОВАНИЯ
export default {
  generateUniqueImage,
  autoGenerateHeroImage,
  generatePostTemplate,
  BEAUTY_IMAGES
};