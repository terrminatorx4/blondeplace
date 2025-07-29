// Файл: diagnostic.js - Диагностика системы генерации контента BlondePlace
import fs from 'fs/promises';

async function diagnostic() {
    console.log('🔍 ДИАГНОСТИКА СИСТЕМЫ BLONDEPLACE');
    console.log('==================================');
    
    let allGood = true;
    
    // Проверка переменных окружения
    console.log('\n🔑 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
    const geminiKey = process.env.GEMINI_API_KEY_CURRENT;
    const openrouterKey = process.env.OPENROUTER_API_KEY_CURRENT;
    const modelChoice = process.env.MODEL_CHOICE || 'gemini';
    
    console.log(`├─ MODEL_CHOICE: ${modelChoice}`);
    console.log(`├─ GEMINI_API_KEY_CURRENT: ${geminiKey ? '✅ Установлен' : '❌ Не установлен'}`);
    console.log(`└─ OPENROUTER_API_KEY_CURRENT: ${openrouterKey ? '✅ Установлен' : '❌ Не установлен'}`);
    
    if (modelChoice === 'gemini' && !geminiKey) {
        console.log('⚠️  Выбран Gemini, но ключ не установлен!');
        allGood = false;
    }
    if (modelChoice === 'openrouter' && !openrouterKey) {
        console.log('⚠️  Выбран OpenRouter, но ключ не установлен!');
        allGood = false;
    }
    
    // Проверка файловой системы
    console.log('\n📁 ФАЙЛОВАЯ СИСТЕМА:');
    try {
        const topicsContent = await fs.readFile('topics.txt', 'utf-8');
        const topics = topicsContent.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
        console.log(`├─ topics.txt: ✅ ${topics.length} тем`);
        
        await fs.access('src/content/posts');
        const posts = await fs.readdir('src/content/posts');
        const mdFiles = posts.filter(f => f.endsWith('.md'));
        console.log(`├─ src/content/posts/: ✅ ${mdFiles.length} статей`);
        console.log(`└─ Новых тем для обработки: ${Math.max(0, topics.length - mdFiles.length)}`);
    } catch (error) {
        console.log(`❌ Ошибка файловой системы: ${error.message}`);
        allGood = false;
    }
    
    // Проверка Git
    console.log('\n🔧 GIT КОНФИГУРАЦИЯ:');
    try {
        const { execa } = await import('execa');
        const { stdout: userName } = await execa('git', ['config', 'user.name']);
        const { stdout: userEmail } = await execa('git', ['config', 'user.email']);
        const { stdout: status } = await execa('git', ['status', '--porcelain']);
        
        console.log(`├─ user.name: ${userName}`);
        console.log(`├─ user.email: ${userEmail}`);
        console.log(`└─ Рабочая директория: ${status ? '⚠️ Есть изменения' : '✅ Чистая'}`);
    } catch (error) {
        console.log(`⚠️ Git проблемы: ${error.message}`);
    }
    
    // Итоговый статус
    console.log('\n🎯 ИТОГОВЫЙ СТАТУС:');
    if (allGood) {
        console.log('✅ Система готова к генерации контента!');
        console.log('💡 Запуск: npm run factory');
    } else {
        console.log('❌ Обнаружены проблемы. Исправьте их перед запуском.');
        console.log('📖 Смотрите FIX_GUIDE.md для решений');
    }
    
    return allGood;
}

diagnostic().catch(console.error);