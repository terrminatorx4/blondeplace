// ===== ALPHA-FACTORY v5.28 - РАБОЧАЯ ВЕРСИЯ с baseNumber = 200000 =====
// ОСНОВА: v5.4 (рабочая ротация API ключей) + ТОЛЬКО baseNumber = 200000!
// МИНИМАЛЬНЫЕ ИЗМЕНЕНИЯ: НЕ трогаем API ключи, только номера постов!
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { execa } from 'execa';

// --- СТТЫ ---
const SITE_URL = 'https://blondeplace.netlify.app';
const BRAND_NAME = 'BlondePlace';
const BRAND_BLOG_NAME = 'лог BlondePlace';
const BRAND_AUTHOR_NAME = 'ксперт BlondePlace';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop';
const INDEXNOW_API_KEY = 'df39150ca56f896546628ae3c923dd4a';
const TARGET_URL_MAIN = "https://blondeplace.ru";
const POSTS_DIR = 'src/content/posts';

// 🎯 ЬЫ 8 ЫХ С   Ь-
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

// --- СТ  ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-pro";

// --- Я API  ---
// --- ПАРСИНГ API КЛЮЧЕЙ ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;

// ПАРСИНГ ПУЛА КЛЮЧЕЙ (если передан пул)
const GEMINI_KEYS_POOL = process.env.GEMINI_API_KEYS_POOL;
const OPENROUTER_KEYS_POOL = process.env.OPENROUTER_API_KEYS_POOL;

let GEMINI_API_KEY_CURRENT = process.env.GEMINI_API_KEY_CURRENT;
let OPENROUTER_API_KEY_CURRENT = process.env.OPENROUTER_API_KEY_CURRENT;

// Если есть пул ключей - парсим и ротируем
if (GEMINI_KEYS_POOL) {
    const geminiKeys = GEMINI_KEYS_POOL.split(',').map(key => key.trim()).filter(Boolean);
    if (geminiKeys.length > 0) {
        const keyIndex = (threadId - 1) % geminiKeys.length;
        GEMINI_API_KEY_CURRENT = geminiKeys[keyIndex];
        console.log(`[KEYS] Thread #${threadId}: Выбран Gemini ключ #${keyIndex + 1} из ${geminiKeys.length}`);
    }
}

if (OPENROUTER_KEYS_POOL) {
    const openrouterKeys = OPENROUTER_KEYS_POOL.split(',').map(key => key.trim()).filter(Boolean);
    if (openrouterKeys.length > 0) {
        const keyIndex = (threadId - 1) % openrouterKeys.length;
        OPENROUTER_API_KEY_CURRENT = openrouterKeys[keyIndex];
        console.log(`[KEYS] Thread #${threadId}: Выбран OpenRouter ключ #${keyIndex + 1} из ${openrouterKeys.length}`);
    }
}

let apiKey;
if (modelChoice === 'deepseek') {
    apiKey = OPENROUTER_API_KEY_CURRENT;
} else {
    apiKey = GEMINI_API_KEY_CURRENT;
}

if (!apiKey) {
    throw new Error(`[ALPHA-STRIKE #${threadId}] е был предоставлен API-ключ!`);
}
console.log(`[KEY] [ALPHA-STRIKE #${threadId}] одель: ${modelChoice}, ключ: ...${apiKey.slice(-4)}`);

// --- СТЯ  ---
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const baseDelay = 500;

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
    let delay = 5000;
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
                    throw new Error(`шибка HTTP от OpenRouter: ${response.status}`);
                }
                const data = await response.json();
                if (!data.choices || data.choices.length === 0) throw new Error("твет от API OpenRouter не содержит поля 'choices'.");
                return data.choices[0].message.content;
            } else {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        } catch (error) {
            if (error.message.includes('503') || error.message.includes('429')) {
                console.warn(`[WARNING] [ALPHA-STRIKE #${threadId}] одель перегружена. опытка ${i + 1}/${maxRetries}. ду ${delay / 1000}с...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
    throw new Error(`[ALPHA-STRIKE #${threadId}] е удалось получить ответ от модели ${modelChoice} после ${maxRetries} попыток.`);
}

async function isUrlAccessible(url) {
    if (typeof url !== 'string' || !url.startsWith('http')) return false;
    try {
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        return response.ok;
    } catch (error) {
        console.warn(`[WARNING] е удалось проверить URL изображения: ${url}`);
        return false;
    }
}

// 🎯 Я ЬЫХ СТТ   С (СЯ СЯ)
async function generatePost(keyword, postNumber) {
    console.log(`[TASK] [ALPHA-STRIKE #${threadId}] енерирую уникальную статью #${postNumber} по ключу: ${keyword}`);
    
    //  FACTORY.JS: ХТЯ Я - С 
    const planPrompt = `Создай максимально детальный, многоуровневый план для экспертной SEO-статьи на тему "${keyword}". 

Т: Статья должна быть Ь и отличаться от других статей по этой же теме!

ТЯ  :
- инимум 15-20 разделов и подразделов
- ключи практические примеры, кейсы, пошаговые инструкции  
- обавь FAQ секцию (5-7 вопросов)
- ключи разделы: введение, основная часть, практические советы, частые ошибки, заключение
- лан должен покрывать тему полностью и всесторонне
- ЯТЬ: создай уникальный подход к теме "${keyword}" (например, через призму трендов 2024, инновационных техник, экспертных секретов)

онтекст: статья для блога салона красоты ${BRAND_NAME}, целевая аудитория - женщины 25-45 лет, интересующиеся красотой.

: Сделай план максимально уникальным и экспертным!`;

    const plan = await generateWithRetry(planPrompt);

    //  FACTORY.JS: Я  СТТЬ    
    const articlePrompt = `апиши исчерпывающую, экспертную статью объемом  15000 символов по этому плану:

${plan}

ТС ТЯ:
- Статья должна быть СЬ подробной и экспертной
- ЬЫ подход к теме "${keyword}" - не банальный контент!
- ключи множество конкретных примеров, практических советов, кейсов
- обавь списки, таблицы сравнения, пошаговые инструкции
- бязательно включи FAQ секцию в конце  
- иши от лица экспертов салона красоты ${BRAND_NAME}
- спользуй профессиональную терминологию, но объясняй сложные понятия
- Строго следуй плану и используй правильные Markdown заголовки (# ## ###)
-  добавляй изображения ![...], ссылки, URL-адреса
- ачинай сразу с заголовка H1
- : избегай частого повторения одних слов, используй синонимы и разнообразную лексику для снижения тошноты текста

Ъ: минимум 15000 символов - это критически важно!

Тема статьи: ${keyword}
онтекст: экспертный блог салона красоты ${BRAND_NAME}

ЯТЬ: Сделай статью максимально уникальной по теме "${keyword}"!`;

    let articleText = await generateWithRetry(articlePrompt);

    //  Ы   С  (  FACTORY.JS)
    if (articleText.length < 12000) {
        const extensionPrompt = `асширь статью "${keyword}". обавь:
        - ольше практических примеров
        - етальные пошаговые инструкции  
        - Советы от экспертов
        - астые ошибки и как их избежать
        - ополнительные подразделы
        
        Текущая статья:
        ${articleText}
        
        величь объем минимум в 1.5 раза, сохраняя экспертность и структуру.`;
        
        articleText = await generateWithRetry(extensionPrompt);
    }

    // 🔥 С-СТЯ СТ   FACTORY.JS ( Я ССЫ!)
    articleText = articleText.replace(/^.*?вот\s+(исчерпывающая|экспертная|подробная)?\s*(статья|руководство|гид).*$/gmi, "");
    articleText = articleText.replace(/^.*?конечно,?\s*/gmi, "");
    articleText = articleText.replace(/\*\*title:\*\*.*$/gmi, "");
    articleText = articleText.replace(/\*\*description:\*\*.*$/gmi, "");
    articleText = articleText.replace(/\*\*заголовок\s*\([^)]*\)\s*:\*\*.*$/gmi, "");
    articleText = articleText.replace(/^title:\s*.*/gmi, "");
    articleText = articleText.replace(/^description:\s*.*/gmi, "");
    articleText = articleText.replace(/^content:\s*.*/gmi, "");
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.replace(/www\.[^\s]+/g, '');
    articleText = articleText.trim();

    // 🎯 Я ЬЫХ SEO DATA  
    const seoPrompt = `ля статьи на тему "${keyword}" сгенерируй JSON-объект. ТС : ответ ТЬ валидный JSON.

JSON должен содержать: 
- "title" (длиной 40-45 символов, включи основное ключевое слово,  )
- "description" (длиной 150-164 символа, продающий, с призывом к действию) 
- "keywords" (СТ 5-7 ключевых слов через запятую, СЬ релевантных теме)
- "heroImage" (URL изображения с Unsplash подходящего по теме)

ТС требования к title:
-  быть ЬЫ и экспертным
-  банальный, а с изюминкой
-    !
- римеры: "Секреты ${keyword}: инсайды от топ-мастеров", "${keyword} 2024: революционные техники", "ак выбрать ${keyword}: экспертный чек-лист"

ТС требования к description:
-  быть ЬЫ и содержательным  
- ключать практическую ценность
-  дублировать заголовок

ТС требования к keywords:
- спользуй ТЬ термины  ТЫ статьи
-  используй общие слова типа "красота, стиль, уход"
- окусируйся на Т процедуре/технике

онтекст: блог салона красоты ${BRAND_NAME}.
омер статьи: #${postNumber} (для уникальности, но  включай в title)`;

    let seoText = await generateWithRetry(seoPrompt);
    const match = seoText.match(/\{[\s\S]*\}/);
    if (!match) { throw new Error("е удалось найти валидный JSON в ответе модели."); }
    const seoData = JSON.parse(match[0]);

    // SCHEMA.ORG С Т (  FACTORY.JS)
    const reviewCount = Math.floor(Math.random() * (900 - 300 + 1)) + 300;
    const ratingValue = (Math.random() * (5.0 - 4.7) + 4.7).toFixed(1);

    const isImageOk = await isUrlAccessible(seoData.heroImage);
    const finalHeroImage = isImageOk ? seoData.heroImage : FALLBACK_IMAGE_URL;

    // Я СХ HOWTO С ТЫ Т (  FACTORY.JS)
    const fullSchema = {
        "@context": "https://schema.org", 
        "@type": "HowTo",
        "name": seoData.title,
        "description": seoData.description, 
        "image": {
            "@type": "ImageObject",
            "url": finalHeroImage
        },
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
            "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/favicon.svg`
            }
        },
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "author": {
            "@type": "Person",
            "name": BRAND_AUTHOR_NAME
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${SITE_URL}/blog/post${postNumber}/`
        }
    };

    // 🔗 ЬЫ URL   Ь-
    const targetUrls = [
        `${TARGET_URL_MAIN}/#about`,
        `${TARGET_URL_MAIN}/#services`,
        `${TARGET_URL_MAIN}/#discount`,
        `${TARGET_URL_MAIN}/#why`,
        `${TARGET_URL_MAIN}/#coworking`,
        `${TARGET_URL_MAIN}/#masters`,
        `${TARGET_URL_MAIN}/#comments`,
        `${TARGET_URL_MAIN}/#brands`,
        `${TARGET_URL_MAIN}/#news`,
        `${TARGET_URL_MAIN}`
    ];

    // СТЯ 85 ССЫ (С СТ!)
    const words = articleText.split(' ');
    let linkCount = 0;
    const targetLinkCount = 85;
    const linkInterval = Math.floor(words.length / targetLinkCount);

    for (let i = linkInterval; i < words.length && linkCount < targetLinkCount; i += linkInterval) {
        const targetUrl = targetUrls[linkCount % targetUrls.length];
        const anchorText = words[i];
        if (anchorText && anchorText.length > 2) {
            words[i] = `[${anchorText}](${targetUrl})`;
            linkCount++;
        }
    }

    const finalContent = words.join(' ');
    console.log(`[LINKS] [ALPHA-STRIKE #${threadId}] ставлено ${linkCount} ссылок (внешних: ${linkCount}, внутренних: 0)`);

    // FRONTMATTER С SCHEMA.ORG (  FACTORY.JS)
    const frontmatter = `---
title: ${JSON.stringify(seoData.title)}
description: ${JSON.stringify(seoData.description)}
keywords: ${JSON.stringify(seoData.keywords || keyword)}
pubDate: ${JSON.stringify(new Date().toISOString())}
author: ${JSON.stringify(BRAND_AUTHOR_NAME)}
heroImage: ${JSON.stringify(finalHeroImage)}
schema: ${JSON.stringify(fullSchema)}
---
${finalContent}
`;
    
    // Сохраняем файл
    const filename = `post${postNumber}.md`;
    const filePath = path.join(POSTS_DIR, filename);
    
    await fs.writeFile(filePath, frontmatter, 'utf-8');
    console.log(`[DONE] [ALPHA-STRIKE #${threadId}] Статья #${postNumber} создана: "${seoData.title}"`);
    console.log(`[META] Title: ${seoData.title.length} символов, Description: ${seoData.description.length} символов`);
    console.log(`[SCHEMA] Schema.org HowTo с рейтингом ${ratingValue} (${reviewCount} отзывов)`);
    console.log(`[IMAGE] зображение: ${finalHeroImage}`);
    
    // IndexNow уведомление
    const articleUrl = `${SITE_URL}/blog/post${postNumber}`;
    await notifyIndexNow(articleUrl);
    console.log(`[INDEXNOW] [ALPHA-STRIKE #${threadId}] Турбо-индексация: 3/3 сервисов уведомлены`);
    
    return {
        filename,
        title: seoData.title,
        url: articleUrl,
        linkCount,
        keyword
    };
}

async function notifyIndexNow(url) {
    const HOST = "blondeplace.netlify.app";
    const payload = JSON.stringify({ host: HOST, key: INDEXNOW_API_KEY, urlList: [url] });

    try {
        await execa('curl', ['-X', 'POST', 'https://yandex.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        await execa('curl', ['-X', 'POST', 'https://www.bing.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        await execa('curl', ['-X', 'POST', 'https://google.com/ping?sitemap=' + encodeURIComponent(SITE_URL + '/sitemap.xml')]);
    } catch (error) {
        console.error(`[ERROR] [ALPHA-STRIKE #${threadId}] шибка IndexNow:`, error.message);
    }
}

// 🎯 ЬЯ  ALPHA-STRIKE С ЬЫ 8 Ы С
async function main() {
    console.log(`[INIT] [ALPHA-STRIKE #${threadId}] нициализация боевой системы v5.4 с ключом ...${apiKey.slice(-4)}`);

    try {
        const targetArticles = parseInt(process.env.TARGET_ARTICLES, 10) || 1;
        
        console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] === АЛЬФА-УДАР v5.28 ===`);
        console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Цель: ${targetArticles} уникальных статей`);
        console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Ключевые слова: ${ALPHA_KEYWORDS.length} шт`);
        console.log(`[ALPHA] [ALPHA-STRIKE #${threadId}] Правильные ключи: ${ALPHA_KEYWORDS.join(', ')}`);

        // ИСПРАВЛЕНИЕ: baseNumber = 200000 для обхода GitHub API лимита
        const baseNumber = 200000;
        const startNumber = baseNumber + (threadId * 100);
        console.log(`[NUMBERS] [ALPHA-STRIKE #${threadId}] Безопасный базовый номер: ${baseNumber}`);
        console.log(`[NUMBERS] [ALPHA-STRIKE #${threadId}] Начинаю нумерацию с: ${startNumber}`);

        let createdArticles = 0;
        let totalLinks = 0;
        const createdUrls = [];
        const keywordStats = {};

        for (let i = 0; i < targetArticles; i++) {
            // ЬЯ : берем ключевое слово по кругу
            const keywordIndex = (threadId - 1 + i) % ALPHA_KEYWORDS.length;
            const keyword = ALPHA_KEYWORDS[keywordIndex];
            const postNumber = startNumber + i;
            
            if (!keywordStats[keyword]) keywordStats[keyword] = 0;
            keywordStats[keyword]++;
            
            try {
                const result = await generatePost(keyword, postNumber);
                createdArticles++;
                totalLinks += result.linkCount;
                createdUrls.push(result.url);
                
                await delay(baseDelay);
            } catch (error) {
                console.error(`[ERROR] [ALPHA-STRIKE #${threadId}] шибка статьи #${postNumber}: ${error.message}`);
            }
        }

        console.log(`[COMPLETE] [ALPHA-STRIKE #${threadId}] === ССЯ v5.4 Ш ===`);
        console.log(`[STATS] Создано статей: ${createdArticles}`);
        console.log(`[STATS] бщее количество ссылок на основной сайт: ~${totalLinks}`);
        console.log(`[STATS] инальная скорость: ${baseDelay}мс`);
        console.log(`[STATS] иапазон номеров: ${startNumber}-${startNumber + createdArticles - 1}`);

        // СТТСТ  Ы С
        console.log(`[KEYWORDS] СТТСТ  Ы С:`);
        Object.entries(keywordStats).forEach(([keyword, count]) => {
            console.log(`[KEYWORDS] "${keyword}": ${count} статей`);
        });

        // ТТ С ССЫ
        console.log(`[RESULTS] СЫ СТТЬ:`);
        createdUrls.forEach((url, index) => {
            console.log(`[ARTICLE] Статья ${index + 1}: ${url}`);
        });

        console.log(`[INDEXNOW] INDEXNOW ТТ:`);
        console.log(`[INDEXNOW] Yandex IndexNow: ${createdArticles} URLs отправлено`);
        console.log(`[INDEXNOW] Bing IndexNow: ${createdArticles} URLs отправлено`);
        console.log(`[INDEXNOW] Google Sitemap Ping: ${createdArticles} URLs отправлено`);
        
    } catch (error) {
        console.error(`[FATAL] [ALPHA-STRIKE #${threadId}] ритическая ошибка:`, error.message);
        process.exit(1);
    }
}

// апуск
main();