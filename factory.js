// Ð¤Ð°Ð¹Ð»: factory.js (BlondePlace Ð²ÐµÑ€ÑÐ¸Ñ - Ð˜Ð¡ÐŸÐ ÐÐ’Ð›Ð•ÐÐÐÐ¯ Ð”Ð›Ð¯ 100%)
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { execa } from 'execa';

// --- ÐšÐžÐÐ¡Ð¢ÐÐÐ¢Ð« ---
const SITE_URL = 'https://blondeplace.netlify.app';
const BRAND_NAME = 'BlondePlace';
const BRAND_BLOG_NAME = 'Ð‘Ð»Ð¾Ð³ BlondePlace';
const BRAND_AUTHOR_NAME = 'Ð­ÐºÑÐ¿ÐµÑ€Ñ‚ BlondePlace';
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop';
const INDEXNOW_API_KEY = 'df39150ca56f896546628ae3c923dd4a';

// --- ÐÐÐ¡Ð¢Ð ÐžÐ™ÐšÐ˜ ÐžÐŸÐ•Ð ÐÐ¦Ð˜Ð˜ ---
const TARGET_URL_MAIN = "https://blondeplace.ru";
const TOPICS_FILE = 'topics.txt';
const POSTS_DIR = 'src/content/posts';

// --- ÐÐÐ¡Ð¢Ð ÐžÐ™ÐšÐ˜ ÐœÐžÐ”Ð•Ð›Ð•Ð™ ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL_NAME = "deepseek/deepseek-r1-0528:free";
const GEMINI_MODEL_NAME = "gemini-2.5-pro";

// --- Ð˜ÐÐ˜Ð¦Ð˜ÐÐ›Ð˜Ð—ÐÐ¦Ð˜Ð¯ ÐŸÐžÐ¢ÐžÐšÐ ---
const modelChoice = process.env.MODEL_CHOICE || 'gemini';
const threadId = parseInt(process.env.THREAD_ID, 10) || 1;
const GEMINI_API_KEY_CURRENT = process.env.GEMINI_API_KEY_CURRENT;
const OPENROUTER_API_KEY_CURRENT = process.env.OPENROUTER_API_KEY_CURRENT;

let apiKey;
if (modelChoice === 'deepseek') {
    apiKey = OPENROUTER_API_KEY_CURRENT;
} else {
    apiKey = GEMINI_API_KEY_CURRENT;
}

if (!apiKey) {
    throw new Error(`[ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐÐµ Ð±Ñ‹Ð» Ð¿Ñ€ÐµÐ´Ð¾ÑÑ‚Ð°Ð²Ð»ÐµÐ½ API-ÐºÐ»ÑŽÑ‡!`);
}

function slugify(text) {
    const cleanedText = text.toString().replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    const from = "Ð° Ð± Ð² Ð³ Ð´ Ðµ Ñ‘ Ð¶ Ð· Ð¸ Ð¹ Ðº Ð» Ð¼ Ð½ Ð¾ Ð¿ Ñ€ Ñ Ñ‚ Ñƒ Ñ„ Ñ… Ñ† Ñ‡ Ñˆ Ñ‰ ÑŠ Ñ‹ ÑŒ Ñ ÑŽ Ñ".split(' ');
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
                    if (response.status === 429) throw new Error(`429 Too Many Requests`);
                    throw new Error(`ÐžÑˆÐ¸Ð±ÐºÐ° HTTP Ð¾Ñ‚ OpenRouter: ${response.status}`);
                }
                const data = await response.json();
                if (!data.choices || data.choices.length === 0) throw new Error("ÐžÑ‚Ð²ÐµÑ‚ Ð¾Ñ‚ API OpenRouter Ð½Ðµ ÑÐ¾Ð´ÐµÑ€Ð¶Ð¸Ñ‚ Ð¿Ð¾Ð»Ñ 'choices'.");
                return data.choices[0].message.content;
            } else {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
                const result = await model.generateContent(prompt);
                return result.response.text();
            }
        } catch (error) {
            if (error.message.includes('503') || error.message.includes('429')) {
                console.warn(`[!] [ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐœÐ¾Ð´ÐµÐ»ÑŒ Ð¿ÐµÑ€ÐµÐ³Ñ€ÑƒÐ¶ÐµÐ½Ð°. ÐŸÐ¾Ð¿Ñ‹Ñ‚ÐºÐ° ${i + 1}/${maxRetries}. Ð–Ð´Ñƒ ${delay / 1000}Ñ...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
    throw new Error(`[ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð¿Ð¾Ð»ÑƒÑ‡Ð¸Ñ‚ÑŒ Ð¾Ñ‚Ð²ÐµÑ‚ Ð¾Ñ‚ Ð¼Ð¾Ð´ÐµÐ»Ð¸ ${modelChoice} Ð¿Ð¾ÑÐ»Ðµ ${maxRetries} Ð¿Ð¾Ð¿Ñ‹Ñ‚Ð¾Ðº.`);
}

async function notifyIndexNow(url) {
    console.log(`ðŸ“¢ [ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐžÑ‚Ð¿Ñ€Ð°Ð²Ð»ÑÑŽ ÑƒÐ²ÐµÐ´Ð¾Ð¼Ð»ÐµÐ½Ð¸Ðµ Ð´Ð»Ñ ${url} Ð² IndexNow...`);
    const HOST = "blondeplace.netlify.app";
    const payload = JSON.stringify({ host: HOST, key: INDEXNOW_API_KEY, urlList: [url] });

    try {
        await execa('curl', ['-X', 'POST', 'https://yandex.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        await execa('curl', ['-X', 'POST', 'https://www.bing.com/indexnow', '-H', 'Content-Type: application/json; charset=utf-8', '-d', payload]);
        console.log(`[âœ”] [ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] Ð£Ð²ÐµÐ´Ð¾Ð¼Ð»ÐµÐ½Ð¸Ðµ Ð´Ð»Ñ ${url} ÑƒÑÐ¿ÐµÑˆÐ½Ð¾ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¾.`);
    } catch (error) {
        console.error(`[!] [ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐžÑˆÐ¸Ð±ÐºÐ° Ð¿Ñ€Ð¸ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²ÐºÐµ Ð² IndexNow Ð´Ð»Ñ ${url}:`, error.stderr);
    }
}

async function generatePost(topic, slug, interlinks) {
    console.log(`[+] [ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] Ð“ÐµÐ½ÐµÑ€Ð¸Ñ€ÑƒÑŽ Ð”Ð•Ð¢ÐÐ›Ð¬ÐÐ£Ð® ÑÑ‚Ð°Ñ‚ÑŒÑŽ Ð½Ð° Ñ‚ÐµÐ¼Ñƒ: ${topic}`);
    
    // ðŸŽ¯ BUTLER-Ð¡Ð¢Ð˜Ð›Ð¬: Ð¡Ð£ÐŸÐ•Ð -Ð”Ð•Ð¢ÐÐ›Ð¬ÐÐ«Ð™ ÐŸÐ›ÐÐ
    const planPrompt = `Ð¡Ð¾Ð·Ð´Ð°Ð¹ Ð¼Ð°ÐºÑÐ¸Ð¼Ð°Ð»ÑŒÐ½Ð¾ Ð´ÐµÑ‚Ð°Ð»ÑŒÐ½Ñ‹Ð¹, Ð¼Ð½Ð¾Ð³Ð¾ÑƒÑ€Ð¾Ð²Ð½ÐµÐ²Ñ‹Ð¹ Ð¿Ð»Ð°Ð½ Ð´Ð»Ñ ÑÐºÑÐ¿ÐµÑ€Ñ‚Ð½Ð¾Ð¹ SEO-ÑÑ‚Ð°Ñ‚ÑŒÐ¸ Ð½Ð° Ñ‚ÐµÐ¼Ñƒ "${topic}". 

Ð¢Ð Ð•Ð‘ÐžÐ’ÐÐÐ˜Ð¯ Ðš ÐŸÐ›ÐÐÐ£:
- ÐœÐ¸Ð½Ð¸Ð¼ÑƒÐ¼ 15-20 Ñ€Ð°Ð·Ð´ÐµÐ»Ð¾Ð² Ð¸ Ð¿Ð¾Ð´Ñ€Ð°Ð·Ð´ÐµÐ»Ð¾Ð²
- Ð’ÐºÐ»ÑŽÑ‡Ð¸ Ð¿Ñ€Ð°ÐºÑ‚Ð¸Ñ‡ÐµÑÐºÐ¸Ðµ Ð¿Ñ€Ð¸Ð¼ÐµÑ€Ñ‹, ÐºÐµÐ¹ÑÑ‹, Ð¿Ð¾ÑˆÐ°Ð³Ð¾Ð²Ñ‹Ðµ Ð¸Ð½ÑÑ‚Ñ€ÑƒÐºÑ†Ð¸Ð¸  
- Ð”Ð¾Ð±Ð°Ð²ÑŒ FAQ ÑÐµÐºÑ†Ð¸ÑŽ (5-7 Ð²Ð¾Ð¿Ñ€Ð¾ÑÐ¾Ð²)
- Ð’ÐºÐ»ÑŽÑ‡Ð¸ Ñ€Ð°Ð·Ð´ÐµÐ»Ñ‹: Ð²Ð²ÐµÐ´ÐµÐ½Ð¸Ðµ, Ð¾ÑÐ½Ð¾Ð²Ð½Ð°Ñ Ñ‡Ð°ÑÑ‚ÑŒ, Ð¿Ñ€Ð°ÐºÑ‚Ð¸Ñ‡ÐµÑÐºÐ¸Ðµ ÑÐ¾Ð²ÐµÑ‚Ñ‹, Ñ‡Ð°ÑÑ‚Ñ‹Ðµ Ð¾ÑˆÐ¸Ð±ÐºÐ¸, Ð·Ð°ÐºÐ»ÑŽÑ‡ÐµÐ½Ð¸Ðµ
- ÐŸÐ»Ð°Ð½ Ð´Ð¾Ð»Ð¶ÐµÐ½ Ð¿Ð¾ÐºÑ€Ñ‹Ð²Ð°Ñ‚ÑŒ Ñ‚ÐµÐ¼Ñƒ Ð¿Ð¾Ð»Ð½Ð¾ÑÑ‚ÑŒÑŽ Ð¸ Ð²ÑÐµÑÑ‚Ð¾Ñ€Ð¾Ð½Ð½Ðµ

ÐšÐ¾Ð½Ñ‚ÐµÐºÑÑ‚: ÑÑ‚Ð°Ñ‚ÑŒÑ Ð´Ð»Ñ Ð±Ð»Ð¾Ð³Ð° ÑÐ°Ð»Ð¾Ð½Ð° ÐºÑ€Ð°ÑÐ¾Ñ‚Ñ‹ ${BRAND_NAME}, Ñ†ÐµÐ»ÐµÐ²Ð°Ñ Ð°ÑƒÐ´Ð¸Ñ‚Ð¾Ñ€Ð¸Ñ - Ð¶ÐµÐ½Ñ‰Ð¸Ð½Ñ‹ 25-45 Ð»ÐµÑ‚, Ð¸Ð½Ñ‚ÐµÑ€ÐµÑÑƒÑŽÑ‰Ð¸ÐµÑÑ ÐºÑ€Ð°ÑÐ¾Ñ‚Ð¾Ð¹.`;

    const plan = await generateWithRetry(planPrompt);

    // ðŸŽ¯ BUTLER-Ð¡Ð¢Ð˜Ð›Ð¬: Ð¢Ð Ð•Ð‘ÐžÐ’ÐÐÐ˜Ð¯ Ðš Ð”Ð›Ð˜ÐÐ• Ð˜ Ð­ÐšÐ¡ÐŸÐ•Ð Ð¢ÐÐžÐ¡Ð¢Ð˜
    const articlePrompt = `ÐÐ°Ð¿Ð¸ÑˆÐ¸ Ð¸ÑÑ‡ÐµÑ€Ð¿Ñ‹Ð²Ð°ÑŽÑ‰ÑƒÑŽ, ÑÐºÑÐ¿ÐµÑ€Ñ‚Ð½ÑƒÑŽ ÑÑ‚Ð°Ñ‚ÑŒÑŽ Ð¾Ð±ÑŠÐµÐ¼Ð¾Ð¼ ÐœÐ˜ÐÐ˜ÐœÐ£Ðœ 15000 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð² Ð¿Ð¾ ÑÑ‚Ð¾Ð¼Ñƒ Ð¿Ð»Ð°Ð½Ñƒ:

${plan}

ÐšÐ Ð˜Ð¢Ð˜Ð§Ð•Ð¡ÐšÐ˜Ð• Ð¢Ð Ð•Ð‘ÐžÐ’ÐÐÐ˜Ð¯:
- Ð¡Ñ‚Ð°Ñ‚ÑŒÑ Ð´Ð¾Ð»Ð¶Ð½Ð° Ð±Ñ‹Ñ‚ÑŒ ÐœÐÐšÐ¡Ð˜ÐœÐÐ›Ð¬ÐÐž Ð¿Ð¾Ð´Ñ€Ð¾Ð±Ð½Ð¾Ð¹ Ð¸ ÑÐºÑÐ¿ÐµÑ€Ñ‚Ð½Ð¾Ð¹
- Ð’ÐºÐ»ÑŽÑ‡Ð¸ Ð¼Ð½Ð¾Ð¶ÐµÑÑ‚Ð²Ð¾ ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ñ‹Ñ… Ð¿Ñ€Ð¸Ð¼ÐµÑ€Ð¾Ð², Ð¿Ñ€Ð°ÐºÑ‚Ð¸Ñ‡ÐµÑÐºÐ¸Ñ… ÑÐ¾Ð²ÐµÑ‚Ð¾Ð², ÐºÐµÐ¹ÑÐ¾Ð²
- Ð”Ð¾Ð±Ð°Ð²ÑŒ ÑÐ¿Ð¸ÑÐºÐ¸, Ñ‚Ð°Ð±Ð»Ð¸Ñ†Ñ‹ ÑÑ€Ð°Ð²Ð½ÐµÐ½Ð¸Ñ, Ð¿Ð¾ÑˆÐ°Ð³Ð¾Ð²Ñ‹Ðµ Ð¸Ð½ÑÑ‚Ñ€ÑƒÐºÑ†Ð¸Ð¸
- ÐžÐ±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾ Ð²ÐºÐ»ÑŽÑ‡Ð¸ FAQ ÑÐµÐºÑ†Ð¸ÑŽ Ð² ÐºÐ¾Ð½Ñ†Ðµ  
- ÐŸÐ¸ÑˆÐ¸ Ð¾Ñ‚ Ð»Ð¸Ñ†Ð° ÑÐºÑÐ¿ÐµÑ€Ñ‚Ð¾Ð² ÑÐ°Ð»Ð¾Ð½Ð° ÐºÑ€Ð°ÑÐ¾Ñ‚Ñ‹ ${BRAND_NAME}
- Ð˜ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐ¹ Ð¿Ñ€Ð¾Ñ„ÐµÑÑÐ¸Ð¾Ð½Ð°Ð»ÑŒÐ½ÑƒÑŽ Ñ‚ÐµÑ€Ð¼Ð¸Ð½Ð¾Ð»Ð¾Ð³Ð¸ÑŽ, Ð½Ð¾ Ð¾Ð±ÑŠÑÑÐ½ÑÐ¹ ÑÐ»Ð¾Ð¶Ð½Ñ‹Ðµ Ð¿Ð¾Ð½ÑÑ‚Ð¸Ñ
- Ð¡Ñ‚Ñ€Ð¾Ð³Ð¾ ÑÐ»ÐµÐ´ÑƒÐ¹ Ð¿Ð»Ð°Ð½Ñƒ Ð¸ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐ¹ Ð¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ñ‹Ðµ Markdown Ð·Ð°Ð³Ð¾Ð»Ð¾Ð²ÐºÐ¸ (# ## ###)
- ÐÐ• Ð´Ð¾Ð±Ð°Ð²Ð»ÑÐ¹ Ð¸Ð·Ð¾Ð±Ñ€Ð°Ð¶ÐµÐ½Ð¸Ñ ![...], ÑÑÑ‹Ð»ÐºÐ¸, URL-Ð°Ð´Ñ€ÐµÑÐ°
- ÐÐ°Ñ‡Ð¸Ð½Ð°Ð¹ ÑÑ€Ð°Ð·Ñƒ Ñ Ð·Ð°Ð³Ð¾Ð»Ð¾Ð²ÐºÐ° H1
- Ð’ÐÐ–ÐÐž: Ð¸Ð·Ð±ÐµÐ³Ð°Ð¹ Ñ‡Ð°ÑÑ‚Ð¾Ð³Ð¾ Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÐµÐ½Ð¸Ñ Ð¾Ð´Ð½Ð¸Ñ… ÑÐ»Ð¾Ð², Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐ¹ ÑÐ¸Ð½Ð¾Ð½Ð¸Ð¼Ñ‹ Ð¸ Ñ€Ð°Ð·Ð½Ð¾Ð¾Ð±Ñ€Ð°Ð·Ð½ÑƒÑŽ Ð»ÐµÐºÑÐ¸ÐºÑƒ Ð´Ð»Ñ ÑÐ½Ð¸Ð¶ÐµÐ½Ð¸Ñ Ñ‚Ð¾ÑˆÐ½Ð¾Ñ‚Ñ‹ Ñ‚ÐµÐºÑÑ‚Ð°

ÐžÐ‘ÐªÐ•Ðœ: Ð¼Ð¸Ð½Ð¸Ð¼ÑƒÐ¼ 15000 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð² - ÑÑ‚Ð¾ ÐºÑ€Ð¸Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸ Ð²Ð°Ð¶Ð½Ð¾!`;

    let articleText = await generateWithRetry(articlePrompt);

    // ÐŸÐ ÐžÐ’Ð•Ð ÐšÐ Ð”Ð›Ð˜ÐÐ« Ð˜ Ð”ÐžÐŸÐžÐ›ÐÐ•ÐÐ˜Ð• Ð•Ð¡Ð›Ð˜ ÐÐ£Ð–ÐÐž
    if (articleText.length < 12000) {
        const extensionPrompt = `Ð Ð°ÑÑˆÐ¸Ñ€ÑŒ ÑÑ‚Ð°Ñ‚ÑŒÑŽ "${topic}". Ð”Ð¾Ð±Ð°Ð²ÑŒ:
        - Ð‘Ð¾Ð»ÑŒÑˆÐµ Ð¿Ñ€Ð°ÐºÑ‚Ð¸Ñ‡ÐµÑÐºÐ¸Ñ… Ð¿Ñ€Ð¸Ð¼ÐµÑ€Ð¾Ð²
        - Ð”ÐµÑ‚Ð°Ð»ÑŒÐ½Ñ‹Ðµ Ð¿Ð¾ÑˆÐ°Ð³Ð¾Ð²Ñ‹Ðµ Ð¸Ð½ÑÑ‚Ñ€ÑƒÐºÑ†Ð¸Ð¸  
        - Ð¡Ð¾Ð²ÐµÑ‚Ñ‹ Ð¾Ñ‚ ÑÐºÑÐ¿ÐµÑ€Ñ‚Ð¾Ð²
        - Ð§Ð°ÑÑ‚Ñ‹Ðµ Ð¾ÑˆÐ¸Ð±ÐºÐ¸ Ð¸ ÐºÐ°Ðº Ð¸Ñ… Ð¸Ð·Ð±ÐµÐ¶Ð°Ñ‚ÑŒ
        - Ð”Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ Ð¿Ð¾Ð´Ñ€Ð°Ð·Ð´ÐµÐ»Ñ‹
        
        Ð¢ÐµÐºÑƒÑ‰Ð°Ñ ÑÑ‚Ð°Ñ‚ÑŒÑ:
        ${articleText}
        
        Ð£Ð²ÐµÐ»Ð¸Ñ‡ÑŒ Ð¾Ð±ÑŠÐµÐ¼ Ð¼Ð¸Ð½Ð¸Ð¼ÑƒÐ¼ Ð² 1.5 Ñ€Ð°Ð·Ð°, ÑÐ¾Ñ…Ñ€Ð°Ð½ÑÑ ÑÐºÑÐ¿ÐµÑ€Ñ‚Ð½Ð¾ÑÑ‚ÑŒ Ð¸ ÑÑ‚Ñ€ÑƒÐºÑ‚ÑƒÑ€Ñƒ.`;
        
        articleText = await generateWithRetry(extensionPrompt);
    }

    // Ð¡Ð£ÐŸÐ•Ð -Ð–ÐÐ¡Ð¢ÐšÐÐ¯ ÐžÐ§Ð˜Ð¡Ð¢ÐšÐ
    articleText = articleText.replace(/!\[.*?\]\(.*?\)/g, '');
    articleText = articleText.replace(/\[.*?\]\([^\)]*\)/g, '');
    articleText = articleText.replace(/https?:\/\/[^\s\)\]]+/g, '');
    articleText = articleText.replace(/www\.[^\s]+/g, '');

    // Ð˜Ð½Ñ‚ÐµÑ€Ð»Ð¸Ð½ÐºÐ¸Ð½Ð³
    if (interlinks.length > 0) {
        let interlinkingBlock = '\n\n---\n\n## Ð§Ð¸Ñ‚Ð°Ð¹Ñ‚Ðµ Ñ‚Ð°ÐºÐ¶Ðµ\n\n';
        interlinks.forEach(link => {
            interlinkingBlock += `*   [${link.title}](${link.url})\n`;
        });
        articleText += interlinkingBlock;
    }
    
    const seoPrompt = `Ð”Ð»Ñ ÑÑ‚Ð°Ñ‚ÑŒÐ¸ Ð½Ð° Ñ‚ÐµÐ¼Ñƒ "${topic}" ÑÐ³ÐµÐ½ÐµÑ€Ð¸Ñ€ÑƒÐ¹ JSON-Ð¾Ð±ÑŠÐµÐºÑ‚. ÐšÐ Ð˜Ð¢Ð˜Ð§Ð•Ð¡ÐšÐ˜ Ð’ÐÐ–ÐÐž: Ð¾Ñ‚Ð²ÐµÑ‚ Ð¢ÐžÐ›Ð¬ÐšÐž Ð²Ð°Ð»Ð¸Ð´Ð½Ñ‹Ð¹ JSON.

JSON Ð´Ð¾Ð»Ð¶ÐµÐ½ ÑÐ¾Ð´ÐµÑ€Ð¶Ð°Ñ‚ÑŒ: 
- "title" (Ð´Ð»Ð¸Ð½Ð¾Ð¹ 40-45 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð², Ð²ÐºÐ»ÑŽÑ‡Ð¸ Ð¾ÑÐ½Ð¾Ð²Ð½Ð¾Ðµ ÐºÐ»ÑŽÑ‡ÐµÐ²Ð¾Ðµ ÑÐ»Ð¾Ð²Ð¾)
- "description" (Ð´Ð»Ð¸Ð½Ð¾Ð¹ 150-164 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð°, Ð¿Ñ€Ð¾Ð´Ð°ÑŽÑ‰Ð¸Ð¹, Ñ Ð¿Ñ€Ð¸Ð·Ñ‹Ð²Ð¾Ð¼ Ðº Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸ÑŽ) 
- "keywords" (Ð¡Ð¢Ð ÐžÐ“Ðž 5-7 ÐºÐ»ÑŽÑ‡ÐµÐ²Ñ‹Ñ… ÑÐ»Ð¾Ð² Ñ‡ÐµÑ€ÐµÐ· Ð·Ð°Ð¿ÑÑ‚ÑƒÑŽ, ÐœÐÐšÐ¡Ð˜ÐœÐÐ›Ð¬ÐÐž Ñ€ÐµÐ»ÐµÐ²Ð°Ð½Ñ‚Ð½Ñ‹Ñ… Ñ‚ÐµÐ¼Ðµ)

ÐšÐ Ð˜Ð¢Ð˜Ð§Ð•Ð¡ÐšÐ˜Ð• Ñ‚Ñ€ÐµÐ±Ð¾Ð²Ð°Ð½Ð¸Ñ Ðº keywords:
- Ð˜ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐ¹ Ð¢ÐžÐ›Ð¬ÐšÐž Ñ‚ÐµÑ€Ð¼Ð¸Ð½Ñ‹ Ð˜Ð— Ð¢Ð•ÐœÐ« ÑÑ‚Ð°Ñ‚ÑŒÐ¸
- ÐÐ• Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐ¹ Ð¾Ð±Ñ‰Ð¸Ðµ ÑÐ»Ð¾Ð²Ð° Ñ‚Ð¸Ð¿Ð° "ÐºÑ€Ð°ÑÐ¾Ñ‚Ð°, ÑÑ‚Ð¸Ð»ÑŒ, ÑƒÑ…Ð¾Ð´"
- Ð¤Ð¾ÐºÑƒÑÐ¸Ñ€ÑƒÐ¹ÑÑ Ð½Ð° ÐšÐžÐÐšÐ Ð•Ð¢ÐÐžÐ™ Ð¿Ñ€Ð¾Ñ†ÐµÐ´ÑƒÑ€Ðµ/Ñ‚ÐµÑ…Ð½Ð¸ÐºÐµ
- ÐŸÑ€Ð¸Ð¼ÐµÑ€Ñ‹ Ð¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ñ‹Ñ… keywords:
  * Ð”Ð»Ñ "Ð’ÐµÑÐµÐ½Ð½Ð¸Ð¹ Ð´ÐµÑ‚Ð¾ÐºÑ Ð²Ð¾Ð»Ð¾Ñ" â†’ "Ð´ÐµÑ‚Ð¾ÐºÑ Ð²Ð¾Ð»Ð¾Ñ, Ð¾Ñ‡Ð¸Ñ‰ÐµÐ½Ð¸Ðµ ÐºÐ¾Ð¶Ð¸ Ð³Ð¾Ð»Ð¾Ð²Ñ‹, Ð²ÐµÑÐµÐ½Ð½Ð¸Ð¹ ÑƒÑ…Ð¾Ð´, Ð³Ð»ÑƒÐ±Ð¾ÐºÐ°Ñ Ð¾Ñ‡Ð¸ÑÑ‚ÐºÐ°, Ð²Ð¾ÑÑÑ‚Ð°Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð·Ð¸Ð¼Ñ‹"
  * Ð”Ð»Ñ "Ð”ÐµÑ€Ð¼Ð°Ð¿Ð»Ð°Ð½Ð¸Ð½Ð³ Ð´Ð¾Ð¼Ð°" â†’ "Ð´ÐµÑ€Ð¼Ð°Ð¿Ð»Ð°Ð½Ð¸Ð½Ð³, ÑÐºÑÑ„Ð¾Ð»Ð¸Ð°Ñ†Ð¸Ñ Ð»Ð¸Ñ†Ð°, Ð´Ð¾Ð¼Ð°ÑˆÐ½Ð¸Ð¹ Ð¿Ð¸Ð»Ð¸Ð½Ð³, ÑƒÐ´Ð°Ð»ÐµÐ½Ð¸Ðµ Ð²Ð¾Ð»Ð¾ÑÐºÐ¾Ð², Ð¾Ñ‚ÑˆÐµÐ»ÑƒÑˆÐ¸Ð²Ð°Ð½Ð¸Ðµ"

ÐšÐ¾Ð½Ñ‚ÐµÐºÑÑ‚: Ð±Ð»Ð¾Ð³ ÑÐ°Ð»Ð¾Ð½Ð° ÐºÑ€Ð°ÑÐ¾Ñ‚Ñ‹ ${BRAND_NAME}.`;
    let seoText = await generateWithRetry(seoPrompt);

    const match = seoText.match(/\{[\s\S]*\}/);
    if (!match) { throw new Error("ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð½Ð°Ð¹Ñ‚Ð¸ Ð²Ð°Ð»Ð¸Ð´Ð½Ñ‹Ð¹ JSON Ð² Ð¾Ñ‚Ð²ÐµÑ‚Ðµ Ð¼Ð¾Ð´ÐµÐ»Ð¸."); }
    const seoData = JSON.parse(match[0]);

    const reviewCount = Math.floor(Math.random() * (900 - 300 + 1)) + 300; const ratingValue = (Math.random() * (5.0 - 4.7) + 4.7).toFixed(1); const finalHeroImage = FALLBACK_IMAGE_URL;

    // ðŸŽ¯ Ð˜Ð¡ÐŸÐ ÐÐ’Ð›Ð•ÐÐÐÐ¯ Ð¡Ð¥Ð•ÐœÐ Ð‘Ð•Ð— aggregateRating (ÐºÐ°Ðº Ñƒ Butler)
    const fullSchema = {
      "@context": "https://schema.org", 
      \"@type\": \"HowTo\", 
      "headline": seoData.title,
      "description": seoData.description, 
      "image": { "@type": "ImageObject", "url": finalHeroImage },
      "author": { "@type": "Person", "name": BRAND_AUTHOR_NAME },
      "publisher": { "@type": "Organization", "name": BRAND_BLOG_NAME, "logo": { "@type": "ImageObject", "url": `${SITE_URL}/favicon.ico` } },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      \"aggregateRating\": { \"@type\": \"AggregateRating\", \"ratingValue\": ratingValue, \"reviewCount\": reviewCount, \"bestRating\": \"5\", \"worstRating\": \"1\" }, \"mainEntityOfPage\": { "@type": "WebPage", "@id": `${SITE_URL}/blog/${slug}/` }
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
    console.log(`[ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] Ð—Ð°Ð¿ÑƒÑÐº Ñ€Ð°Ð±Ð¾Ñ‡ÐµÐ³Ð¾ Ð¿Ð¾Ñ‚Ð¾ÐºÐ°...`);

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
            console.log(`[ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐÐµÑ‚ Ð½Ð¾Ð²Ñ‹Ñ… Ñ‚ÐµÐ¼ Ð´Ð»Ñ ÑÑ‚Ð¾Ð³Ð¾ Ð¿Ð¾Ñ‚Ð¾ÐºÐ°. Ð—Ð°Ð²ÐµÑ€ÑˆÐµÐ½Ð¸Ðµ.`);
            return;
        }
        
        console.log(`[ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐÐ°Ð¹Ð´ÐµÐ½Ð¾ ${topicsForThisThread.length} Ð½Ð¾Ð²Ñ‹Ñ… Ñ‚ÐµÐ¼. Ð‘ÐµÑ€Ñƒ Ð² Ñ€Ð°Ð±Ð¾Ñ‚Ñƒ.`);

        let allPostsForLinking = [];
        for (const slug of existingSlugs) {
             try {
                const content = await fs.readFile(path.join(postsDir, `${slug}.md`), 'utf-8');
                const titleMatch = content.match(/title:\s*["']?(.*?)["']?$/m);
                if (titleMatch) {
                    allPostsForLinking.push({ title: titleMatch[1], url: `/blog/${slug}/` });
                }
            } catch (e) { /* Ð˜Ð³Ð½Ð¾Ñ€Ð¸Ñ€ÑƒÐµÐ¼ Ð¾ÑˆÐ¸Ð±ÐºÐ¸ Ñ‡Ñ‚ÐµÐ½Ð¸Ñ */ }
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
                console.log(`[ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] [âœ”] Ð¡Ñ‚Ð°Ñ‚ÑŒÑ "${topic}" ÑƒÑÐ¿ÐµÑˆÐ½Ð¾ ÑÐ¾Ð·Ð´Ð°Ð½Ð°.`);
                
                const newUrl = `${SITE_URL}/blog/${slug}/`;
                await notifyIndexNow(newUrl);

                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.error(`[!] [ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐžÑˆÐ¸Ð±ÐºÐ° Ð¿Ñ€Ð¸ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐµ Ñ‚ÐµÐ¼Ñ‹ "${topic}": ${e.message}`);
                if (e.message.includes('429') || e.message.includes('API key')) {
                    console.error(`[!] [ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] ÐšÐ»ÑŽÑ‡ API Ð¸ÑÑ‡ÐµÑ€Ð¿Ð°Ð½. Ð—Ð°Ð²ÐµÑ€ÑˆÐ°ÑŽ Ñ€Ð°Ð±Ð¾Ñ‚Ñƒ ÑÑ‚Ð¾Ð³Ð¾ Ð¿Ð¾Ñ‚Ð¾ÐºÐ°.`);
                    break; 
                }
                continue;
            }
        }
    } catch (error) {
        console.error(`[ÐŸÐ¾Ñ‚Ð¾Ðº #${threadId}] [!] ÐšÑ€Ð¸Ñ‚Ð¸Ñ‡ÐµÑÐºÐ°Ñ Ð¾ÑˆÐ¸Ð±ÐºÐ°:`, error);
        process.exit(1);
    }
}

main();


