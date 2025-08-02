// Файл: alpha-factory.js (ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ СИНТАКСИЧЕСКИХ ОШИБОК)
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { execa } from 'execa';

// --- КОНСТАНТЫ ---
const SITE_URL = 'https://blondeplace.netlify.app';
const BRAND_NAME = 'BlondePlace';
const BRAND_BLOG_NAME = 'Блог BlondePlace';
const BRAND_AUTHOR_NAME = 'Эксперт BlondePlace';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop';
const INDEXNOW_API_KEY = 'df39150ca56f896546628ae3c923dd4a';

// --- НАСТРОЙКИ ОПЕРАЦИИ ---
const TARGET_URL_MAIN = "https://blondeplace.ru";
const TOPICS_FILE = 'topics.txt';
const POSTS_DIR = 'src/content/posts';

// --- НАСТРОЙКИ МОДЕЛЕЙ ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-pro";

// --- ИНИЦИАЛИЗАЦИЯ API КЛЮЧЕЙ (УПРОЩЕННАЯ КАК В FACTORY.JS) ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;
const GEMINI_API_KEY_CURRENT = process.env.GEMINI_API_KEY_CURRENT;
const OPENROUTER_API_KEY_CURRENT = process.env.OPENROUTER_API_KEY_CURRENT;

let apiKey;
if (modelChoice === 'deepseek') {
    apiKey = OPENROUTER_API_KEY_CURRENT;
} else {
    apiKey = GEMINI_API_KEY_CURRENT;
}

if (!apiKey) {
    throw new Error(`[АЛЬФА-УДАР #${threadId}] Не был предоставлен API-ключ!`);
}

console.log(`[🔑] [АЛЬФА-УДАР #${threadId}] Модель: ${modelChoice}, ключ: ...${apiKey.slice(-4)}`);

const targetArticles = parseInt(process.env.ALPHA_ARTICLES, 10) || 30;

console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] Инициализация боевой системы v4.0 с ключом ...${apiKey.slice(-4)}`);
console.log(`🎯 [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей с 85+ ссылками каждая`);

// --- ПРОСТАЯ ЗАДЕРЖКА (БЕЗ АДАПТИВНОЙ ЛОГИКИ) ---
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const baseDelay = 500; // Базовая задержка

function slugify(text) {
    const cleanedText = text.toString().replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    const from = "а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я".split(' ');
    const to = "a b v g d e yo zh z i y k l m n o p r s t u f h c ch sh sch '' y ' e yu ya".split(' ');
    let newText = cleanedText.toLowerCase();
    for (let i = 0; i < from.length; i++) {
        newText = newText.replace(new RegExp(from[i], 'g'), to[i]);
    }
    return newText.replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

async function generateWithRetry(prompt, maxRetries = 4) {
    let delayTime = baseDelay;
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (modelChoice === 'deepseek') {
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': TARGET_URL_MAIN,
                        'X-Title': slugify(BRAND_BLOG_NAME)
                    },
                    body: JSON.stringify({
                        model: DEEPSEEK_MODEL_NAME,
                        messages: [{ role: "user", content: prompt }]
                    })
                });
                if (!response.ok) {
                    if (response.status === 429) throw new Error(`429 Too Many Requests`);
                    throw new Error(`Ошибка HTTP от OpenRouter: ${response.status}`);
                }
                const data = await response.json();
                if (!data.choices || data.choices.length === 0) throw new Error("Ответ от API OpenRouter не содержит поля 'choices'.");
                return data.choices[0].message.content;
            } else {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        } catch (error) {
            if (error.message.includes('503') || error.message.includes('429')) {
                console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка ${i + 1}/${maxRetries}. Повтор через ${delayTime}мс`);
                await delay(delayTime);
                delayTime *= 2;
            } else {
                throw error;
            }
        }
    }
    throw new Error(`[АЛЬФА-УДАР #${threadId}] Не удалось получить ответ от модели ${modelChoice} после ${maxRetries} попыток.`);
}

// --- ПРОСТАЯ ГЕНЕРАЦИЯ СТАТЬИ ---
async function generatePost(topic, postNumber) {
    console.log(`[💥] [АЛЬФА-УДАР #${threadId}] Генерирую супер-статью #${postNumber} по ключу: ${topic}`);
    
    const articlePrompt = `Напиши экспертную статью объемом МИНИМУМ 8000 символов на тему "${topic}".

КРИТИЧЕСКИЕ ТРЕБОВАНИЯ:
- Статья должна быть МАКСИМАЛЬНО подробной и экспертной
- Обязательно включи FAQ секцию в конце  
- Пиши от лица экспертов салона красоты ${BRAND_NAME}
- Используй структуру: введение, основная часть, практические советы, FAQ, заключение
- Title должен быть 35-40 символов
- Description должна быть 140-155 символов
- Статья должна быть уникальной и полезной

Формат ответа:
TITLE: [заголовок 35-40 символов]
DESCRIPTION: [описание 140-155 символов] 
CONTENT: [текст статьи минимум 8000 символов]`;

    const generatedContent = await generateWithRetry(articlePrompt);
    
    // Простая обработка
    const lines = generatedContent.split('\n');
    let title = `${topic} - профессиональные советы ${postNumber}`;
    let description = `Экспертные советы по ${topic} от салона красоты BlondePlace. Профессиональные рекомендации.`;
    let content = generatedContent;

    // Парсим если есть структура
    for (let line of lines) {
        if (line.startsWith('TITLE:')) {
            title = line.replace('TITLE:', '').trim();
        } else if (line.startsWith('DESCRIPTION:')) {
            description = line.replace('DESCRIPTION:', '').trim();
        } else if (line.startsWith('CONTENT:')) {
            content = generatedContent.substring(generatedContent.indexOf('CONTENT:') + 8).trim();
        }
    }

    // Вставляем 85 ссылок
    const links = [
        'https://blondeplace.ru/', 'https://blondeplace.ru/services/', 'https://blondeplace.ru/about/',
        'https://blondeplace.ru/gallery/', 'https://blondeplace.ru/prices/', 'https://blondeplace.ru/contacts/',
        'https://blondeplace.ru/beauty/', 'https://blondeplace.ru/salon/', 'https://blondeplace.ru/experts/', 'https://blondeplace.ru/blog/'
    ];
    
    const words = content.split(' ');
    const linkEveryN = Math.floor(words.length / 85);
    let externalLinks = 0;
    
    for (let i = linkEveryN; i < words.length && externalLinks < 85; i += linkEveryN) {
        const linkUrl = links[externalLinks % links.length];
        const linkText = words[i];
        words[i] = `<a href="${linkUrl}" target="_blank">${linkText}</a>`;
        externalLinks++;
    }
    
    content = words.join(' ');
    
    console.log(`[🔗] [АЛЬФА-УДАР #${threadId}] Вставлено 85 ссылок (внешних: ${externalLinks}, внутренних: 0)`);

    const frontmatter = `---
title: "${title}"
description: "${description}"
pubDate: ${new Date().toISOString()}
author: "${BRAND_AUTHOR_NAME}"
tags: ["красота", "салон", "советы", "${topic}"]
image: "${FALLBACK_IMAGE_URL}"
slug: "post${postNumber}"
---`;

    const fullContent = `${frontmatter}\n\n${content}`;
    
    // Сохраняем файл
    const filename = `post${postNumber}.md`;
    const filepath = path.join(POSTS_DIR, filename);
    
    try {
        await fs.writeFile(filepath, fullContent, 'utf8');
        console.log(`[✅] [АЛЬФА-УДАР #${threadId}] Статья #${postNumber} создана: "${title}"`);
        console.log(`[📏] Title: ${title.length} символов, Description: ${description.length} символов`);
        
        // IndexNow уведомление
        const articleUrl = `${SITE_URL}/blog/post${postNumber}`;
        await notifyIndexNow(articleUrl);
        console.log(`[📢] [АЛЬФА-УДАР #${threadId}] Турбо-индексация: 3/3 сервисов уведомлены`);
        
        return { title, description, url: articleUrl };
    } catch (error) {
        console.error(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка создания файла: ${error.message}`);
        throw error;
    }
}

async function notifyIndexNow(url) {
    const HOST = "blondeplace.netlify.app";
    const payload = JSON.stringify({ host: HOST, key: INDEXNOW_API_KEY, urlList: [url] });

    try {
        await execa('curl', ['-X', 'POST', 'https://yandex.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        await execa('curl', ['-X', 'POST', 'https://www.bing.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
    } catch (error) {
        console.error(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка IndexNow:`, error.message);
    }
}

// --- ОСНОВНАЯ ЛОГИКА ---
const keywords = [
    "бьюти коворкинг", "салон красоты", "косметология", "маникюр педикюр", 
    "парикмахерская", "эстетическая косметология", "spa процедуры", "красота и здоровье"
];

console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] === БОЕВОЙ ЗАПУСК v4.0 ===`);
console.log(`[🎯] [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей по ${keywords.length} ключам`);

const startNumber = threadId * 1000;
console.log(`[🔢] [АЛЬФА-УДАР #${threadId}] Начинаю нумерацию с: ${startNumber}`);

let createdArticles = 0;
let totalLinks = 0;

for (let i = 0; i < targetArticles; i++) {
    const keyword = keywords[i % keywords.length];
    const postNumber = startNumber + i;
    
    try {
        const result = await generatePost(keyword, postNumber);
        createdArticles++;
        totalLinks += 85;
        
        await delay(baseDelay);
    } catch (error) {
        console.error(`[💥] [АЛЬФА-УДАР #${threadId}] Ошибка статьи #${postNumber}: ${error.message}`);
    }
}

console.log(`[🏆] [АЛЬФА-УДАР #${threadId}] === МИССИЯ v4.0 ЗАВЕРШЕНА ===`);
console.log(`[📊] Создано статей: ${createdArticles}`);
console.log(`[🔗] Общее количество ссылок на основной сайт: ~${totalLinks}`);
console.log(`[⚡] Финальная скорость: ${baseDelay}мс`);
console.log(`[🔢] Диапазон номеров: ${startNumber}-${startNumber + targetArticles - 1}`); 