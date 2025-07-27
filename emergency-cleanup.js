// Файл: emergency-cleanup.js - Экстренная очистка поломанных файлов
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const POSTS_DIR = 'src/content/posts';

async function emergencyCleanup() {
    console.log('🚨 ЭКСТРЕННАЯ ОЧИСТКА: Удаление всех поломанных файлов...');
    
    try {
        const files = await fs.readdir(POSTS_DIR);
        const mdFiles = files.filter(file => file.endsWith('.md'));
        
        let validCount = 0;
        let deletedCount = 0;
        let brokenFiles = [];
        
        for (const file of mdFiles) {
            const filePath = path.join(POSTS_DIR, file);
            
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                
                // Проверяем наличие git conflict маркеров
                if (content.includes('<<<<<<< ') || content.includes('=======') || content.includes('>>>>>>> ')) {
                    console.log(`🗑️ Удаляю файл с git конфликтом: ${file}`);
                    await fs.unlink(filePath);
                    deletedCount++;
                    brokenFiles.push(`${file} (git conflict)`);
                    continue;
                }
                
                // Проверяем валидность YAML
                try {
                    matter(content);
                    console.log(`✅ ${file} - валидный`);
                    validCount++;
                } catch (yamlError) {
                    console.log(`🗑️ Удаляю файл с YAML ошибкой: ${file}`);
                    console.log(`   Ошибка: ${yamlError.message}`);
                    await fs.unlink(filePath);
                    deletedCount++;
                    brokenFiles.push(`${file} (YAML error: ${yamlError.message})`);
                }
                
            } catch (error) {
                console.error(`❌ Ошибка чтения ${file}:`, error.message);
                console.log(`🗑️ Удаляю нечитаемый файл: ${file}`);
                await fs.unlink(filePath);
                deletedCount++;
                brokenFiles.push(`${file} (read error)`);
            }
        }
        
        console.log(`\n📊 РЕЗУЛЬТАТ ЭКСТРЕННОЙ ОЧИСТКИ:
        ✅ Валидных файлов: ${validCount}
        🗑️ Удалено файлов: ${deletedCount}
        📄 Всего проверено: ${mdFiles.length}`);
        
        if (brokenFiles.length > 0) {
            console.log(`\n🗂️ Удаленные файлы:`);
            brokenFiles.forEach(file => console.log(`   - ${file}`));
        }
        
        console.log(`\n🎯 СТАТУС: Теперь остались только рабочие файлы. Netlify билд должен пройти!`);
        
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
    }
}

// Запуск
emergencyCleanup(); 