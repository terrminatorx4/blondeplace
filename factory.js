import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';

// ===== BLONDEPLACE BRAND CONFIG =====
const BRAND_CONFIG = {
    brand: 'BLONDE PLACE',
    salon_name: 'BLONDE PLACE',
    domain: 'blondeplace.ru',
    blog_domain: 'blondeplace.netlify.app',
    author: 'BLONDE PLACE Beauty Expert',
    location: 'Санкт-Петербург',
    phone: '+7 (812) 123-45-67',
    telegram: 'https://t.me/Blondeplace'
};

// ===== FALLBACK IMAGE =====
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1560066984-138dadb4c035';

// ===== REAL LINKS MAP =====
const REAL_LINKS_MAP = {
    'general': [
        { url: "https://blondeplace.ru", text: `главном сайте ${BRAND_CONFIG.salon_name}` },
        { url: "https://blondeplace.ru/#about", text: `о салоне красоты ${BRAND_CONFIG.salon_name}` },
        { url: "https://blondeplace.ru/#services", text: `наших услугах` },
        { url: "https://blondeplace.ru/#masters", text: `наших мастерах` },
        { url: "https://blondeplace.ru/#coworking", text: `beauty коворкинге` },
        { url: "https://t.me/Blondeplace", text: `Telegram канале` },
    ],
    'услуг': { url: "https://blondeplace.ru/#services", text: "наших услугах" },
    'окрашивание': { url: "https://blondeplace.ru/#services", text: "услугах окрашивания волос" },
    'блонд': { url: "https://blondeplace.ru/#why", text: "почему BLONDE PLACE" },
    'стрижка': { url: "https://blondeplace.ru/#services", text: "услугах стрижки" },
    'маникюр': { url: "https://blondeplace.ru/#services", text: "услугах маникюра" },
    'уход': { url: "https://blondeplace.ru/#services", text: "процедурах по уходу" },
    'скидк': { url: "https://blondeplace.ru/#discount", text: "получении скидки" },
    'мастер': { url: "https://blondeplace.ru/#masters", text: "наших мастерах" },
    'бренд': { url: "https://blondeplace.ru/#brands", text: "брендах которые мы используем" },
    'новост': { url: "https://blondeplace.ru/#news", text: "новостной ленте" },
    'отзыв': { url: "https://blondeplace.ru/#comments", text: "отзывах клиентов" },
    'коворкинг': { url: "https://blondeplace.ru/#coworking", text: "beauty коворкинге" }
};

// ===== BEAUTY CATEGORIES =====
const BEAUTY_CATEGORIES = [
    'hair-care', 'hair-coloring', 'hairstyles', 'blonde-trends', 'hair-treatments',
    'nail-care', 'manicure', 'pedicure', 'skincare', 'makeup', 'beauty-tips',
    'salon-news', 'hair-products', 'beauty-trends', 'seasonal-beauty'
];

// ===== КОНФИГУРАЦИЯ AI =====
const MODEL_CHOICE = process.env.MODEL_CHOICE || 'gemini';
const API_KEY_CURRENT = process.env.API_KEY_CURRENT || process.env.GEMINI_API_KEY;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 5;
const THREAD_ID = process.env.THREAD_ID || '1';
const TOTAL_THREADS = parseInt(process.env.TOTAL_THREADS) || 1;

if (!API_KEY_CURRENT) {
    console.error('❌ API ключ не найден! Установите GEMINI_API_KEY или API_KEY_CURRENT');
    process.exit(1);
}

// ===== ИНИЦИАЛИЗАЦИЯ AI =====
const genAI = new GoogleGenerativeAI(API_KEY_CURRENT);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
    }
});

// ===== LOAD TOPICS =====
async function loadTopics() {
    try {
        const data = await fs.readFile('topics.txt', 'utf8');
        return data.split('\n').filter(line => line.trim()).map(line => line.trim());
    } catch (error) {
        console.log('📝 topics.txt не найден. Создаю пустой файл...');
        await fs.writeFile('topics.txt', '');
        return [];
    }
}

// ===== CATEGORIZE TOPIC =====
function categorizeBeautyTopic(topic) {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('окрашивание') || topicLower.includes('блонд') || topicLower.includes('цвет')) return 'hair-coloring';
    if (topicLower.includes('стрижка') || topicLower.includes('прическа')) return 'hairstyles';
    if (topicLower.includes('уход за волосами') || topicLower.includes('волосы')) return 'hair-care';
    if (topicLower.includes('маникюр') || topicLower.includes('ногти')) return 'manicure';
    if (topicLower.includes('педикюр')) return 'pedicure';
    if (topicLower.includes('уход за кожей') || topicLower.includes('кожа')) return 'skincare';
    if (topicLower.includes('макияж')) return 'makeup';
    if (topicLower.includes('коворкинг')) return 'salon-news';
    
    return 'beauty-tips';
}

// ===== GENERATE SEO - ОПТИМАЛЬНЫЕ МЕТА-ТЕГИ BUTLER УРОВНЯ =====
async function generateBeautySEO(topic, category) {
    const prompt = `Создай SEO для beauty статьи про "${topic}":

ТРЕБОВАНИЯ:
- Title: 35-40 символов (ТОЧНО!)
- Description: 150-160 символов (ТОЧНО!)
- Keywords: 5-7 релевантных ключевиков через запятую
- Title должен быть цепляющим и содержать "${BRAND_CONFIG.salon_name}"
- Description должен быть продающим с призывом к действию

Формат ответа:
TITLE: [точный title]
DESCRIPTION: [точное description]
KEYWORDS: [ключевики через запятую]`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        const titleMatch = text.match(/TITLE: (.+)/i);
        const descMatch = text.match(/DESCRIPTION: (.+)/i);
        const keywordsMatch = text.match(/KEYWORDS: (.+)/i);
        
        return {
            title: titleMatch ? titleMatch[1].trim() : `${topic} | ${BRAND_CONFIG.salon_name}`,
            description: descMatch ? descMatch[1].trim() : `Профессиональные советы по ${topic} от экспертов ${BRAND_CONFIG.salon_name}. Записывайтесь на консультацию!`,
            keywords: keywordsMatch ? keywordsMatch[1].trim() : `${topic}, салон красоты, ${BRAND_CONFIG.location}`
        };
    } catch (error) {
        console.error(`❌ Ошибка генерации SEO: ${error.message}`);
        return {
            title: `${topic} | ${BRAND_CONFIG.salon_name}`,
            description: `Профессиональные советы по ${topic} от экспертов ${BRAND_CONFIG.salon_name}. Записывайтесь на консультацию!`,
            keywords: `${topic}, салон красоты, ${BRAND_CONFIG.location}`
        };
    }
}

// ===== GENERATE CONTENT =====
async function generateBeautyContent(topic) {
    const category = categorizeBeautyTopic(topic);
    
    const prompt = `Напиши подробную beauty статью про "${topic}" для салона "${BRAND_CONFIG.salon_name}".

ТРЕБОВАНИЯ:
- 800-1200 слов
- Используй заголовки H2, H3
- Практические советы и рекомендации
- Упоминай услуги салона естественно
- Добавь призывы к действию
- Пиши экспертно и профессионально

Структура:
1. Введение
2. 3-4 основных раздела с подзаголовками
3. Практические рекомендации
4. Заключение с призывом

НЕ используй markdown разметку для заголовков (не ##), пиши обычный текст.`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error(`❌ Ошибка генерации контента: ${error.message}`);
        return null;
    }
}

// ===== CREATE FRONTMATTER - BUTLER SEO СТРУКТУРА =====
async function createBeautyFrontmatter(topic, content, seoData) {
    const slug = topic.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const category = categorizeBeautyTopic(topic);
    const heroImage = FALLBACK_IMAGE_URL;
    const currentDate = new Date().toISOString();
    
    // BUTLER-LEVEL SCHEMA.ORG
    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: seoData.title,
        description: seoData.description,
        image: heroImage,
        author: {
            "@type": "Organization",
            name: BRAND_CONFIG.salon_name,
            url: `https://${BRAND_CONFIG.domain}`
        },
        publisher: {
            "@type": "Organization", 
            name: BRAND_CONFIG.brand,
            logo: {
                "@type": "ImageObject",
                url: `https://${BRAND_CONFIG.domain}/logo.png`
            }
        },
        datePublished: currentDate,
        dateModified: currentDate,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://${BRAND_CONFIG.blog_domain}/blog/${slug}/`
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
    
    const frontmatter = `---
title: ${JSON.stringify(seoData.title)}
description: ${JSON.stringify(seoData.description)}
keywords: ${JSON.stringify(seoData.keywords)}
pubDate: ${JSON.stringify(currentDate)}
author: ${JSON.stringify(BRAND_CONFIG.author)}
heroImage: ${JSON.stringify(heroImage)}
category: ${JSON.stringify(category)}
schema: ${JSON.stringify(schema)}
---

${content}
`;
    
    return frontmatter;
}

// ===== ОСНОВНАЯ ФУНКЦИЯ =====
async function main() {
    try {
        console.log(`🎨 === BLONDEPLACE BEAUTY FACTORY ===`);
        console.log(`💄 Салон: ${BRAND_CONFIG.salon_name}`);
        console.log(`🌐 Домен: ${BRAND_CONFIG.domain}`);
        console.log(`📱 Поток: #${THREAD_ID} | Пакет: ${BATCH_SIZE} статей`);
        console.log(`🤖 Модель: ${MODEL_CHOICE}`);
        
        const allTopics = await loadTopics();
        
        if (allTopics.length === 0) {
            console.log('📝 Топики не найдены. Создан пустой файл topics.txt');
            return;
        }
        
        // Распределяем топики по потокам
        const threadTopics = allTopics.filter((_, index) => 
            index % TOTAL_THREADS === (parseInt(THREAD_ID) - 1)
        );
        
        const topicsToProcess = threadTopics.slice(0, BATCH_SIZE);
        
        if (topicsToProcess.length === 0) {
            console.log(`[Поток #${THREAD_ID}] 📭 Нет топиков для обработки`);
            return;
        }
        
        console.log(`[Поток #${THREAD_ID}] 📋 Обрабатываю ${topicsToProcess.length} топиков...`);
        
        let successCount = 0;
        
        for (const topic of topicsToProcess) {
            try {
                console.log(`[Поток #${THREAD_ID}] 🎨 Генерирую beauty статью: "${topic}"`);
                
                // Генерируем контент
                const content = await generateBeautyContent(topic);
                if (!content) continue;
                
                // Генерируем SEO
                const category = categorizeBeautyTopic(topic);
                const seoData = await generateBeautySEO(topic, category);
                
                // Создаем frontmatter
                const fullContent = await createBeautyFrontmatter(topic, content, seoData);
                
                // Сохраняем файл
                const slug = topic.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                
                const filePath = `src/content/posts/${slug}.md`;
                await fs.writeFile(filePath, fullContent);
                
                console.log(`[Поток #${THREAD_ID}] ✅ Создан: ${filePath}`);
                successCount++;
                
                // Пауза между генерациями
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`[Поток #${THREAD_ID}] ❌ Ошибка обработки "${topic}":`, error.message);
            }
        }
        
        console.log(`\n🎉 [Поток #${THREAD_ID}] Завершено! Создано статей: ${successCount}/${topicsToProcess.length}`);
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

// Запуск только если файл вызван напрямую
if (process.argv[1].endsWith('factory.js')) {
    main();
}

export { main };