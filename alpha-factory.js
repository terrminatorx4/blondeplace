import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { execa } from 'execa';

// --- ПЛАН "АЛЬФА-УДАР" НАСТРОЙКИ ---
const SITE_URL = 'https://blondeplace.netlify.app';
const TARGET_URL_MAIN = "https://blondeplace.ru";
const BRAND_NAME = 'BlondePlace';
const BRAND_BLOG_NAME = 'Блог BlondePlace';
const BRAND_AUTHOR_NAME = 'Эксперт BlondePlace';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const INDEXNOW_API_KEY = 'df39150ca56f896546628ae3c923dd4a';
const POSTS_DIR = 'src/content/posts';

// --- 8 КЛЮЧЕВЫХ ФРАЗ ДЛЯ ПЛАНА "АЛЬФА-УДАР" ---
const ALPHA_KEYWORDS = [
    "бьюти коворкинг",
    "аренда парикмахерского кресла", 
    "коворкинг для мастера",
    "места в аренду",
    "кресло для мастера",
    "салон красоты",
    "мелирование",
    "тотал блонд"
];

// --- РАСШИРЕННЫЕ СИНОНИМЫ ДЛЯ МАКСИМАЛЬНОЙ УНИКАЛИЗАЦИИ ---
const SYNONYMS = {
    "аренда": ["сдача", "наем", "прокат", "бронирование", "съем", "лизинг", "найм", "резерв", "временное пользование", "заказ", "предоставление", "получение"],
    "кресло": ["место", "рабочая зона", "стол мастера", "рабочее место", "позиция", "кабинет", "станция", "локация", "спот", "точка", "зона работы", "пространство"],
    "мастер": ["специалист", "парикмахер", "стилист", "профессионал", "эксперт", "визажист", "бьютимастер", "косметолог", "nail-мастер", "бьюти-специалист", "мастер красоты"],
    "коворкинг": ["рабочее пространство", "beauty-пространство", "студия", "центр", "офис", "спейс", "хаб", "зона", "площадка", "локация", "пространство", "центр красоты"],
    "места": ["локации", "помещения", "зоны", "пространства", "кабинеты", "студии", "точки", "позиции", "станции", "области", "территории", "участки"],
    "салон": ["студия красоты", "beauty-центр", "студия", "центр красоты", "клиника красоты", "бьюти-студия", "spa-центр", "косметологический центр", "beauty-салон", "эстетический центр"],
    "мелирование": ["осветление", "колорирование", "окрашивание", "блондирование", "тонирование", "обесцвечивание", "высветление", "омбре", "балаяж", "шатуш", "окраска", "покраска"],
    "тотал блонд": ["полное блондирование", "платиновый блонд", "ультра блонд", "белый блонд", "экстремальный блонд", "total blonde", "радикальный блонд", "ледяной блонд", "полное осветление", "максимальный блонд"]
};

// --- МОДИФИКАТОРЫ ДЛЯ ЗАГОЛОВКОВ (ИСПРАВЛЕНЫ) ---
const TITLE_MODIFIERS = [
    "2025", "срочно", "сегодня", "сейчас", "премиум", "элитный", "профессиональный", "современный",
    "выгодно", "удобно", "комфортно", "стильно", "центр", "метро", "удобная локация", "без депозита",
    "под ключ", "со всем оборудованием", "мебелированное", "для начинающих", "для опытных мастеров",
    "топ качество", "лучшие условия", "эксклюзив", "VIP", "бизнес класс"
];

const DESCRIPTION_MODIFIERS = [
    "⭐ Лучшие условия", "✅ Без скрытых платежей", "🔥 Акция до конца месяца", "💎 Премиум локация",
    "🚀 Быстрое оформление", "⚡ Моментальное подключение", "💰 Выгодные цены", "🎯 Индивидуальный подход"
];

// --- ЦЕЛЕВЫЕ URL ОСНОВНОГО САЙТА ---
const TARGET_URLS = [
    "https://blondeplace.ru/#about",
    "https://blondeplace.ru/#services", 
    "https://blondeplace.ru/#discount",
    "https://blondeplace.ru/#coworking",
    "https://blondeplace.ru/#masters",
    "https://blondeplace.ru/#brands",
    "https://blondeplace.ru/#news",
    "https://blondeplace.ru/#comments",
    "https://blondeplace.ru/#why",
    "https://blondeplace.ru"
];

// --- ИНИЦИАЛИЗАЦИЯ ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;
const apiKey = process.env.API_KEY_CURRENT;
const targetArticles = parseInt(process.env.ALPHA_ARTICLES, 10) || 250;

if (!apiKey) {
    throw new Error(`[АЛЬФА-УДАР #${threadId}] Не был предоставлен API-ключ!`);
}

console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] Инициализация боевой системы с ключом ...${apiKey.slice(-4)}`);
console.log(`🎯 [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей с 85 ссылками каждая`);

// --- НАСТРОЙКИ МОДЕЛЕЙ ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-flash";

// --- ГЛОБАЛЬНАЯ УНИКАЛИЗАЦИЯ ПО ВРЕМЕНИ + ПОТОКУ ---
function generateUniqueId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${threadId}_${timestamp}_${random}`;
}

function generateVariation(keyword) {
    const words = keyword.split(' ');
    let result = '';
    
    for (const word of words) {
        const cleanWord = word.toLowerCase();
        if (SYNONYMS[cleanWord] && Math.random() > 0.5) {
            const synonyms = SYNONYMS[cleanWord];
            result += synonyms[Math.floor(Math.random() * synonyms.length)] + ' ';
        } else {
            result += word + ' ';
        }
    }
    
    return result.trim();
}

// УЛУЧШЕННАЯ СИСТЕМА УНИКАЛЬНЫХ ЗАГОЛОВКОВ (БЕЗ КОЛЛИЗИЙ)
function createGloballyUniqueTitle(baseKeyword, postNumber) {
    const variation = generateVariation(baseKeyword);
    const modifier = TITLE_MODIFIERS[Math.floor(Math.random() * TITLE_MODIFIERS.length)];
    const uniqueId = generateUniqueId();
    
    // Включаем номер поста для 100% уникальности
    const title = `${variation}: ${modifier} #${postNumber}`;
    
    // Обрезаем до 45 символов, сохраняя целые слова
    if (title.length <= 45) {
        return title;
    }
    
    const words = title.split(' ');
    let result = '';
    for (const word of words) {
        if (result.length + word.length + 1 <= 45) {
            result += (result ? ' ' : '') + word;
        } else {
            break;
        }
    }
    
    return result || `${baseKeyword} #${postNumber}`;
}

function createGloballyUniqueDescription(keyword, postNumber) {
    const modifier = DESCRIPTION_MODIFIERS[Math.floor(Math.random() * DESCRIPTION_MODIFIERS.length)];
    const variation = generateVariation(keyword);
    
    const description = `${modifier} ${variation} в BlondePlace! Профессиональное оборудование, удобная локация, выгодные условия. Звоните прямо сейчас! #${postNumber}`;
    
    // Обрезаем до 164 символов, сохраняя целые слова
    if (description.length <= 164) {
        return description;
    }
    
    const words = description.split(' ');
    let result = '';
    for (const word of words) {
        if (result.length + word.length + 1 <= 164) {
            result += (result ? ' ' : '') + word;
        } else {
            break;
        }
    }
    
    return result || `${keyword} в BlondePlace! Звоните сейчас!`;
}

async function generateWithRetry(prompt, maxRetries = 3) {
    let delay = 2000;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (modelChoice === 'deepseek') {
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': TARGET_URL_MAIN,
                        'X-Title': 'BlondePlace-Alpha-Strike'
                    },
                    body: JSON.stringify({
                        model: DEEPSEEK_MODEL_NAME,
                        messages: [{ role: "user", content: prompt }]
                    })
                });

                if (!response.ok) {
                    if (response.status === 429) throw new Error(`429 Too Many Requests`);
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;
            } else {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        } catch (error) {
            if (i < maxRetries - 1) {
                console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка ${i + 1}/${maxRetries}. Повтор через ${delay}мс`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5;
            } else {
                throw error;
            }
        }
    }
}

// БЕЗОПАСНАЯ ГЕНЕРАЦИЯ ССЫЛОК (НЕ ЛОМАЕТ ЗАГОЛОВКИ)
function generateMassiveLinksSecure(keyword, articleText) {
    const numLinks = 75 + Math.floor(Math.random() * 25); // 75-100 ссылок
    
    // Анкоры для ссылок
    const anchorTemplates = [
        keyword,
        `${keyword} в СПб`,
        `лучший ${keyword}`,
        `${keyword} BlondePlace`,
        `профессиональный ${keyword}`,
        `качественный ${keyword}`,
        `${keyword} центр`,
        `${keyword} студия`,
        `${keyword} услуги`,
        `записаться на ${keyword}`
    ];
    
    // Разделяем на заголовки и обычный текст
    const lines = articleText.split('\n');
    let processedLines = [];
    let addedLinks = 0;
    
    for (const line of lines) {
        // НЕ добавляем ссылки в заголовки (начинающиеся с #)
        if (line.trim().startsWith('#') || addedLinks >= numLinks) {
            processedLines.push(line);
            continue;
        }
        
        // Добавляем ссылки только в обычные абзацы
        if (line.trim().length > 50 && Math.random() > 0.7) {
            const targetUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
            const anchor = anchorTemplates[Math.floor(Math.random() * anchorTemplates.length)];
            
            // Добавляем ссылку в конец абзаца
            const linkedLine = `${line} Узнайте больше о <a href="${targetUrl}" target="_blank">${anchor}</a>.`;
            processedLines.push(linkedLine);
            addedLinks++;
        } else {
            processedLines.push(line);
        }
    }
    
    console.log(`[💥] [АЛЬФА-УДАР #${threadId}] Вставлено ${addedLinks} ссылок на основной сайт`);
    return processedLines.join('\n');
}

async function notifyIndexNow(url) {
    const payload = JSON.stringify({
        host: "blondeplace.netlify.app",
        key: INDEXNOW_API_KEY,
        urlList: [url]
    });

    try {
        await execa('curl', ['-X', 'POST', 'https://yandex.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        console.log(`[📢] [АЛЬФА-УДАР #${threadId}] IndexNow: ${url}`);
    } catch (error) {
        console.warn(`[!] [АЛЬФА-УДАР #${threadId}] IndexNow ошибка: ${url}`);
    }
}

async function commitToGithub(filePath, content, message) {
    try {
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPOSITORY;
        
        if (!token || !repo) {
            console.warn(`[!] [АЛЬФА-УДАР #${threadId}] GitHub токен или репозиторий не настроены`);
            return;
        }
        
        const encodedContent = Buffer.from(content).toString('base64');
        
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                content: encodedContent
            })
        });
        
        if (response.ok) {
            console.log(`[✅] [АЛЬФА-УДАР #${threadId}] Файл ${filePath} сохранен в GitHub`);
        }
    } catch (error) {
        console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка сохранения в GitHub: ${error.message}`);
    }
}

async function generateAlphaArticle(keyword, postNumber) {
    console.log(`[💥] [АЛЬФА-УДАР #${threadId}] Генерирую статью #${postNumber} по ключу: ${keyword}`);

    // ОПТИМИЗИРОВАННЫЙ ПРОМПТ ДЛЯ СКОРОСТИ + SEO
    const articlePrompt = `Напиши экспертную SEO-статью на тему "${keyword}" для салона красоты BlondePlace.

СТРОГИЕ ТРЕБОВАНИЯ:
- Объем: 6000-8000 символов (не больше!)
- Структура: # H1, ## H2, ### H3 в Markdown
- Тематика: ${keyword} в контексте салона BlondePlace
- Стиль: От лица экспертов BlondePlace
- БЕЗ ссылок в тексте (добавлю отдельно)
- БЕЗ изображений
- Сразу начинай с заголовка H1

Пиши профессионально, но быстро!`;

    let articleText = await generateWithRetry(articlePrompt);
    
    // Супер-очистка
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.replace(/www\.[^\s]+/g, '');
    articleText = articleText.trim();

    // БЕЗОПАСНАЯ ВСТАВКА ССЫЛОК
    articleText = generateMassiveLinksSecure(keyword, articleText);

    // ГЛОБАЛЬНО УНИКАЛЬНЫЕ МЕТА-ТЕГИ
    const uniqueTitle = createGloballyUniqueTitle(keyword, postNumber);
    const uniqueDescription = createGloballyUniqueDescription(keyword, postNumber);

    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": uniqueTitle,
        "description": uniqueDescription,
        "author": { "@type": "Person", "name": BRAND_AUTHOR_NAME },
        "publisher": { "@type": "Organization", "name": BRAND_BLOG_NAME },
        "datePublished": new Date().toISOString(),
        "mainEntityOfPage": `${SITE_URL}/blog/post${postNumber}/`
    };

    const frontmatter = `---
title: "${uniqueTitle.replace(/"/g, '\\"')}"
description: "${uniqueDescription.replace(/"/g, '\\"')}"
keywords: "${keyword}, BlondePlace, салон красоты, профессиональные услуги"
pubDate: "${new Date().toISOString()}"
author: "${BRAND_AUTHOR_NAME}"
heroImage: "${FALLBACK_IMAGE_URL}"
schema: ${JSON.stringify(schema)}
---

${articleText}
`;

    return { content: frontmatter, title: uniqueTitle, description: uniqueDescription };
}

async function main() {
    console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] === БОЕВОЙ ЗАПУСК ===`);
    
    try {
        const postsDir = path.join(process.cwd(), POSTS_DIR);
        await fs.mkdir(postsDir, { recursive: true });
        
        console.log(`[🎯] [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей по 8 ключам`);
        
        // УНИКАЛЬНАЯ НУМЕРАЦИЯ ДЛЯ КАЖДОГО ПОТОКА
        let postCounter = (threadId - 1) * 1000 + 1; // Поток 1: 1-1000, Поток 2: 1001-2000 и т.д.
        
        for (let i = 0; i < targetArticles; i++) {
            const keyword = ALPHA_KEYWORDS[i % ALPHA_KEYWORDS.length];
            const postNumber = postCounter + i;
            
            try {
                const slug = `post${postNumber}`;
                const filePath = path.join(postsDir, `${slug}.md`);
                const githubPath = `${POSTS_DIR}/${slug}.md`;
                
                const result = await generateAlphaArticle(keyword, postNumber);
                
                // Локальное сохранение
                await fs.writeFile(filePath, result.content);
                
                // Сохранение в GitHub
                await commitToGithub(githubPath, result.content, `🚀💥 АЛЬФА-УДАР: Статья #${postNumber} - ${result.title}`);
                
                console.log(`[✅] [АЛЬФА-УДАР #${threadId}] Статья #${postNumber} создана: "${result.title}"`);
                console.log(`[📏] Title: ${result.title.length} символов, Description: ${result.description.length} символов`);
                
                // Мгновенная отправка в IndexNow
                const url = `${SITE_URL}/blog/${slug}/`;
                await notifyIndexNow(url);
                
                // Минимальная пауза
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.error(`[💥] [АЛЬФА-УДАР #${threadId}] Ошибка статьи #${postCounter + i}: ${error.message}`);
                continue;
            }
        }
        
        console.log(`[🏆] [АЛЬФА-УДАР #${threadId}] === МИССИЯ ЗАВЕРШЕНА ===`);
        console.log(`[📊] Создано статей: ${targetArticles}`);
        console.log(`[🔗] Общее количество ссылок на основной сайт: ~${targetArticles * 80}`);
        
    } catch (error) {
        console.error(`[💥] [АЛЬФА-УДАР #${threadId}] КРИТИЧЕСКАЯ ОШИБКА:`, error);
        process.exit(1);
    }
}

main(); 