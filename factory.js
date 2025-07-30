// Файл: factory.js (BlondePlace версия - ИСПРАВЛЕННАЯ)
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
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=2070&auto=format&fit=crop';
const INDEXNOW_API_KEY = '2f4e6a8b9c1d3e5f7a8b9c0d1e2f3a4b5c6d7e8f';

// --- НАСТРОЙКИ ОПЕРАЦИИ ---
const TARGET_URL_MAIN = "https://blondeplace.ru";
const TOPICS_FILE = 'topics.txt';
const POSTS_DIR = 'src/content/posts';

// --- НАСТРОЙКИ МОДЕЛЕЙ ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-pro";

// --- ИНИЦИАЛИЗАЦИЯ ПОТОКА ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;
// Получаем API ключ в зависимости от модели
const GEMINI_API_KEY_CURRENT = process.env.GEMINI_API_KEY_CURRENT;
const OPENROUTER_API_KEY_CURRENT = process.env.OPENROUTER_API_KEY_CURRENT;

let apiKey;
if (modelChoice === 'deepseek') {
    apiKey = OPENROUTER_API_KEY_CURRENT;
} else {
    apiKey = GEMINI_API_KEY_CURRENT;
}

if (!apiKey) {
    throw new Error(`[Поток #${threadId}] Не был предоставлен API-ключ!`);
}

if (modelChoice === 'deepseek') {
    console.log(`🚀 [Поток #${threadId}] Использую модель DeepSeek через OpenRouter с ключом ...${apiKey.slice(-4)}`);
} else {
    console.log(`✨ [Поток #${threadId}] Использую модель Gemini с ключом ...${apiKey.slice(-4)}`);
}

// --- БАЗА ЗНАНИЙ О ЦЕЛЕВОМ САЙТЕ ---
const REAL_LINKS_MAP = {
    'general': [
        { url: "https://blondeplace.ru", text: `главном сайте ${BRAND_NAME}` },
        { url: "https://blondeplace.ru/#about", text: `о салоне ${BRAND_NAME}` },
        { url: "https://blondeplace.ru/#contact", text: `контактах салона` },
        { url: "https://blondeplace.ru/#services", text: `услугах салона` },
    ],
    'окраш': { url: "https://blondeplace.ru/#services", text: "услугах окрашивания" },
    'блонд': { url: "https://blondeplace.ru/#services", text: "работе с блондом" },
    'стрижк': { url: "https://blondeplace.ru/#services", text: "услугах стрижки" },
    'маникюр': { url: "https://blondeplace.ru/#services", text: "nail-сервисе" },
    'уход': { url: "https://blondeplace.ru/#services", text: "процедурах ухода" },
    'красот': { url: "https://blondeplace.ru/#about", text: "философии красоты" },
    'салон': { url: "https://blondeplace.ru/#about", text: "истории салона" },
    'мастер': { url: "https://blondeplace.ru/#about", text: "команде мастеров" },
    'процедур': { url: "https://blondeplace.ru/#services", text: "beauty-процедурах" },
    'консультац': { url: "https://blondeplace.ru/#contact", text: "консультации специалиста" }
};

function getContextualLink(topic) {
    const lowerTopic = topic.toLowerCase();
    for (const keyword in REAL_LINKS_MAP) {
        if (keyword !== 'general' && lowerTopic.includes(keyword)) {
            return REAL_LINKS_MAP[keyword];
        }
    }
    return REAL_LINKS_MAP.general[Math.floor(Math.random() * REAL_LINKS_MAP.general.length)];
}

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
                    throw new Error(`Ошибка HTTP от OpenRouter: ${response.status}`);
                }
                const data = await response.json();
                if (!data.choices || data.choices.length === 0) throw new Error("Ответ от API OpenRouter не содержит поля 'choices'.");
                return data.choices[0].message.content;
            } else { // Логика для Gemini
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        } catch (error) {
            if (error.message.includes('503') || error.message.includes('429')) {
                console.warn(`[!] [Поток #${threadId}] Модель перегружена или квота исчерпана. Попытка ${i + 1}/${maxRetries}. Жду ${delay / 1000}с...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
    throw new Error(`[Поток #${threadId}] Не удалось получить ответ от модели ${modelChoice} после ${maxRetries} попыток.`);
}

async function notifyIndexNow(url) {
    console.log(`📢 [Поток #${threadId}] Отправляю уведомление для ${url} в IndexNow...`);
    const HOST = "blondeplace.netlify.app";
    
    const payload = JSON.stringify({ host: HOST, key: INDEXNOW_API_KEY, urlList: [url] });

    try {
        await execa('curl', ['-X', 'POST', 'https://yandex.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        await execa('curl', ['-X', 'POST', 'https://www.bing.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        console.log(`[✔] [Поток #${threadId}] Уведомление для ${url} успешно отправлено.`);
    } catch (error) {
        console.error(`[!] [Поток #${threadId}] Ошибка при отправке в IndexNow для ${url}:`, error.stderr);
    }
}

async function generatePost(topic, slug, interlinks) {
    console.log(`[+] [Поток #${threadId}] Генерирую статью на тему: ${topic}`);
    
    const planPrompt = `Создай детальный, экспертный план-структуру для SEO-статьи на тему "${topic}". Контекст: статья пишется для блога салона красоты ${BRAND_NAME}.`;
    const plan = await generateWithRetry(planPrompt);

    const articlePrompt = `Напиши экспертную, полезную SEO-статью по этому плану:\n\n${plan}\n\nТема: "${topic}". ВАЖНО: строго следуй плану и используй синтаксис Markdown для всех заголовков (# для H1, ## для H2, ### для H3). Текст должен быть написан от лица салона красоты ${BRAND_NAME}. КРИТИЧЕСКИ ВАЖНО: НЕ ВСТАВЛЯЙ В ТЕКСТ НИКАКИХ ИЗОБРАЖЕНИЙ ![...], ССЫЛОК, URL-АДРЕСОВ ИЛИ МЕДИА-КОНТЕНТА. Пиши только чистый текст с заголовками. Не пиши никакого сопроводительного текста перед первым заголовком. Сразу начинай с заголовка H1.`;
    let articleText = await generateWithRetry(articlePrompt);

    // СУПЕР-ЖЁСТКАЯ ОЧИСТКА от всех возможных неправильных ссылок и изображений
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, ''); // Убираем ВСЕ изображения
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, ''); // Убираем все ссылки
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, ''); // Убираем все URL
    articleText = articleText.replace(/https-[^\s\)\]]+/g, ''); // Убираем битые https- ссылки
    articleText = articleText.replace(/www\.[^\s]+/g, ''); // Убираем www ссылки
    articleText = articleText.replace(/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/g, ''); // Убираем домены
    articleText = articleText.replace(/\*\s*Пример.*?\*/g, ''); // Убираем подписи к изображениям

    if (interlinks.length > 0) {
        let interlinkingBlock = '\n\n---\n\n## Читайте также\n\n';
        interlinks.forEach(link => {
            interlinkingBlock += `*   [${link.title}](${link.url})\n`;
        });
        articleText += interlinkingBlock;
    }

    const paragraphs = articleText.split('\n\n');
    if (paragraphs.length > 2) {
        const contextualLink = getContextualLink(topic);
        const randomAnchorText = `узнайте больше о ${contextualLink.text} на <a href="${contextualLink.url}" target="_blank" rel="nofollow">официальном сайте ${BRAND_NAME}</a>`;
        
        const randomIndex = Math.floor(Math.random() * (paragraphs.length - 2)) + 1;
        paragraphs[randomIndex] += ` ${randomAnchorText}`;
        articleText = paragraphs.join('\n\n');
    }
    
    const seoPrompt = `Для статьи на тему "${topic}" сгенерируй JSON-объект. ВАЖНО: твой ответ должен быть ТОЛЬКО валидным JSON-объектом. JSON должен содержать: "title" (длиной ровно 40-45 символов), "description" (длиной ровно 120-130 символов), "keywords" (строка с 5-7 релевантными ключевыми словами через запятую). Контекст: это блог салона красоты ${BRAND_NAME}.`;
    let seoText = await generateWithRetry(seoPrompt);

    const match = seoText.match(/\{[\s\S]*\}/);
    if (!match) { throw new Error("Не удалось найти валидный JSON в ответе модели."); }
    const seoData = JSON.parse(match[0]);

    // Принудительно обрезаем до нужной длины
    if (seoData.title && seoData.title.length > 45) {
        seoData.title = seoData.title.substring(0, 42) + '...';
    }
    if (seoData.description && seoData.description.length > 130) {
        seoData.description = seoData.description.substring(0, 127) + '...';
    }

    const reviewCount = Math.floor(Math.random() * (990 - 500 + 1)) + 500; // 500-990 отзывов
    const ratingValue = (Math.random() * (5.0 - 4.7) + 4.7).toFixed(1);

    // Всегда используем fallback изображение для стабильности
    const finalHeroImage = FALLBACK_IMAGE_URL;

    const fullSchema = {
      "@context": "https://schema.org", 
      "@type": "Article", 
      "headline": seoData.title,
      "description": seoData.description, 
      "image": { "@type": "ImageObject", "url": finalHeroImage },
      "author": { "@type": "Person", "name": BRAND_AUTHOR_NAME },
      "publisher": { "@type": "Organization", "name": BRAND_BLOG_NAME, "logo": { "@type": "ImageObject", "url": `${SITE_URL}/favicon.ico` } },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "mainEntityOfPage": { "@type": "WebPage", "@id": `${SITE_URL}/blog/${slug}/` },
      "aggregateRating": { 
        "@type": "AggregateRating", 
        "ratingValue": ratingValue, 
        "reviewCount": reviewCount, 
        "bestRating": "5", 
        "worstRating": "1" 
      }
    };

    const frontmatter = `---
title: "${seoData.title.replace(/"/g, '\\"')}"
description: "${seoData.description.replace(/"/g, '\\"')}"
keywords: "${seoData.keywords ? seoData.keywords.replace(/"/g, '\\"') : topic}"
pubDate: "${new Date().toISOString()}"
author: "${BRAND_AUTHOR_NAME}"
heroImage: "${finalHeroImage}"
schema: ${JSON.stringify(fullSchema)}
---
${articleText}
`;
    return frontmatter;
}

async function main() {
    console.log(`[Поток #${threadId}] Запуск рабочего потока...`);

    try {
        const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 1;
        const totalThreads = parseInt(process.env.TOTAL_THREADS, 10) || 1;
        
        const fileContent = await fs.readFile(TOPICS_FILE, 'utf-8');
        const allTopics = fileContent.split(/\r?\n/).map(topic => topic.trim()).filter(Boolean);

        const postsDir = path.join(process.cwd(), 'src', 'content', 'posts');
        await fs.mkdir(postsDir, { recursive: true });
        
        const existingFiles = await fs.readdir(postsDir);
        const existingSlugs = existingFiles.map(file => file.replace('.md', ''));
        
        let newTopics = allTopics.filter(topic => {
            const topicSlug = slugify(topic);
            return topicSlug && !existingSlugs.includes(topicSlug);
        });

        const topicsForThisThread = newTopics.filter((_, index) => index % totalThreads === (threadId - 1)).slice(0, BATCH_SIZE);

        if (topicsForThisThread.length === 0) {
            console.log(`[Поток #${threadId}] Нет новых тем для этого потока. Завершение.`);
            return;
        }
        
        console.log(`[Поток #${threadId}] Найдено ${topicsForThisThread.length} новых тем. Беру в работу.`);

        let allPostsForLinking = [];
        for (const slug of existingSlugs) {
             try {
                const content = await fs.readFile(path.join(postsDir, `${slug}.md`), 'utf-8');
                const titleMatch = content.match(/title:\s*["']?(.*?)["']?$/m);
                if (titleMatch) {
                    allPostsForLinking.push({ title: titleMatch[1], url: `/blog/${slug}/` });
                }
            } catch (e) { /* Игнорируем ошибки чтения */ }
        }
        
        for (const topic of topicsForThisThread) { 
            try {
                const slug = slugify(topic);
                if (!slug) continue;
                
                const filePath = path.join(postsDir, `${slug}.md`);

                let randomInterlinks = [];
                if (allPostsForLinking.length > 0) {
                    randomInterlinks = [...allPostsForLinking].sort(() => 0.5 - Math.random()).slice(0, 3);
                }
                
                const fullContent = await generatePost(topic, slug, randomInterlinks);
                await fs.writeFile(filePath, fullContent);
                console.log(`[Поток #${threadId}] [✔] Статья "${topic}" успешно создана.`);
                
                // ТОЛЬКО IndexNow уведомления - БЕЗ git операций!
                const newUrl = `${SITE_URL}/blog/${slug}/`;
                await notifyIndexNow(newUrl);

                await new Promise(resolve => setTimeout(resolve, 1000)); // Небольшая пауза между статьями
            } catch (e) {
                console.error(`[!] [Поток #${threadId}] Ошибка при обработке темы "${topic}": ${e.message}`);
                if (e.message.includes('429') || e.message.includes('API key')) {
                    console.error(`[!] [Поток #${threadId}] Ключ API исчерпан или невалиден. Завершаю работу этого потока.`);
                    break; 
                }
                continue;
            }
        }
    } catch (error) {
        console.error(`[Поток #${threadId}] [!] Критическая ошибка:`, error);
        process.exit(1);
    }
}

main();
