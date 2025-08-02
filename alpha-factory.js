import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { execa } from 'execa';

// --- ПЛАН "АЛЬФА-УДАР" v4.0 - СУПЕР-УЛУЧШЕННАЯ ВЕРСИЯ ---
const SITE_URL = 'https://blondeplace.netlify.app';
const TARGET_URL_MAIN = "https://blondeplace.ru";
const BRAND_NAME = 'BlondePlace';
const BRAND_BLOG_NAME = 'Блог BlondePlace';
const BRAND_AUTHOR_NAME = 'Эксперт BlondePlace';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const INDEXNOW_API_KEY = 'df39150ca56f896546628ae3c923dd4a';
const POSTS_DIR = 'src/content/posts';

// --- 8 КЛЮЧЕВЫХ ФРАЗ ДЛЯ ПЛАНА "АЛЬФА-УДАР" ---
const ALPHA_KEYWORDS = [
    "бьюти коворкинг",
    "аренда парикмахерского кресла", 
    "коворкинг для мастера",
    "места в аренду",
    "кресло для мастера",
    "салон красоты",
    "мелирование",
    "тотал блонд"
];

// --- РАСШИРЕННЫЕ СИНОНИМЫ ДЛЯ МАКСИМАЛЬНОЙ УНИКАЛИЗАЦИИ v4.0 ---
const SYNONYMS = {
    "аренда": ["сдача", "наем", "прокат", "бронирование", "съем", "лизинг", "найм", "резерв", "временное пользование", "заказ", "предоставление", "получение", "фриланс", "подряд", "субаренда", "коммерческий найм"],
    "кресло": ["место", "рабочая зона", "стол мастера", "рабочее место", "позиция", "кабинет", "станция", "локация", "спот", "точка", "зона работы", "пространство", "рабочий уголок", "мастерская", "студия", "corner"],
    "мастер": ["специалист", "парикмахер", "стилист", "профессионал", "эксперт", "визажист", "бьютимастер", "косметолог", "nail-мастер", "бьюти-специалист", "мастер красоты", "топ-мастер", "профи", "guru", "ace"],
    "коворкинг": ["рабочее пространство", "beauty-пространство", "студия", "центр", "офис", "спейс", "хаб", "зона", "площадка", "локация", "пространство", "центр красоты", "бизнес-центр", "креативное пространство", "шеринг", "workspace"],
    "места": ["локации", "помещения", "зоны", "пространства", "кабинеты", "студии", "точки", "позиции", "станции", "области", "территории", "участки", "площади", "секции", "отделения", "уголки"],
    "салон": ["студия красоты", "beauty-центр", "студия", "центр красоты", "клиника красоты", "бьюти-студия", "spa-центр", "косметологический центр", "beauty-салон", "эстетический центр", "институт красоты", "дом красоты", "пространство красоты"],
    "мелирование": ["осветление", "колорирование", "окрашивание", "блондирование", "тонирование", "обесцвечивание", "высветление", "омбре", "балаяж", "шатуш", "окраска", "покраска", "highlights", "babylights", "airtouch", "растяжка цвета"],
    "тотал блонд": ["полное блондирование", "платиновый блонд", "ультра блонд", "белый блонд", "экстремальный блонд", "total blonde", "радикальный блонд", "ледяной блонд", "полное осветление", "максимальный блонд", "arctic blonde", "platinum", "перламутровый блонд"]
};

// --- ГЕО-ТАРГЕТИНГОВЫЕ РАЙОНЫ СПБ ---
const SPB_DISTRICTS = [
    "в центре", "у метро", "в Василеостровском районе", "на Петроградской стороне", 
    "в Адмиралтейском районе", "в Центральном районе", "возле Невского проспекта",
    "рядом с Эрмитажем", "у Дворцовой площади", "в историческом центре",
    "в деловом квартале", "в культурном центре", "у Мариинского театра",
    "рядом с Исаакиевским собором", "возле Казанского собора", "в Московском районе",
    "в Калининском районе", "в Выборгском районе", "в Приморском районе",
    "на Васильевском острове", "в элитном районе", "в престижной локации"
];

// --- РАСШИРЕННЫЕ МОДИФИКАТОРЫ v4.0 ---
const TITLE_MODIFIERS = [
    "2025", "срочно", "сегодня", "сейчас", "премиум", "элитный", "профессиональный", "современный",
    "выгодно", "удобно", "комфортно", "стильно", "центр", "метро", "удобная локация", "без депозита",
    "под ключ", "со всем оборудованием", "мебелированное", "для начинающих", "для опытных мастеров",
    "топ качество", "лучшие условия", "эксклюзив", "VIP", "бизнес класс", "новинка", "хит сезона",
    "тренд", "популярное", "востребованное", "инновационное", "уникальное", "особенное", 
    "люкс", "делюкс", "супер", "мега", "ультра", "про", "мастер-класс", "экспресс"
];

const DESCRIPTION_MODIFIERS = [
    "⭐ Лучшие условия", "✅ Без скрытых платежей", "🔥 Акция до конца месяца", "💎 Премиум локация",
    "🚀 Быстрое оформление", "⚡ Моментальное подключение", "💰 Выгодные цены", "🎯 Индивидуальный подход",
    "🏆 Топ предложение", "📞 Звоните сейчас", "🎁 Бонусы новым клиентам", "⏰ Ограниченное предложение",
    "🌟 Эксклюзивно", "💝 Подарки", "🎊 Специальная цена", "🔔 Новинка", "🎪 Супер предложение", "👑 VIP условия"
];

// --- ЦЕЛЕВЫЕ URL ОСНОВНОГО САЙТА ---
const TARGET_URLS = [
    "https://blondeplace.ru/#about",
    "https://blondeplace.ru/#services", 
    "https://blondeplace.ru/#discount",
    "https://blondeplace.ru/#coworking",
    "https://blondeplace.ru/#masters",
    "https://blondeplace.ru/#brands",
    "https://blondeplace.ru/#news",
    "https://blondeplace.ru/#comments",
    "https://blondeplace.ru/#why",
    "https://blondeplace.ru"
];

// --- ШАБЛОНЫ СТРУКТУРЫ СТАТЕЙ v4.0 ---
const ARTICLE_TEMPLATES = [
    "гид", "обзор", "инструкция", "советы", "секреты", "тренды", "новинки", 
    "сравнение", "рейтинг", "топ", "лучшие", "как выбрать", "что нужно знать",
    "полное руководство", "экспертное мнение", "профессиональные советы"
];

// --- НАСТРОЙКИ МОДЕЛЕЙ (АДАПТИВНЫЕ v4.0) ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-flash";

// --- ПРАВИЛЬНАЯ ИНИЦИАЛИЗАЦИЯ API КЛЮЧЕЙ (КАК В ОРИГИНАЛЬНОМ FACTORY.JS) ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;

// Получаем правильные переменные окружения
const GEMINI_API_KEY_CURRENT = process.env.GEMINI_API_KEY_CURRENT;
const OPENROUTER_API_KEY_CURRENT = process.env.OPENROUTER_API_KEY_CURRENT;

// Определяем какой API ключ использовать в зависимости от модели
let rawApiKey;
if (modelChoice === 'deepseek') {
    rawApiKey = OPENROUTER_API_KEY_CURRENT;
    if (!rawApiKey) {
        throw new Error(`[АЛЬФА-УДАР #${threadId}] Не найден OPENROUTER_API_KEY_CURRENT для модели DeepSeek!`);
    }
} else {
    rawApiKey = GEMINI_API_KEY_CURRENT;
    if (!rawApiKey) {
        throw new Error(`[АЛЬФА-УДАР #${threadId}] Не найден GEMINI_API_KEY_CURRENT для модели Gemini!`);
    }
}

// Обрабатываем пул ключей (если это пул, разделенный запятыми)
const apiKeysArray = rawApiKey.split(',').map(key => key.trim()).filter(key => key.length > 0);

console.log(`[🔍] [АЛЬФА-УДАР #${threadId}] Модель: ${modelChoice}, найдено ключей: ${apiKeysArray.length}`);

// Распределяем ключи между потоками
let apiKey;
if (apiKeysArray.length === 1) {
    apiKey = apiKeysArray[0];
    console.log(`[⚠️] [АЛЬФА-УДАР #${threadId}] ВНИМАНИЕ: Использую единственный ключ с задержкой`);
} else {
    apiKey = apiKeysArray[threadId % apiKeysArray.length];
    console.log(`[🔑] [АЛЬФА-УДАР #${threadId}] Использую ключ #${(threadId % apiKeysArray.length) + 1} из ${apiKeysArray.length}`);
}

const targetArticles = parseInt(process.env.ALPHA_ARTICLES, 10) || 30;

console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] Инициализация боевой системы v4.0 с ключом ...${apiKey.slice(-4)}`);
console.log(`🎯 [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей с 85+ ссылками каждая`);

// --- АДАПТИВНАЯ СИСТЕМА СКОРОСТИ v4.0 ---
class AdaptiveSpeedController {
    constructor() {
        this.baseDelay = apiKeysArray.length === 1 ? 1000 : 100; // Больше задержка для одного ключа
        this.currentDelay = this.baseDelay;
        this.errorCount = 0;
        this.successCount = 0;
        this.lastErrorTime = 0;
    }

    onSuccess() {
        this.successCount++;
        this.errorCount = Math.max(0, this.errorCount - 1);
        
        // Ускоряемся при успехах (только если несколько ключей)
        if (apiKeysArray.length > 1 && this.successCount % 5 === 0 && this.currentDelay > 50) {
            this.currentDelay = Math.max(50, this.currentDelay * 0.9);
            console.log(`[⚡] [АЛЬФА-УДАР #${threadId}] Ускорение: ${this.currentDelay}мс`);
        }
    }

    onError() {
        this.errorCount++;
        this.lastErrorTime = Date.now();
        
        // Замедляемся при ошибках
        this.currentDelay = Math.min(5000, this.currentDelay * 1.5);
        console.log(`[🐌] [АЛЬФА-УДАР #${threadId}] Замедление: ${this.currentDelay}мс`);
    }

    getDelay() {
        // Дополнительное замедление, если недавно были ошибки
        const timeSinceError = Date.now() - this.lastErrorTime;
        if (timeSinceError < 10000 && this.errorCount > 0) {
            return this.currentDelay * 2;
        }
        return this.currentDelay;
    }
}

const speedController = new AdaptiveSpeedController();

// --- СИСТЕМА ГЛОБАЛЬНОЙ УНИКАЛЬНОСТИ v4.0 ---
async function getNextAvailablePostNumber() {
    try {
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPOSITORY;
        
        if (!token || !repo) {
            console.warn(`[!] [АЛЬФА-УДАР #${threadId}] GitHub не настроен, начинаю с ${threadId * 1000}`);
            return threadId * 1000;
        }

        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${POSTS_DIR}`, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (!response.ok) {
            console.log(`[📁] [АЛЬФА-УДАР #${threadId}] Директория постов пуста, начинаю с ${threadId * 1000}`);
            return threadId * 1000;
        }

        const files = await response.json();
        
        if (!Array.isArray(files) || files.length === 0) {
            console.log(`[📁] [АЛЬФА-УДАР #${threadId}] Нет существующих постов, начинаю с ${threadId * 1000}`);
            return threadId * 1000;
        }

        let maxPostNumber = 0;
        for (const file of files) {
            if (file.name.startsWith('post') && file.name.endsWith('.md')) {
                const numberMatch = file.name.match(/post(\d+)\.md/);
                if (numberMatch) {
                    const postNumber = parseInt(numberMatch[1], 10);
                    if (postNumber > maxPostNumber) {
                        maxPostNumber = postNumber;
                    }
                }
            }
        }

        // Для каждого потока резервируем диапазон в 1000 номеров
        const threadBase = Math.max(maxPostNumber + 1, threadId * 1000);
        console.log(`[🔢] [АЛЬФА-УДАР #${threadId}] Максимальный пост: ${maxPostNumber}, начинаю с ${threadBase}`);
        return threadBase;

    } catch (error) {
        console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка определения номера: ${error.message}, начинаю с ${threadId * 1000}`);
        return threadId * 1000;
    }
}

// --- УГЛУБЛЕННАЯ УНИКАЛИЗАЦИЯ v4.0 ---
function generateAdvancedVariation(keyword) {
    const words = keyword.split(' ');
    let result = '';
    
    for (const word of words) {
        const cleanWord = word.toLowerCase();
        if (SYNONYMS[cleanWord] && Math.random() > 0.3) { // Увеличена вероятность замены
            const synonyms = SYNONYMS[cleanWord];
            result += synonyms[Math.floor(Math.random() * synonyms.length)] + ' ';
        } else {
            result += word + ' ';
        }
    }
    
    // Добавляем гео-модификатор в 40% случаев
    if (Math.random() > 0.6) {
        const geoModifier = SPB_DISTRICTS[Math.floor(Math.random() * SPB_DISTRICTS.length)];
        result += geoModifier + ' ';
    }
    
    return result.trim();
}

// --- СИСТЕМА УМНЫХ ЗАГОЛОВКОВ v4.0 ---
function createSmartUniqueTitle(baseKeyword, postNumber) {
    const variation = generateAdvancedVariation(baseKeyword);
    const modifier = TITLE_MODIFIERS[Math.floor(Math.random() * TITLE_MODIFIERS.length)];
    const template = ARTICLE_TEMPLATES[Math.floor(Math.random() * ARTICLE_TEMPLATES.length)];
    const timestamp = Date.now().toString().slice(-3); // Последние 3 цифры времени
    
    // Создаем структурированный заголовок
    const titleFormats = [
        `${template}: ${variation} ${modifier}`,
        `${variation} - ${template} ${modifier}`,
        `${modifier} ${variation}: ${template}`,
        `${variation} ${modifier} (${template})`
    ];
    
    const selectedFormat = titleFormats[Math.floor(Math.random() * titleFormats.length)];
    const titleWithNumber = `${selectedFormat} ${postNumber}`;
    
    // Обрезаем до 45 символов, сохраняя целые слова
    if (titleWithNumber.length <= 45) {
        return titleWithNumber;
    }
    
    const words = titleWithNumber.split(' ');
    let result = '';
    for (const word of words) {
        if (result.length + word.length + 1 <= 42) {
            result += (result ? ' ' : '') + word;
        } else {
            break;
        }
    }
    
    return result ? `${result} ${postNumber}` : `${baseKeyword} ${postNumber}`;
}

function createSmartUniqueDescription(keyword, postNumber) {
    const modifier = DESCRIPTION_MODIFIERS[Math.floor(Math.random() * DESCRIPTION_MODIFIERS.length)];
    const variation = generateAdvancedVariation(keyword);
    const geoContext = SPB_DISTRICTS[Math.floor(Math.random() * SPB_DISTRICTS.length)];
    
    const descriptionFormats = [
        `${modifier} ${variation} в BlondePlace ${geoContext}! Профессиональное оборудование, выгодные условия. Запись: ${postNumber}.`,
        `${modifier} ${variation} ${geoContext} в BlondePlace! Лучшие мастера, современное оборудование. Звоните: ${postNumber}.`,
        `${variation} ${geoContext} - ${modifier} в BlondePlace! Качественные услуги, доступные цены. ID: ${postNumber}.`
    ];
    
    const selectedDescription = descriptionFormats[Math.floor(Math.random() * descriptionFormats.length)];
    
    // Обрезаем до 164 символов
    if (selectedDescription.length <= 164) {
        return selectedDescription;
    }
    
    const words = selectedDescription.split(' ');
    let result = '';
    for (const word of words) {
        if (result.length + word.length + 1 <= 164) {
            result += (result ? ' ' : '') + word;
        } else {
            break;
        }
    }
    
    return result || `${keyword} в BlondePlace! Запись: ${postNumber}.`;
}

// --- ГЕНЕРАЦИЯ С АДАПТИВНЫМИ ПОВТОРАМИ v4.0 ---
async function generateWithAdaptiveRetry(prompt, maxRetries = 3) {
    let delay = speedController.getDelay();
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (modelChoice === 'deepseek') {
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': TARGET_URL_MAIN,
                        'X-Title': 'BlondePlace-Alpha-Strike-v4'
                    },
                    body: JSON.stringify({
                        model: DEEPSEEK_MODEL_NAME,
                        messages: [{ role: "user", content: prompt }]
                    })
                });

                if (!response.ok) {
                    if (response.status === 429) throw new Error(`429 Too Many Requests`);
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                speedController.onSuccess();
                return data.choices[0].message.content;
            } else {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
                const result = await model.generateContent(prompt);
                speedController.onSuccess();
                return result.response.text();
            }
        } catch (error) {
            speedController.onError();
            if (i < maxRetries - 1) {
                delay = speedController.getDelay();
                console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка ${i + 1}/${maxRetries}. Повтор через ${delay}мс`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

// --- СИСТЕМА УМНОЙ ССЫЛОЧНОЙ ПИРАМИДЫ v4.0 ---
function generateIntelligentLinks(keyword, articleText, existingPosts) {
    const targetLinks = 85; // Увеличено количество ссылок
    
    // Расширенные анкоры с гео-модификаторами
    const anchorTemplates = [
        keyword,
        `${keyword} в СПб`,
        `лучший ${keyword}`,
        `${keyword} BlondePlace`,
        `профессиональный ${keyword}`,
        `качественный ${keyword}`,
        `${keyword} центр`,
        `${keyword} студия`,
        `${keyword} услуги`,
        `записаться на ${keyword}`,
        `топ ${keyword}`,
        `${keyword} рядом`,
        `${keyword} недорого`,
        `${keyword} отзывы`,
        `${keyword} в центре`,
        `${keyword} у метро`,
        `эксклюзивный ${keyword}`,
        `премиум ${keyword}`
    ];
    
    const paragraphs = articleText.split('\n\n').filter(p => p.trim().length > 0);
    let processedParagraphs = [];
    let addedLinks = 0;
    let internalLinks = 0;
    
    for (let i = 0; i < paragraphs.length && addedLinks < targetLinks; i++) {
        const paragraph = paragraphs[i];
        
        // НЕ добавляем ссылки в заголовки
        if (paragraph.trim().startsWith('#')) {
            processedParagraphs.push(paragraph);
            continue;
        }
        
        let modifiedParagraph = paragraph;
        const linksInThisParagraph = Math.min(Math.floor(Math.random() * 4) + 2, targetLinks - addedLinks);
        
        for (let j = 0; j < linksInThisParagraph; j++) {
            // 80% ссылок на основной сайт, 20% внутренние ссылки
            if (Math.random() > 0.2 || existingPosts.length === 0) {
                // Внешняя ссылка на основной сайт
                const targetUrl = TARGET_URLS[Math.floor(Math.random() * TARGET_URLS.length)];
                const anchor = anchorTemplates[Math.floor(Math.random() * anchorTemplates.length)];
                
                const sentences = modifiedParagraph.split('. ');
                if (sentences.length > 1) {
                    const randomSentenceIndex = Math.floor(Math.random() * sentences.length);
                    const linkTexts = [
                        `Подробнее о <a href="${targetUrl}" target="_blank">${anchor}</a>`,
                        `Узнайте больше о <a href="${targetUrl}" target="_blank">${anchor}</a>`,
                        `Читайте про <a href="${targetUrl}" target="_blank">${anchor}</a>`,
                        `Смотрите <a href="${targetUrl}" target="_blank">${anchor}</a>`
                    ];
                    const linkText = linkTexts[Math.floor(Math.random() * linkTexts.length)];
                    sentences[randomSentenceIndex] += ` ${linkText}.`;
                    modifiedParagraph = sentences.join('. ');
                }
            } else {
                // Внутренняя ссылка на другие статьи блога
                const randomPost = existingPosts[Math.floor(Math.random() * existingPosts.length)];
                const sentences = modifiedParagraph.split('. ');
                if (sentences.length > 1) {
                    const randomSentenceIndex = Math.floor(Math.random() * sentences.length);
                    sentences[randomSentenceIndex] += ` Также читайте: <a href="${randomPost.url}">${randomPost.title}</a>.`;
                    modifiedParagraph = sentences.join('. ');
                    internalLinks++;
                }
            }
            
            addedLinks++;
        }
        
        processedParagraphs.push(modifiedParagraph);
    }
    
    console.log(`[🔗] [АЛЬФА-УДАР #${threadId}] Вставлено ${addedLinks} ссылок (внешних: ${addedLinks - internalLinks}, внутренних: ${internalLinks})`);
    return processedParagraphs.join('\n\n');
}

// --- ТУРБО-РЕЖИМ ИНДЕКСАЦИИ v4.0 ---
async function turboIndexNotification(url) {
    const payload = JSON.stringify({
        host: "blondeplace.netlify.app",
        key: INDEXNOW_API_KEY,
        urlList: [url]
    });

    const notifications = [
        // Yandex IndexNow
        { url: 'https://yandex.com/indexnow', name: 'Yandex' },
        // Bing IndexNow
        { url: 'https://www.bing.com/indexnow', name: 'Bing' },
        // Google ping (альтернативный способ)
        { url: 'https://www.google.com/ping?sitemap=' + encodeURIComponent(`${SITE_URL}/sitemap.xml`), name: 'Google' }
    ];

    const results = await Promise.allSettled(
        notifications.map(async (service) => {
            try {
                if (service.name === 'Google') {
                    await execa('curl', ['-X', 'GET', service.url]);
                } else {
                    await execa('curl', ['-X', 'POST', service.url, '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
                }
                return { service: service.name, status: 'success' };
            } catch (error) {
                return { service: service.name, status: 'error', error: error.message };
            }
        })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;
    console.log(`[📢] [АЛЬФА-УДАР #${threadId}] Турбо-индексация: ${successful}/${notifications.length} сервисов уведомлены`);
}

async function commitToGithub(filePath, content, message) {
    try {
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPOSITORY;
        
        if (!token || !repo) {
            console.warn(`[!] [АЛЬФА-УДАР #${threadId}] GitHub токен не настроен`);
            return false;
        }
        
        const encodedContent = Buffer.from(content).toString('base64');
        
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                content: encodedContent
            })
        });
        
        if (response.ok) {
            console.log(`[✅] [АЛЬФА-УДАР #${threadId}] Файл сохранен в GitHub: ${filePath}`);
            return true;
        } else {
            console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка GitHub API: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка сохранения: ${error.message}`);
        return false;
    }
}

// --- СИСТЕМА СУЩЕСТВУЮЩИХ ПОСТОВ ДЛЯ ВНУТРЕННЕЙ ПЕРЕЛИНКОВКИ ---
async function getExistingPosts() {
    try {
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPOSITORY;
        
        if (!token || !repo) return [];

        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${POSTS_DIR}`, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (!response.ok) return [];

        const files = await response.json();
        const posts = [];

        for (const file of files.slice(0, 50)) { // Берем первые 50 для производительности
            if (file.name.startsWith('post') && file.name.endsWith('.md')) {
                const numberMatch = file.name.match(/post(\d+)\.md/);
                if (numberMatch) {
                    const postNumber = parseInt(numberMatch[1], 10);
                    posts.push({
                        title: `Статья №${postNumber}`,
                        url: `/blog/post${postNumber}/`
                    });
                }
            }
        }

        return posts;
    } catch (error) {
        console.warn(`[!] [АЛЬФА-УДАР #${threadId}] Ошибка получения существующих постов: ${error.message}`);
        return [];
    }
}

// --- AI-УПРАВЛЯЕМАЯ ГЕНЕРАЦИЯ СТАТЕЙ v4.0 ---
async function generateAdvancedAlphaArticle(keyword, postNumber, existingPosts) {
    console.log(`[💥] [АЛЬФА-УДАР #${threadId}] Генерирую супер-статью #${postNumber} по ключу: ${keyword}`);

    // Выбираем случайный шаблон статьи
    const template = ARTICLE_TEMPLATES[Math.floor(Math.random() * ARTICLE_TEMPLATES.length)];
    const geoContext = SPB_DISTRICTS[Math.floor(Math.random() * SPB_DISTRICTS.length)];

    // УМНЫЙ ПРОМПТ С КОНТЕКСТОМ v4.0
    const articlePrompt = `Напиши экспертную SEO-статью в формате "${template}" на тему "${keyword}" для салона красоты BlondePlace.

КОНТЕКСТ: Салон находится в Санкт-Петербурге ${geoContext}.

ТРЕБОВАНИЯ:
- Объем: 6000-8000 символов
- Стиль: ${template} от экспертов BlondePlace
- Структура: # H1, ## H2, ### H3 в Markdown
- Геоконтекст: Упоминай "${geoContext}" и связанные локации
- Экспертность: Конкретные советы и рекомендации
- БЕЗ ссылок в тексте (добавлю отдельно)
- БЕЗ изображений
- Сразу начинай с заголовка H1

Пиши как настоящий эксперт салона BlondePlace!`;

    let articleText = await generateWithAdaptiveRetry(articlePrompt);
    
    // Супер-очистка от всех ссылок и изображений
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.replace(/www\.[^\s]+/g, '');
    articleText = articleText.trim();

    // УМНАЯ ССЫЛОЧНАЯ ПИРАМИДА
    articleText = generateIntelligentLinks(keyword, articleText, existingPosts);

    // СУПЕР-УНИКАЛЬНЫЕ МЕТА-ТЕГИ
    const uniqueTitle = createSmartUniqueTitle(keyword, postNumber);
    const uniqueDescription = createSmartUniqueDescription(keyword, postNumber);

    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": uniqueTitle,
        "description": uniqueDescription,
        "author": { "@type": "Person", "name": BRAND_AUTHOR_NAME },
        "publisher": { "@type": "Organization", "name": BRAND_BLOG_NAME },
        "datePublished": new Date().toISOString(),
        "mainEntityOfPage": `${SITE_URL}/blog/post${postNumber}/`,
        "keywords": [keyword, "BlondePlace", "салон красоты", "СПб"],
        "locationCreated": {
            "@type": "Place",
            "name": "Санкт-Петербург"
        }
    };

    const frontmatter = `---
title: "${uniqueTitle.replace(/"/g, '\\"')}"
description: "${uniqueDescription.replace(/"/g, '\\"')}"
keywords: "${keyword}, BlondePlace, салон красоты, Санкт-Петербург"
pubDate: "${new Date().toISOString()}"
author: "${BRAND_AUTHOR_NAME}"
heroImage: "${FALLBACK_IMAGE_URL}"
schema: ${JSON.stringify(schema)}
---

${articleText}
`;

    return { content: frontmatter, title: uniqueTitle, description: uniqueDescription };
}

async function main() {
    console.log(`🚀💥 [АЛЬФА-УДАР #${threadId}] === БОЕВОЙ ЗАПУСК v4.0 ===`);
    
    try {
        const postsDir = path.join(process.cwd(), POSTS_DIR);
        await fs.mkdir(postsDir, { recursive: true });
        
        console.log(`[🎯] [АЛЬФА-УДАР #${threadId}] Цель: ${targetArticles} статей по 8 ключам`);
        
        // ПОЛУЧАЕМ СЛЕДУЮЩИЙ ДОСТУПНЫЙ НОМЕР ПОСТА
        const startPostNumber = await getNextAvailablePostNumber();
        
        // ПОЛУЧАЕМ СУЩЕСТВУЮЩИЕ ПОСТЫ ДЛЯ ВНУТРЕННЕЙ ПЕРЕЛИНКОВКИ
        const existingPosts = await getExistingPosts();
        console.log(`[🔗] [АЛЬФА-УДАР #${threadId}] Найдено ${existingPosts.length} существующих постов для перелинковки`);
        
        console.log(`[🔢] [АЛЬФА-УДАР #${threadId}] Начинаю нумерацию с: ${startPostNumber}`);
        
        for (let i = 0; i < targetArticles; i++) {
            const keyword = ALPHA_KEYWORDS[i % ALPHA_KEYWORDS.length];
            const postNumber = startPostNumber + i;
            
            try {
                const slug = `post${postNumber}`;
                const filePath = path.join(postsDir, `${slug}.md`);
                const githubPath = `${POSTS_DIR}/${slug}.md`;
                
                const result = await generateAdvancedAlphaArticle(keyword, postNumber, existingPosts);
                
                // Локальное сохранение
                await fs.writeFile(filePath, result.content);
                
                // Сохранение в GitHub
                await commitToGithub(githubPath, result.content, `🚀💥 АЛЬФА-УДАР v4.0: Супер-статья #${postNumber} - ${result.title}`);
                
                console.log(`[✅] [АЛЬФА-УДАР #${threadId}] Статья #${postNumber} создана: "${result.title}"`);
                console.log(`[📏] Title: ${result.title.length} символов, Description: ${result.description.length} символов`);
                
                // ТУРБО-ИНДЕКСАЦИЯ
                const url = `${SITE_URL}/blog/${slug}/`;
                await turboIndexNotification(url);
                
                // АДАПТИВНАЯ ПАУЗА
                const delay = speedController.getDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
                
            } catch (error) {
                console.error(`[💥] [АЛЬФА-УДАР #${threadId}] Ошибка статьи #${startPostNumber + i}: ${error.message}`);
                continue;
            }
        }
        
        console.log(`[🏆] [АЛЬФА-УДАР #${threadId}] === МИССИЯ v4.0 ЗАВЕРШЕНА ===`);
        console.log(`[📊] Создано статей: ${targetArticles}`);
        console.log(`[🔗] Общее количество ссылок на основной сайт: ~${targetArticles * 85}`);
        console.log(`[⚡] Финальная скорость: ${speedController.currentDelay}мс`);
        console.log(`[🔢] Диапазон номеров: ${startPostNumber}-${startPostNumber + targetArticles - 1}`);
        
    } catch (error) {
        console.error(`[💥] [АЛЬФА-УДАР #${threadId}] КРИТИЧЕСКАЯ ОШИБКА:`, error);
        process.exit(1);
    }
}

main(); 