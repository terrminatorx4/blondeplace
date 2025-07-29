#!/usr/bin/env node
// BlondePlace Beauty Content Factory
// Генератор экспертных статей о красоте, уходе за волосами и салонных процедурах

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// ===== SLUGIFY ФУНКЦИЯ =====
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
    
    skincare: `Ты косметолог с медицинским образованием в салоне ${BRAND_CONFIG.salon_name}.
    Создавай научно обоснованные статьи об уходе за кожей, anti-age процедурах, косметологии.
    Используй профессиональную терминологию, но объясняй доступно.`
};

// ===== API КЛЮЧИ =====
const GEMINI_API_KEY_CURRENT = process.env.GEMINI_API_KEY_CURRENT;
const OPENROUTER_API_KEY_CURRENT = process.env.OPENROUTER_API_KEY_CURRENT;
const MODEL_CHOICE = process.env.MODEL_CHOICE || 'gemini';
const THREAD_ID = process.env.THREAD_ID || '1';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1');

let API_KEY_CURRENT;
let model;

if (MODEL_CHOICE === 'gemini') {
    API_KEY_CURRENT = GEMINI_API_KEY_CURRENT;
    if (!API_KEY_CURRENT) {
        console.error('❌ Gemini API ключ не найден! Установите GEMINI_API_KEY_CURRENT');
        process.exit(1);
    }
    console.log(`💄 [Beauty Поток #${THREAD_ID}] Использую модель Gemini с ключом ...${API_KEY_CURRENT.slice(-4)}`);
    
    const genAI = new GoogleGenerativeAI(API_KEY_CURRENT);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
} else {
    API_KEY_CURRENT = OPENROUTER_API_KEY_CURRENT;
    if (!API_KEY_CURRENT) {
        console.error('❌ OpenRouter API ключ не найден! Установите OPENROUTER_API_KEY_CURRENT');
        process.exit(1);
    }
    console.log(`💄 [Beauty Поток #${THREAD_ID}] Использую модель OpenRouter с ключом ...${API_KEY_CURRENT.slice(-4)}`);
}

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
    const category = categorizeBeautyTopic(topic);
    const systemPrompt = BEAUTY_SYSTEM_PROMPTS[category] || BEAUTY_SYSTEM_PROMPTS.beauty_tips;
    
    const prompt = `${systemPrompt}

ТЕМА: "${topic}"

Создай экспертную статью для блога салона красоты ${BRAND_CONFIG.salon_name} (${BRAND_CONFIG.domain}).

ТРЕБОВАНИЯ:
- Объем: 4000-6000 символов
- Структура: введение, 3-4 основных раздела, заключение  
- Стиль: экспертный, но понятный
- Тон: дружелюбный, профессиональный
- Обязательно: практические советы, примеры, рекомендации
- Включи упоминания о том, что такие процедуры/консультации доступны в ${BRAND_CONFIG.salon_name}
- Используй beauty-терминологию
- Добавь призыв к действию в конце

СТРУКТУРА:
1. Краткое введение (проблема/актуальность)
2. Основные разделы с подзаголовками (H2)
3. Практические советы и рекомендации  
4. Заключение с призывом обратиться к специалистам ${BRAND_CONFIG.salon_name}

Пиши только текст статьи без заголовков первого уровня (H1).`;

    if (MODEL_CHOICE === 'gemini') {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } else {
        // OpenRouter logic здесь
        return "OpenRouter implementation needed";
    }
}

// ===== КАТЕГОРИЗАЦИЯ ТОПИКОВ =====
function categorizeBeautyTopic(topic) {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('волос') || topicLower.includes('шампунь') || topicLower.includes('маска') || 
        topicLower.includes('кератин') || topicLower.includes('ботокс') || topicLower.includes('стрижк')) {
        return 'hair_care';
    }
    
    if (topicLower.includes('окраш') || topicLower.includes('блонд') || topicLower.includes('мелир') || 
        topicLower.includes('омбре') || topicLower.includes('балаяж') || topicLower.includes('шатуш') ||
        topicLower.includes('колор') || topicLower.includes('цвет')) {
        return 'hair_coloring';
    }
    
    if (topicLower.includes('маникюр') || topicLower.includes('педикюр') || topicLower.includes('ногт') || 
        topicLower.includes('гель-лак') || topicLower.includes('наращив')) {
        return 'nail_care';
    }
    
    if (topicLower.includes('кож') || topicLower.includes('лицо') || topicLower.includes('косметолог') || 
        topicLower.includes('уход') || topicLower.includes('чистк') || topicLower.includes('пилинг')) {
        return 'skincare';
    }
    
    return 'beauty_tips';
}

// ===== ОСНОВНАЯ ФУНКЦИЯ =====
async function main() {
    try {
        console.log('🎨 === BLONDEPLACE BEAUTY FACTORY ===');
        console.log(`💄 Салон: ${BRAND_CONFIG.salon_name}`);
        console.log(`🌐 Домен: ${BRAND_CONFIG.domain}`);
        console.log(`📱 Поток: #${THREAD_ID} | Пакет: ${BATCH_SIZE} статей`);
        console.log(`🤖 Модель: ${MODEL_CHOICE}`);

        // Загружаем топики
        const allTopics = await loadTopics();
        if (allTopics.length === 0) {
            console.log(`[Поток #${THREAD_ID}] ⚠️  Нет топиков для обработки. Завершаю работу.`);
            return;
        }

        // Выбираем топики для этого потока
        const startIndex = (parseInt(THREAD_ID) - 1) * BATCH_SIZE;
        const topicsToProcess = allTopics.slice(startIndex, startIndex + BATCH_SIZE);

        if (topicsToProcess.length === 0) {
            console.log(`[Поток #${THREAD_ID}] ⚠️  Нет топиков для обработки в этом диапазоне. Завершаю работу.`);
            return;
        }

        console.log(`[Поток #${THREAD_ID}] 📋 Обрабатываю ${topicsToProcess.length} топиков...`);

        let successCount = 0;
        
        for (const topic of topicsToProcess) {
            try {
                console.log(`[Поток #${THREAD_ID}] 🎨 Генерирую beauty контент: "${topic}"`);
                
                // Генерируем контент
                const content = await generateBeautyContent(topic);
                console.log(`[Поток #${THREAD_ID}] ✅ Сгенерировано ${content.length} символов для "${topic}"`);
                
                // Создаем frontmatter
                const frontmatter = createBeautyFrontmatter(topic);
                const fullContent = `---\n${frontmatter}\n---\n\n${content}`;
                
                // YAML валидация
                try {
                    const matter = await import('gray-matter');
                    matter.default(fullContent);
                    console.log(`[Поток #${THREAD_ID}] [✔] YAML валидация прошла для "${topic}"`);
                } catch (yamlError) {
                    console.error(`[Поток #${THREAD_ID}] [❌] YAML ошибка в "${topic}": ${yamlError.message}`);
                    continue;
                }
                
                // Сохраняем файл с правильным slug
                const slug = slugify(topic);
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

// ===== СОЗДАНИЕ FRONTMATTER =====
function createBeautyFrontmatter(topic) {
    const seo = generateBeautySEO(topic);
    const category = categorizeBeautyTopic(topic);
    const heroImage = getBeautyImage(topic, category);
    
    return `title: "${seo.title}"
description: "${seo.description}"
keywords: "${seo.keywords}"
pubDate: ${new Date().toISOString()}
author: "${BRAND_CONFIG.author}"
heroImage: "${heroImage}"
category: "${category}"
serviceType: "beauty_consultation"
difficulty: "medium"
duration: "30-60 минут"
price: "от 2000 руб"
tools: ["профессиональная косметика", "инструменты мастера"]
products: ["качественные beauty-продукты"]
hairType: "все типы волос"
skinType: "все типы кожи"`;
}

// ===== ГЕНЕРАЦИЯ SEO =====
function generateBeautySEO(topic) {
    let title = topic;
    
    // Строгий лимит для заголовка (35-40 символов)
    if (title.length > 40) {
        title = title.substring(0, 37) + '...';
    }
    
    const description = `${topic} - экспертные советы от мастеров ${BRAND_CONFIG.salon_name}. Профессиональные рекомендации и современные методики. Запишитесь на консультацию!`;
    
    // Строгий лимит для описания (150-160 символов)
    let finalDescription = description;
    if (finalDescription.length > 160) {
        finalDescription = finalDescription.substring(0, 157) + '...';
    }
    
    const keywords = `${topic}, ${BRAND_CONFIG.salon_name}, салон красоты, beauty, уход за волосами, ${BRAND_CONFIG.location}`;
    
    return {
        title,
        description: finalDescription,
        keywords
    };
}

// ===== СИСТЕМА ИЗОБРАЖЕНИЙ =====
async function getBeautyImage(topic, category) {
    const crypto = await import('crypto');
    const hash = crypto.createHash('md5').update(topic).digest('hex');
    const imageId = parseInt(hash.substring(0, 6), 16);
    
    const categoryImages = {
        hair_care: [1522, 1551, 1570, 1588, 1598, 1623, 1631, 1639, 1656, 1667],
        hair_coloring: [1500, 1510, 1520, 1530, 1540, 1560, 1580, 1590, 1610, 1620],
        nail_care: [1650, 1660, 1670, 1680, 1690, 1700, 1710, 1720, 1730, 1740],
        skincare: [1750, 1760, 1770, 1780, 1790, 1800, 1810, 1820, 1830, 1840],
        beauty_tips: [1850, 1860, 1870, 1880, 1890, 1900, 1910, 1920, 1930, 1940]
    };
    
    const images = categoryImages[category] || categoryImages.beauty_tips;
    const selectedImage = images[imageId % images.length];
    
    return `https://images.unsplash.com/photo-${selectedImage}?q=80&w=1200&auto=format&fit=crop&h=630&unique=${hash.substring(0, 8)}`;
}

// Запуск фабрики
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
} 