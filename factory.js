import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';

// ===== BRAND CONFIG LIKE BUTLER =====
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

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop';

const REAL_LINKS_MAP = {
    'general': [
        { url: "https://blondeplace.ru", text: `главном сайте ${BRAND_CONFIG.salon_name}` },
        { url: "https://blondeplace.ru/#about", text: `о салоне красоты ${BRAND_CONFIG.salon_name}` },
        { url: "https://blondeplace.ru/#services", text: `наших услугах` },
        { url: "https://blondeplace.ru/#masters", text: `наших мастерах` },
        { url: "https://blondeplace.ru/#coworking", text: `beauty коворкинге` },
        { url: "https://t.me/Blondeplace", text: `Telegram канале` },
    ]
};

const MODEL_CHOICE = process.env.MODEL_CHOICE || 'gemini';
const API_KEY_CURRENT = process.env.API_KEY_CURRENT || process.env.GEMINI_API_KEY;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 5;
const THREAD_ID = process.env.THREAD_ID || '1';
const TOTAL_THREADS = parseInt(process.env.TOTAL_THREADS) || 1;

if (!API_KEY_CURRENT) {
    console.error('❌ API ключ не найден!');
    process.exit(1);
}

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

function categorizeBeautyTopic(topic) {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('окрашивание') || topicLower.includes('блонд')) return 'hair-coloring';
    if (topicLower.includes('стрижка') || topicLower.includes('прическа')) return 'hairstyles';
    if (topicLower.includes('маникюр')) return 'manicure';
    if (topicLower.includes('уход')) return 'skincare';
    
    return 'beauty-tips';
}

// BUTLER-EXACT SEO GENERATION
async function generateButlerSEO(topic) {
    const prompt = `Создай SEO для beauty статьи про "${topic}" ТОЧНО КАК В BUTLER:

ТРЕБОВАНИЯ (КАК В BUTLER):
- Title: СТРОГО 40-45 символов (считай точно!)
- Description: СТРОГО 150-164 символа (считай точно!)
- Keywords: 5-7 ключевиков через запятую
- Упоминай BLONDE PLACE в title

Формат ответа:
TITLE: [точный title 40-45 символов]
DESCRIPTION: [точное description 150-164 символа]
KEYWORDS: [ключевики через запятую]`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        const titleMatch = text.match(/TITLE: (.+)/i);
        const descMatch = text.match(/DESCRIPTION: (.+)/i);
        const keywordsMatch = text.match(/KEYWORDS: (.+)/i);
        
        return {
            title: titleMatch ? titleMatch[1].trim() : `${topic} | BLONDE PLACE`,
            description: descMatch ? descMatch[1].trim() : `Профессиональные советы по ${topic} от экспертов BLONDE PLACE в Санкт-Петербурге. Записывайтесь на консультацию!`,
            keywords: keywordsMatch ? keywordsMatch[1].trim() : `${topic}, салон красоты, Санкт-Петербург, BLONDE PLACE, beauty`
        };
    } catch (error) {
        console.error(`❌ Ошибка генерации SEO: ${error.message}`);
        return {
            title: `${topic} в BLONDE PLACE СПб`,
            description: `Профессиональные советы по ${topic} от экспертов BLONDE PLACE в Санкт-Петербурге. Записывайтесь на консультацию!`,
            keywords: `${topic}, салон красоты, Санкт-Петербург, BLONDE PLACE, beauty`
        };
    }
}

async function generateBeautyContent(topic) {
    const prompt = `Напиши подробную beauty статью про "${topic}" для салона BLONDE PLACE.

ТРЕБОВАНИЯ:
- 1000-1500 слов
- Заголовки H2, H3
- Практические советы
- Упоминай BLONDE PLACE естественно
- Призывы к действию

Структура:
1. Введение 
2. 3-4 основных раздела
3. Практические рекомендации
4. Заключение с призывом

НЕ используй markdown разметку для заголовков, пиши обычный текст.`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error(`❌ Ошибка генерации контента: ${error.message}`);
        return null;
    }
}

// BUTLER-EXACT FRONTMATTER
async function createButlerFrontmatter(topic, content, seoData) {
    const slug = topic.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const category = categorizeBeautyTopic(topic);
    const heroImage = FALLBACK_IMAGE_URL;
    const currentDate = new Date().toISOString();
    
    // BUTLER-EXACT SCHEMA
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
        }
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

async function main() {
    try {
        console.log(`🎨 === BLONDE PLACE FACTORY (BUTLER-STYLE) ===`);
        console.log(`💄 Поток: #${THREAD_ID}`);
        
        const allTopics = await loadTopics();
        
        if (allTopics.length === 0) {
            console.log('📝 Топики не найдены');
            return;
        }
        
        const threadTopics = allTopics.filter((_, index) => 
            index % TOTAL_THREADS === (parseInt(THREAD_ID) - 1)
        );
        
        const topicsToProcess = threadTopics.slice(0, BATCH_SIZE);
        
        if (topicsToProcess.length === 0) {
            console.log(`[Поток #${THREAD_ID}] 📭 Нет топиков`);
            return;
        }
        
        console.log(`[Поток #${THREAD_ID}] 📋 Обрабатываю ${topicsToProcess.length} топиков...`);
        
        let successCount = 0;
        
        for (const topic of topicsToProcess) {
            try {
                console.log(`[Поток #${THREAD_ID}] 🎨 Генерирую: "${topic}"`);
                
                const content = await generateBeautyContent(topic);
                if (!content) continue;
                
                const seoData = await generateButlerSEO(topic);
                const fullContent = await createButlerFrontmatter(topic, content, seoData);
                
                const slug = topic.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                
                const filePath = `src/content/posts/${slug}.md`;
                await fs.writeFile(filePath, fullContent);
                
                console.log(`[Поток #${THREAD_ID}] ✅ Создан: ${filePath}`);
                successCount++;
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`[Поток #${THREAD_ID}] ❌ Ошибка "${topic}":`, error.message);
            }
        }
        
        console.log(`\n🎉 [Поток #${THREAD_ID}] Создано: ${successCount}/${topicsToProcess.length}`);
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        process.exit(1);
    }
}

if (process.argv[1].endsWith('factory.js')) {
    main();
}

export { main };