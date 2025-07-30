// === FACTORY.JS ВЕРСИЯ 8.3 «БЕЗ REQUIRE» ===

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// --- КОНСТАНТЫ ---
const SITE_URL = 'https://blondeplace.netlify.app';
const BRAND_NAME = 'BlondePlace';
const BRAND_BLOG_NAME = 'Блог BlondePlace';
const BRAND_AUTHOR_NAME = 'Эксперт BlondePlace';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=2070&auto=format&fit=crop';
const INDEXNOW_API_KEY = '2f4e6a8b9c1d3e5f7a8b9c0d1e2f3a4b5c6d7e8f';
const GEMINI_MODEL_NAME = 'gemini-2.0-flash-exp';

// Определяем модель и API ключ
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = process.env.THREAD_ID || '1';
const batchSize = parseInt(process.env.BATCH_SIZE) || 5;

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

console.log(`[Поток #${threadId}] 🚀 Запуск Beauty Factory (Модель: ${modelChoice})`);
console.log(`[Поток #${threadId}] 📊 Планируется генерация: ${batchSize} статей`);

// --- ФУНКЦИЯ SLUGIFY ---
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

// --- ЗАГРУЗКА ИНТЕРЛИНКОВ ---
function loadInterlinks() {
    try {
        const existingPosts = fs.readdirSync('src/content/posts')
            .filter(file => file.endsWith('.md'))
            .map(file => {
                const content = fs.readFileSync(path.join('src/content/posts', file), 'utf-8');
                const titleMatch = content.match(/^title:\s*["'](.+?)["']/m);
                const slug = file.replace('.md', '');
                return titleMatch ? { title: titleMatch[1], slug } : null;
            })
            .filter(Boolean);

        console.log(`[Поток #${threadId}] Загружено ${existingPosts.length} существующих статей для интерлинкинга`);
        return existingPosts;
    } catch (error) {
        console.log(`[Поток #${threadId}] Интерлинки недоступны:`, error.message);
        return [];
    }
}

// --- ГЕНЕРАЦИЯ СТАТЬИ ---
async function generatePost(topic, slug, interlinks) {
    console.log(`[Поток #${threadId}] 🎨 Генерирую статью: "${topic}"`);

    const planPrompt = `Создай подробный план для экспертной статьи на тему: "${topic}". План должен включать:
    1. Привлекающий заголовок H1
    2. 4-6 основных разделов (H2) с практическими советами
    3. 2-3 подраздела (H3) в каждом разделе
    4. Фокус на практические советы для салона красоты ${BRAND_NAME}
    5. Экспертные рекомендации и профессиональные секреты
    
    Контекст: статья для блога салона красоты ${BRAND_NAME}, целевая аудитория - люди, интересующиеся красотой и уходом.`;

    const plan = await generateWithRetry(planPrompt);

    const articlePrompt = `Напиши экспертную, полезную SEO-статью по этому плану:\n\n${plan}\n\nТема: "${topic}". ВАЖНО: строго следуй плану и используй синтаксис Markdown для всех заголовков (# для H1, ## для H2, ### для H3). Текст должен быть написан от лица салона красоты ${BRAND_NAME}. АБСОЛЮТНО ЗАПРЕЩЕНО: НЕ ВСТАВЛЯЙ В ТЕКСТ НИКАКИХ ИЗОБРАЖЕНИЙ ![...], ССЫЛОК [...](...), URL-АДРЕСОВ http/https, ДОМЕНОВ .com/.ru/.org, МЕДИА-КОНТЕНТА ИЛИ УПОМИНАНИЙ ДРУГИХ САЙТОВ. ТОЛЬКО ЧИСТЫЙ ТЕКСТ БЕЗ ССЫЛОК. Не пиши никакого сопроводительного текста перед первым заголовком. Сразу начинай с заголовка H1.`;
    let articleText = await generateWithRetry(articlePrompt);

    // УЛЬТРА-ЖЁСТКАЯ ОЧИСТКА от ВСЕХ возможных ссылок и упоминаний
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, ''); // Убираем ВСЕ изображения
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, ''); // Убираем все ссылки
    articleText = articleText.replace(/https?:\/\/[^\s\)\]\,\.\!]+/g, ''); // Убираем все URL
    articleText = articleText.replace(/www\.[^\s\)\]\,\.\!]+/g, ''); // Убираем www ссылки
    articleText = articleText.replace(/[a-zA-Z0-9\-]+\.(com|ru|org|net|info|biz|co|io|app|dev)[^\s]*/gi, ''); // Убираем все домены
    articleText = articleText.replace(/https-[^\s\)\]\,\.\!]+/g, ''); // Убираем битые https- ссылки
    articleText = articleText.replace(/netlify[^\s]*/gi, ''); // Убираем любые упоминания netlify
    articleText = articleText.replace(/github[^\s]*/gi, ''); // Убираем любые упоминания github
    articleText = articleText.replace(/\*\s*Пример.*?\*/g, ''); // Убираем подписи к изображениям

    // Дополнительная очистка - убираем строки с доменами
    const lines = articleText.split('\n');
    articleText = lines.filter(line => {
        const cleanLine = line.toLowerCase();
        return !cleanLine.includes('.com') && 
               !cleanLine.includes('.ru') && 
               !cleanLine.includes('.org') && 
               !cleanLine.includes('.net') && 
               !cleanLine.includes('netlify') && 
               !cleanLine.includes('github') &&
               !cleanLine.includes('http') &&
               !cleanLine.includes('www.');
    }).join('\n');

    // ИНТЕРЛИНКИНГ
    if (interlinks.length > 0) {
        const relatedPosts = interlinks
            .filter(post => {
                const topicWords = topic.toLowerCase().split(' ');
                const titleWords = post.title.toLowerCase().split(' ');
                return topicWords.some(word => titleWords.some(titleWord => titleWord.includes(word) && word.length > 3));
            })
            .slice(0, 3);

        if (relatedPosts.length > 0) {
            let relatedSection = '\n\n## Читайте также\n\n';
            relatedPosts.forEach(post => {
                relatedSection += `* [${post.title}](/blog/${post.slug}/)\n`;
            });
            articleText += relatedSection;
        }
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

    // КРИТИЧНО: Убеждаемся что keywords всегда есть
    if (!seoData.keywords || seoData.keywords.length < 10) {
        seoData.keywords = `красота, ${BRAND_NAME}, салон красоты, уход, стиль`;
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

    // ИСПОЛЬЗУЕМ JSON.stringify для БЕЗОПАСНОГО YAML (как в Butler)
    const frontmatter = `---
title: ${JSON.stringify(seoData.title)}
description: ${JSON.stringify(seoData.description)}
keywords: ${JSON.stringify(seoData.keywords)}
pubDate: ${JSON.stringify(new Date().toISOString())}
author: ${JSON.stringify(BRAND_AUTHOR_NAME)}
heroImage: ${JSON.stringify(finalHeroImage)}
schema: ${JSON.stringify(fullSchema)}
---
${articleText}
`;
    return frontmatter;
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

// --- ОСНОВНАЯ ФУНКЦИЯ ---
async function main() {
    try {
        // ЧИТАЕМ TOPICS.TXT (БЕЗ require)
        console.log(`[Поток #${threadId}] 📖 Читаю актуальный topics.txt...`);
        
        const topicsContent = fs.readFileSync('topics.txt', 'utf-8');
        const allLines = topicsContent.split('\n').map(line => line.trim());
        
        // Фильтруем только АКТУАЛЬНЫЕ темы (убираем служебные строки)
        const topics = allLines.filter(line => 
            line && 
            !line.startsWith('#') && 
            !line.includes('50 тем') &&
            !line.includes('Правильный выбор кисточек') && // Исключаем первую тему как служебную
            line.length > 10 // Минимальная длина темы
        );

        console.log(`[Поток #${threadId}] 📋 Найдено ${topics.length} АКТУАЛЬНЫХ тем`);
        console.log(`[Поток #${threadId}] 🎯 Первые 3 темы: ${topics.slice(0, 3).join(', ')}`);

        if (topics.length === 0) {
            console.log(`[Поток #${threadId}] ❌ Нет доступных тем в topics.txt`);
            return;
        }

        const interlinks = loadInterlinks();
        const generatedUrls = [];

        for (let i = 0; i < batchSize; i++) {
            if (topics.length === 0) break;

            const randomIndex = Math.floor(Math.random() * topics.length);
            const topic = topics.splice(randomIndex, 1)[0].trim();
            const slug = slugify(topic);

            const outputPath = `src/content/posts/${slug}.md`;
            if (fs.existsSync(outputPath)) {
                console.log(`[Поток #${threadId}] ⏭️ Статья "${topic}" уже существует, пропускаю`);
                continue;
            }

            try {
                const content = await generatePost(topic, slug, interlinks);
                
                if (!fs.existsSync('src/content/posts')) {
                    fs.mkdirSync('src/content/posts', { recursive: true });
                }
                
                fs.writeFileSync(outputPath, content, 'utf-8');
                generatedUrls.push(`${SITE_URL}/blog/${slug}/`);
                
                console.log(`[Поток #${threadId}] ✅ Создана статья: ${slug}.md`);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`[Поток #${threadId}] ❌ Ошибка генерации "${topic}":`, error.message);
            }
        }

        // Обновляем topics.txt
        fs.writeFileSync('topics.txt', topics.join('\n') + '\n', 'utf-8');

        // Уведомляем поисковики
        if (generatedUrls.length > 0) {
            await notifySearchEngines(generatedUrls);
        }

        console.log(`[Поток #${threadId}] 🎯 Генерация завершена: ${generatedUrls.length} статей`);
    } catch (error) {
        console.error(`[Поток #${threadId}] 💥 Критическая ошибка:`, error.message);
        process.exit(1);
    }
}

main();
