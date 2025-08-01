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
const GEMINI_MODEL_NAME = "gemini-2.5-flash";

// --- ИНИЦИАЛИЗАЦИЯ ПОТОКА ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;
const apiKey = process.env.API_KEY_CURRENT;

if (!apiKey) {
    throw new Error(`[Поток #${threadId}] Не был предоставлен API-ключ (API_KEY_CURRENT)!`);
}

// ЛОГИРОВАНИЕ КАК В BUTLER FACTORY
if (modelChoice === 'deepseek') {
    console.log(`🚀 [Поток #${threadId}] Использую модель DeepSeek через OpenRouter с ключом ...${apiKey.slice(-4)}`);
} else {
    console.log(`✨ [Поток #${threadId}] Использую модель Gemini с ключом ...${apiKey.slice(-4)}`);
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

// УЛУЧШЕННАЯ ФУНКЦИЯ ПРОВЕРКИ ЦЕЛОСТНОСТИ СЛОВ
function ensureCompleteWords(text, minLength, maxLength) {
    // Если текст короче минимума, возвращаем как есть
    if (text.length < minLength) return text;
    
    // Если текст в пределах нормы, возвращаем как есть
    if (text.length <= maxLength) return text;
    
    // Обрезаем по максимальной длине
    let trimmed = text.slice(0, maxLength);
    
    // Если следующий символ не пробел, ищем последний пробел
    if (text[maxLength] && text[maxLength] !== ' ') {
        const lastSpaceIndex = trimmed.lastIndexOf(' ');
        // Не обрезаем слишком агрессивно - минимум 80% от максимальной длины
        if (lastSpaceIndex > maxLength * 0.8) {
            trimmed = trimmed.slice(0, lastSpaceIndex);
        }
    }
    
    // Убираем лишние пробелы и знаки препинания в конце
    trimmed = trimmed.trim().replace(/[,:;!?\-\.]+$/, '');
    
    // Если после обрезки стало меньше минимума, возвращаем исходный текст обрезанный по максимуму
    if (trimmed.length < minLength) {
        return text.slice(0, maxLength).trim();
    }
    
    return trimmed;
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
                        throw new Error(`429 Too Many Requests`);
                    }
                    throw new Error(`Ошибка HTTP от OpenRouter: ${response.status}`);
                }

                const data = await response.json();
                if (!data.choices || data.choices.length === 0) throw new Error("Ответ от API OpenRouter не содержит поля 'choices'.");

                return data.choices[0].message.content;
            } else {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        } catch (error) {
            if (error.message.includes('503') || error.message.includes('429')) {
                console.warn(`[!] [Поток #${threadId}] Модель перегружена. Попытка ${i + 1}/${maxRetries}. Жду ${delay / 1000}с...`);
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
    console.log(`[+] [Поток #${threadId}] Генерирую ДЕТАЛЬНУЮ статью на тему: ${topic}`);

    // BUTLER-СТИЛЬ: СУПЕР-ДЕТАЛЬНЫЙ ПЛАН
    const planPrompt = `Создай максимально детальный, многоуровневый план для экспертной SEO-статьи на тему "${topic}".

ТРЕБОВАНИЯ К ПЛАНУ:
- Минимум 15-20 разделов и подразделов
- Включи практические примеры, кейсы, пошаговые инструкции
- Добавь FAQ секцию (5-7 вопросов)
- Включи разделы: введение, основная часть, практические советы, частые ошибки, заключение
- План должен покрывать тему полностью и всесторонне

Контекст: статья для блога салона красоты ${BRAND_NAME}, целевая аудитория - женщины 25-45 лет, интересующиеся красотой.`;

    const plan = await generateWithRetry(planPrompt);

    // УЛЬТРА-АГРЕССИВНАЯ БОРЬБА С ТОШНОТОЙ + МАКСИМАЛЬНЫЙ ОБЪЕМ
    const articlePrompt = `Напиши исчерпывающую, экспертную статью объемом МИНИМУМ 20000 символов по этому плану:

${plan}

🔥 КРИТИЧЕСКИЕ ТРЕБОВАНИЯ ДЛЯ СНИЖЕНИЯ ТОШНОТЫ ДО 3.0:
- МАКСИМАЛЬНОЕ РАЗНООБРАЗИЕ ЛЕКСИКИ! Каждое предложение - уникальные слова!
- Используй синонимы, перифразы, профессиональные термины, научные названия
- ЗАПРЕЩЕНО повторять одинаковые слова в соседних абзацах!
- Варьируй структуру предложений (короткие, длинные, вопросительные, восклицательные)
- Включи технические термины, химические названия, бренды материалов
- Добавь множество примеров с разными названиями техник и процедур
- Используй профессиональный жаргон парикмахеров и стилистов
- Добавь иностранные термины и их русские аналоги
- ЦЕЛЬ: тошнота СТРОГО ниже 3.0!

СТРУКТУРНЫЕ ТРЕБОВАНИЯ:
- Статья должна быть МАКСИМАЛЬНО подробной и экспертной
- Включи множество конкретных примеров, практических советов, кейсов
- Добавь списки, таблицы сравнения, пошаговые инструкции
- Обязательно включи FAQ секцию в конце
- Пиши от лица экспертов салона красоты ${BRAND_NAME}
- Используй профессиональную терминологию, но объясняй сложные понятия
- Строго следуй плану и используй правильные Markdown заголовки (# ## ###)
- НЕ добавляй изображения ![...], ссылки, URL-адреса
- Начинай сразу с заголовка H1

ОБЪЕМ: минимум 20000 символов для максимального разнообразия лексики!`;

    let articleText = await generateWithRetry(articlePrompt);

    // ПРОВЕРКА ДЛИНЫ И ДОПОЛНЕНИЕ ЕСЛИ НУЖНО
    if (articleText.length < 15000) {
        const extensionPrompt = `Дополни и расширь статью на тему "${topic}". Добавь больше деталей:
- Практические примеры и кейсы с уникальными названиями процедур
- Детальные пошаговые инструкции с профессиональной терминологией
- Советы от экспертов салона с разнообразной лексикой
- Частые ошибки и способы их избежать
- Дополнительные подразделы с синонимами и техническими терминами
- Химические формулы и научные названия компонентов
- Бренды материалов и инструментов
- Международные техники и их адаптация

Текущая статья: ${articleText}

КРИТИЧНО: Увеличь объем минимум в 1.5 раза. Используй МАКСИМАЛЬНО уникальную лексику, синонимы, профессиональные термины, научные названия для снижения тошноты до 2.5!`;

        articleText = await generateWithRetry(extensionPrompt);
    }

    // СУПЕР-ЖЁСТКАЯ ОЧИСТКА
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.replace(/www\.[^\s]+/g, '');

    // ОЧИСТКА ESCAPE-СИМВОЛОВ И ПРОБЛЕМНЫХ ПЕРЕНОСОВ СТРОК
    articleText = articleText.replace(/\\n/g, '');
    articleText = articleText.replace(/`n/g, '');
    articleText = articleText.replace(/\r\n/g, '\n');
    articleText = articleText.replace(/\r/g, '\n');
    articleText = articleText.trim();

    // Интерлинкинг
    if (interlinks.length > 0) {
        let interlinkingBlock = '\n\n---\n\n## Читайте также\n\n';
        interlinks.forEach(link => {
            interlinkingBlock += `* [${link.title}](${link.url})\n`;
        });
        articleText += interlinkingBlock;
    }

    // УЛЬТРА-ТОЧНЫЙ SEO ПРОМПТ С ПРАВИЛЬНЫМИ ЛИМИТАМИ
    const seoPrompt = `Для статьи на тему "${topic}" сгенерируй JSON-объект.

КРИТИЧЕСКИ ВАЖНО: ответ ТОЛЬКО валидный JSON без дополнительного текста, комментариев, markdown форматирования. Начинай ответ сразу с { и заканчивай }. Никакого текста до или после JSON!

JSON должен содержать:
- "title" (СТРОГО 40-45 символов, полные слова без обрезки, включи основное ключевое слово и призыв)
- "description" (СТРОГО 150-164 символа, полные слова без обрезки, продающий, с призывом к действию)
- "keywords" (СТРОГО строка: 3-5 ключевых слов через запятую, БЕЗ общих слов)

🎯 ТРЕБОВАНИЯ К ДЛИНЕ - ОБЯЗАТЕЛЬНО:
- Title: МИНИМУМ 40 символов, МАКСИМУМ 45 символов, БЕЗ ОБРЕЗКИ СЛОВ!
- Description: МИНИМУМ 150 символов, МАКСИМУМ 164 символа, БЕЗ ОБРЕЗКИ СЛОВ!
- Проверь каждое слово - оно должно помещаться ПОЛНОСТЬЮ!

ПРИМЕРЫ ПРАВИЛЬНОЙ ДЛИНЫ:
Title: "Калифорнийское мелирование: техника и результат" (43 символа) ✅
Description: "Профессиональное калифорнийское мелирование в салоне BlondePlace. Естественный эффект выгоревших прядей с сохранением здоровья волос. Запишитесь!" (158 символов) ✅

КРИТИЧЕСКИЕ требования к keywords:
- Используй ТОЛЬКО термины ИЗ ТЕМЫ статьи
- НЕ используй общие слова типа "красота, стиль, уход"
- Фокусируйся на КОНКРЕТНОЙ процедуре/технике

Контекст: блог салона красоты ${BRAND_NAME}.`;

    let seoText = await generateWithRetry(seoPrompt);

    // УЛУЧШЕННЫЙ JSON ПАРСИНГ С FALLBACK
    let match = seoText.match(/\{[^{}]*\}/);
    if (!match) {
        match = seoText.match(/\{[\s\S]*?\}/);
    }
    if (!match) {
        const cleanSeoText = seoText.replace(/```json|```|`/g, "").trim();
        match = cleanSeoText.match(/\{[\s\S]*?\}/);
    }

    let seoData;
    if (!match) {
        console.warn(`[!] [Поток #${threadId}] JSON не найден в ответе модели. Создаю fallback SEO данные.`);
        
        // УЛУЧШЕННЫЕ FALLBACK SEO ДАННЫЕ С ПРАВИЛЬНЫМИ ЛИМИТАМИ
        const baseTopic = topic.length > 30 ? topic.slice(0, 30) : topic;
        const fallbackTitle = `${baseTopic}: полный гид от BlondePlace`;
        const finalTitle = ensureCompleteWords(fallbackTitle, 40, 45);
        
        const fallbackDesc = `Профессиональные услуги по ${topic.toLowerCase()} в салоне BlondePlace. Опытные мастера, качественные материалы, гарантия результата. Записывайтесь на консультацию!`;
        const finalDesc = ensureCompleteWords(fallbackDesc, 150, 164);
        
        seoData = {
            title: finalTitle,
            description: finalDesc,
            keywords: topic
        };
        
        console.log(`[Поток #${threadId}] Использую fallback SEO: title=${seoData.title.length} chars, desc=${seoData.description.length} chars`);
    } else {
        try {
            seoData = JSON.parse(match[0]);
            
            // ПРОВЕРКА И КОРРЕКЦИЯ ДЛИНЫ БЕЗ ПОТЕРИ СМЫСЛА
            if (seoData.title) {
                const originalTitle = seoData.title;
                seoData.title = ensureCompleteWords(seoData.title, 40, 45);
                if (seoData.title.length < 40) {
                    // Если title слишком короткий, дополняем
                    seoData.title = `${seoData.title} - BlondePlace`;
                    seoData.title = ensureCompleteWords(seoData.title, 40, 45);
                }
                if (seoData.title !== originalTitle) {
                    console.warn(`[!] [Поток #${threadId}] Title скорректирован: ${seoData.title.length} символов`);
                }
            }
            
            if (seoData.description) {
                const originalDesc = seoData.description;
                seoData.description = ensureCompleteWords(seoData.description, 150, 164);
                if (seoData.description.length < 150) {
                    // Если description слишком короткий, дополняем
                    seoData.description = `${seoData.description} Записывайтесь в BlondePlace прямо сейчас!`;
                    seoData.description = ensureCompleteWords(seoData.description, 150, 164);
                }
                if (seoData.description !== originalDesc) {
                    console.warn(`[!] [Поток #${threadId}] Description скорректирован: ${seoData.description.length} символов`);
                }
            }
            
        } catch (parseError) {
            console.warn(`[!] [Поток #${threadId}] Ошибка парсинга JSON: ${parseError.message}. Создаю fallback SEO данные.`);
            
            // УЛУЧШЕННЫЕ FALLBACK SEO ДАННЫЕ С ПРАВИЛЬНЫМИ ЛИМИТАМИ
            const baseTopic = topic.length > 30 ? topic.slice(0, 30) : topic;
            const fallbackTitle = `${baseTopic}: полный гид от BlondePlace`;
            const finalTitle = ensureCompleteWords(fallbackTitle, 40, 45);
            
            const fallbackDesc = `Профессиональные услуги по ${topic.toLowerCase()} в салоне BlondePlace. Опытные мастера, качественные материалы, гарантия результата. Записывайтесь на консультацию!`;
            const finalDesc = ensureCompleteWords(fallbackDesc, 150, 164);
            
            seoData = {
                title: finalTitle,
                description: finalDesc,
                keywords: topic
            };
        }
    }

    const reviewCount = Math.floor(Math.random() * (900 - 300 + 1)) + 300;
    const ratingValue = (Math.random() * (5.0 - 4.7) + 4.7).toFixed(1);

    const finalHeroImage = FALLBACK_IMAGE_URL;

    // ИСПРАВЛЕННАЯ СХЕМА (как у Butler)
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

    // БЕЗОПАСНАЯ ОБРАБОТКА KEYWORDS
    const safeKeywords = typeof seoData.keywords === "string" 
        ? seoData.keywords 
        : Array.isArray(seoData.keywords) 
            ? seoData.keywords.join(", ") 
            : topic;

    // ИСПРАВЛЕННЫЙ FRONTMATTER БЕЗ ПРОБЛЕМНЫХ СИМВОЛОВ
    const frontmatter = `---
title: ${JSON.stringify(seoData.title)}
description: ${JSON.stringify(seoData.description)}
keywords: ${JSON.stringify(safeKeywords)}
pubDate: ${JSON.stringify(new Date().toISOString())}
author: ${JSON.stringify(BRAND_AUTHOR_NAME)}
heroImage: ${JSON.stringify(finalHeroImage)}
schema: ${JSON.stringify(fullSchema)}
---

${articleText}`;

    // ФИНАЛЬНАЯ ПРОВЕРКА И ЛОГИРОВАНИЕ
    console.log(`[✔] [Поток #${threadId}] ФИНАЛЬНАЯ ПРОВЕРКА:`);
    console.log(`[✔] [Поток #${threadId}] Title: "${seoData.title}" (${seoData.title.length} символов) ${seoData.title.length >= 40 && seoData.title.length <= 45 ? '✅' : '❌'}`);
    console.log(`[✔] [Поток #${threadId}] Description: "${seoData.description}" (${seoData.description.length} символов) ${seoData.description.length >= 150 && seoData.description.length <= 164 ? '✅' : '❌'}`);
    
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
            } catch (e) { 
                // Игнорируем ошибки чтения
            }
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

                const newUrl = `${SITE_URL}/blog/${slug}/`;
                await notifyIndexNow(newUrl);

                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.error(`[!] [Поток #${threadId}] Ошибка при обработке темы "${topic}": ${e.message}`);
                if (e.message.includes('429') || e.message.includes('API key')) {
                    console.error(`[!] [Поток #${threadId}] Ключ API исчерпан. Завершаю работу этого потока.`);
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