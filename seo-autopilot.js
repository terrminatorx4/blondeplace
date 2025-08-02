// ===== SEO AUTOPILOT v1.0 - АВТОМАТИЧЕСКАЯ SEO ОПТИМИЗАЦИЯ =====
// Проверяет каждую статью на CheckSite.ru и автоматически исправляет проблемы
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'terrminatorx4/blondeplace';
const SITE_URL = 'https://blondeplace.netlify.app';

class SEOAutopilot {
    constructor() {
        this.checkedArticles = [];
        this.seoIssues = [];
        this.fixedIssues = [];
        this.targetScore = 95; // Минимальный CheckSite.ru score
    }

    // ===== ГЛАВНАЯ ФУНКЦИЯ SEO AUTOPILOT =====
    async runSEOAutopilot() {
        console.log('🎯 SEO AUTOPILOT v1.0: Запуск автоматической SEO оптимизации...');
        
        try {
            // 1. Находим новые статьи (созданные за последние 2 часа)
            const newArticles = await this.findNewArticles();
            
            // 2. Проверяем каждую статью на CheckSite.ru
            for (const article of newArticles) {
                await this.checkArticleSEO(article);
                await this.sleep(5000); // 5 секунд между проверками
            }
            
            // 3. Исправляем найденные SEO проблемы
            await this.fixSEOIssues();
            
            console.log(`✅ SEO AUTOPILOT: Завершено. Проверено ${newArticles.length} статей, исправлено ${this.fixedIssues.length} проблем`);
            
        } catch (error) {
            console.error('❌ SEO AUTOPILOT ERROR:', error.message);
        }
    }

    // ===== ПОИСК НОВЫХ СТАТЕЙ =====
    async findNewArticles() {
        console.log('📄 Ищу новые статьи за последние 2 часа...');
        
        try {
            // Получаем список commits за последние 2 часа
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            
            const response = await fetch(`https://api.github.com/repos/${REPO}/commits?since=${twoHoursAgo}&per_page=50`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'SEO-Autopilot-Bot'
                }
            });
            
            const commits = await response.json();
            const newArticles = [];
            
            for (const commit of commits) {
                // Получаем изменения в коммите
                const commitResponse = await fetch(commit.url, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'User-Agent': 'SEO-Autopilot-Bot'
                    }
                });
                
                const commitData = await commitResponse.json();
                
                // Ищем новые .md файлы в src/content/posts/
                for (const file of commitData.files || []) {
                    if (file.filename.startsWith('src/content/posts/post') && 
                        file.filename.endsWith('.md') && 
                        file.status === 'added') {
                        
                        const postNumber = file.filename.match(/post(\d+)\.md/)?.[1];
                        if (postNumber) {
                            newArticles.push({
                                filename: file.filename,
                                postNumber: postNumber,
                                url: `${SITE_URL}/blog/post${postNumber}/`,
                                commitSha: commit.sha
                            });
                        }
                    }
                }
            }
            
            console.log(`📊 Найдено ${newArticles.length} новых статей для проверки`);
            return newArticles;
            
        } catch (error) {
            console.error('❌ Ошибка поиска новых статей:', error.message);
            return [];
        }
    }

    // ===== ПРОВЕРКА СТАТЬИ НА CHECKSITE.RU =====
    async checkArticleSEO(article) {
        console.log(`🔍 Проверяю SEO для статьи: ${article.url}`);
        
        try {
            // Имитируем проверку CheckSite.ru
            // В реальной версии здесь будет запрос к CheckSite.ru API или парсинг
            const seoData = await this.simulateCheckSiteAnalysis(article);
            
            console.log(`📊 SEO оценка статьи ${article.postNumber}: ${seoData.totalScore}%`);
            
            // Если оценка ниже целевой - добавляем в список для исправления
            if (seoData.totalScore < this.targetScore) {
                console.log(`⚠️ Статья ${article.postNumber} требует SEO оптимизации (${seoData.totalScore}% < ${this.targetScore}%)`);
                
                this.seoIssues.push({
                    article: article,
                    issues: seoData.issues,
                    currentScore: seoData.totalScore
                });
            } else {
                console.log(`✅ Статья ${article.postNumber} имеет хорошую SEO оценку: ${seoData.totalScore}%`);
            }
            
            this.checkedArticles.push(article);
            
        } catch (error) {
            console.error(`❌ Ошибка проверки SEO для ${article.url}:`, error.message);
        }
    }

    // ===== СИМУЛЯЦИЯ CHECKSITE.RU АНАЛИЗА =====
    async simulateCheckSiteAnalysis(article) {
        // Получаем содержимое статьи
        const articleContent = await this.getArticleContent(article);
        
        const issues = [];
        let totalScore = 100;
        
        // Проверяем title
        const titleMatch = articleContent.match(/title:\s*"([^"]+)"/);
        const title = titleMatch?.[1] || '';
        
        if (title.length < 40 || title.length > 45) {
            issues.push({
                type: 'title_length',
                description: `Title длина ${title.length} символов (нужно 40-45)`,
                severity: 'high',
                fix: 'adjust_title_length'
            });
            totalScore -= 10;
        }
        
        // Проверяем description
        const descMatch = articleContent.match(/description:\s*"([^"]+)"/);
        const description = descMatch?.[1] || '';
        
        if (description.length < 150 || description.length > 164) {
            issues.push({
                type: 'description_length',
                description: `Description длина ${description.length} символов (нужно 150-164)`,
                severity: 'high',
                fix: 'adjust_description_length'
            });
            totalScore -= 10;
        }
        
        // Проверяем keywords
        if (!articleContent.includes('keywords:')) {
            issues.push({
                type: 'missing_keywords',
                description: 'Отсутствуют keywords',
                severity: 'medium',
                fix: 'add_keywords'
            });
            totalScore -= 5;
        }
        
        // Проверяем тошноту (упрощённо)
        const wordCount = articleContent.split(/\s+/).length;
        const blondePlaceCount = (articleContent.match(/BlondePlace/g) || []).length;
        const nausea = (blondePlaceCount / wordCount) * 100;
        
        if (nausea > 5) {
            issues.push({
                type: 'high_nausea',
                description: `Тошнота ${nausea.toFixed(2)}% (норма <5%)`,
                severity: 'medium',
                fix: 'reduce_nausea'
            });
            totalScore -= 8;
        }
        
        return {
            totalScore: Math.max(totalScore, 0),
            issues: issues
        };
    }

    // ===== ПОЛУЧЕНИЕ СОДЕРЖИМОГО СТАТЬИ =====
    async getArticleContent(article) {
        try {
            const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${article.filename}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'SEO-Autopilot-Bot'
                }
            });
            
            const fileData = await response.json();
            const content = Buffer.from(fileData.content, 'base64').toString('utf8');
            
            return content;
            
        } catch (error) {
            console.error(`❌ Ошибка получения содержимого ${article.filename}:`, error.message);
            return '';
        }
    }

    // ===== ИСПРАВЛЕНИЕ SEO ПРОБЛЕМ =====
    async fixSEOIssues() {
        console.log(`🔧 Исправляю SEO проблемы для ${this.seoIssues.length} статей...`);
        
        for (const articleIssue of this.seoIssues) {
            console.log(`🛠️ Исправляю статью ${articleIssue.article.postNumber}...`);
            
            try {
                let content = await this.getArticleContent(articleIssue.article);
                let wasFixed = false;
                
                for (const issue of articleIssue.issues) {
                    console.log(`  🔧 Исправляю: ${issue.description}`);
                    
                    const fixedContent = await this.applySpecificSEOFix(content, issue);
                    if (fixedContent !== content) {
                        content = fixedContent;
                        wasFixed = true;
                        console.log(`  ✅ Исправлено: ${issue.description}`);
                    }
                }
                
                // Если были исправления - сохраняем файл
                if (wasFixed) {
                    await this.saveFixedArticle(articleIssue.article, content);
                    this.fixedIssues.push(articleIssue);
                    console.log(`✅ Статья ${articleIssue.article.postNumber} исправлена`);
                }
                
            } catch (error) {
                console.error(`❌ Ошибка исправления статьи ${articleIssue.article.postNumber}:`, error.message);
            }
        }
    }

    // ===== ПРИМЕНЕНИЕ КОНКРЕТНОГО SEO ИСПРАВЛЕНИЯ =====
    async applySpecificSEOFix(content, issue) {
        switch (issue.fix) {
            case 'adjust_title_length':
                return this.fixTitleLength(content);
                
            case 'adjust_description_length':
                return this.fixDescriptionLength(content);
                
            case 'add_keywords':
                return this.addKeywords(content);
                
            case 'reduce_nausea':
                return this.reduceNausea(content);
                
            default:
                console.log(`⚠️ Неизвестный тип исправления: ${issue.fix}`);
                return content;
        }
    }

    // ===== ИСПРАВЛЕНИЕ ДЛИНЫ TITLE =====
    fixTitleLength(content) {
        const titleMatch = content.match(/title:\s*"([^"]+)"/);
        if (!titleMatch) return content;
        
        let title = titleMatch[1];
        
        // Если слишком короткий - добавляем
        if (title.length < 40) {
            title = title + ' - экспертные советы';
        }
        
        // Если слишком длинный - обрезаем
        if (title.length > 45) {
            title = title.substring(0, 42) + '...';
        }
        
        return content.replace(/title:\s*"[^"]+"/, `title: "${title}"`);
    }

    // ===== ИСПРАВЛЕНИЕ ДЛИНЫ DESCRIPTION =====
    fixDescriptionLength(content) {
        const descMatch = content.match(/description:\s*"([^"]+)"/);
        if (!descMatch) return content;
        
        let description = descMatch[1];
        
        // Если слишком короткий - расширяем
        if (description.length < 150) {
            description = description + ' Получите профессиональные рекомендации от экспертов BlondePlace. Индивидуальный подход к каждому клиенту.';
        }
        
        // Если слишком длинный - обрезаем
        if (description.length > 164) {
            description = description.substring(0, 161) + '...';
        }
        
        return content.replace(/description:\s*"[^"]+"/, `description: "${description}"`);
    }

    // ===== ДОБАВЛЕНИЕ KEYWORDS =====
    addKeywords(content) {
        const titleMatch = content.match(/title:\s*"([^"]+)"/);
        const title = titleMatch?.[1] || '';
        
        // Извлекаем ключевое слово из title
        const keywords = ['BlondePlace', 'салон красоты', 'Санкт-Петербург', 'профессиональный', 'качественный', 'экспертные советы'];
        
        // Добавляем keywords после description
        const keywordsLine = `keywords: "${keywords.join(', ')}"`;
        
        return content.replace(
            /(description:\s*"[^"]+"\n)/,
            `$1${keywordsLine}\n`
        );
    }

    // ===== СНИЖЕНИЕ ТОШНОТЫ =====
    reduceNausea(content) {
        // Заменяем часть упоминаний BlondePlace синонимами
        const synonyms = ['наш салон', 'специалисты', 'эксперты', 'профессионалы', 'мастера'];
        
        let updatedContent = content;
        let blondePlaceCount = 0;
        
        updatedContent = updatedContent.replace(/BlondePlace/g, (match, offset) => {
            blondePlaceCount++;
            
            // Каждое третье упоминание заменяем синонимом
            if (blondePlaceCount % 3 === 0) {
                return synonyms[Math.floor(Math.random() * synonyms.length)];
            }
            
            return match;
        });
        
        return updatedContent;
    }

    // ===== СОХРАНЕНИЕ ИСПРАВЛЕННОЙ СТАТЬИ =====
    async saveFixedArticle(article, content) {
        try {
            const encodedContent = Buffer.from(content).toString('base64');
            
            // Получаем текущий SHA файла
            const fileResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${article.filename}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'SEO-Autopilot-Bot'
                }
            });
            
            const fileData = await fileResponse.json();
            
            // Обновляем файл
            await fetch(`https://api.github.com/repos/${REPO}/contents/${article.filename}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'SEO-Autopilot-Bot',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `🎯 SEO AUTO-FIX: Оптимизация статьи post${article.postNumber} для CheckSite.ru 95%+`,
                    content: encodedContent,
                    sha: fileData.sha
                })
            });
            
            console.log(`✅ Статья ${article.filename} обновлена в GitHub`);
            
        } catch (error) {
            console.error(`❌ Ошибка сохранения ${article.filename}:`, error.message);
        }
    }

    // ===== SLEEP ФУНКЦИЯ =====
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== ЗАПУСК SEO AUTOPILOT =====
if (import.meta.url === `file://${process.argv[1]}`) {
    const seoAutopilot = new SEOAutopilot();
    seoAutopilot.runSEOAutopilot();
}

export default SEOAutopilot; 