// === FACTORY.JS ВЕРСИЯ 9.2 «ИСПРАВЛЕНЫ ОБРЕЗАНИЯ + KEYWORDS» ===

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// --- КОНСТАНТЫ ---
const TOPICS_FILE = 'topics.txt';
const POSTS_DIR = 'src/content/posts';
const SITE_URL = 'https://blondeplace.netlify.app';
const BRAND_NAME = 'BlondePlace';
const BRAND_BLOG_NAME = 'Блог BlondePlace';
const BRAND_AUTHOR_NAME = 'Эксперт BlondePlace';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=2070&auto=format&fit=crop';
const INDEXNOW_API_KEY = '2f4e6a8b9c1d3e5f7a8b9c0d1e2f3a4b5c6d7e8f';
const GEMINI_MODEL_NAME = 'gemini-2.0-flash-exp';

// Определяем параметры из environment
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;

let apiKey, modelName;

if (modelChoice === 'deepseek') {
    apiKey = process.env.OPENROUTER_API_KEY_CURRENT;
    modelName = 'deepseek/deepseek-chat';
    if (!apiKey) {
        throw new Error(`[Поток #${threadId}] OpenRouter API ключ не найден!`);
    }
} else {
    apiKey = process.env.GEMINI_API_KEY_CURRENT;
    modelName = GEMINI_MODEL_NAME;
    if (!apiKey) {
        throw new Error(`[Поток #${threadId}] Gemini API ключ не найден!`);
    }
}

// --- ФУНКЦИЯ SLUGIFY (ТОЧНАЯ КОПИЯ BUTLER) ---
function slugify(text) {
    const translitMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    return text
        .toLowerCase()
        .split('')
        .map(char => translitMap[char] || char)
        .join('')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// --- AI ГЕНЕРАЦИЯ ---
async function generateWithRetry(prompt, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (modelChoice === 'deepseek') {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': SITE_URL,
                        'X-Title': BRAND_BLOG_NAME,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 4000
                    })
                });

                if (!response.ok) {
                    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;
            } else {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        } catch (error) {
            console.error(`[Поток #${threadId}] Попытка ${attempt}/${maxRetries} неудачна:`, error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
}

// --- ГЕНЕРАЦИЯ СТАТЬИ ---
async function generatePost(topic, slug, interlinks) {
    console.log(`[Поток #${threadId}] 🎨 Генерирую статью: "${topic}"`);

    const planPrompt = `Создай детальный, экспертный план-структуру для SEO-статьи на тему "${topic}". Контекст: статья пишется для блога салона красоты ${BRAND_NAME}.`;
    const plan = await generateWithRetry(planPrompt);

    // ИСПРАВЛЕННЫЙ PROMPT ДЛЯ ЧИСТЫХ ЗАГОЛОВКОВ
    const articlePrompt = `Напиши экспертную, полезную SEO-статью по этому плану:\n\n${plan}\n\nТема: "${topic}". ВАЖНО: строго следуй плану и используй синтаксис Markdown для всех заголовков (# для H1, ## для H2, ### для H3). Текст должен быть написан от лица салона красоты ${BRAND_NAME}. КРИТИЧЕСКИ ВАЖНО: НЕ ВСТАВЛЯЙ В ТЕКСТ НИКАКИХ ИЗОБРАЖЕНИЙ ![...], ССЫЛОК, URL-АДРЕСОВ ИЛИ МЕДИА-КОНТЕНТА. Пиши только чистый текст с заголовками. Не пиши никакого сопроводительного текста перед первым заголовком. Сразу начинай с заголовка H1. ЗАГОЛОВКИ ДОЛЖНЫ БЫТЬ КОРОТКИМИ БЕЗ НОМЕРОВ И ЛИШНИХ СЛОВ.`;
    let articleText = await generateWithRetry(articlePrompt);

    // СУПЕР-ЖЁСТКАЯ ОЧИСТКА (КАК В BUTLER)
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, ''); // Убираем ВСЕ изображения
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, ''); // Убираем все ссылки
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, ''); // Убираем все URL
    articleText = articleText.replace(/https-[^\s\)\]]+/g, ''); // Убираем битые https- ссылки
    articleText = articleText.replace(/www\.[^\s]+/g, ''); // Убираем www ссылки
    articleText = articleText.replace(/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/g, ''); // Убираем домены
    articleText = articleText.replace(/\*\s*Пример.*?\*/g, ''); // Убираем подписи к изображениям

    // ДОПОЛНИТЕЛЬНАЯ ОЧИСТКА ЗАГОЛОВКОВ ОТ НОМЕРОВ
    articleText = articleText.replace(/^#+\s*\d+\.?\s*/gm, function(match) {
        const level = match.match(/^#+/)[0];
        return level + ' ';
    });
    
    // Убираем длинные заголовки с двоеточиями и лишними словами
    articleText = articleText.replace(/^(#+\s*)([^:\n]*?):\s*[^\n]*?(–|—).*$/gm, '$1$2');

    // ИНТЕРЛИНКИНГ (КАК В BUTLER)
    if (interlinks.length > 0) {
        let interlinkingBlock = '\n\n---\n\n## Читайте также\n\n';
        interlinks.forEach(link => {
            interlinkingBlock += `* [${link.title}](${link.url})\n`;
        });
        articleText += interlinkingBlock;
    }

    const seoPrompt = `Для статьи на тему "${topic}" сгенерируй JSON-объект. ВАЖНО: твой ответ должен быть ТОЛЬКО валидным JSON-объектом. JSON должен содержать: "title" (длиной ровно 50-60 символов), "description" (длиной ровно 150-160 символов), "keywords" (строка с 5-7 релевантными ключевыми словами через запятую). Контекст: это блог салона красоты ${BRAND_NAME}.`;
    let seoText = await generateWithRetry(seoPrompt);

    const match = seoText.match(/\{[\s\S]*\}/);
    if (!match) { throw new Error("Не удалось найти валидный JSON в ответе модели."); }
    const seoData = JSON.parse(match[0]);

    // УБРАЛИ ПРИНУДИТЕЛЬНОЕ ОБРЕЗАНИЕ!
    // Теперь используем то что сгенерировала AI, только если слишком длинно - тогда обрезаем
    if (seoData.title && seoData.title.length > 70) {
        seoData.title = seoData.title.substring(0, 67) + '...';
    }
    if (seoData.description && seoData.description.length > 180) {
        seoData.description = seoData.description.substring(0, 177) + '...';
    }

    // КРИТИЧНО: Убеждаемся что keywords всегда есть
    if (!seoData.keywords || seoData.keywords.length < 10) {
        seoData.keywords = `красота, ${BRAND_NAME}, салон красоты, уход, стиль`;
    }

    const reviewCount = Math.floor(Math.random() * (990 - 500 + 1)) + 500;
    const ratingValue = (Math.random() * (5.0 - 4.7) + 4.7).toFixed(1);
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

    // BUTLER-STYLE FRONTMATTER (ТОЧНАЯ КОПИЯ)
    const frontmatter = `---
title: ${JSON.stringify(seoData.title)}
description: ${JSON.stringify(seoData.description)}
keywords: ${JSON.stringify(seoData.keywords)}
pubDate: ${JSON.stringify(new Date().toISOString())}
author: ${JSON.stringify(BRAND_AUTHOR_NAME)}
heroImage: ${JSON.stringify(finalHeroImage)}
schema: ${JSON.stringify(fullSchema)}
---
`;
    
    return frontmatter + articleText;
}

// --- УВЕДОМЛЕНИЯ INDEXNOW ---
async function notifySearchEngines(urls) {
    if (!urls.length) return;

    const payload = {
        host: "blondeplace.netlify.app",
        key: INDEXNOW_API_KEY,
        urlList: urls
    };

    try {
        console.log(`[Поток #${threadId}] 📢 Уведомляю поисковики о ${urls.length} новых статьях...`);
        
        await Promise.allSettled([
            fetch('https://yandex.com/indexnow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify(payload)
            }),
            fetch('https://www.bing.com/indexnow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify(payload)
            })
        ]);

        console.log(`[Поток #${threadId}] ✅ Уведомления отправлены в Yandex и Bing`);
    } catch (error) {
        console.error(`[Поток #${threadId}] ❌ Ошибка уведомления:`, error.message);
    }
}

// --- ОСНОВНАЯ ФУНКЦИЯ (ТОЧНАЯ КОПИЯ BUTLER) ---
async function main() {
    console.log(`[Поток #${threadId}] Запуск рабочего потока...`);

    try {
        const BATCH_SIZE = parseInt(process.env.BATCH_SIZE_PER_THREAD, 10) || 1;
        const totalThreads = parseInt(process.env.TOTAL_THREADS, 10) || 1;
        
        const fileContent = await fs.readFile(TOPICS_FILE, 'utf-8');
        const allTopics = fileContent.split(/\r?\n/).map(topic => topic.trim()).filter(Boolean);

        const postsDir = path.join(process.cwd(), POSTS_DIR);
        await fs.mkdir(postsDir, { recursive: true });
        
        const existingFiles = await fs.readdir(postsDir);
        const existingSlugs = existingFiles.map(file => file.replace('.md', ''));
        
        let newTopics = allTopics.filter(topic => {
            const topicSlug = slugify(topic);
            return topicSlug && !existingSlugs.includes(topicSlug);
        });

        // BUTLER ЛОГИКА РАСПРЕДЕЛЕНИЯ ПО ПОТОКАМ
        const topicsForThisThread = newTopics.filter((_, index) => index % totalThreads === (threadId - 1)).slice(0, BATCH_SIZE);

        if (topicsForThisThread.length === 0) {
            console.log(`[Поток #${threadId}] Нет новых тем для этого потока. Завершение.`);
            return;
        }
        
        console.log(`[Поток #${threadId}] Найдено ${topicsForThisThread.length} новых тем. Беру в работу.`);

        // Загружаем существующие статьи для интерлинкинга
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
                    const shuffled = [...allPostsForLinking].sort(() => 0.5 - Math.random());
                    randomInterlinks = shuffled.slice(0, 3);
                }

                const content = await generatePost(topic, slug, randomInterlinks);
                await fs.writeFile(filePath, content);
                
                console.log(`[Поток #${threadId}] ✅ Создана статья: ${slug}.md`);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`[Поток #${threadId}] ❌ Ошибка генерации "${topic}":`, error.message);
            }
        }

        console.log(`[Поток #${threadId}] 🎯 Генерация завершена`);
    } catch (error) {
        console.error(`[Поток #${threadId}] 💥 Критическая ошибка:`, error.message);
        process.exit(1);
    }
}

main();
