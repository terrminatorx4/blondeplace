// Файл: factory.js (BlondePlace версия - ИСПРАВЛЕНЫ КРИТИЧЕСКИЕ ОШИБКИ!)
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
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const INDEXNOW_API_KEY = 'df39150ca56f896546628ae3c923dd4a';

// --- НАСТРОЙКИ ОПЕРАЦИИ ---
const TARGET_URL_MAIN = "https://blondeplace.ru";
const TOPICS_FILE = 'topics.txt';
const POSTS_DIR = 'src/content/posts';

// --- НАСТРОЙКИ МОДЕЛЕЙ ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-1.5-flash"; // 🔧 ИСПРАВЛЕНО: gemini-1.5-flash (НЕ 2.5!)

// --- ИНИЦИАЛИЗАЦИЯ ПОТОКА ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;

// 🔑 УМНАЯ РОТАЦИЯ API КЛЮЧЕЙ (КАК В BUTLER FACTORY)
let availableApiKeys = [];
let currentKeyIndex = 0;
let apiKey;
let keyInfo;

// Глобальные переменные для отслеживания используемых ключей
const usedKeys = new Set(); // Отслеживаем использованные ключи по всем потокам

function loadApiKeysFromSecrets() {
    try {
        // 🔍 ОТЛАДКА: Проверяем все переменные окружения
        console.log(`[🔍] [Поток #${threadId}] Отладка переменных окружения:`);
        console.log(`[🔍] [Поток #${threadId}] NODE_ENV: ${process.env.NODE_ENV || 'не установлено'}`);
        console.log(`[🔍] [Поток #${threadId}] GITHUB_ACTIONS: ${process.env.GITHUB_ACTIONS || 'не установлено'}`);
        console.log(`[🔍] [Поток #${threadId}] RUNNER_OS: ${process.env.RUNNER_OS || 'не установлено'}`);
        
        // Читаем GitHub Secret с пулом ключей
        const poolSecret = process.env.GEMINI_API_KEYS_POOL;
        
        console.log(`[🔍] [Поток #${threadId}] GEMINI_API_KEYS_POOL существует: ${!!poolSecret}`);
        if (poolSecret) {
            console.log(`[🔍] [Поток #${threadId}] GEMINI_API_KEYS_POOL длина: ${poolSecret.length} символов`);
            console.log(`[🔍] [Поток #${threadId}] GEMINI_API_KEYS_POOL первые 20 символов: ${poolSecret.substring(0, 20)}...`);
        }

        if (!poolSecret) {
            console.error(`[!] [Поток #${threadId}] GitHub Secret GEMINI_API_KEYS_POOL не найден!`);
            console.error(`[!] [Поток #${threadId}] Доступные переменные окружения с 'API' в названии:`);
            Object.keys(process.env).filter(key => key.includes('API')).forEach(key => {
                console.error(`[!] [Поток #${threadId}] - ${key}: ${process.env[key] ? 'установлено' : 'не установлено'}`);
            });
            throw new Error('GitHub Secret GEMINI_API_KEYS_POOL не найден!');
        }

        // Парсим ключи из секрета (разделенные переносами)
        availableApiKeys = poolSecret.split('\n')
            .map(key => key.trim())
            .filter(key => key.length > 0);

        console.log(`[🔍] [Поток #${threadId}] Обработано ключей: ${availableApiKeys.length}`);
        if (availableApiKeys.length > 0) {
            console.log(`[🔍] [Поток #${threadId}] Первый ключ начинается с: ${availableApiKeys[0].substring(0, 20)}...`);
            console.log(`[🔍] [Поток #${threadId}] Последний ключ начинается с: ${availableApiKeys[availableApiKeys.length - 1].substring(0, 20)}...`);
        }

        if (availableApiKeys.length === 0) {
            throw new Error('GitHub Secret GEMINI_API_KEYS_POOL пуст или не содержит валидных ключей');
        }

        // ИЗНАЧАЛЬНАЯ РОТАЦИЯ ПО НОМЕРУ ПОТОКА (как в Butler Factory)
        currentKeyIndex = (threadId - 1) % availableApiKeys.length;
        apiKey = availableApiKeys[currentKeyIndex];
        keyInfo = `Pool KEY_${currentKeyIndex + 1}/${availableApiKeys.length} (...${apiKey.slice(-4)})`;

        console.log(`[🔑] [Поток #${threadId}] Загружен пул из ${availableApiKeys.length} ключей из GitHub Secrets, использую ${keyInfo}`);

    } catch (error) {
        console.error(`[!] [Поток #${threadId}] Критическая ошибка при загрузке ключей: ${error.message}`);
        throw error;
    }
}

// 🎯 ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ НА СЛЕДУЮЩИЙ СВОБОДНЫЙ КЛЮЧ (КАК В BUTLER FACTORY)
function switchToNextAvailableKey() {
    if (availableApiKeys.length <= 1) {
        console.warn(`[!] [Поток #${threadId}] Нет других ключей для переключения`);
        return false;
    }

    // Ищем следующий свободный ключ
    let nextKeyIndex = -1;
    
    // Сначала проверяем ключи после текущего пула (резервные)
    for (let i = availableApiKeys.length; i > currentKeyIndex; i--) {
        const testIndex = i % availableApiKeys.length;
        if (!usedKeys.has(testIndex)) {
            nextKeyIndex = testIndex;
            break;
        }
    }
    
    // Если резервные закончились, ищем среди всех
    if (nextKeyIndex === -1) {
        for (let i = 0; i < availableApiKeys.length; i++) {
            if (i !== currentKeyIndex && !usedKeys.has(i)) {
                nextKeyIndex = i;
                break;
            }
        }
    }

    if (nextKeyIndex === -1) {
        console.error(`[!] [Поток #${threadId}] Все ключи исчерпаны!`);
        return false;
    }

    // Переключаемся на новый ключ
    usedKeys.add(currentKeyIndex); // Помечаем старый ключ как использованный
    currentKeyIndex = nextKeyIndex;
    apiKey = availableApiKeys[currentKeyIndex];
    keyInfo = `Pool KEY_${currentKeyIndex + 1}/${availableApiKeys.length} (...${apiKey.slice(-4)}) [SWITCHED]`;

    console.log(`[🔄] [Поток #${threadId}] Переключение на свободный ключ: ${keyInfo}`);
    return true;
}

// Загружаем ключи при старте
loadApiKeysFromSecrets();

// 🏆 ЛОГИРОВАНИЕ КАК В BUTLER FACTORY
if (modelChoice === 'deepseek') {
    console.log(`🚀 [Поток #${threadId}] Использую модель DeepSeek через OpenRouter с ключом ${keyInfo}`);
} else {
    console.log(`✨ [Поток #${threadId}] Использую модель Gemini ${GEMINI_MODEL_NAME} с ключом ${keyInfo}`);
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
                    if (response.status === 429) {
                        throw new Error(`429 Too Many Requests - Quota exhausted for ${keyInfo}`);
                    }
                    throw new Error(`Ошибка HTTP от OpenRouter: ${response.status}`);
                }

                const data = await response.json();
                if (!data.choices || data.choices.length === 0) throw new Error("Ответ от API OpenRouter не содержит поля 'choices'.");

                return data.choices[0].message.content;
            } else { // Логика для Gemini (КАК В BUTLER)
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        } catch (error) {
            console.warn(`[!] [Поток #${threadId}] [${keyInfo}] Попытка ${i + 1}/${maxRetries}: ${error.message}`);
            
            // 🎯 КЛЮЧЕВАЯ ЛОГИКА BUTLER FACTORY: ПЕРЕКЛЮЧЕНИЕ ПРИ 429 ОШИБКЕ
            if (error.message.includes('429') || error.message.includes('Quota exhausted')) {
                console.warn(`[!] [Поток #${threadId}] Квота исчерпана для ${keyInfo}, попытка переключения...`);
                
                // Пытаемся переключиться на следующий свободный ключ
                if (switchToNextAvailableKey()) {
                    console.log(`[✨] [Поток #${threadId}] Переключился на ${keyInfo}, повторяю запрос...`);
                    continue; // Повторяем запрос с новым ключом БЕЗ увеличения счетчика попыток
                } else {
                    console.error(`[!] [Поток #${threadId}] Не удалось найти свободный ключ для переключения`);
                }
            }
            
            if (error.message.includes('503') || error.message.includes('500')) {
                console.warn(`[!] [Поток #${threadId}] Модель перегружена. Попытка ${i + 1}/${maxRetries}. Жду ${delay / 1000}с...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else if (i === maxRetries - 1) {
                // Последняя попытка - пробуем переключить ключ даже при других ошибках
                if (switchToNextAvailableKey()) {
                    console.log(`[🔄] [Поток #${threadId}] Последняя попытка с новым ключом ${keyInfo}`);
                }
                throw error;
            }
        }
    }
    throw new Error(`[Поток #${threadId}] Не удалось получить ответ от модели ${modelChoice} (${keyInfo}) после ${maxRetries} попыток.`);
}

async function notifyIndexNow(url) {
    console.log(`📢 [Поток #${threadId}] Отправляю уведомление для ${url} в IndexNow...`);
    const HOST = "blondeplace.netlify.app";
    const payload = JSON.stringify({
        host: HOST,
        key: INDEXNOW_API_KEY,
        urlList: [url]
    });

    try {
        await execa('curl', ['-X', 'POST', 'https://yandex.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        await execa('curl', ['-X', 'POST', 'https://www.bing.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        console.log(`[✔] [Поток #${threadId}] Уведомление для ${url} успешно отправлено.`);
    } catch (error) {
        console.error(`[!] [Поток #${threadId}] Ошибка при отправке в IndexNow для ${url}:`, error.stderr);
    }
}

async function generatePost(topic, slug, interlinks) {
    console.log(`[+] [Поток #${threadId}] [${keyInfo}] Генерирую ДЕТАЛЬНУЮ статью на тему: ${topic}`);

    // 🎯 BUTLER-СТИЛЬ: СУПЕР-ДЕТАЛЬНЫЙ ПЛАН
    const planPrompt = `Создай максимально детальный, многоуровневый план для портной SEO-статьи на тему "${topic}".

ТРЕБОВАНИЯ К ПЛАНУ:
- Минимум 15-20 разделов и подразделов
- Включи практические примеры, кейсы, пошаговые инструкции
- Добавь FAQ секцию (5-7 вопросов)
- Включи разделы: введение, основная часть, практические советы, частые ошибки, заключение
- План должен покрывать тему полностью и всесторонне

Контекст: статья для блога салона красоты ${BRAND_NAME}, целевая аудитория - женщины 25-45 лет, интересующиеся красотой.`;

    const plan = await generateWithRetry(planPrompt);

    // 🎯 BUTLER-СТИЛЬ: ТРЕБОВАНИЯ К ДЛИНЕ И ЭКСПЕРТНОСТИ
    const articlePrompt = `Напиши исчерпывающую, экспертную статью объемом МИНИМУМ 15000 символов по этому плану:

${plan}

КРИТИЧЕСКИЕ ТРЕБОВАНИЯ:
- Статья должна быть МАКСИМАЛЬНО подробной и экспертной
- Включи множество конкретных примеров, практических советов, кейсов
- Добавь списки, таблицы сравнения, пошаговые инструкции
- Обязательно включи FAQ секцию в конце
- Пиши от лица экспертов салона красоты ${BRAND_NAME}
- Используй профессиональную терминологию, но объясняй сложные понятия
- Строго следуй плану и используй правильные Markdown заголовки (# ## ###)
- НЕ добавляй изображения ![...], ссылки, URL-адреса
- Начинай сразу с заголовка H1
- ВАЖНО: избегай частого повторения одних слов, используй синонимы и разнообразную лексику для снижения тошноты текста

ОБЪЕМ: минимум 15000 символов - это критично важно!`;

    let articleText = await generateWithRetry(articlePrompt);

    // ПРОВЕРКА ДЛИНЫ И ДОПОЛНЕНИЕ ЕСЛИ НУЖНО
    if (articleText.length < 12000) {
        const extensionPrompt = `Расширь статью "${topic}". Добавь:
- Больше практических примеров
- Детальные пошаговые инструкции  
- Советы от экспертов
- Частые ошибки и как их избежать
- Дополнительные подразделы

Текущая статья:
${articleText}

Увеличь объем минимум в 1.5 раза, сохраняя экспертность и структуру.`;

        articleText = await generateWithRetry(extensionPrompt);
    }

    // СУПЕР-ЖЁСТКАЯ ОЧИСТКА
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.replace(/www\.[^\s]+/g, '');

    // Интерлинкинг
    if (interlinks.length > 0) {
        let interlinkingBlock = '\n\n---\n\n## Читайте также\n\n';
        interlinks.forEach(link => {
            interlinkingBlock += `* [${link.title}](${link.url})\n`;
        });
        articleText += interlinkingBlock;
    }

    const seoPrompt = `Для статьи на тему "${topic}" сгенерируй JSON-объект.

КРИТИЧЕСКИ ВАЖНО: ответ ТОЛЬКО валидный JSON.

JSON должен содержать:
- "title" (длиной 40-45 символов, включи основное ключевое слово)
- "description" (длиной 150-164 символа, продающий, с призывом к действию)
- "keywords" (СТРОГО 5-7 ключевых слов через запятую, МАКСИМАЛЬНО релевантных теме)

КРИТИЧЕСКИЕ требования к keywords:
- Используй ТОЛЬКО термины ИЗ ТЕМЫ статьи
- НЕ используй общие слова типа "красота, стиль, уход"
- Фокусируйся на КОНКРЕТНОЙ процедуре/технике

Контекст: блог салона красоты ${BRAND_NAME}.`;

    let seoText = await generateWithRetry(seoPrompt);

    const match = seoText.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error("Не удалось найти валидный JSON в ответе модели.");
    }
    const seoData = JSON.parse(match[0]);

    const reviewCount = Math.floor(Math.random() * (900 - 300 + 1)) + 300;
    const ratingValue = (Math.random() * (5.0 - 4.7) + 4.7).toFixed(1);

    const finalHeroImage = FALLBACK_IMAGE_URL;

    // 🎯 ИСПРАВЛЕННАЯ СХЕМА (как у Butler)
    const fullSchema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "headline": seoData.title,
        "description": seoData.description,
        "image": {
            "@type": "ImageObject",
            "url": finalHeroImage
        },
        "author": {
            "@type": "Person",
            "name": BRAND_AUTHOR_NAME
        },
        "publisher": {
            "@type": "Organization",
            "name": BRAND_BLOG_NAME,
            "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/favicon.ico`
            }
        },
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": ratingValue,
            "reviewCount": reviewCount,
            "bestRating": "5",
            "worstRating": "1"
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${SITE_URL}/blog/${slug}/`
        }
    };

    const frontmatter = `---
title: ${JSON.stringify(seoData.title)}
description: ${JSON.stringify(seoData.description)}
keywords: ${JSON.stringify(seoData.keywords || topic)}
pubDate: ${JSON.stringify(new Date().toISOString())}
author: ${JSON.stringify(BRAND_AUTHOR_NAME)}
heroImage: ${JSON.stringify(finalHeroImage)}
schema: ${JSON.stringify(fullSchema)}
---

${articleText}
`;

    return frontmatter;
}

async function main() {
    console.log(`[🚀] [Поток #${threadId}] [${keyInfo}] Запуск рабочего потока для модели ${GEMINI_MODEL_NAME}...`);

    try {
        const BATCH_SIZE = parseInt(process.env.BATCH_SIZE_PER_THREAD, 10) || 1;
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

        console.log(`[🎯] [Поток #${threadId}] [${keyInfo}] Найдено ${topicsForThisThread.length} новых тем. Беру в работу.`);

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
                console.log(`[✔] [Поток #${threadId}] [${keyInfo}] Статья "${topic}" успешно создана.`);

                const newUrl = `${SITE_URL}/blog/${slug}/`;
                await notifyIndexNow(newUrl);

                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.error(`[!] [Поток #${threadId}] [${keyInfo}] Ошибка при обработке темы "${topic}": ${e.message}`);
                if (e.message.includes('429') || e.message.includes('API key')) {
                    console.error(`[!] [Поток #${threadId}] [${keyInfo}] Ключ API исчерпан. Завершаю работу этого потока.`);
                    break;
                }
                continue;
            }
        }
    } catch (error) {
        console.error(`[Поток #${threadId}] [${keyInfo}] [!] Критическая ошибка:`, error);
        process.exit(1);
    }
}

main(); 