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

// --- СИНОНИМЫ ДЛЯ УНИКАЛИЗАЦИИ ---
const SYNONYMS = {
    "аренда": ["сдача", "наем", "прокат", "бронирование", "съем", "лизинг", "найм", "резерв", "временное пользование", "заказ"],
    "кресло": ["место", "рабочая зона", "стол мастера", "рабочее место", "позиция", "кабинет", "станция", "локация", "спот", "точка"],
    "мастер": ["специалист", "парикмахер", "стилист", "профессионал", "эксперт", "визажист", "бьютимастер", "косметолог", "nail-мастер", "бьюти-специалист"],
    "коворкинг": ["рабочее пространство", "beauty-пространство", "студия", "центр", "офис", "спейс", "хаб", "зона", "площадка", "локация"],
    "места": ["локации", "помещения", "зоны", "пространства", "кабинеты", "студии", "точки", "позиции", "станции", "области"],
    "салон": ["студия красоты", "beauty-центр", "студия", "центр красоты", "клиника красоты", "бьюти-студия", "spa-центр", "косметологический центр", "beauty-салон", "эстетический центр"],
    "мелирование": ["осветление", "колорирование", "окрашивание", "блондирование", "тонирование", "обесцвечивание", "высветление", "омбре", "балаяж", "шатуш"],
    "тотал блонд": ["полное блондирование", "платиновый блонд", "ультра блонд", "белый блонд", "экстремальный блонд", "total blonde", "радикальный блонд", "ледяной блонд", "полное осветление", "максимальный блонд"]
};

// --- МОДИФИКАТОРЫ ДЛЯ ЗАГОЛОВКОВ ---
const TITLE_MODIFIERS = [
    "2025", "срочно", "сегодня", "сейчас", "премиум", "элитный", "профессиональный", "современный",
    "выгодно", "удобно", "комфортно", "стильно", "центр", "метро", "удобная локация", "без депозита",
    "под ключ", "со всем оборудованием", "мебелированное", "для начинающих", "для опытных мастеров"
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
const targetArticles = parseInt(process.env.ALPHA_ARTICLES, 10) || 250; // 250 статей на поток при 20 потоках = 5000

if (!apiKey) {
    throw new Error(`[АЛЬФА-УДАР #${threadId}] Не был предоставлен API-ключ!`);
}

console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] Инициализация боевой системы с ключом ...${apiKey.slice(-4)}`);
console.log(`🎯 [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей с 85 ссылками каждая`);

// --- НАСТРОЙКИ МОДЕЛЕЙ ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-flash";

// --- БАЗА УНИКАЛЬНЫХ ЗАГОЛОВКОВ ---
let usedTitles = new Set();

function generateVariation(keyword) {
    const words = keyword.split(' ');
    let result = '';
    
    for (const word of words) {
        const cleanWord = word.toLowerCase();
        if (SYNONYMS[cleanWord] && Math.random() > 0.6) {
            const synonyms = SYNONYMS[cleanWord];
            result += synonyms[Math.floor(Math.random() * synonyms.length)] + ' ';
        } else {
            result += word + ' ';
        }
    }
    
    return result.trim();
}

function createUniqueTitle(baseKeyword, attempt = 1) {
    if (attempt > 50) {
        return `${baseKeyword} ${Math.random().toString(36).substr(2, 5)}`;
    }
    
    const variation = generateVariation(baseKeyword);
    const modifier = TITLE_MODIFIERS[Math.floor(Math.random() * TITLE_MODIFIERS.length)];
    const emoji = ['⭐', '🔥', '💎', '✨', '🎯'][Math.floor(Math.random() * 5)];
    
    const title = `${variation}: ${modifier} ${emoji}`;
    
    if (title.length > 55 || usedTitles.has(title.toLowerCase())) {
        return createUniqueTitle(baseKeyword, attempt + 1);
    }
    
    usedTitles.add(title.toLowerCase());
    return title;
}

function createUniqueDescription(keyword) {
    const modifier = DESCRIPTION_MODIFIERS[Math.floor(Math.random() * DESCRIPTION_MODIFIERS.length)];
    const variation = generateVariation(keyword);
    
    return `${modifier} ${variation} в BlondePlace! Профессиональное оборудование, удобная локация, выгодные условия. Звоните прямо сейчас!`;
}

async function generateWithRetry(prompt, maxRetries = 3) {
    let delay = 2000; // Быстрее для Альфа-Удар
    
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

// АГРЕССИВНАЯ ГЕНЕРАЦИЯ ССЫЛОК (70-100 НА СТАТЬЮ)
function generateMassiveLinks(keyword, articleText) {
    const numLinks = 75 + Math.floor(Math.random() * 25); // 75-100 ссылок
    let linkifiedText = articleText;
    
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
    
    const sentences = linkifiedText.split('. ');
    const linksPerSentence = Math.ceil(numLinks / sentences.length);
    
    for (let i = 0; i < sentences.length && numLinks > 0; i++) {
        const sentence = sentences[i];
        const wordsInSentence = sentence.split(' ');
        
        for (let j = 0; j < linksPerSentence && j < wordsInSentence.length - 2; j++) {
            const targetUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
            const anchor = anchorTemplates[Math.floor(Math.random() * anchorTemplates.length)];
            
            // Вставляем ссылку в случайное место предложения
            const insertPos = Math.floor(Math.random() * (wordsInSentence.length - 2)) + 1;
            wordsInSentence.splice(insertPos, 0, `<a href="${targetUrl}" target="_blank">${anchor}</a>`);
        }
        
        sentences[i] = wordsInSentence.join(' ');
    }
    
    console.log(`[💥] [АЛЬФА-УДАР #${threadId}] Вставлено ~${numLinks} ссылок на основной сайт`);
    return sentences.join('. ');
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

async function generateAlphaArticle(keyword, postNumber) {
    console.log(`[💥] [АЛЬФА-УДАР #${threadId}] Генерирую статью #${postNumber} по ключу: ${keyword}`);

    // АГРЕССИВНЫЙ ПРОМПТ ДЛЯ БЫСТРОЙ ГЕНЕРАЦИИ
    const articlePrompt = `Напиши подробную статью на тему "${keyword}" для салона красоты BlondePlace. 
    
ТРЕБОВАНИЯ:
- Объем: 8000+ символов
- Заголовки: H1, H2, H3 в Markdown
- Много подробностей про ${keyword}
- От лица экспертов BlondePlace
- БЕЗ ссылок в тексте (добавлю сам)
- Сразу начинай с H1

Пиши быстро и содержательно!`;

    let articleText = await generateWithRetry(articlePrompt);
    
    // Очистка
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.trim();

    // МАССОВАЯ ВСТАВКА ССЫЛОК (70-100)
    articleText = generateMassiveLinks(keyword, articleText);

    // АГРЕССИВНЫЕ МЕТА-ТЕГИ
    const aggressiveTitle = createUniqueTitle(keyword);
    const aggressiveDescription = createUniqueDescription(keyword);
    
    // Обрезаем до нужной длины без потери слов
    const finalTitle = aggressiveTitle.length <= 45 ? aggressiveTitle : aggressiveTitle.slice(0, 42) + '...';
    const finalDescription = aggressiveDescription.length <= 164 ? aggressiveDescription : aggressiveDescription.slice(0, 161) + '...';

    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": finalTitle,
        "description": finalDescription,
        "author": { "@type": "Person", "name": BRAND_AUTHOR_NAME },
        "publisher": { "@type": "Organization", "name": BRAND_BLOG_NAME },
        "datePublished": new Date().toISOString(),
        "mainEntityOfPage": `${SITE_URL}/blog/post${postNumber}/`
    };

    const frontmatter = `---
title: "${finalTitle.replace(/"/g, '\\"')}"
description: "${finalDescription.replace(/"/g, '\\"')}"
keywords: "${keyword}, BlondePlace, салон красоты, профессиональные услуги"
pubDate: "${new Date().toISOString()}"
author: "${BRAND_AUTHOR_NAME}"
heroImage: "${FALLBACK_IMAGE_URL}"
schema: ${JSON.stringify(schema)}
---

${articleText}
`;

    return { content: frontmatter, title: finalTitle, description: finalDescription };
}

async function main() {
    console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] === БОЕВОЙ ЗАПУСК ===`);
    
    try {
        const postsDir = path.join(process.cwd(), POSTS_DIR);
        await fs.mkdir(postsDir, { recursive: true });
        
        console.log(`[🎯] [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей по 8 ключам`);
        
        let postCounter = (threadId - 1) * targetArticles + 1; // Уникальная нумерация для каждого потока
        
        for (let i = 0; i < targetArticles; i++) {
            const keyword = ALPHA_KEYWORDS[i % ALPHA_KEYWORDS.length];
            const postNumber = postCounter + i;
            
            try {
                const slug = `post${postNumber}`;
                const filePath = path.join(postsDir, `${slug}.md`);
                
                const result = await generateAlphaArticle(keyword, postNumber);
                await fs.writeFile(filePath, result.content);
                
                console.log(`[✅] [АЛЬФА-УДАР #${threadId}] Статья #${postNumber} создана: "${result.title}"`);
                
                // Мгновенная отправка в IndexNow
                const url = `${SITE_URL}/blog/${slug}/`;
                await notifyIndexNow(url);
                
                // Минимальная пауза для избежания rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`[💥] [АЛЬФА-УДАР #${threadId}] Ошибка статьи #${postCounter + i}: ${error.message}`);
                continue;
            }
        }
        
        console.log(`[🏆] [АЛЬФА-УДАР #${threadId}] === МИССИЯ ЗАВЕРШЕНА ===`);
        console.log(`[📊] Создано статей: ${targetArticles}`);
        console.log(`[🔗] Общее количество ссылок на основной сайт: ~${targetArticles * 85}`);
        
    } catch (error) {
        console.error(`[💥] [АЛЬФА-УДАР #${threadId}] КРИТИЧЕСКАЯ ОШИБКА:`, error);
        process.exit(1);
    }
}

main(); 