#!/usr/bin/env node
// BlondePlace Beauty Content Factory
// Генератор экспертных статей о красоте, уходе за волосами и салонных процедурах

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// ===== КОНФИГУРАЦИЯ BLONDEPLACE =====
const BRAND_CONFIG = {
    brand: "BlondePlace",
    domain: "blondeplace.ru",
    blog_domain: "blondeplace.netlify.app",
    salon_name: "BlondePlace Beauty Studio",
    specialization: "Салон красоты, специализирующийся на окрашивании волос, стрижках, маникюре и beauty-процедурах",
    author: "BlondePlace Beauty Expert",
    location: "Россия",
    services: [
        "Окрашивание волос (блонд, омбре, шатуш, балаяж)",
        "Стрижки и укладки", 
        "Кератиновое выпрямление волос",
        "Ботокс для волос",
        "Маникюр и педикюр",
        "Наращивание ногтей",
        "Уход за кожей лица",
        "Косметологические процедуры",
        "Консультации beauty-экспертов"
    ],
    target_audience: "Женщины 18-45 лет, интересующиеся красотой, уходом за волосами и современными трендами",
    tone: "Экспертный, дружелюбный, информативный",
    expertise: "Профессиональные советы от мастеров с многолетним опытом"
};

// ===== BEAUTY КАРТИНКИ (ВМЕСТО BUTLER) =====
const BEAUTY_IMAGES_POOL = [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2074&auto=format&fit=crop", // Hair salon
    "https://images.unsplash.com/photo-1487412912207-890745b4773c?q=80&w=2070&auto=format&fit=crop", // Nail art
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2069&auto=format&fit=crop", // Makeup
    "https://images.unsplash.com/photo-1559599101-f09722fb4948?q=80&w=2069&auto=format&fit=crop", // Hair care
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=2069&auto=format&fit=crop", // Beauty salon
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=2070&auto=format&fit=crop", // Hair styling
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=2070&auto=format&fit=crop", // Spa treatment
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop"  // Skincare
];

// Функция для выбора релевантной картинки
function getBeautyImage(topic, category) {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('волос') || topicLower.includes('окрашивание') || topicLower.includes('стрижк')) {
        return BEAUTY_IMAGES_POOL[Math.random() < 0.5 ? 0 : 5]; // Hair salon/styling
    }
    if (topicLower.includes('ногт') || topicLower.includes('маникюр') || topicLower.includes('nail')) {
        return BEAUTY_IMAGES_POOL[1]; // Nail art
    }
    if (topicLower.includes('макияж') || topicLower.includes('makeup')) {
        return BEAUTY_IMAGES_POOL[2]; // Makeup
    }
    if (topicLower.includes('уход') || topicLower.includes('кожа')) {
        return BEAUTY_IMAGES_POOL[Math.random() < 0.5 ? 3 : 7]; // Care/skincare
    }
    if (topicLower.includes('процедур') || topicLower.includes('салон')) {
        return BEAUTY_IMAGES_POOL[Math.random() < 0.5 ? 4 : 6]; // Salon/spa
    }
    
    // Default beauty image
    return BEAUTY_IMAGES_POOL[Math.floor(Math.random() * BEAUTY_IMAGES_POOL.length)];
}

// ===== НАСТРОЙКИ КОНТЕНТА =====
const POSTS_DIR = 'src/content/posts';
const TOPICS_FILE = 'topics.txt';
const THREAD_ID = parseInt(process.env.THREAD_ID, 10) || 1;

// ===== ССЫЛКИ НА ОСНОВНОЙ САЙТ BLONDEPLACE =====
const REAL_LINKS_MAP = {
    "о нас": { url: "https://blondeplace.ru/#about", text: "о нашем салоне" },
    "услуги": { url: "https://blondeplace.ru/#services", text: "наших услугах" },
    "скидки": { url: "https://blondeplace.ru/#discount", text: "актуальных скидках" },
    "почему мы": { url: "https://blondeplace.ru/#why", text: "преимуществах BLONDE PLACE" },
    "коворкинг": { url: "https://blondeplace.ru/#coworking", text: "beauty коворкинге" },
    "мастера": { url: "https://blondeplace.ru/#masters", text: "наших мастерах" },
    "отзывы": { url: "https://blondeplace.ru/#comments", text: "отзывах клиентов" },
    "бренды": { url: "https://blondeplace.ru/#brands", text: "брендах-партнерах" },
    "новости": { url: "https://blondeplace.ru/#news", text: "последних новостях" },
    "телеграм": { url: "https://t.me/Blondeplace", text: "📱 телеграм канале" }
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
let model, apiClient;

// Выбираем модель
if (modelChoice === 'openrouter') {
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
    
    const apiKey = process.env.OPENROUTER_API_KEY_CURRENT;
    if (!apiKey) {
        throw new Error("[Beauty Поток #" + THREAD_ID + "] OpenRouter API key не найден!");
    }
    
    apiClient = {
        url: OPENROUTER_API_URL,
        key: apiKey,
        model: DEEPSEEK_MODEL_NAME
    };
    
    console.log("💄 [Beauty Поток #" + THREAD_ID + "] Использую модель OpenRouter DeepSeek с ключом ..." + apiKey.slice(-4));
} else {
    const apiKey = process.env.GEMINI_API_KEY_CURRENT;
    if (!apiKey) {
        throw new Error("[Beauty Поток #" + THREAD_ID + "] Gemini API key не найден!");
    }
    
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    console.log("💄 [Beauty Поток #" + THREAD_ID + "] Использую модель Gemini с ключом ..." + apiKey.slice(-4));
}

// ===== BEAUTY SYSTEM PROMPTS =====
const BEAUTY_SYSTEM_PROMPTS = {
    hair_care: "Ты — эксперт по уходу за волосами в салоне красоты BlondePlace. Знаешь все о современных техниках окрашивания, восстановлении волос, профессиональных процедурах.",
    nail_care: "Ты — мастер маникюра и педикюра в салоне BlondePlace. Эксперт по nail-арту, покрытиям, уходу за ногтями и современным тенденциям.",
    skincare: "Ты — косметолог салона BlondePlace. Специализируешься на уходе за кожей лица, anti-age процедурах, подборе косметики.",
    salon_procedures: "Ты — технолог салона BlondePlace. Знаешь все о салонных процедурах: кератине, ботоксе для волос, химических завивках.",
    beauty_tips: "Ты — beauty-консультант салона BlondePlace. Даешь советы по красоте, стилю, подбору образов и уходовых процедур."
};

// ===== ГЕНЕРАЦИЯ КОНТЕНТА =====
async function generateWithRetry(prompt, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (modelChoice === 'openrouter') {
                const response = await fetch(apiClient.url, {
                    method: 'POST',
                    headers: {
                        'Authorization': "Bearer " + apiClient.key,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: apiClient.model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7
                    })
                });
                
                const data = await response.json();
                return data.choices[0].message.content;
            } else {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            }
        } catch (error) {
            console.warn("[Beauty Поток #" + THREAD_ID + "] ⚠️ Попытка " + attempt + "/" + maxRetries + " не удалась: " + error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
}

async function generateBeautyContent(topic) {
    const category = categorizeBeautyTopic(topic);
    const systemPrompt = BEAUTY_SYSTEM_PROMPTS[category] || BEAUTY_SYSTEM_PROMPTS.beauty_tips;
    
    const prompt = systemPrompt + "\n\nСоздай экспертную статью для блога салона красоты BlondePlace на тему: \"" + topic + "\"\n\nТРЕБОВАНИЯ К КОНТЕНТУ:\n- Объем: 1500-2500 слов (оптимально для SEO)\n- Структура: заголовки H1, H2, H3 в Markdown\n- Тон: экспертный, но доступный\n- Включи практические советы от мастеров BlondePlace\n- Добавь призывы к действию (записаться в салон)\n- Используй профессиональную терминологию\n- Упоминай услуги и процедуры BlondePlace\n\nСТРУКТУРА:\n1. Введение (100-150 слов)\n2. Основные разделы (3-5 блоков по 300-400 слов)\n3. Практические советы (список)\n4. Заключение с призывом к действию\n\nНЕ используй изображения в тексте. Пиши в формате Markdown.";

    try {
        console.log("[+] [Beauty Поток #" + THREAD_ID + "] Генерирую beauty статью на тему: " + topic);
        
        const content = await generateWithRetry(prompt);
        const seoData = await generateBeautySEO(topic, category);
        const frontmatter = await createBeautyFrontmatter(topic, content, seoData);
        
        return frontmatter;
        
    } catch (error) {
        console.error("[Beauty Поток #" + THREAD_ID + "] ❌ Ошибка генерации для \"" + topic + "\":", error.message);
        return null;
    }
}

// ===== КАТЕГОРИЗАЦИЯ BEAUTY ТОПИКОВ =====
function categorizeBeautyTopic(topic) {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('окрашивание') || topicLower.includes('блонд') || 
        topicLower.includes('цвет') || topicLower.includes('мелирование') ||
        topicLower.includes('омбре') || topicLower.includes('балаяж')) {
        return 'hair_coloring';
    }
    
    if (topicLower.includes('волос') || topicLower.includes('уход за волосами') ||
        topicLower.includes('шампунь') || topicLower.includes('кондиционер')) {
        return 'hair_care';
    }
    
    if (topicLower.includes('маникюр') || topicLower.includes('педикюр') || 
        topicLower.includes('ногт') || topicLower.includes('nail')) {
        return 'nail_care';
    }
    
    if (topicLower.includes('процедур') || topicLower.includes('салон') ||
        topicLower.includes('кератин') || topicLower.includes('ботокс')) {
        return 'salon_procedures';
    }
    
    return 'beauty_tips';
}

// ===== ГЕНЕРАЦИЯ SEO ДАННЫХ (ФИКСИРОВАННЫЕ ДЛИНЫ) =====
async function generateBeautySEO(topic, category) {
    const seoPrompt = "Создай SEO-оптимизированные метаданные для статьи салона красоты на тему: \"" + topic + "\"\n\nСТРОГИЕ ТРЕБОВАНИЯ:\n- Title: ТОЧНО 35-40 символов, включай \"BLONDE PLACE\"\n- Description: ТОЧНО 150-160 символов, с призывом к действию\n- Keywords: 5-7 ключевых фраз через запятую\n- Учитывай beauty-тематику\n\nОтвет СТРОГО в JSON формате:\n{\n  \"title\": \"...\",\n  \"description\": \"...\", \n  \"keywords\": \"...\"\n}";

    try {
        const result = await generateWithRetry(seoPrompt);
        
        // Извлекаем JSON из ответа
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const seoData = JSON.parse(jsonMatch[0]);
            
            // ПРИНУДИТЕЛЬНО ОБРЕЗАЕМ ДО НУЖНОЙ ДЛИНЫ
            if (seoData.title && seoData.title.length > 45) {
                seoData.title = seoData.title.substring(0, 42) + '...';
            }
            
            if (seoData.description && seoData.description.length > 164) {
                seoData.description = seoData.description.substring(0, 157) + '...';
            }
            
            return seoData;
        }
        
        // Fallback SEO с правильными длинами
        const shortTitle = topic.substring(0, 25) + " BLONDE PLACE";
        const shortDesc = "Экспертные советы от " + BRAND_CONFIG.brand + ". " + topic.substring(0, 80) + ". Записывайтесь на консультацию!";
        
        return {
            title: shortTitle.length <= 45 ? shortTitle : shortTitle.substring(0, 42) + '...',
            description: shortDesc.length <= 164 ? shortDesc : shortDesc.substring(0, 157) + '...',
            keywords: topic + ", салон красоты, " + BRAND_CONFIG.brand + ", beauty советы, уход за волосами"
        };
        
    } catch (error) {
        console.warn("[Beauty Поток #" + THREAD_ID + "] ⚠️ Ошибка генерации SEO для \"" + topic + "\". Использую fallback.");
        return {
            title: topic.substring(0, 30) + " " + BRAND_CONFIG.brand,
            description: "Советы экспертов " + BRAND_CONFIG.brand + " по теме \"" + topic.substring(0, 60) + "\". Запишитесь на консультацию!",
            keywords: topic + ", салон красоты, beauty, уход, " + BRAND_CONFIG.brand
        };
    }
}

// ===== СОЗДАНИЕ FRONTMATTER =====
async function createBeautyFrontmatter(topic, content, seoData) {
    const category = categorizeBeautyTopic(topic);
    const slug = topic.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    // ИСПОЛЬЗУЕМ BEAUTY КАРТИНКУ ВМЕСТО BUTLER
    const heroImage = getBeautyImage(topic, category);
    const currentDate = new Date().toISOString();
    
    // Schema.org для beauty контента
    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: seoData.title,
        description: seoData.description,
        image: heroImage,
        author: {
            "@type": "Organization",
            name: BRAND_CONFIG.salon_name,
            url: "https://" + BRAND_CONFIG.domain
        },
        publisher: {
            "@type": "Organization", 
            name: BRAND_CONFIG.brand,
            logo: {
                "@type": "ImageObject",
                url: "https://" + BRAND_CONFIG.domain + "/logo.png"
            }
        },
        datePublished: currentDate,
        dateModified: currentDate,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://" + BRAND_CONFIG.blog_domain + "/blog/" + slug + "/"
        },
        about: [
            {
                "@type": "Thing",
                name: "Beauty Care"
            },
            {
                "@type": "Thing", 
                name: "Hair Care"
            }
        ]
    };
    
    const frontmatter = "---\ntitle: " + JSON.stringify(seoData.title) + "\ndescription: " + JSON.stringify(seoData.description) + "\nkeywords: " + JSON.stringify(seoData.keywords) + "\npubDate: " + JSON.stringify(currentDate) + "\nauthor: " + JSON.stringify(BRAND_CONFIG.author) + "\nheroImage: " + JSON.stringify(heroImage) + "\ncategory: " + JSON.stringify(category) + "\nschema: " + JSON.stringify(schema) + "\n---\n\n" + content + "\n";
    
    return frontmatter;
}

// ===== ОСНОВНАЯ ФУНКЦИЯ =====
async function main() {
    try {
        console.log("💄 [Beauty Поток #" + THREAD_ID + "] Запуск beauty рабочего потока...");
        
        const topics = await fs.readFile(TOPICS_FILE, 'utf-8');
        const topicsList = topics.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        const batchSize = parseInt(process.env.BATCH_SIZE_PER_THREAD, 10) || 1;
        const startIndex = (THREAD_ID - 1) * batchSize;
        const endIndex = Math.min(startIndex + batchSize, topicsList.length);
        const batchTopics = topicsList.slice(startIndex, endIndex);
        
        if (batchTopics.length === 0) {
            console.log("💄 [Beauty Поток #" + THREAD_ID + "] Нет beauty тем для обработки.");
            return;
        }
        
        console.log("💄 [Beauty Поток #" + THREAD_ID + "] Найдено " + batchTopics.length + " новых beauty тем. Беру в работу.");
        
        for (const topic of batchTopics) {
            const slug = topic.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            
            const filePath = path.join(POSTS_DIR, slug + ".md");
            
            try {
                await fs.access(filePath);
                console.log("💄 [Beauty Поток #" + THREAD_ID + "] ⏭️ Статья \"" + topic + "\" уже существует. Пропускаю.");
                continue;
            } catch {
                // Файл не существует, продолжаем
            }
            
            const content = await generateBeautyContent(topic);
            if (content) {
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, content, 'utf-8');
                
                console.log("💄 [Beauty Поток #" + THREAD_ID + "] [✔] Beauty статья \"" + topic + "\" успешно создана.");
                
                // IndexNow уведомление
                const indexUrl = "https://" + BRAND_CONFIG.blog_domain + "/blog/" + slug + "/";
                await sendIndexNowNotification(indexUrl);
            }
        }
        
    } catch (error) {
        console.error("💄 [Beauty Поток #" + THREAD_ID + "] ❌ Критическая ошибка:", error.message);
        process.exit(1);
    }
}

// ===== INDEXNOW УВЕДОМЛЕНИЯ =====
async function sendIndexNowNotification(url) {
    const API_KEY = "df39150ca56f896546628ae3c923dd4a"; // BlondePlace IndexNow token
    const HOST = "blondeplace.netlify.app";
    
    const payload = {
        host: HOST,
        key: API_KEY,
        urlList: [url]
    };
    
    try {
        console.log("📢 [Beauty Поток #" + THREAD_ID + "] Отправляю уведомление для " + url + " в IndexNow...");
        
        const response = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log("📢 [Beauty Поток #" + THREAD_ID + "] [✔] Уведомление для " + url + " успешно отправлено. 🔥");
        } else {
            console.log("📢 [Beauty Поток #" + THREAD_ID + "] ⚠️ IndexNow ответил: " + response.status);
        }
        
    } catch (error) {
        console.log("📢 [Beauty Поток #" + THREAD_ID + "] ❌ Ошибка IndexNow: " + error.message);
    }
}

if (import.meta.url === "file://" + process.argv[1]) {
    main();
}