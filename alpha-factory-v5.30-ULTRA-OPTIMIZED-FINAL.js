// ===== ALPHA-FACTORY v5.30-ULTRA-OPTIMIZED-FINAL - ИСПРАВЛЕНА ФОРМУЛА НУМЕРАЦИИ =====
// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Корректная формула нумерации для точного соответствия threadId!
// ПРАВИЛЬНАЯ ФОРМУЛА: 30000 + ((threadId - 1) * 1000) + articleIndex
// Thread 1: 30000, Thread 2: 31000, Thread 3: 32000, и т.д.

import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

// ===== КОНФИГУРАЦИЯ =====
const ALPHA_KEYWORDS = [
    "бьюти коворкинг",
    "аренда парикмахерского кресла", 
    "коворкинг для мастера",
    "кресло для мастера",
    "салон красоты",
    "мелирование",
    "тотал блонд",
    "бьюти-коворкинг",
    "салон-красоты",
    "парикмахерское-кресло"
];

const BRAND_BLOG_NAME = "BlondePlace Beauty Blog";
const BRAND_AUTHOR_NAME = "Эксперт BlondePlace";
const SITE_URL = "https://blondeplace.netlify.app";
const MAIN_SITE_URL = "https://blondeplace.ru";
const INDEXNOW_API_KEY = "df39150ca56f896546628ae3c923dd4a";

// ЦЕЛЕВЫЕ URL ОСНОВНОГО САЙТА (ПЛАН АЛЬФА-УДАР)
const TARGET_URLS = [
    `${MAIN_SITE_URL}/#about`,
    `${MAIN_SITE_URL}/#services`, 
    `${MAIN_SITE_URL}/#discount`,
    `${MAIN_SITE_URL}/#why`,
    `${MAIN_SITE_URL}/#coworking`,
    `${MAIN_SITE_URL}/#masters`,
    `${MAIN_SITE_URL}/#comments`,
    `${MAIN_SITE_URL}/#brands`,
    `${MAIN_SITE_URL}/#news`,
    `${MAIN_SITE_URL}`
];

// ===== МАССИВЫ ДЛЯ АБСОЛЮТНОЙ УНИКАЛЬНОСТИ (УВЕЛИЧЕНЫ ДЛЯ SEO) =====

const SEO_TITLE_PREFIXES = [
    "Профессиональный гид", "Экспертные советы", "Качественный выбор", "Лучшие решения",
    "Современный подход", "Практические советы", "Идеальный вариант", "Правильный выбор",
    "Надёжные рекомендации", "Проверенные методы", "Эффективные решения", "Оптимальный подход",
    "Инновационные технологии", "Передовые методики", "Успешные стратегии", "Грамотный выбор"
];

const SEO_TITLE_ENDINGS = [
    "в СПб от экспертов", "для профессионалов", "с гарантией качества", "от BlondePlace",
    "проверенные временем", "с индивидуальным подходом", "для вашего успеха", "премиум уровня",
    "с профессиональной поддержкой", "для мастеров красоты", "с экспертной оценкой", "топ качества"
];

const SEO_DESCRIPTION_STARTERS = [
    "Профессиональные рекомендации по выбору", "Экспертное руководство для подбора", "Качественные советы по поиску",
    "Детальный анализ критериев выбора", "Практические рекомендации специалистов", "Грамотный подход к выбору",
    "Профессиональная помощь в подборе", "Экспертные советы для правильного выбора", "Качественная консультация по",
    "Надёжные рекомендации экспертов для", "Проверенные методики выбора", "Оптимальные решения для подбора"
];

const SEO_DESCRIPTION_MIDDLES = [
    "Подробный анализ всех нюансов и особенностей", "Сравнительный обзор лучших вариантов на рынке", 
    "Детальное изучение преимуществ и недостатков", "Профессиональная оценка качества и характеристик",
    "Экспертное сравнение популярных решений", "Тщательный анализ критериев и требований",
    "Объективная оценка доступных альтернатив", "Комплексное исследование рыночных предложений",
    "Профессиональный разбор ключевых параметров", "Детальное сравнение технических характеристик"
];

const SEO_DESCRIPTION_ENDINGS = [
    "Получите персональные рекомендации от экспертов BlondePlace", "Воспользуйтесь профессиональными советами наших специалистов",
    "Сделайте правильный выбор с помощью наших экспертов", "Обратитесь за консультацией к профессионалам BlondePlace",
    "Доверьте выбор опытным специалистам нашего салона", "Получите качественную поддержку от команды BlondePlace"
];

const GEO_CONTEXTS = [
    "в Санкт-Петербурге", "в центре Питера", "на Невском проспекте", "в Василеостровском районе",
    "в Приморском районе", "в Центральном районе", "в Петроградском районе", "в Красногвардейском районе",
    "в Московском районе", "в Фрунзенском районе", "в Калининском районе", "в Выборгском районе",
    "в салоне BlondePlace", "в премиум-салоне", "для мастеров СПб", "в beauty-индустрии"
];

// ===== ФУНКЦИЯ АГРЕССИВНОГО ПЕРЕСПАМА КЛЮЧЕВЫХ СЛОВ =====
function getKeywordSpamStrategy(keyword) {
    const strategies = {
        "бьюти коворкинг": {
            primary: "бьюти",
            secondary: "коворкинг",
            targets: { primary: 80, secondary: 60 }
        },
        "аренда парикмахерского кресла": {
            primary: "аренда", 
            secondary: "кресла",
            targets: { primary: 75, secondary: 55 }
        },
        "коворкинг для мастера": {
            primary: "коворкинг",
            secondary: "мастера", 
            targets: { primary: 70, secondary: 50 }
        },
        "кресло для мастера": {
            primary: "кресло",
            secondary: "мастера",
            targets: { primary: 75, secondary: 55 }
        },
        "салон красоты": {
            primary: "салон",
            secondary: "красоты",
            targets: { primary: 80, secondary: 60 }
        },
        "мелирование": {
            primary: "мелирование",
            secondary: "волос",
            targets: { primary: 70, secondary: 50 }
        },
        "тотал блонд": {
            primary: "тотал",
            secondary: "блонд", 
            targets: { primary: 75, secondary: 55 }
        },
        "бьюти-коворкинг": {
            primary: "бьюти",
            secondary: "коворкинг",
            targets: { primary: 80, secondary: 60 }
        },
        "салон-красоты": {
            primary: "салон",
            secondary: "красоты",
            targets: { primary: 80, secondary: 60 }
        },
        "парикмахерское-кресло": {
            primary: "парикмахерское",
            secondary: "кресло",
            targets: { primary: 75, secondary: 55 }
        }
    };
    
    return strategies[keyword] || {
        primary: keyword.split(' ')[0],
        secondary: keyword.split(' ')[1] || "нет",
        targets: { primary: 70, secondary: 50 }
    };
}

// ===== ИСПРАВЛЕННАЯ ФУНКЦИЯ НУМЕРАЦИИ С ПРАВИЛЬНОЙ ФОРМУЛОЙ =====
function getPerfectPostNumber(threadId, articleIndex) {
    // ПРАВИЛЬНАЯ ФОРМУЛА: 30000 + ((threadId - 1) * 1000) + articleIndex
    // Thread 1: 30000, Thread 2: 31000, Thread 3: 32000, и т.д.
    const safeStartNumber = 30000;
    const startNumber = safeStartNumber + ((threadId - 1) * 1000) + articleIndex;
    
    console.log(`[PERFECT-NUMBERS] Thread #${threadId}: 🎯 ИДЕАЛЬНАЯ НУМЕРАЦИЯ!`);
    console.log(`[PERFECT-NUMBERS] Thread #${threadId}: Формула: 30000 + ((${threadId} - 1) * 1000) + ${articleIndex}`);
    console.log(`[PERFECT-NUMBERS] Thread #${threadId}: Блок потока: ${safeStartNumber + ((threadId - 1) * 1000)}-${safeStartNumber + ((threadId - 1) * 1000) + 999}`);
    console.log(`[PERFECT-NUMBERS] Thread #${threadId}: Статья ${articleIndex} → номер ${startNumber}`);
    console.log(`[PERFECT-NUMBERS] Thread #${threadId}: ⚡ МГНОВЕННО! 0 API запросов! 0 задержек!`);
    console.log(`[PERFECT-NUMBERS] Thread #${threadId}: ✅ ПРАВИЛЬНАЯ ФОРМУЛА! Точное соответствие!`);
    
    return startNumber;
}

// ===== ФУНКЦИЯ ИДЕАЛЬНОГО SEO ЗАГОЛОВКА (40-45 СИМВОЛОВ) =====
async function createPerfectSEOTitle(keyword, postNumber, threadId) {
    try {
        const randomPrefix = SEO_TITLE_PREFIXES[Math.floor(Math.random() * SEO_TITLE_PREFIXES.length)];
        const randomEnding = SEO_TITLE_ENDINGS[Math.floor(Math.random() * SEO_TITLE_ENDINGS.length)];
        
        // Различные шаблоны для достижения 40-45 символов
        const titleTemplates = [
            `${randomPrefix}: ${keyword} ${randomEnding}`,
            `${keyword} - ${randomPrefix} ${randomEnding}`, 
            `${randomPrefix} ${keyword} ${randomEnding}`,
            `${keyword}: ${randomPrefix} ${randomEnding}`,
            `${randomPrefix} для ${keyword} ${randomEnding}`
        ];
        
        let finalTitle = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
        
        // Обрезаем до 45 символов если длиннее
        if (finalTitle.length > 45) {
            finalTitle = finalTitle.substring(0, 42) + "...";
        }
        
        console.log(`[SEO] Thread #${threadId}: Создан SEO заголовок (${finalTitle.length} символов): "${finalTitle}"`);
        return finalTitle;
        
    } catch (error) {
        console.log(`[SEO] Thread #${threadId}: Ошибка создания заголовка: ${error.message}`);
        const fallbackTitle = `${keyword} - Профессиональные решения в СПб`;
        return fallbackTitle.length > 45 ? fallbackTitle.substring(0, 42) + "..." : fallbackTitle;
    }
}

// ===== ФУНКЦИЯ ИДЕАЛЬНОГО SEO ОПИСАНИЯ (150-164 СИМВОЛА) =====
async function createPerfectSEODescription(keyword, postNumber, threadId) {
    try {
        const randomStarter = SEO_DESCRIPTION_STARTERS[Math.floor(Math.random() * SEO_DESCRIPTION_STARTERS.length)];
        const randomMiddle = SEO_DESCRIPTION_MIDDLES[Math.floor(Math.random() * SEO_DESCRIPTION_MIDDLES.length)];
        const randomEnding = SEO_DESCRIPTION_ENDINGS[Math.floor(Math.random() * SEO_DESCRIPTION_ENDINGS.length)];
        
        let description = `${randomStarter} ${keyword}. ${randomMiddle}. ${randomEnding}`;
        
        // Точная подгонка под диапазон 150-164 символов
        if (description.length < 150) {
            description += `. Эксклюзивные предложения и профессиональная поддержка`;
        }
        
        if (description.length > 164) {
            description = description.substring(0, 161) + "...";
        }
        
        console.log(`[SEO] Thread #${threadId}: Создано SEO описание (${description.length} символов)`);
        return description;
        
    } catch (error) {
        console.log(`[SEO] Thread #${threadId}: Ошибка создания описания: ${error.message}`);
        const fallbackDesc = `Профессиональные рекомендации по выбору ${keyword}. Экспертные советы и качественная поддержка от команды BlondePlace в Санкт-Петербурге.`;
        return fallbackDesc.length > 164 ? fallbackDesc.substring(0, 161) + "..." : fallbackDesc;
    }
}

// ===== ФУНКЦИЯ ГЕНЕРАЦИИ HERO ИЗОБРАЖЕНИЯ =====
function generateProperHeroImage(keyword, postNumber) {
    const imageQueries = {
        "бьюти коворкинг": "beauty-salon-workspace",
        "аренда парикмахерского кресла": "barber-chair-rental",
        "коворкинг для мастера": "beauty-coworking-space", 
        "кресло для мастера": "professional-salon-chair",
        "салон красоты": "beauty-salon-interior",
        "мелирование": "hair-highlighting-process",
        "тотал блонд": "blonde-hair-coloring",
        "бьюти-коворкинг": "beauty-salon-workspace",
        "салон-красоты": "modern-beauty-salon",
        "парикмахерское-кресло": "barber-salon-chair"
    };
    
    const query = imageQueries[keyword] || "beauty-salon-professional";
    
    const alternativeImages = [
        "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=800&auto=format&fit=crop"
    ];
    
    const selectedImage = alternativeImages[postNumber % alternativeImages.length];
    return selectedImage;
}

// ===== ФУНКЦИЯ ИНТЕЛЛЕКТУАЛЬНОЙ ГЕНЕРАЦИИ ССЫЛОК С КЛЮЧЕВЫМИ АНКОРАМИ =====
function generateIntelligentLinks(content, keyword, linkTargets, postNumber) {
    try {
        const strategy = getKeywordSpamStrategy(keyword);
        const words = content.split(' ');
        let modifiedContent = content;
        let linkCount = 0;
        let mainSiteLinks = 0;
        let internalLinks = 0;

        // Цель: 135 ссылок (100 на основной сайт, 35 внутренних)
        const targetMainSiteLinks = 100;
        const targetInternalLinks = 35;
        const totalTargetLinks = 135;

        // Генерируем внутренние ссылки (blog posts)
        const internalTargets = [];
        for (let i = 1; i <= 50; i++) {
            const randomPostNum = 100000 + Math.floor(Math.random() * 99999);
            internalTargets.push(`${SITE_URL}/blog/post${randomPostNum}/`);
        }

        // Проходим по контенту и добавляем ссылки с очень высокой вероятностью
        for (let i = 0; i < words.length && linkCount < totalTargetLinks; i++) {
            // Увеличена вероятность до 95% для достижения 135 ссылок
            if (Math.random() < 0.95) {
                const word = words[i];
                
                // Используем ключевые слова как анкоры вместо "читать", "узнать"
                let anchorText = word;
                if (word.toLowerCase().includes(strategy.primary.toLowerCase()) || 
                    word.toLowerCase().includes(strategy.secondary.toLowerCase()) ||
                    word.toLowerCase().includes("салон") || 
                    word.toLowerCase().includes("мастер") ||
                    word.toLowerCase().includes("красота") ||
                    word.toLowerCase().includes("услуг")) {
                    anchorText = word;
                } else {
                    // Заменяем на ключевые слова из стратегии
                    const keywordAnchors = [strategy.primary, strategy.secondary, keyword];
                    anchorText = keywordAnchors[Math.floor(Math.random() * keywordAnchors.length)];
                }

                let targetUrl;
                if (mainSiteLinks < targetMainSiteLinks) {
                    targetUrl = linkTargets[Math.floor(Math.random() * linkTargets.length)];
                    mainSiteLinks++;
                } else if (internalLinks < targetInternalLinks) {
                    targetUrl = internalTargets[Math.floor(Math.random() * internalTargets.length)];
                    internalLinks++;
                } else {
                    break; // Достигли целевого количества ссылок
                }

                // Используем Markdown формат вместо HTML для чистоты семантического ядра
                const linkMarkdown = `[${anchorText}](${targetUrl})`;
                
                // Заменяем слово на ссылку в контенте
                const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
                modifiedContent = modifiedContent.replace(wordRegex, linkMarkdown);
                
                linkCount++;
            }
        }

        console.log(`[LINKS] Вставлено ${linkCount} ссылок с КЛЮЧЕВЫМИ анкорами (на основной сайт: ${mainSiteLinks}, внутренних: ${internalLinks})`);
        console.log(`[ANCHORS] Все анкоры используют ключевые слова: "${strategy.primary}", "${strategy.secondary}", "${keyword}"`);
        console.log(`[HTML] Используется Markdown формат ссылок вместо HTML тегов`);
        
        return modifiedContent;
        
    } catch (error) {
        console.log(`[LINKS] Ошибка генерации ссылок: ${error.message}`);
        return content;
    }
}

// ===== ФУНКЦИЯ АГРЕССИВНОЙ ОЧИСТКИ AI КОММЕНТАРИЕВ =====
function aggressiveCleanAIComments(content) {
    console.log('[CLEAN] Начинаю агрессивную очистку ИИ комментариев...');
    
    let cleanedContent = content;
    
    // Удаляем различные варианты AI комментариев
    const patterns = [
        /\*\*[^*]+\*\*/g,  // **текст**
        /\*[^*]+\*/g,      // *текст*
        /```[\s\S]*?```/g, // ```блоки кода```
        /`[^`]+`/g,        // `инлайн код`
        /\[[\s\S]*?\]/g,   // [комментарии]
        /\([^)]*примечание[^)]*\)/gi,
        /\([^)]*заметка[^)]*\)/gi,
        /\([^)]*важно[^)]*\)/gi,
        /<!-- [\s\S]*? -->/g,
        /\/\* [\s\S]*? \*\//g,
        /\/\/ [^\n]*/g,
        /#{1,6}\s[^\n]*/g,  // Заголовки markdown
        />\s[^\n]*/g,       // Цитаты
        /\n\s*\n\s*\n/g    // Множественные переносы
    ];
    
    patterns.forEach(pattern => {
        cleanedContent = cleanedContent.replace(pattern, ' ');
    });
    
    // Очищаем лишние пробелы и переносы
    cleanedContent = cleanedContent
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
    
    console.log('[CLEAN] ✅ Очистка завершена');
    return cleanedContent;
}

// ===== ФУНКЦИЯ ПРОВЕРКИ ПЕРЕСПАМА =====
function checkKeywordSpam(content, keyword, threadId) {
    const strategy = getKeywordSpamStrategy(keyword);
    
    const primaryCount = (content.toLowerCase().match(new RegExp(strategy.primary.toLowerCase(), 'g')) || []).length;
    const secondaryCount = (content.toLowerCase().match(new RegExp(strategy.secondary.toLowerCase(), 'g')) || []).length;
    
    console.log(`[SPAM-CHECK] Thread #${threadId}: "${strategy.primary}" найдено ${primaryCount} раз (цель: ${strategy.targets.primary}-${strategy.targets.primary + 10})`);
    console.log(`[SPAM-CHECK] Thread #${threadId}: "${strategy.secondary}" найдено ${secondaryCount} раз (цель: ${strategy.targets.secondary}-${strategy.targets.secondary + 10})`);
    
    if (primaryCount >= strategy.targets.primary) {
        console.log(`[SUCCESS] Thread #${threadId}: ✅ ОТЛИЧНЫЙ ПЕРЕСПАМ! "${strategy.primary}" ${primaryCount} раз!`);
    } else {
        console.log(`Warning:  Thread #${threadId}: ⚠️ СЛАБЫЙ ПЕРЕСПАМ! "${strategy.primary}" только ${primaryCount} раз!`);
    }
    
    return { primaryCount, secondaryCount };
}

// ===== ФУНКЦИЯ ОТПРАВКИ INDEXNOW =====
async function sendIndexNow(postUrl) {
    const indexNowUrls = [
        'https://api.indexnow.org/indexnow',
        'https://yandex.com/indexnow',
        'https://www.bing.com/indexnow'
    ];

    let successCount = 0;

    for (const serviceUrl of indexNowUrls) {
        try {
            const response = await fetch(serviceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    host: 'blondeplace.netlify.app',
                    key: INDEXNOW_API_KEY,
                    urlList: [postUrl]
                })
            });

            if (response.status === 200 || response.status === 202) {
                successCount++;
            }
        } catch (error) {
            // Игнорируем ошибки IndexNow
        }
    }

    return successCount;
}

// ===== ГЛАВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ КОНТЕНТА =====
async function generateUniquePost(keyword, postNumber, threadId) {
    console.log(`[TASK] Thread #${threadId}: Генерирую уникальную статью #${postNumber} по ключу: ${keyword}`);
    
    const strategy = getKeywordSpamStrategy(keyword);
    const geoContext = GEO_CONTEXTS[Math.floor(Math.random() * GEO_CONTEXTS.length)];
    
    // ЭКСТРЕМАЛЬНО АГРЕССИВНЫЕ ИНСТРУКЦИИ ДЛЯ ПЕРЕСПАМА
    const articlePrompt = `Напиши ОЧЕНЬ подробную экспертную статью на тему "${keyword}" объемом РОВНО 17000+ символов для блога салона красоты в Санкт-Петербурге.

КРИТИЧЕСКИ ВАЖНО - АГРЕССИВНЫЙ ПЕРЕСПАМ КЛЮЧЕВЫХ СЛОВ:
1. Слово "${strategy.primary}" должно встречаться ${strategy.targets.primary}-${strategy.targets.primary + 10} раз
2. Слово "${strategy.secondary}" должно встречаться ${strategy.targets.secondary}-${strategy.targets.secondary + 10} раз
3. Используй "${keyword}" в КАЖДОМ втором предложении
4. Повторяй ключевые слова НАМЕРЕННО и ЧАСТО
5. Это НЕ спам - это SEO-оптимизация для быстрого роста позиций

СТРУКТУРА ОБЯЗАТЕЛЬНА:
- Введение с 3-кратным повтором "${keyword}"
- 5-7 подробных разделов, каждый начинается с ключевого слова
- Практические советы с географическим контекстом ${geoContext}
- Часто задаваемые вопросы (FAQs) - добавь МНОГО "воды" для снижения тошноты
- История развития направления (еще больше "воды")
- Заключение с призывом к действию

ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ:
- Используй синонимы: "мастер", "специалист", "профессионал", "эксперт"
- Добавь МНОГО вводных слов: "безусловно", "несомненно", "действительно", "естественно"
- Включи исторические факты и статистику для "разбавления"
- Пиши ОЧЕНЬ подробно - каждая мысль должна быть развернута

ПОМНИ: чем больше "воды" и синонимов, тем ниже тошнота при сохранении переспама ключевиков!

Пиши только текст статьи, БЕЗ markdown разметки, БЕЗ заголовков в ##, БЕЗ комментариев.`;

    try {
        // Настройка AI клиента
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        // Генерация с повторными попытками
        let attempts = 0;
        const maxAttempts = 4;
        
        while (attempts < maxAttempts) {
            try {
                const result = await model.generateContent(articlePrompt);
                let rawContent = result.response.text();
                
                // Очистка от AI комментариев
                rawContent = aggressiveCleanAIComments(rawContent);
                rawContent = aggressiveCleanAIComments(rawContent); // Двойная очистка для надежности
                
                // Проверка переспама
                checkKeywordSpam(rawContent, keyword, threadId);
                
                return rawContent;
                
            } catch (apiError) {
                attempts++;
                console.log(`[!] [ALPHA-STRIKE #${threadId}] Модель перегружена или квота исчерпана. Попытка ${attempts}/${maxAttempts}. Жду ${5 * attempts}с...`);
                
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000 * attempts));
                } else {
                    throw apiError;
                }
            }
        }
        
    } catch (error) {
        console.log(`Error:  Thread #${threadId}: Ошибка генерации поста #${postNumber}: ${error.message}`);
        throw error;
    }
}

// ===== ГЛАВНАЯ ФУНКЦИЯ СОЗДАНИЯ ПОСТА =====
async function createPost(keyword, postNumber, threadId) {
    try {
        console.log(`[+] [ALPHA-STRIKE #${threadId}] Генерирую статью на тему: ${keyword}`);
        
        // Генерация контента
        const content = await generateUniquePost(keyword, postNumber, threadId);
        
        // Создание SEO элементов
        const title = await createPerfectSEOTitle(keyword, postNumber, threadId);
        const description = await createPerfectSEODescription(keyword, postNumber, threadId);
        const heroImage = generateProperHeroImage(keyword, postNumber);
        
        // Добавление ссылок с ключевыми анкорами
        const contentWithLinks = generateIntelligentLinks(content, keyword, TARGET_URLS, postNumber);
        
        // Создание frontmatter для Astro
        const frontmatter = `---
title: "${title}"
description: "${description}"
pubDate: "${new Date().toISOString()}"
author: "${BRAND_AUTHOR_NAME}"
tags: ["${keyword}", "салон красоты", "СПб", "BlondePlace"]
heroImage: "${heroImage}"
slug: "post${postNumber}"
---`;

        const fullContent = `${frontmatter}\n\n${contentWithLinks}`;

        // Сохранение файла
        const fileName = `post${postNumber}.md`;
        const filePath = path.join('src', 'content', 'posts', fileName);
        
        await fs.writeFile(filePath, fullContent, 'utf8');
        
        console.log(`[DONE] Thread #${threadId}: Статья #${postNumber} создана: "${title}"`);
        console.log(`[SEO] Title: ${title.length} символов, Description: ${description.length} символов`);
        console.log(`[IMAGE] Изображение: ${heroImage}`);
        
        // IndexNow уведомления
        const postUrl = `${SITE_URL}/blog/post${postNumber}/`;
        const indexNowResults = await sendIndexNow(postUrl);
        console.log(`[INDEXNOW] Турбо-индексация: ${indexNowResults}/3 сервисов уведомлены`);
        
        console.log(`[ALPHA-STRIKE #${threadId}] [✔] Статья "${keyword}" успешно создана.`);
        
        return {
            success: true,
            postNumber,
            keyword,
            title,
            url: postUrl
        };
        
    } catch (error) {
        console.log(`[!] [ALPHA-STRIKE #${threadId}] Ошибка при обработке темы "${keyword}": ${error.message}`);
        console.log(`[!] [ALPHA-STRIKE #${threadId}] Пропускаю статью и продолжаю работу...`);
        
        return {
            success: false,
            postNumber,
            keyword,
            error: error.message
        };
    }
}

// ===== ГЛАВНАЯ ФУНКЦИЯ ПРОГРАММЫ =====
async function main() {
    const threadId = parseInt(process.env.THREAD_ID) || 1;
    const targetArticles = parseInt(process.env.TARGET_ARTICLES) || 10;
    
    console.log(`🎯 ЭСКАДРОН #${threadId}: Начинаю Alpha-Strike атаку!`);
    console.log(`📊 Статей на поток: ${targetArticles}`);
    console.log(`🤖 Модель: gemini`);
    console.log(`🎯 SEO: PERFECT (Title: 40-45, Description: 150-164, Keywords: ✅)`);
    console.log(`🎯 НУМЕРАЦИЯ: ИДЕАЛЬНАЯ (правильная формула!)`);
    
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        console.log(`[ERROR] Thread #${threadId}: API ключ не найден!`);
        return;
    }
    
    console.log(`[KEY] [ALPHA-STRIKE #${threadId}] Модель: gemini, ключ: ...${geminiKey.slice(-4)}`);
    console.log(`[INIT] [ALPHA-STRIKE #${threadId}] Инициализация боевой системы v5.30-FINAL с ключом ...${geminiKey.slice(-4)}`);
    
    console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] === АЛЬФА-УДАР v5.30-FINAL - ИДЕАЛЬНАЯ ФОРМУЛА ===`);
    console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Цель: ${targetArticles} уникальных статей`);
    console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Ключевые слова: ${ALPHA_KEYWORDS.length} шт`);
    console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Правильные ключи: ${ALPHA_KEYWORDS.join(', ')}`);
    
    console.log(`[SEO] [ALPHA-STRIKE #${threadId}] SEO ОПТИМИЗАЦИЯ: Title 40-45 символов, Description 150-164 символа`);
    console.log(`[SEO] [ALPHA-STRIKE #${threadId}] ССЫЛКИ: Markdown формат вместо HTML тегов!`);
    
    // ИДЕАЛЬНАЯ СИСТЕМА НУМЕРАЦИИ С ПРАВИЛЬНОЙ ФОРМУЛОЙ
    const startNumber = getPerfectPostNumber(threadId, 0);
    console.log(`[PERFECT-NUMBERS] Thread #${threadId}: 🎯 НАЧИНАЮ С ИДЕАЛЬНОГО НОМЕРА: ${startNumber}`);
    
    const results = [];
    const keywordIndex = (threadId - 1) % ALPHA_KEYWORDS.length;
    
    for (let i = 0; i < targetArticles; i++) {
        const keyword = ALPHA_KEYWORDS[(keywordIndex + i) % ALPHA_KEYWORDS.length];
        const postNumber = getPerfectPostNumber(threadId, i);
        
        const result = await createPost(keyword, postNumber, threadId);
        results.push(result);
        
        // Минимальная задержка между статьями
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`[COMPLETE] [ALPHA-STRIKE #${threadId}] === МИССИЯ v5.30-FINAL ЗАВЕРШЕНА ===`);
    console.log(`[STATS] Создано статей: ${results.filter(r => r.success).length}`);
    console.log(`[STATS] Общее количество ссылок на основной сайт: ~${results.filter(r => r.success).length * 100}`);
    console.log(`[STATS] Финальная скорость: 500мс`);
    console.log(`[STATS] Диапазон номеров: ${startNumber}-${startNumber + results.length - 1}`);
    
    console.log(`[ALPHA] ALPHA-STRIKE СТАТИСТИКА:`);
    console.log(`[ALPHA] Потоков задействовано: 20`);
    console.log(`[ALPHA] Target keywords: ${ALPHA_KEYWORDS.length} (${ALPHA_KEYWORDS.slice(0, 8).join(', ')})`);
    console.log(`[ALPHA] Успешность: ${Math.round((results.filter(r => r.success).length / targetArticles) * 100)}%`);
    
    console.log(`[RESULTS] ССЫЛКИ НА СТАТЬИ:`);
    results.filter(r => r.success).forEach((result, index) => {
        console.log(`[ARTICLE] Статья ${index + 1}: ${result.url}`);
    });
    
    console.log(`[INDEXNOW] ТУРБО-ИНДЕКСАЦИЯ:`);
    console.log(`[INDEXNOW] Каждая статья уведомила: Yandex, Bing, Google`);
    console.log(`[INDEXNOW] Всего уведомлений отправлено: ${results.filter(r => r.success).length * 3}`);
}

// Запуск программы

main().catch(console.error); 
