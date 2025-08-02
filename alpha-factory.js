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

// --- МОДИФИКАТОРЫ ДЛЯ ЗАГОЛОВКОВ ---
const TITLE_MODIFIERS = [
    "2025", "срочно", "сегодня", "сейчас", "премиум", "элитный", "профессиональный", "современный",
    "выгодно", "удобно", "комфортно", "стильно", "центр", "метро", "удобная локация", "без депозита",
    "под ключ", "со всем оборудованием", "мебелированное", "для начинающих", "для опытных мастеров",
    "топ качество", "лучшие условия", "эксклюзив", "VIP", "бизнес класс", "новинка", "хит сезона",
    "тренд", "популярное", "востребованное", "инновационное", "уникальное", "особенное"
];

const DESCRIPTION_MODIFIERS = [
    "⭐ Лучшие условия", "✅ Без скрытых платежей", "🔥 Акция до конца месяца", "💎 Премиум локация",
    "🚀 Быстрое оформление", "⚡ Моментальное подключение", "💰 Выгодные цены", "🎯 Индивидуальный подход",
    "🏆 Топ предложение", "📞 Звоните сейчас", "🎁 Бонусы новым клиентам", "⏰ Ограниченное предложение"
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
const targetArticles = parseInt(process.env.ALPHA_ARTICLES, 10) || 30;

if (!apiKey) {
    throw new Error(`[АЛЬФА-УДАР #${threadId}] Не был предоставлен API-ключ!`);
}

console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] Инициализация боевой системы v3.0 с ключом ...${apiKey.slice(-4)}`);
console.log(`🎯 [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей с 80 ссылками каждая`);

// --- НАСТРОЙКИ МОДЕЛЕЙ (УСКОРЕННЫЕ) ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-flash"; // СКОРОСТНАЯ МОДЕЛЬ

// --- СИСТЕМА ГЛОБАЛЬНОЙ УНИКАЛЬНОСТИ МЕЖДУ ЗАПУСКАМИ ---
async function getNextAvailablePostNumber() {
    try {
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPOSITORY;
        
        if (!token || !repo) {
            console.warn(`[!] [АЛЬФА-УДАР #${threadId}] GitHub не настроен, начинаю с 1`);
            return 1;
        }

        // Получаем список всех файлов в директории posts
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${POSTS_DIR}`, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (!response.ok) {
            console.log(`[📁] [АЛЬФА-УДАР #${threadId}] Директория постов пуста, начинаю с 1`);
            return 1;
        }

        const files = await response.json();
        
        if (!Array.isArray(files) || files.length === 0) {
            console.log(`[📁] [АЛЬФА-УДАР #${threadId}] Нет существующих постов, начинаю с 1`);
            return 1;
        }

        // Извлекаем номера постов из имен файлов
        let maxPostNumber = 0;
        for (const file of files) {
            if (file.name.startsWith('post') && file.name.endsWith('.md')) {
                const numberMatch = file.name.match(/post(\d+)\.md/);
                if (numberMatch) {
                    const postNumber = parseInt(numberMatch[1], 10);
                    if (postNumber > maxPostNumber) {
                        maxPostNumber = postNumber;
                    }
                }
            }
        }

        const nextNumber = maxPostNumber + 1;
        console.log(`[🔢] [АЛЬФА-УДАР #${threadId}] Найден максимальный номер поста: ${maxPostNumber}, продолжаю с ${nextNumber}`);
        return nextNumber;

    } catch (error) {
        console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка определения номера поста: ${error.message}, начинаю с 1`);
        return 1;
    }
}

function generateVariation(keyword) {
    const words = keyword.split(' ');
    let result = '';
    
    for (const word of words) {
        const cleanWord = word.toLowerCase();
        if (SYNONYMS[cleanWord] && Math.random() > 0.4) { // Больше вариативности
            const synonyms = SYNONYMS[cleanWord];
            result += synonyms[Math.floor(Math.random() * synonyms.length)] + ' ';
        } else {
            result += word + ' ';
        }
    }
    
    return result.trim();
}

// СИСТЕМА АБСОЛЮТНО УНИКАЛЬНЫХ ЗАГОЛОВКОВ
function createAbsolutelyUniqueTitle(baseKeyword, postNumber) {
    const variation = generateVariation(baseKeyword);
    const modifier = TITLE_MODIFIERS[Math.floor(Math.random() * TITLE_MODIFIERS.length)];
    const timestamp = Date.now().toString().slice(-4); // Последние 4 цифры времени
    
    // Включаем postNumber + timestamp для 100% уникальности
    const title = `${variation}: ${modifier} ${postNumber}`;
    
    // Обрезаем до 45 символов, сохраняя целые слова
    if (title.length <= 45) {
        return title;
    }
    
    const words = title.split(' ');
    let result = '';
    for (const word of words) {
        if (result.length + word.length + 1 <= 42) { // Оставляем место для номера
            result += (result ? ' ' : '') + word;
        } else {
            break;
        }
    }
    
    // Если результат слишком короткий, добавляем номер
    return result ? `${result} ${postNumber}` : `${baseKeyword} ${postNumber}`;
}

function createAbsolutelyUniqueDescription(keyword, postNumber) {
    const modifier = DESCRIPTION_MODIFIERS[Math.floor(Math.random() * DESCRIPTION_MODIFIERS.length)];
    const variation = generateVariation(keyword);
    
    const description = `${modifier} ${variation} в BlondePlace! Профессиональное оборудование, удобная локация, выгодные условия. Запись: ${postNumber}.`;
    
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
    
    return result || `${keyword} в BlondePlace! Запись: ${postNumber}.`;
}

async function generateWithRetry(prompt, maxRetries = 3) {
    let delay = 1500; // УСКОРЕННАЯ ГЕНЕРАЦИЯ
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (modelChoice === 'deepseek') {
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': TARGET_URL_MAIN,
                        'X-Title': 'BlondePlace-Alpha-Strike-v3'
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
                delay *= 1.3; // Меньше задержка при повторах
            } else {
                throw error;
            }
        }
    }
}

// АГРЕССИВНАЯ ССЫЛОЧНАЯ СИСТЕМА (80 ССЫЛОК НА СТАТЬЮ)
function generateAggressiveLinks(keyword, articleText) {
    const targetLinks = 80; // ФИКСИРОВАННОЕ КОЛИЧЕСТВО
    
    // Расширенные анкоры для ссылок
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
        `записаться на ${keyword}`,
        `топ ${keyword}`,
        `${keyword} рядом`,
        `${keyword} недорого`,
        `${keyword} отзывы`
    ];
    
    // Разделяем текст на абзацы
    const paragraphs = articleText.split('\n\n').filter(p => p.trim().length > 0);
    let processedParagraphs = [];
    let addedLinks = 0;
    
    for (let i = 0; i < paragraphs.length && addedLinks < targetLinks; i++) {
        const paragraph = paragraphs[i];
        
        // НЕ добавляем ссылки в заголовки
        if (paragraph.trim().startsWith('#')) {
            processedParagraphs.push(paragraph);
            continue;
        }
        
        // Добавляем 2-4 ссылки в каждый обычный абзац
        let modifiedParagraph = paragraph;
        const linksInThisParagraph = Math.min(Math.floor(Math.random() * 3) + 2, targetLinks - addedLinks);
        
        for (let j = 0; j < linksInThisParagraph; j++) {
            const targetUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
            const anchor = anchorTemplates[Math.floor(Math.random() * anchorTemplates.length)];
            
            // Добавляем ссылку в случайное место абзаца
            const sentences = modifiedParagraph.split('. ');
            if (sentences.length > 1) {
                const randomSentenceIndex = Math.floor(Math.random() * sentences.length);
                sentences[randomSentenceIndex] += ` Подробнее о <a href="${targetUrl}" target="_blank">${anchor}</a>.`;
                modifiedParagraph = sentences.join('. ');
            }
            
            addedLinks++;
        }
        
        processedParagraphs.push(modifiedParagraph);
    }
    
    console.log(`[🔗] [АЛЬФА-УДАР #${threadId}] Вставлено ${addedLinks} ссылок на основной сайт`);
    return processedParagraphs.join('\n\n');
}

async function notifyIndexNow(url) {
    const payload = JSON.stringify({
        host: "blondeplace.netlify.app",
        key: INDEXNOW_API_KEY,
        urlList: [url]
    });

    try {
        await execa('curl', ['-X', 'POST', 'https://yandex.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        console.log(`[📢] [АЛЬФА-УДАР #${threadId}] IndexNow отправлен: ${url}`);
    } catch (error) {
        console.warn(`[!] [АЛЬФА-УДАР #${threadId}] IndexNow ошибка: ${url}`);
    }
}

async function commitToGithub(filePath, content, message) {
    try {
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPOSITORY;
        
        if (!token || !repo) {
            console.warn(`[!] [АЛЬФА-УДАР #${threadId}] GitHub токен не настроен`);
            return false;
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
            console.log(`[✅] [АЛЬФА-УДАР #${threadId}] Файл сохранен в GitHub: ${filePath}`);
            return true;
        } else {
            console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка GitHub API: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка сохранения: ${error.message}`);
        return false;
    }
}

async function generateAlphaArticle(keyword, postNumber) {
    console.log(`[💥] [АЛЬФА-УДАР #${threadId}] Генерирую статью #${postNumber} по ключу: ${keyword}`);

    // УСКОРЕННЫЙ ПРОМПТ ДЛЯ БЫСТРОЙ ГЕНЕРАЦИИ
    const articlePrompt = `Напиши SEO-статью на тему "${keyword}" для салона красоты BlondePlace.

ТРЕБОВАНИЯ:
- Объем: 5000-7000 символов
- Структура: # H1, ## H2, ### H3 в Markdown
- Тематика: ${keyword} в контексте салона BlondePlace
- Стиль: Экспертный, от лица BlondePlace
- БЕЗ ссылок (добавлю сам)
- БЕЗ изображений
- Сразу начинай с H1

Пиши быстро и качественно!`;

    let articleText = await generateWithRetry(articlePrompt);
    
    // Супер-очистка от всех ссылок и изображений
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.replace(/www\.[^\s]+/g, '');
    articleText = articleText.trim();

    // АГРЕССИВНАЯ ВСТАВКА 80 ССЫЛОК
    articleText = generateAggressiveLinks(keyword, articleText);

    // АБСОЛЮТНО УНИКАЛЬНЫЕ МЕТА-ТЕГИ
    const uniqueTitle = createAbsolutelyUniqueTitle(keyword, postNumber);
    const uniqueDescription = createAbsolutelyUniqueDescription(keyword, postNumber);

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
    console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] === БОЕВОЙ ЗАПУСК v3.0 ===`);
    
    try {
        const postsDir = path.join(process.cwd(), POSTS_DIR);
        await fs.mkdir(postsDir, { recursive: true });
        
        console.log(`[🎯] [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей по 8 ключам`);
        
        // ПОЛУЧАЕМ СЛЕДУЮЩИЙ ДОСТУПНЫЙ НОМЕР ПОСТА (ГЛОБАЛЬНАЯ УНИКАЛЬНОСТЬ)
        const startPostNumber = await getNextAvailablePostNumber();
        
        // Распределяем номера между потоками
        const postsPerThread = Math.ceil(targetArticles / 1); // Для текущего потока
        const threadStartNumber = startPostNumber + (threadId - 1) * postsPerThread;
        
        console.log(`[🔢] [АЛЬФА-УДАР #${threadId}] Начинаю нумерацию с: ${threadStartNumber}`);
        
        for (let i = 0; i < targetArticles; i++) {
            const keyword = ALPHA_KEYWORDS[i % ALPHA_KEYWORDS.length];
            const postNumber = threadStartNumber + i;
            
            try {
                const slug = `post${postNumber}`;
                const filePath = path.join(postsDir, `${slug}.md`);
                const githubPath = `${POSTS_DIR}/${slug}.md`;
                
                const result = await generateAlphaArticle(keyword, postNumber);
                
                // Локальное сохранение
                await fs.writeFile(filePath, result.content);
                
                // Сохранение в GitHub
                const githubSuccess = await commitToGithub(githubPath, result.content, `🚀💥 АЛЬФА-УДАР v3.0: Статья #${postNumber} - ${result.title}`);
                
                console.log(`[✅] [АЛЬФА-УДАР #${threadId}] Статья #${postNumber} создана: "${result.title}"`);
                console.log(`[📏] Title: ${result.title.length} символов, Description: ${result.description.length} символов`);
                
                // Мгновенная отправка в IndexNow
                const url = `${SITE_URL}/blog/${slug}/`;
                await notifyIndexNow(url);
                
                // МИНИМАЛЬНАЯ ПАУЗА (СКОРОСТЬ)
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`[💥] [АЛЬФА-УДАР #${threadId}] Ошибка статьи #${threadStartNumber + i}: ${error.message}`);
                continue;
            }
        }
        
        console.log(`[🏆] [АЛЬФА-УДАР #${threadId}] === МИССИЯ ЗАВЕРШЕНА ===`);
        console.log(`[📊] Создано статей: ${targetArticles}`);
        console.log(`[🔗] Общее количество ссылок на основной сайт: ~${targetArticles * 80}`);
        console.log(`[🔢] Диапазон номеров: ${threadStartNumber}-${threadStartNumber + targetArticles - 1}`);
        
    } catch (error) {
        console.error(`[💥] [АЛЬФА-УДАР #${threadId}] КРИТИЧЕСКАЯ ОШИБКА:`, error);
        process.exit(1);
    }
}

main(); 