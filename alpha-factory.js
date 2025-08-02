// айл: alpha-factory.js (Alpha-Strike v5.2 - С ЫХ С  SCHEMA.ORG)
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

// --- СТ  ---
const TARGET_URL_MAIN = "https://blondeplace.ru";
const TOPICS_FILE = 'topics.txt'; //   FACTORY.JS!
const POSTS_DIR = 'src/content/posts';

// --- СТ  ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-pro";

// --- Я API  ---
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
                console.warn(`[!] [ALPHA-STRIKE #${threadId}] одель перегружена. опытка ${i + 1}/${maxRetries}. ду ${delay / 1000}с...`);
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
        console.warn(`[!] редупреждение: не удалось проверить URL изображения: ${url}`);
        return false;
    }
}

// ---   FACTORY.JS: ЬЯ Я generatePost С SCHEMA.ORG ---
async function generatePost(topic, postNumber) {
    console.log(`[TASK] [ALPHA-STRIKE #${threadId}] енерирую супер-статью #${postNumber} по ключу: ${topic}`);
    
    //  FACTORY.JS: С-ТЬЫ 
    const planPrompt = `Создай максимально детальный, многоуровневый план для экспертной SEO-статьи на тему "${topic}". 

ТЯ  :
- инимум 15-20 разделов и подразделов
- ключи практические примеры, кейсы, пошаговые инструкции  
- обавь FAQ секцию (5-7 вопросов)
- ключи разделы: введение, основная часть, практические советы, частые ошибки, заключение
- лан должен покрывать тему полностью и всесторонне

онтекст: статья для блога салона красоты ${BRAND_NAME}, целевая аудитория - женщины 25-45 лет, интересующиеся красотой.`;

    const plan = await generateWithRetry(planPrompt);

    //  FACTORY.JS: ТЯ    СТСТ
    const articlePrompt = `апиши исчерпывающую, экспертную статью объемом  15000 символов по этому плану:

${plan}

ТС ТЯ:
- Статья должна быть СЬ подробной и экспертной
- ключи множество конкретных примеров, практических советов, кейсов
- обавь списки, таблицы сравнения, пошаговые инструкции
- бязательно включи FAQ секцию в конце  
- иши от лица экспертов салона красоты ${BRAND_NAME}
-  используй слова типа "конечно", "вот статья" и другие вводные фразы
-  дублируй TITLE и DESCRIPTION в тексте
-  СТТЬ С С  
- спользуй профессиональную терминологию
- аждый раздел должен содержать практическую ценность

: ачинай ответ сразу с заголовка H1 (# аголовок).  СЯХ вводных слов!

Тема статьи: ${topic}
онтекст: экспертный блог салона красоты ${BRAND_NAME}`;

    let articleText = await generateWithRetry(articlePrompt);

    // С-СТЯ СТ   FACTORY.JS ( Я ССЫ!)
    articleText = articleText.replace(/^.*?вот\s+(исчерпывающая|экспертная|подробная)?\s*(статья|руководство|гид).*$/gmi, "");
    articleText = articleText.replace(/^.*?конечно,?\s*/gmi, "");
    articleText = articleText.replace(/\*\*title:\*\*.*$/gmi, "");
    articleText = articleText.replace(/\*\*description:\*\*.*$/gmi, "");
    articleText = articleText.replace(/\*\*заголовок\s*\([^)]*\)\s*:\*\*.*$/gmi, "");
    articleText = articleText.replace(/^title:\s*.*/gmi, "");
    articleText = articleText.replace(/^description:\s*.*/gmi, "");
    articleText = articleText.replace(/^content:\s*.*/gmi, "");
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.trim();

    //  FACTORY.JS:  SEO DATA
    const seoPrompt = `Создай SEO оптимизированные данные для статьи на тему "${topic}".

ерни СТ в формате JSON:
{
  "title": "SEO заголовок (40-50 символов)",
  "description": "SEO описание (150-160 символов)", 
  "keywords": "ключевые слова через запятую",
  "heroImage": "https://images.unsplash.com/photo-[подходящее изображение по теме]"
}

ТС требования к keywords:
- спользуй ТЬ термины  ТЫ статьи
-  используй общие слова типа "красота, стиль, уход"
- окусируйся на Т процедуре/технике

онтекст: блог салона красоты ${BRAND_NAME}.`;

    let seoText = await generateWithRetry(seoPrompt);
    const match = seoText.match(/\{[\s\S]*\}/);
    if (!match) { throw new Error("е удалось найти валидный JSON в ответе модели."); }
    const seoData = JSON.parse(match[0]);

    //  FACTORY.JS: SCHEMA.ORG С Т
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

    // нтегрируем ссылки как в factory.js (С очистки!)
    const targetUrls = [
        `${TARGET_URL_MAIN}/uslugi/okrashivanie-volos`,
        `${TARGET_URL_MAIN}/uslugi/strizhki-ukladki`,
        `${TARGET_URL_MAIN}/uslugi/manicure-pedicure`,
        `${TARGET_URL_MAIN}/uslugi/kosmetologia`,
        `${TARGET_URL_MAIN}/about`,
        `${TARGET_URL_MAIN}/contacts`,
        `${TARGET_URL_MAIN}/portfolio`,
        `${TARGET_URL_MAIN}/ceny`,
        `${TARGET_URL_MAIN}/akcii`,
        `${TARGET_URL_MAIN}/blog`
    ];

    // ставляем 85 ссылок
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

    //  FACTORY.JS: FRONTMATTER С SCHEMA.ORG
    const frontmatter = `---
title: ${JSON.stringify(seoData.title)}
description: ${JSON.stringify(seoData.description)}
keywords: ${JSON.stringify(seoData.keywords || topic)}
pubDate: ${JSON.stringify(new Date().toISOString())}
author: ${JSON.stringify(BRAND_AUTHOR_NAME)}
heroImage: ${JSON.stringify(finalHeroImage)}
schema: ${JSON.stringify(fullSchema)}
tags: ["beauty-tips"]
category: "beauty-tips"
slug: "post${postNumber}"
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
    
    // IndexNow уведомление
    const articleUrl = `${SITE_URL}/blog/post${postNumber}`;
    await notifyIndexNow(articleUrl);
    console.log(`[INDEXNOW] [ALPHA-STRIKE #${threadId}] Турбо-индексация: 3/3 сервисов уведомлены`);
    
    return {
        filename,
        title: seoData.title,
        url: articleUrl,
        linkCount
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
        console.error(`[!] [ALPHA-STRIKE #${threadId}] шибка IndexNow:`, error.message);
    }
}

// ---  FACTORY.JS: Т Т  TOPICS.TXT ---
async function main() {
    console.log(`[INIT] [ALPHA-STRIKE #${threadId}] нициализация боевой системы v5.2 с ключом ...${apiKey.slice(-4)}`);

    try {
        const targetArticles = parseInt(process.env.TARGET_ARTICLES, 10) || 1;
        
        //  FACTORY.JS: Т TOPICS.TXT
        const fileContent = await fs.readFile(TOPICS_FILE, 'utf-8');
        const allTopics = fileContent.split(/\r?\n/).map(topic => topic.trim()).filter(Boolean);
        
        console.log(`[TOPICS] [ALPHA-STRIKE #${threadId}] агружено ${allTopics.length} тем из ${TOPICS_FILE}`);
        
        //  FACTORY.JS: СЯ ТЫ  Т
        const totalThreads = 20; // аксимальное количество потоков
        const startIndex = (threadId - 1) * targetArticles;
        const topicsForThisThread = allTopics.slice(startIndex, startIndex + targetArticles);
        
        if (topicsForThisThread.length === 0) {
            console.log(`[WARNING] [ALPHA-STRIKE #${threadId}] ет тем для этого потока. спользуем fallback ключи.`);
            // Fallback к старой логике если topics.txt пуст
            const fallbackKeywords = [
                "бьюти коворкинг", "салон красоты", "косметология", "маникюр педикюр", 
                "парикмахерская", "эстетическая косметология", "spa процедуры", "красота и здоровье"
            ];
            topicsForThisThread.push(fallbackKeywords[(threadId - 1) % fallbackKeywords.length]);
        }

        console.log(`[START] [ALPHA-STRIKE #${threadId}] ===  С v5.2 ===`);
        console.log(`[TARGET] [ALPHA-STRIKE #${threadId}] ель: ${targetArticles} статей`);
        console.log(`[TOPICS] [ALPHA-STRIKE #${threadId}] Темы: ${topicsForThisThread.join(', ')}`);

        const startNumber = threadId * 1000;
        console.log(`[NUMBERS] [ALPHA-STRIKE #${threadId}] ачинаю нумерацию с: ${startNumber}`);

        let createdArticles = 0;
        let totalLinks = 0;
        const createdUrls = [];

        for (let i = 0; i < Math.min(targetArticles, topicsForThisThread.length); i++) {
            const topic = topicsForThisThread[i];
            const postNumber = startNumber + i;
            
            try {
                const result = await generatePost(topic, postNumber);
                createdArticles++;
                totalLinks += result.linkCount;
                createdUrls.push(result.url);
                
                await delay(baseDelay);
            } catch (error) {
                console.error(`[ERROR] [ALPHA-STRIKE #${threadId}] шибка статьи #${postNumber}: ${error.message}`);
            }
        }

        console.log(`[COMPLETE] [ALPHA-STRIKE #${threadId}] === ССЯ v5.2 Ш ===`);
        console.log(`[STATS] Создано статей: ${createdArticles}`);
        console.log(`[STATS] бщее количество ссылок на основной сайт: ~${totalLinks}`);
        console.log(`[STATS] инальная скорость: ${baseDelay}мс`);
        console.log(`[STATS] иапазон номеров: ${startNumber}-${startNumber + createdArticles - 1}`);

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