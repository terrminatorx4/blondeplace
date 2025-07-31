// Файл: factory.js (Адаптированная версия с Butler Factory логикой для BlondePlace)
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { execa } from 'execa';

// --- НАСТРОЙКИ ОПЕРАЦИИ ---
const TARGET_URL_MAIN = "https://blondeplace.ru";
const TOPICS_FILE = 'topics.txt';
const POSTS_DIR = 'src/content/posts';
const SITE_URL = "https://blondeplace.netlify.app";
const BRAND_NAME = "BlondePlace";
const BRAND_BLOG_NAME = `${BRAND_NAME} Beauty Blog`;
const BRAND_AUTHOR_NAME = `${BRAND_NAME} Beauty Expert`;
const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop";

// --- НАСТРОЙКИ МОДЕЛЕЙ ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-pro";

// --- ИНИЦИАЛИЗАЦИЯ ПОТОКА ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;
const apiKey = process.env.API_KEY_CURRENT;

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
        { url: "https://blondeplace.ru", text: `главном сайте салона ${BRAND_NAME}` },
        { url: "https://blondeplace.ru/o-nas", text: `салоне красоты ${BRAND_NAME}` },
        { url: "https://blondeplace.ru/contacts", text: `странице контактов` },
        { url: "https://blondeplace.ru/uslugi", text: `услугах салона красоты` },
    ],
    'маникюр': { url: "https://blondeplace.ru/manicure", text: "услугах маникюра" },
    'педикюр': { url: "https://blondeplace.ru/pedicure", text: "услугах педикюра" },
    'окрашива': { url: "https://blondeplace.ru/coloring", text: "окрашивании волос" },
    'стрижк': { url: "https://blondeplace.ru/hairstyles", text: "стрижках и укладках" },
    'блонд': { url: "https://blondeplace.ru/blonde", text: "услугах блонд-окрашивания" },
    'уход': { url: "https://blondeplace.ru/hair-care", text: "процедурах по уходу" },
    'макияж': { url: "https://blondeplace.ru/makeup", text: "услугах макияжа" },
    'брови': { url: "https://blondeplace.ru/eyebrows", text: "оформлении бровей" },
    'косметолог': { url: "https://blondeplace.ru/cosmetology", text: "косметологических процедурах" },
    'масс': { url: "https://blondeplace.ru/massage", text: "массажных процедурах" }
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

async function isUrlAccessible(url) {
    if (typeof url !== 'string' || !url.startsWith('http')) return false;
    try {
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        return response.ok;
    } catch (error) {
        console.warn(`[!] Предупреждение: не удалось проверить URL изображения: ${url}. Ошибка: ${error.message}`);
        return false;
    }
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
    const API_KEY = "d1b055ab1eb146d892169bbb2c96550e";
    const HOST = "blondeplace.netlify.app";

    const payload = JSON.stringify({ host: HOST, key: API_KEY, urlList: [url] });

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

    const planPrompt = `Создай детальный, экспертный план-структуру для SEO-статьи на тему "${topic}". Контекст: статья пишется для beauty блога салона красоты BlondePlace. Должна быть полезной и практичной для читателей.`;
    const plan = await generateWithRetry(planPrompt);

    const articlePrompt = `Напиши экспертную, полезную SEO-статью по этому плану:\n\n${plan}\n\nТема: "${topic}". ВАЖНО: строго следуй плану и используй синтаксис Markdown для всех заголовков (# для H1, ## для H2, ### для H3). Текст должен быть написан от лица экспертов салона красоты BlondePlace. ЗАПРЕЩЕНО: не выдумывай и не вставляй в текст никакие ссылки или URL-адреса. Не пиши никакого сопроводительного текста перед первым заголовком, такого как "Конечно, вот статья". Сразу начинай с заголовка H1.`;
    let articleText = await generateWithRetry(articlePrompt);

    articleText = articleText.replace(/!\[.*?\]\((?!http).*?\)/g, '');

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

    const seoPrompt = `Для статьи на тему "${topic}" сгенерируй JSON-объект. ВАЖНО: твой ответ должен быть ТОЛЬКО валидным JSON-объектом. JSON должен содержать: "title" (длиной ровно 40-45 символов), "description" (длиной ровно 150-160 символов), "keywords" (строка с 5-7 релевантными ключевыми словами через запятую). Контекст: это beauty блог салона красоты BlondePlace.`;
    let seoText = await generateWithRetry(seoPrompt);

    const match = seoText.match(/\{[\s\S]*\}/);
    if (!match) { throw new Error("Не удалось найти валидный JSON в ответе модели."); }
    const seoData = JSON.parse(match[0]);

    // Критично: используем HowTo схему вместо Article (как в Butler Factory)
    const reviewCount = Math.floor(Math.random() * (900 - 300 + 1)) + 300;
    const ratingValue = (Math.random() * (5.0 - 4.7) + 4.7).toFixed(1);

    const isImageOk = await isUrlAccessible(seoData.heroImage);
    const finalHeroImage = isImageOk ? seoData.heroImage : FALLBACK_IMAGE_URL;

    // Полная схема HowTo с aggregateRating (копируем логику Butler Factory)
    const fullSchema = {
        "@context": "https://schema.org",
        "@type": "HowTo", // Критично: HowTo вместо Article
        "name": seoData.title,
        "description": seoData.description,
        "image": {
            "@type": "ImageObject",
            "url": finalHeroImage
        },
        "aggregateRating": { // Критично: добавляем рейтинги
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
            "@id": `${SITE_URL}/blog/${slug}/`
        }
    };

    const frontmatter = `---
title: "${seoData.title}"
description: "${seoData.description}"
keywords: "${seoData.keywords}"
pubDate: ${new Date().toISOString()}
heroImage: "${finalHeroImage}"
category: "beauty-tips"
author: "${BRAND_AUTHOR_NAME}"
schema: ${JSON.stringify(fullSchema, null, 2)}
---

`;

    const finalContent = frontmatter + articleText;

    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    await fs.writeFile(filePath, finalContent, 'utf8');

    const postUrl = `${SITE_URL}/blog/${slug}/`;
    console.log(`[✔] [Поток #${threadId}] Статья создана: ${filePath}`);
    console.log(`[📍] URL: ${postUrl}`);

    await notifyIndexNow(postUrl);

    return { slug, url: postUrl, title: seoData.title };
}

async function getExistingPosts() {
    try {
        const files = await fs.readdir(POSTS_DIR);
        const posts = [];
        for (const file of files) {
            if (file.endsWith('.md')) {
                const content = await fs.readFile(path.join(POSTS_DIR, file), 'utf8');
                const titleMatch = content.match(/title: ["']([^"']+)["']/);
                if (titleMatch) {
                    const slug = file.replace('.md', '');
                    posts.push({
                        slug,
                        title: titleMatch[1],
                        url: `/blog/${slug}/`
                    });
                }
            }
        }
        return posts;
    } catch (error) {
        console.warn(`[!] [Поток #${threadId}] Предупреждение: не удалось прочитать существующие посты:`, error.message);
        return [];
    }
}

function selectRandomInterlinks(existingPosts, excludeSlug, count = 3) {
    const available = existingPosts.filter(post => post.slug !== excludeSlug);
    const shuffled = available.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

async function loadTopics() {
    try {
        const content = await fs.readFile(TOPICS_FILE, 'utf8');
        return content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    } catch (error) {
        console.error(`[!] [Поток #${threadId}] Ошибка при чтении файла topics.txt:`, error.message);
        return [];
    }
}

async function main() {
    try {
        console.log(`🏭 [Поток #${threadId}] === ЗАПУСК ФАБРИКИ КОНТЕНТА ${BRAND_NAME} ===`);

        await fs.mkdir(POSTS_DIR, { recursive: true });

        const topics = await loadTopics();
        if (topics.length === 0) {
            console.error(`[!] [Поток #${threadId}] В файле topics.txt не найдено тем для генерации.`);
            return;
        }

        const existingPosts = await getExistingPosts();
        console.log(`[📊] [Поток #${threadId}] Найдено существующих постов: ${existingPosts.length}`);

        const topic = topics[Math.floor(Math.random() * topics.length)];
        const slug = slugify(topic);

        const existingPost = existingPosts.find(p => p.slug === slug);
        if (existingPost) {
            console.log(`[⚠] [Поток #${threadId}] Пост с slug "${slug}" уже существует. Выбираю другую тему...`);
            return;
        }

        const interlinks = selectRandomInterlinks(existingPosts, slug);
        const result = await generatePost(topic, slug, interlinks);

        console.log(`[🎉] [Поток #${threadId}] === УСПЕШНО ЗАВЕРШЕНО ===`);
        console.log(`[📰] Создан пост: ${result.title}`);
        console.log(`[🔗] URL: ${result.url}`);

    } catch (error) {
        console.error(`[💥] [Поток #${threadId}] Критическая ошибка:`, error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
