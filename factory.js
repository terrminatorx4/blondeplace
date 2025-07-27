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

// ===== СИСТЕМНЫЕ ПРОМПТЫ ДЛЯ BEAUTY КОНТЕНТА =====
const BEAUTY_SYSTEM_PROMPTS = {
    hair_care: `Ты эксперт по уходу за волосами в салоне красоты ${BRAND_CONFIG.salon_name}. 
    Пиши профессиональные статьи о уходе за волосами, используя знания трихологии и современных методик.
    Упоминай качественные продукты и процедуры. Фокусируйся на практических советах.`,
    
    hair_coloring: `Ты мастер-колорист с 10+ лет опыта в салоне ${BRAND_CONFIG.salon_name}.
    Создавай экспертные статьи об окрашивании волос, техниках колорирования, трендах.
    Обязательно освещай особенности работы с блондом, так как это специализация салона.`,
    
    beauty_tips: `Ты beauty-консультант салона красоты ${BRAND_CONFIG.salon_name}.
    Пиши практические статьи с советами красоты, которые можно применить дома и в салоне.
    Фокусируйся на современных трендах и профессиональных секретах.`,
    
    nail_care: `Ты мастер маникюра в премиальном салоне ${BRAND_CONFIG.salon_name}.
    Создавай статьи о nail-арте, уходе за ногтями, трендах маникюра и педикюра.
    Подчеркивай важность профессионального подхода к nail-сервису.`,
    
    salon_procedures: `Ты специалист по салонным процедурам в ${BRAND_CONFIG.salon_name}.
    Пиши о современных beauty-процедурах, их эффективности и особенностях.
    Объясняй разницу между домашним и салонным уходом.`
};

// ===== BEAUTY КАТЕГОРИИ =====
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
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
    }
});

// ===== ЗАГРУЗКА ТОПИКОВ =====
async function loadTopics() {
    try {
        const topicsContent = await fs.readFile('topics.txt', 'utf-8');
        const topics = topicsContent
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(line => line.trim());
        
        if (topics.length === 0) {
            console.log('📝 Файл topics.txt пуст. Используем базовые beauty топики...');
            return [
                'Как ухаживать за блондом дома',
                'Тренды окрашивания волос 2024',
                'Секреты долговечного маникюра',
                'Как выбрать идеальную стрижку',
                'Уход за кожей лица зимой'
            ];
        }
        
        return topics;
    } catch (error) {
        console.log('📝 Файл topics.txt не найден. Создаю с базовыми топиками...');
        const defaultTopics = [
            '# Beauty топики для BlondePlace',
            '# Добавьте свои топики по одному на строку',
            '',
            'Как ухаживать за блондом дома',
            'Тренды окрашивания волос 2024',
            'Секреты долговечного маникюра',
            'Как выбрать идеальную стрижку для типа лица',
            'Уход за кожей лица в зимний период'
        ].join('\n');
        
        await fs.writeFile('topics.txt', defaultTopics);
        return [];
    }
}

// ===== ГЕНЕРАЦИЯ BEAUTY КОНТЕНТА =====
async function generateBeautyContent(topic) {
    // Определяем категорию на основе топика
    const category = categorizeBeautyTopic(topic);
    const systemPrompt = BEAUTY_SYSTEM_PROMPTS[category] || BEAUTY_SYSTEM_PROMPTS.beauty_tips;
    
    const prompt = `${systemPrompt}

ТЕМА: "${topic}"

Создай экспертную статью для блога салона красоты ${BRAND_CONFIG.salon_name} (${BRAND_CONFIG.domain}).

ТРЕБОВАНИЯ:
✅ Объем: 1500-2500 слов
✅ Стиль: экспертный, но доступный
✅ Структура: заголовки H2, H3, списки, выделения
✅ SEO: естественное вхождение ключевых слов
✅ Экспертность: профессиональные советы и рекомендации
✅ Практичность: конкретные советы, которые можно применить
✅ Актуальность: современные тренды и методики

ОБЯЗАТЕЛЬНО ВКЛЮЧИ:
• Профессиональные советы от мастеров
• Рекомендации по продуктам и процедурам
• Различие между домашним и салонным уходом
• Предупреждения о типичных ошибках
• Когда стоит обратиться к специалисту

ФОРМАТ СТАТЬИ:
1. Введение (почему эта тема важна)
2. Основные разделы с подзаголовками
3. Практические советы и рекомендации
4. Профессиональные секреты
5. Заключение с призывом к действию

Пиши от лица эксперта салона ${BRAND_CONFIG.salon_name}. Используй "мы", "наш салон", "наши мастера".
Естественно упоминай, что в салоне можно получить профессиональную консультацию.

ВАЖНО: Не используй прямую рекламу. Фокусируйся на экспертном контенте с ненавязчивыми упоминаниями салона.`;

    try {
        console.log(`[Поток #${THREAD_ID}] 🎨 Генерирую beauty контент: "${topic}"`);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (!text || text.length < 500) {
            throw new Error('Слишком короткий контент');
        }
        
        console.log(`[Поток #${THREAD_ID}] ✅ Сгенерировано ${text.length} символов для "${topic}"`);
        return text;
        
    } catch (error) {
        console.error(`[Поток #${THREAD_ID}] ❌ Ошибка генерации для "${topic}":`, error.message);
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

// ===== ГЕНЕРАЦИЯ SEO ДАННЫХ =====
async function generateBeautySEO(topic, category) {
    const seoPrompt = `Создай SEO-оптимизированные метаданные для статьи салона красоты на тему: "${topic}"

Требования:
- Title: 50-60 символов, включай "${BRAND_CONFIG.brand}"
- Description: 140-160 символов, призыв к действию
- Keywords: 5-7 ключевых фраз через запятую
- Учитывай beauty-тематику и местную специфику

Ответ в JSON формате:
{
  "title": "...",
  "description": "...", 
  "keywords": "..."
}`;

    try {
        const result = await model.generateContent(seoPrompt);
        const response = await result.response;
        const text = response.text();
        
        // Извлекаем JSON из ответа
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        // Fallback SEO
        return {
            title: `${topic} | Советы экспертов ${BRAND_CONFIG.brand}`,
            description: `Профессиональные советы по теме "${topic}" от мастеров салона ${BRAND_CONFIG.brand}. Экспертные рекомендации и практические советы.`,
            keywords: `${topic}, салон красоты, ${BRAND_CONFIG.brand}, beauty советы, уход за волосами`
        };
        
    } catch (error) {
        console.warn(`[Поток #${THREAD_ID}] ⚠️ Ошибка генерации SEO для "${topic}". Использую fallback.`);
        return {
            title: `${topic} | ${BRAND_CONFIG.brand}`,
            description: `Экспертные советы от салона красоты ${BRAND_CONFIG.brand}. ${topic} - профессиональные рекомендации.`,
            keywords: `${topic}, салон красоты, beauty, уход, ${BRAND_CONFIG.brand}`
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
    
    const heroImage = `/images/beauty/${category}/${slug}.jpg`;
    const currentDate = new Date().toISOString();
    
    // Schema.org для beauty контента
    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: seoData.title,
        description: seoData.description,
        image: `https://${BRAND_CONFIG.blog_domain}${heroImage}`,
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
                // Генерируем контент
                const content = await generateBeautyContent(topic);
                if (!content) continue;
                
                // Генерируем SEO
                const category = categorizeBeautyTopic(topic);
                const seoData = await generateBeautySEO(topic, category);
                
                // Создаем frontmatter
                const fullContent = await createBeautyFrontmatter(topic, content, seoData);
                
                // Валидация YAML
                try {
                    const matter = await import('gray-matter');
                    matter.default(fullContent);
                    console.log(`[Поток #${THREAD_ID}] [✔] YAML валидация прошла для "${topic}"`);
                } catch (yamlError) {
                    console.error(`[Поток #${THREAD_ID}] [❌] YAML ошибка в "${topic}": ${yamlError.message}`);
                    continue;
                }
                
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
        
        console.log(`[Поток #${THREAD_ID}] 🎯 Завершено! Создано статей: ${successCount}/${topicsToProcess.length}`);
        
    } catch (error) {
        console.error(`[Поток #${THREAD_ID}] 💥 Критическая ошибка:`, error);
        process.exit(1);
    }
}

// Запуск фабрики
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
