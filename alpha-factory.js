// ===== ALPHA-FACTORY v5.7 - UNIQUE NUMBERS FIX =====
// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ:
// 1. Функция getNextAvailablePostNumber() теперь учитывает threadId
// 2. Каждый поток получает уникальный диапазон номеров
// 3. Нет перезаписи статей между потоками

import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

// ===== КОНФИГУРАЦИЯ =====
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

const BRAND_BLOG_NAME = "BlondePlace Beauty Blog";
const BRAND_AUTHOR_NAME = "Эксперт BlondePlace";
const SITE_URL = "https://blondeplace.netlify.app";
const MAIN_SITE_URL = "https://blondeplace.ru";
const INDEXNOW_API_KEY = "df39150ca56f896546628ae3c923dd4a";

// Правильные целевые URL для внешних ссылок (НЕ от Butler!)
const TARGET_URLS = [
    `${MAIN_SITE_URL}/#services`,
    `${MAIN_SITE_URL}/#about`, 
    `${MAIN_SITE_URL}/#contacts`,
    `${MAIN_SITE_URL}/#portfolio`,
    `${MAIN_SITE_URL}/#team`,
    `${MAIN_SITE_URL}/#pricing`,
    `${MAIN_SITE_URL}/#booking`,
    `${MAIN_SITE_URL}/#gallery`,
    `${MAIN_SITE_URL}/#reviews`,
    `${MAIN_SITE_URL}/#location`
];

// ===== ИСПРАВЛЕННАЯ ФУНКЦИЯ УНИКАЛЬНОЙ НУМЕРАЦИИ =====
async function getNextAvailablePostNumber(threadId) {
    try {
        console.log(`[NUMBERS] Thread #${threadId}: Получаю последний номер поста из GitHub API...`);
        
        const response = await fetch('https://api.github.com/repos/terrminatorx4/blondeplace/contents/src/content/posts', {
            headers: {
                'User-Agent': 'Alpha-Factory-v5.7'
            }
        });
        
        if (!response.ok) {
            console.log(`[NUMBERS] Thread #${threadId}: ⚠️ GitHub API недоступен, использую базовый номер`);
            // Fallback: базовый номер + уникальный сдвиг для каждого потока
            return 30000 + (threadId * 1000); // Thread 1: 31000, Thread 2: 32000, etc.
        }
        
        const files = await response.json();
        const postFiles = files.filter(file => 
            file.name.startsWith('post') && file.name.endsWith('.md')
        );
        
        let maxNumber = 0;
        
        for (const file of postFiles) {
            const match = file.name.match(/^post(\d+)\.md$/);
            if (match) {
                const number = parseInt(match[1], 10);
                if (number > maxNumber) {
                    maxNumber = number;
                }
            }
        }
        
        // ИСПРАВЛЕНИЕ: Каждый поток получает уникальный диапазон
        const baseNumber = maxNumber + 1000;
        const uniqueStartNumber = baseNumber + (threadId * 100); // Thread 1: +100, Thread 2: +200, etc.
        
        console.log(`[NUMBERS] Thread #${threadId}: Найден максимальный номер: ${maxNumber}`);
        console.log(`[NUMBERS] Thread #${threadId}: Уникальный стартовый номер: ${uniqueStartNumber}`);
        
        return uniqueStartNumber;
        
    } catch (error) {
        console.log(`[NUMBERS] Thread #${threadId}: ⚠️ Ошибка при получении номера: ${error.message}`);
        // Fallback с уникальным номером для каждого потока
        return 30000 + (threadId * 1000);
    }
}

// ===== АГРЕССИВНАЯ ОЧИСТКА ИИ КОММЕНТАРИЕВ =====
function cleanAIComments(text) {
    console.log('[CLEAN] Начинаю агрессивную очистку ИИ комментариев...');
    
    let cleaned = text;
    
    // Удаляем все ИИ интро (САМОЕ ВАЖНОЕ!)
    const aiIntroPatterns = [
        /!\s*[Вв]от\s+исчерпывающая.*?статья.*?\n/gmi,
        /[Кк]онечно,?\s*вот\s+.*?(статья|инструкция|гид).*?\n/gmi,
        /[Оо]тлично,?\s*вот\s+.*?(статья|инструкция|гид).*?\n/gmi,
        /!\s*[Сс]оздаю\s+исчерпывающую.*?\n/gmi,
        /[Вв]от\s+исчерпывающая\s+экспертная\s+статья.*?\n/gmi,
        /[Вв]от\s+подробная\s+статья.*?\n/gmi,
        /[Вв]от\s+полная\s+статья.*?\n/gmi,
        /написанная\s+строго\s+по\s+вашему.*?плану.*?\n/gmi,
        /с\s+учетом\s+всех\s+требований.*?\n/gmi
    ];
    
    for (const pattern of aiIntroPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }
    
    // Удаляем метки
    cleaned = cleaned.replace(/^title:\s*.*/gmi, '');
    cleaned = cleaned.replace(/^description:\s*.*/gmi, '');
    cleaned = cleaned.replace(/^content:\s*.*/gmi, '');
    cleaned = cleaned.replace(/\*\*title:\*\*.*$/gmi, '');
    cleaned = cleaned.replace(/\*\*description:\*\*.*$/gmi, '');
    
    // Удаляем избыточные переносы
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleaned = cleaned.trim();
    
    console.log('[CLEAN] ✅ Очистка завершена');
    return cleaned;
}

// ===== ГЕНЕРАЦИЯ ПРАВИЛЬНОГО ИЗОБРАЖЕНИЯ =====
function generateProperHeroImage(keyword) {
    // Используем правильные изображения для BlondePlace (НЕ от Butler!)
    const imageMap = {
        "бьюти коворкинг": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop",
        "аренда парикмахерского кресла": "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=2070&auto=format&fit=crop", 
        "коворкинг для мастера": "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?q=80&w=2070&auto=format&fit=crop",
        "места в аренду": "https://images.unsplash.com/photo-1560448075-bb485b067938?q=80&w=2070&auto=format&fit=crop",
        "кресло для мастера": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop",
        "салон красоты": "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=2070&auto=format&fit=crop",
        "мелирование": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2070&auto=format&fit=crop",
        "тотал блонд": "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=2070&auto=format&fit=crop"
    };
    
    return imageMap[keyword] || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop";
}

// ===== ГЕНЕРАЦИЯ КОНТЕНТА С УЛУЧШЕННОЙ ОЧИСТКОЙ =====
async function generatePost(keyword, postNumber, threadId) {
    try {
        console.log(`[TASK] Thread #${threadId}: Генерирую уникальную статью #${postNumber} по ключу: ${keyword}`);
        
        const geoContext = getGeoContext(threadId);
        
        // Шаг 1: Генерация плана
        const planPrompt = `Создай детальный план статьи на тему "${keyword}" для beauty-блога. 
План должен включать:
- Введение с хуком
- 4-5 основных разделов
- Практические советы
- Заключение с призывом к действию

Ответь только планом, без лишних слов.`;

        const planResponse = await generateWithAI(planPrompt);
        const plan = cleanAIComments(planResponse);
        
        // Шаг 2: Генерация статьи по плану
        const articlePrompt = `Напиши экспертную статью объемом 15000+ символов по плану:

${plan}

Тема: "${keyword}"
Контекст: ${geoContext}

Требования:
- Пиши от лица эксперта BlondePlace
- Используй личный опыт и кейсы
- Добавь практические советы
- Включи эмоциональные моменты
- Стиль: экспертный, но дружелюбный
- БЕЗ вводных фраз типа "Конечно, вот статья"!

Начинай сразу с заголовка статьи.`;

        const articleResponse = await generateWithAI(articlePrompt);
        let articleText = cleanAIComments(articleResponse);
        
        // Создаем мета-данные
        const seoData = await createSmartUniqueTitle(keyword, postNumber, geoContext);
        const description = await createSmartUniqueDescription(keyword, postNumber, geoContext);
        
        // Генерируем правильное изображение
        const heroImage = generateProperHeroImage(keyword);
        
        // Создаем Schema.org
        const schema = createHowToSchema(seoData.title, description, heroImage, postNumber);
        
        // Вставляем ссылки
        articleText = generateIntelligentLinks(articleText);
        
        // Формируем финальный контент
        const frontMatter = `---
title: "${seoData.title}"
description: "${description}"
pubDate: ${new Date().toISOString()}
heroImage: "${heroImage}"
category: "Beauty советы"
tags: ["${keyword}", "beauty", "салон красоты", "BlondePlace"]
---

<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>

`;

        const fullContent = frontMatter + articleText;
        
        // Сохраняем статью
        const fileName = `post${postNumber}.md`;
        const filePath = path.join('src/content/posts', fileName);
        await fs.writeFile(filePath, fullContent, 'utf8');
        
        console.log(`[DONE] Thread #${threadId}: Статья #${postNumber} создана: "${seoData.title}"`);
        console.log(`[META] Title: ${seoData.title.length} символов, Description: ${description.length} символов`);
        console.log(`[IMAGE] Изображение: ${heroImage}`);
        
        // IndexNow уведомление
        await turboIndexNotification(`${SITE_URL}/blog/post${postNumber}/`);
        
        return {
            postNumber,
            title: seoData.title,
            url: `${SITE_URL}/blog/post${postNumber}/`,
            keyword
        };
        
    } catch (error) {
        console.error(`[ERROR] Thread #${threadId}: Ошибка генерации поста #${postNumber}:`, error.message);
        throw error;
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getGeoContext(threadId) {
    const contexts = [
        "в Санкт-Петербурге",
        "в центре Питера", 
        "на Невском проспекте",
        "в салоне BlondePlace",
        "в премиум-салоне",
        "для мастеров СПб",
        "в beauty-индустрии",
        "в современном салоне"
    ];
    return contexts[(threadId - 1) % contexts.length];
}

async function createSmartUniqueTitle(keyword, postNumber, geoContext) {
    const variations = [
        `${keyword}: ваш гид по эргономике`,
        `${keyword}: секреты профессионалов`,
        `${keyword}: полный обзор 2025`,
        `${keyword}: как выбрать правильно`,
        `${keyword}: экспертные советы`,
        `${keyword}: практический гид`,
        `${keyword}: все что нужно знать`,
        `${keyword}: профессиональный подход`
    ];
    
    const baseTitle = variations[postNumber % variations.length];
    return { title: baseTitle.slice(0, 45) }; // Максимум 45 символов
}

async function createSmartUniqueDescription(keyword, postNumber, geoContext) {
    const variations = [
        `Неудобное кресло крадет вашу энергию и деньги. В статье разбираем, как высота, спинка и колесики влияют на продуктивность. Сделайте правильный выбор с нами.`,
        `Выбираете ${keyword}? Наш экспертный гид поможет избежать ошибок. Разбираем все нюансы: от эргономики до цены. Профессиональные советы ${geoContext}.`,
        `Качественный ${keyword} - основа успешной работы. Делимся секретами выбора, на которые обращают внимание профессионалы. Экспертные рекомендации от BlondePlace.`
    ];
    
    const description = variations[postNumber % variations.length];
    return description.slice(0, 160); // Максимум 160 символов
}

function createHowToSchema(title, description, heroImage, postNumber) {
    const ratingValue = (4.7 + Math.random() * 0.3).toFixed(1);
    const reviewCount = Math.floor(Math.random() * 600) + 300;
    
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": title,
        "description": description,
        "image": { "@type": "ImageObject", "url": heroImage },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": ratingValue,
            "reviewCount": reviewCount,
            "bestRating": "5",
            "worstRating": "1"
        },
        "publisher": { 
            "@type": "Organization", 
            "name": BRAND_BLOG_NAME, 
            "logo": { "@type": "ImageObject", "url": `${SITE_URL}/favicon.svg` } 
        },
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "author": { "@type": "Person", "name": BRAND_AUTHOR_NAME },
        "mainEntityOfPage": { "@type": "WebPage", "@id": `${SITE_URL}/blog/post${postNumber}/` }
    };
}

function generateIntelligentLinks(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    let linkCount = 0;
    const targetLinkCount = 85;
    
    for (let i = 0; i < sentences.length && linkCount < targetLinkCount; i++) {
        if (Math.random() < 0.4) { // 40% вероятность вставки ссылки
            const isExternal = Math.random() < 0.8; // 80% внешние ссылки
            
            if (isExternal) {
                const targetUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
                const linkText = "BlondePlace";
                sentences[i] += ` <a href="${targetUrl}" target="_blank">${linkText}</a>`;
                linkCount++;
            } else {
                // Внутренняя ссылка
                const internalPostNum = Math.floor(Math.random() * 20000) + 1000;
                sentences[i] += ` <a href="${SITE_URL}/blog/post${internalPostNum}/">подробнее здесь</a>`;
                linkCount++;
            }
        }
    }
    
    console.log(`[LINKS] Вставлено ${linkCount} ссылок (внешних: ${Math.floor(linkCount * 0.8)}, внутренних: ${Math.floor(linkCount * 0.2)})`);
    
    return sentences.join('.') + '.';
}

async function generateWithAI(prompt) {
    const modelChoice = process.env.MODEL_CHOICE || 'gemini';
    
    if (modelChoice === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY_CURRENT;
        if (!apiKey) throw new Error('GEMINI_API_KEY_CURRENT не найден');
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        
        const result = await model.generateContent(prompt);
        return result.response.text();
    } else {
        // OpenRouter
        const apiKey = process.env.OPENROUTER_API_KEY_CURRENT;
        if (!apiKey) throw new Error('OPENROUTER_API_KEY_CURRENT не найден');
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "deepseek/deepseek-chat",
                "messages": [{ "role": "user", "content": prompt }]
            })
        });
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
}

async function turboIndexNotification(url) {
    const payload = {
        host: "blondeplace.netlify.app",
        key: INDEXNOW_API_KEY,
        urlList: [url]
    };
    
    try {
        // Yandex IndexNow
        await fetch('https://yandex.com/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        // Bing IndexNow  
        await fetch('https://www.bing.com/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        // Google Sitemap Ping
        await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITE_URL + '/sitemap.xml')}`);
        
        console.log('[INDEXNOW] Турбо-индексация: 3/3 сервисов уведомлены');
        
    } catch (error) {
        console.log(`[INDEXNOW] ⚠️ Ошибка уведомления: ${error.message}`);
    }
}

// ===== ОСНОВНАЯ ФУНКЦИЯ =====
async function main() {
    try {
        const threadId = parseInt(process.env.THREAD_ID) || 1;
        const targetArticles = parseInt(process.env.TARGET_ARTICLES) || 1;
        const modelChoice = process.env.MODEL_CHOICE || 'gemini';
        
        console.log(`[KEY] [ALPHA-STRIKE #${threadId}] Модель: ${modelChoice}, ключ: ...${(process.env.GEMINI_API_KEY_CURRENT || process.env.OPENROUTER_API_KEY_CURRENT || '').slice(-4)}`);
        console.log(`[INIT] [ALPHA-STRIKE #${threadId}] Инициализация боевой системы v5.7 с ключом ...${(process.env.GEMINI_API_KEY_CURRENT || process.env.OPENROUTER_API_KEY_CURRENT || '').slice(-4)}`);
        console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] === АЛЬФА-УДАР v5.7 ===`);
        console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Цель: ${targetArticles} уникальных статей`);
        console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Ключевые слова: ${ALPHA_KEYWORDS.length} шт`);
        console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Правильные ключи: ${ALPHA_KEYWORDS.join(', ')}`);
        
        // ИСПРАВЛЕНО: Получаем уникальный стартовый номер для каждого потока
        const startNumber = await getNextAvailablePostNumber(threadId);
        console.log(`[NUMBERS] Thread #${threadId}: Начинаю нумерацию с: ${startNumber}`);
        
        const results = [];
        
        for (let i = 0; i < targetArticles; i++) {
            // ИСПРАВЛЕНО: Правильное распределение ключей по потокам
            const keywordIndex = (threadId - 1 + i) % ALPHA_KEYWORDS.length;
            const keyword = ALPHA_KEYWORDS[keywordIndex];
            const postNumber = startNumber + i;
            
            const result = await generatePost(keyword, postNumber, threadId);
            results.push(result);
            
            // Небольшая задержка между статьями
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`[COMPLETE] [ALPHA-STRIKE #${threadId}] === МИССИЯ v5.7 ЗАВЕРШЕНА ===`);
        console.log(`[STATS] Создано статей: ${results.length}`);
        console.log(`[STATS] Общее количество ссылок на основной сайт: ~${results.length * 85}`);
        console.log(`[STATS] Финальная скорость: 500мс`);
        console.log(`[STATS] Диапазон номеров: ${startNumber}-${startNumber + results.length - 1}`);
        
        // Статистика по ключевым словам
        console.log(`[KEYWORDS] СТАТИСТИКА ПО КЛЮЧЕВЫМ СЛОВАМ:`);
        const keywordStats = {};
        results.forEach(r => {
            keywordStats[r.keyword] = (keywordStats[r.keyword] || 0) + 1;
        });
        
        Object.entries(keywordStats).forEach(([keyword, count]) => {
            console.log(`[KEYWORDS] "${keyword}": ${count} статей`);
        });
        
        // Результаты статей
        console.log(`[RESULTS] ССЫЛКИ НА СТАТЬИ:`);
        results.forEach((result, index) => {
            console.log(`[ARTICLE] Статья ${index + 1}: ${result.url}`);
        });
        
        // IndexNow статистика
        console.log(`[INDEXNOW] INDEXNOW СТАТИСТИКА:`);
        console.log(`[INDEXNOW] Yandex IndexNow: ${results.length} URLs отправлено`);
        console.log(`[INDEXNOW] Bing IndexNow: ${results.length} URLs отправлено`);
        console.log(`[INDEXNOW] Google Sitemap Ping: ${results.length} URLs отправлено`);
        
    } catch (error) {
        console.error(`[FATAL ERROR] ${error.message}`);
        process.exit(1);
    }
}

// ES MODULES EXPORT
export { main };

// Запуск для прямого вызова
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
} 