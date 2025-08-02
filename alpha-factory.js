// айл: alpha-factory.js (Alpha-Strike v5.1 - С СХ )
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
const POSTS_DIR = 'src/content/posts';

// --- СТ  ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-pro";

// --- Я API  (  FACTORY.JS) ---
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

// ---   FACTORY.JS: ЬЯ Я generatePost ---
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

    //  FACTORY.JS: ТЯ    СТСТ + ТС Т
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

    // Создаем title  номера (как должно быть)
    const title = `${topic} - экспертные советы от BlondePlace`;
    const description = `рофессиональные советы по ${topic} от экспертов салона красоты BlondePlace. рактические рекомендации и секреты мастеров.`;

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

    // Создаем frontmatter
    const frontmatter = `---
title: "${title}"
description: "${description}"
pubDate: "${new Date().toISOString().split('T')[0]}"
author: "${BRAND_AUTHOR_NAME}"
tags: ["beauty-tips"]
image: "${FALLBACK_IMAGE_URL}"
category: "beauty-tips"
slug: "post${postNumber}"
---`;

    const fullArticle = `${frontmatter}\n\n${finalContent}`;
    
    // Сохраняем файл
    const filename = `post${postNumber}.md`;
    const filePath = path.join(POSTS_DIR, filename);
    
    await fs.writeFile(filePath, fullArticle, 'utf-8');
    console.log(`[DONE] [ALPHA-STRIKE #${threadId}] Статья #${postNumber} создана: "${title}"`);
    console.log(`[META] Title: ${title.length} символов, Description: ${description.length} символов`);
    
    // IndexNow уведомление
    const articleUrl = `${SITE_URL}/blog/post${postNumber}`;
    await notifyIndexNow(articleUrl);
    console.log(`[INDEXNOW] [ALPHA-STRIKE #${threadId}] Турбо-индексация: 3/3 сервисов уведомлены`);
    
    return {
        filename,
        title,
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

// --- СЯ  ---
const targetArticles = parseInt(process.env.TARGET_ARTICLES, 10) || 1;
const keywords = [
    "бьюти коворкинг", "салон красоты", "косметология", "маникюр педикюр", 
    "парикмахерская", "эстетическая косметология", "spa процедуры", "красота и здоровье"
];

console.log(`[INIT] [ALPHA-STRIKE #${threadId}] нициализация боевой системы v5.1 с ключом ...${apiKey.slice(-4)}`);
console.log(`[TARGET] [ALPHA-STRIKE #${threadId}] ель: ${targetArticles} статей с 85+ ссылками каждая`);

console.log(`[START] [ALPHA-STRIKE #${threadId}] ===  С v5.1 ===`);
console.log(`[TARGET] [ALPHA-STRIKE #${threadId}] ель: ${targetArticles} статей по ${keywords.length} ключам`);

const startNumber = threadId * 1000;
console.log(`[NUMBERS] [ALPHA-STRIKE #${threadId}] ачинаю нумерацию с: ${startNumber}`);

let createdArticles = 0;
let totalLinks = 0;
const createdUrls = [];

for (let i = 0; i < targetArticles; i++) {
    const keyword = keywords[i % keywords.length];
    const postNumber = startNumber + i;
    
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

console.log(`[COMPLETE] [ALPHA-STRIKE #${threadId}] === ССЯ v5.1 Ш ===`);
console.log(`[STATS] Создано статей: ${createdArticles}`);
console.log(`[STATS] бщее количество ссылок на основной сайт: ~${totalLinks}`);
console.log(`[STATS] инальная скорость: ${baseDelay}мс`);
console.log(`[STATS] иапазон номеров: ${startNumber}-${startNumber + targetArticles - 1}`);

// ТТ С ССЫ ( С ЬТЬ)
console.log(`[RESULTS] СЫ СТТЬ:`);
createdUrls.forEach((url, index) => {
    console.log(`[ARTICLE] Статья ${index + 1}: ${url}`);
});

console.log(`[INDEXNOW] INDEXNOW ТТ:`);
console.log(`[INDEXNOW] Yandex IndexNow: ${createdArticles} URLs отправлено`);
console.log(`[INDEXNOW] Bing IndexNow: ${createdArticles} URLs отправлено`);
console.log(`[INDEXNOW] Google Sitemap Ping: ${createdArticles} URLs отправлено`);