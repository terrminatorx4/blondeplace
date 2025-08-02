// ===== CONTENT AUTOPILOT v1.0 - УМНАЯ ГЕНЕРАЦИЯ КОНТЕНТА =====
// Автоматически определяет когда и сколько контента генерировать для достижения ТОП-1
import fetch from 'node-fetch';
import { promises as fs } from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'terrminatorx4/blondeplace';
const DAILY_LIMIT = 100; // Максимум статей в день

class ContentAutopilot {
    constructor() {
        this.positionData = null;
        this.contentPlan = {};
        this.generationQueue = [];
        this.todayGenerated = 0;
    }

    // ===== ГЛАВНАЯ ФУНКЦИЯ CONTENT AUTOPILOT =====
    async runContentAutopilot() {
        console.log('🚀 CONTENT AUTOPILOT v1.0: Запуск умной генерации контента...');
        
        try {
            // 1. Загружаем данные о позициях
            await this.loadPositionData();
            
            // 2. Проверяем сколько статей уже сгенерировано сегодня
            await this.checkTodayGeneration();
            
            // 3. Анализируем потребность в контенте
            const contentNeed = await this.analyzeContentNeed();
            
            // 4. Если нужен контент - планируем генерацию
            if (contentNeed.needContent) {
                await this.planContentGeneration(contentNeed);
                
                // 5. Запускаем генерацию если возможно
                await this.executeContentGeneration();
            } else {
                console.log('⏸️ Контент сейчас не нужен - позиции стабильны');
            }
            
            console.log('✅ CONTENT AUTOPILOT: Анализ завершён');
            
        } catch (error) {
            console.error('❌ CONTENT AUTOPILOT ERROR:', error.message);
        }
    }

    // ===== ЗАГРУЗКА ДАННЫХ О ПОЗИЦИЯХ =====
    async loadPositionData() {
        try {
            const data = await fs.readFile('position_dashboard.json', 'utf8');
            this.positionData = JSON.parse(data);
            
            console.log('📊 Данные о позициях загружены:');
            console.log(`   🎯 Средняя позиция: ${this.positionData.summary.avg_position_main}`);
            console.log(`   🏆 Ключей в ТОП-1: ${this.positionData.summary.keywords_in_top1}/8`);
            console.log(`   🔟 Ключей в ТОП-10: ${this.positionData.summary.keywords_in_top10}/8`);
            
        } catch (error) {
            console.log('⚠️ Нет данных о позициях, использую базовые настройки');
            this.positionData = {
                summary: {
                    avg_position_main: 50,
                    keywords_in_top1: 0,
                    keywords_in_top10: 1,
                    need_content: true,
                    suggested_articles: 40
                }
            };
        }
    }

    // ===== ПРОВЕРКА СКОЛЬКО СТАТЕЙ СГЕНЕРИРОВАНО СЕГОДНЯ =====
    async checkTodayGeneration() {
        try {
            // Получаем commits за сегодня от Alpha-Strike
            const today = new Date().toISOString().split('T')[0];
            
            const response = await fetch(`https://api.github.com/repos/${REPO}/commits?since=${today}T00:00:00Z&per_page=100`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'Content-Autopilot-Bot'
                }
            });
            
            const commits = await response.json();
            
            // Считаем commits от Alpha-Strike
            let alphaStrikeCommits = 0;
            for (const commit of commits) {
                if (commit.commit.message.includes('Alpha-Strike') || 
                    commit.commit.message.includes('AUTOPILOT')) {
                    alphaStrikeCommits++;
                }
            }
            
            // Примерно 1 commit = 20 статей (20 потоков)
            this.todayGenerated = alphaStrikeCommits * 20;
            
            console.log(`📊 Сегодня уже сгенерировано: ${this.todayGenerated} статей`);
            console.log(`📈 Остаток дневного лимита: ${DAILY_LIMIT - this.todayGenerated}`);
            
        } catch (error) {
            console.error('❌ Ошибка проверки сегодняшней генерации:', error.message);
            this.todayGenerated = 0;
        }
    }

    // ===== АНАЛИЗ ПОТРЕБНОСТИ В КОНТЕНТЕ =====
    async analyzeContentNeed() {
        console.log('🧠 Анализирую потребность в контенте...');
        
        const summary = this.positionData.summary;
        
        // Критерии для генерации контента
        const criteria = {
            // Если средняя позиция хуже 20 - нужно много контента
            avgPositionBad: parseFloat(summary.avg_position_main) > 20,
            
            // Если в ТОП-1 менее 3 ключей - нужен контент
            fewInTop1: summary.keywords_in_top1 < 3,
            
            // Если в ТОП-10 менее 6 ключей - нужен контент  
            fewInTop10: summary.keywords_in_top10 < 6,
            
            // Прямое указание из Position Tracker
            directNeed: summary.need_content,
            
            // Проверяем не превышен ли дневной лимит
            withinDailyLimit: this.todayGenerated < DAILY_LIMIT
        };

        console.log('📋 Критерии потребности в контенте:');
        console.log(`   🎯 Плохая средняя позиция (>${20}): ${criteria.avgPositionBad ? '✅' : '❌'}`);
        console.log(`   🏆 Мало в ТОП-1 (<3): ${criteria.fewInTop1 ? '✅' : '❌'}`);
        console.log(`   🔟 Мало в ТОП-10 (<6): ${criteria.fewInTop10 ? '✅' : '❌'}`);
        console.log(`   📊 Прямая рекомендация: ${criteria.directNeed ? '✅' : '❌'}`);
        console.log(`   ⚖️ В пределах лимита: ${criteria.withinDailyLimit ? '✅' : '❌'}`);

        // Определяем нужность и агрессивность
        const needContent = (criteria.avgPositionBad || criteria.fewInTop1 || 
                           criteria.fewInTop10 || criteria.directNeed) && 
                           criteria.withinDailyLimit;

        let aggressiveness = 'low';
        let suggestedArticles = 20;

        if (needContent) {
            // Определяем агрессивность на основе критериев
            if (criteria.avgPositionBad && criteria.fewInTop1) {
                aggressiveness = 'high';
                suggestedArticles = Math.min(80, DAILY_LIMIT - this.todayGenerated);
            } else if (criteria.fewInTop10 || criteria.directNeed) {
                aggressiveness = 'medium';
                suggestedArticles = Math.min(40, DAILY_LIMIT - this.todayGenerated);
            } else {
                aggressiveness = 'low';
                suggestedArticles = Math.min(20, DAILY_LIMIT - this.todayGenerated);
            }
        }

        console.log(`🎯 РЕЗУЛЬТАТ АНАЛИЗА:`);
        console.log(`   Нужен контент: ${needContent ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`   Агрессивность: ${aggressiveness}`);
        console.log(`   Рекомендуемое количество: ${suggestedArticles} статей`);

        return {
            needContent,
            aggressiveness,
            suggestedArticles,
            criteria,
            remainingLimit: DAILY_LIMIT - this.todayGenerated
        };
    }

    // ===== ПЛАНИРОВАНИЕ ГЕНЕРАЦИИ КОНТЕНТА =====
    async planContentGeneration(contentNeed) {
        console.log('📝 Планирую генерацию контента...');
        
        const { suggestedArticles, aggressiveness } = contentNeed;
        
        // Определяем параметры генерации
        let threads, articlesPerThread;
        
        switch (aggressiveness) {
            case 'high':
                threads = 20;
                articlesPerThread = Math.ceil(suggestedArticles / threads);
                break;
            case 'medium':
                threads = 15;
                articlesPerThread = Math.ceil(suggestedArticles / threads);
                break;
            case 'low':
                threads = 10;
                articlesPerThread = Math.ceil(suggestedArticles / threads);
                break;
        }

        this.contentPlan = {
            totalArticles: suggestedArticles,
            threads: threads,
            articlesPerThread: articlesPerThread,
            aggressiveness: aggressiveness,
            model: 'gemini', // Всегда используем Gemini для стабильности
            timestamp: new Date().toISOString()
        };

        console.log('📋 ПЛАН ГЕНЕРАЦИИ КОНТЕНТА:');
        console.log(`   📊 Общее количество статей: ${this.contentPlan.totalArticles}`);
        console.log(`   🧵 Потоков: ${this.contentPlan.threads}`);
        console.log(`   📄 Статей на поток: ${this.contentPlan.articlesPerThread}`);
        console.log(`   🎯 Агрессивность: ${this.contentPlan.aggressiveness}`);
        console.log(`   🤖 Модель: ${this.contentPlan.model}`);

        // Сохраняем план для последующего выполнения
        await fs.writeFile('content_plan.json', JSON.stringify(this.contentPlan, null, 2));
    }

    // ===== ВЫПОЛНЕНИЕ ГЕНЕРАЦИИ КОНТЕНТА =====
    async executeContentGeneration() {
        console.log('🚀 Выполняю генерацию контента...');
        
        if (!this.contentPlan.totalArticles) {
            console.log('⏸️ Нет плана для генерации');
            return;
        }

        try {
            // Запускаем Alpha-Strike workflow через GitHub API
            const workflowResponse = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/alpha-strike.yml/dispatches`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'Content-Autopilot-Bot',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ref: 'main',
                    inputs: {
                        target_articles: this.contentPlan.totalArticles.toString(),
                        threads: this.contentPlan.threads.toString(),
                        model_choice: this.contentPlan.model
                    }
                })
            });

            if (workflowResponse.ok) {
                console.log('✅ Alpha-Strike workflow запущен успешно!');
                console.log(`🎯 Параметры: ${this.contentPlan.totalArticles} статей, ${this.contentPlan.threads} потоков`);
                
                // Логируем запуск
                const executionLog = {
                    timestamp: new Date().toISOString(),
                    plan: this.contentPlan,
                    status: 'launched',
                    workflow_status: 'running'
                };
                
                await fs.writeFile('autopilot_execution.json', JSON.stringify(executionLog, null, 2));
                
            } else {
                console.error('❌ Ошибка запуска Alpha-Strike workflow');
                console.error(`Status: ${workflowResponse.status}`);
            }
            
        } catch (error) {
            console.error('❌ Ошибка выполнения генерации:', error.message);
        }
    }

    // ===== ПРОВЕРКА СТАТУСА ВЫПОЛНЕНИЯ =====
    async checkExecutionStatus() {
        try {
            // Проверяем последние workflow runs
            const response = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=5`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'Content-Autopilot-Bot'
                }
            });
            
            const data = await response.json();
            
            // Ищем наши Alpha-Strike runs
            for (const run of data.workflow_runs) {
                if (run.name.includes('ALPHA-STRIKE') && 
                    run.status === 'completed' && 
                    run.conclusion === 'success') {
                    
                    console.log(`✅ Найден успешный Alpha-Strike run: ${run.id}`);
                    return 'success';
                }
            }
            
            return 'running';
            
        } catch (error) {
            console.error('❌ Ошибка проверки статуса:', error.message);
            return 'unknown';
        }
    }

    // ===== ГЕНЕРАЦИЯ ОТЧЁТА AUTOPILOT =====
    async generateAutopilotReport() {
        const report = {
            timestamp: new Date().toISOString(),
            status: 'active',
            today_generated: this.todayGenerated,
            daily_limit: DAILY_LIMIT,
            remaining_limit: DAILY_LIMIT - this.todayGenerated,
            content_plan: this.contentPlan,
            position_data: this.positionData?.summary || null,
            next_check: new Date(Date.now() + 30 * 60 * 1000).toISOString() // через 30 минут
        };

        await fs.writeFile('content_autopilot_status.json', JSON.stringify(report, null, 2));
        console.log('📊 Отчёт Content Autopilot сохранён');
    }
}

// ===== ЗАПУСК CONTENT AUTOPILOT =====
if (import.meta.url === `file://${process.argv[1]}`) {
    const contentAutopilot = new ContentAutopilot();
    contentAutopilot.runContentAutopilot();
}

export default ContentAutopilot; 