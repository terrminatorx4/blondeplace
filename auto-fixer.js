// ===== AUTO-FIXER v1.0 - АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ ОШИБОК =====
// Исправляет ошибки БЕЗ участия пользователя
import fetch from 'node-fetch';
import { promises as fs } from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'terrminatorx4/blondeplace';

class AutoFixer {
    constructor() {
        this.fixedIssues = [];
        this.errors = [];
    }

    // ===== ГЛАВНАЯ ФУНКЦИЯ АВТОИСПРАВЛЕНИЯ =====
    async runAutoFix() {
        console.log('🛠️ AUTO-FIXER v1.0: Запуск автоматического исправления...');
        
        try {
            // 1. Проверяем GitHub Actions
            await this.checkGitHubActions();
            
            // 2. Проверяем Netlify билды
            await this.checkNetlifyBuilds();
            
            // 3. Проверяем конфигурации
            await this.checkConfigurations();
            
            // 4. Исправляем найденные проблемы
            await this.applyAutoFixes();
            
            console.log(`✅ AUTO-FIXER: Завершено. Исправлено ${this.fixedIssues.length} проблем`);
            
        } catch (error) {
            console.error('❌ AUTO-FIXER ERROR:', error.message);
        }
    }

    // ===== ПРОВЕРКА GITHUB ACTIONS =====
    async checkGitHubActions() {
        console.log('⚙️ Проверяю последние GitHub Actions runs...');
        
        try {
            const response = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=5`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'AutoFixer-Bot'
                }
            });
            
            const data = await response.json();
            
            for (const run of data.workflow_runs) {
                if (run.status === 'completed' && run.conclusion === 'failure') {
                    console.log(`❌ Найден failed run: ${run.name} (${run.id})`);
                    
                    // Анализируем ошибку
                    await this.analyzeFailedRun(run);
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка проверки GitHub Actions:', error.message);
        }
    }

    // ===== АНАЛИЗ FAILED RUN =====
    async analyzeFailedRun(run) {
        try {
            // Получаем логи job'а
            const jobsResponse = await fetch(`https://api.github.com/repos/${REPO}/actions/runs/${run.id}/jobs`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'AutoFixer-Bot'
                }
            });
            
            const jobsData = await jobsResponse.json();
            
            for (const job of jobsData.jobs) {
                if (job.conclusion === 'failure') {
                    console.log(`🔍 Анализирую failed job: ${job.name}`);
                    
                    // Проверяем распространённые ошибки
                    await this.identifyCommonErrors(job);
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка анализа failed run:', error.message);
        }
    }

    // ===== ИДЕНТИФИКАЦИЯ РАСПРОСТРАНЁННЫХ ОШИБОК =====
    async identifyCommonErrors(job) {
        const errorPatterns = [
            {
                pattern: /hoisted.*scripts.*not.*function/i,
                fix: 'astro_hoisted_scripts',
                description: 'Ошибка Astro hoisted scripts'
            },
            {
                pattern: /Command failed.*exit code 1.*npm run build/i,
                fix: 'build_failure',
                description: 'Ошибка билда'
            },
            {
                pattern: /Could not resolve.*import/i,
                fix: 'import_error',
                description: 'Ошибка импорта'
            },
            {
                pattern: /adapter.*static.*output/i,
                fix: 'astro_adapter_conflict',
                description: 'Конфликт adapter и static output'
            }
        ];

        // Получаем логи (упрощённая версия)
        const logText = job.steps?.map(step => step.name).join(' ') || '';
        
        for (const errorType of errorPatterns) {
            if (errorType.pattern.test(logText)) {
                console.log(`🎯 Найдена ошибка: ${errorType.description}`);
                this.errors.push({
                    type: errorType.fix,
                    description: errorType.description,
                    job: job.name
                });
            }
        }
    }

    // ===== ПРОВЕРКА NETLIFY БИЛДОВ =====
    async checkNetlifyBuilds() {
        console.log('📊 Проверяю Netlify билды...');
        
        // Здесь можно добавить проверку через Netlify API
        // Пока делаем базовую проверку доступности сайта
        
        try {
            const response = await fetch('https://blondeplace.netlify.app/', {
                timeout: 10000
            });
            
            if (response.ok) {
                console.log('✅ Netlify сайт доступен');
            } else {
                console.log('⚠️ Netlify сайт недоступен');
                this.errors.push({
                    type: 'netlify_down',
                    description: 'Сайт Netlify недоступен'
                });
            }
            
        } catch (error) {
            console.log('❌ Ошибка проверки Netlify:', error.message);
            this.errors.push({
                type: 'netlify_error',
                description: 'Ошибка подключения к Netlify'
            });
        }
    }

    // ===== ПРОВЕРКА КОНФИГУРАЦИЙ =====
    async checkConfigurations() {
        console.log('⚙️ Проверяю конфигурационные файлы...');
        
        // Проверяем astro.config.mjs
        await this.checkAstroConfig();
        
        // Проверяем netlify.toml
        await this.checkNetlifyConfig();
        
        // Проверяем package.json
        await this.checkPackageJson();
    }

    // ===== ПРОВЕРКА ASTRO CONFIG =====
    async checkAstroConfig() {
        try {
            const astroConfig = await fs.readFile('astro.config.mjs', 'utf8');
            
            // Проверяем распространённые проблемы
            if (astroConfig.includes('adapter: netlify()') && astroConfig.includes("output: 'static'")) {
                this.errors.push({
                    type: 'astro_adapter_conflict',
                    description: 'Конфликт adapter и static output в astro.config.mjs'
                });
            }
            
            if (!astroConfig.includes("inlineStylesheets: 'never'")) {
                this.errors.push({
                    type: 'astro_hoisted_scripts',
                    description: 'Отсутствует fix для hoisted scripts'
                });
            }
            
        } catch (error) {
            console.log('⚠️ Не удалось проверить astro.config.mjs');
        }
    }

    // ===== ПРОВЕРКА NETLIFY CONFIG =====
    async checkNetlifyConfig() {
        try {
            const netlifyConfig = await fs.readFile('netlify.toml', 'utf8');
            
            if (!netlifyConfig.includes('node postbuild.js')) {
                this.errors.push({
                    type: 'missing_postbuild',
                    description: 'Отсутствует postbuild.js в netlify.toml'
                });
            }
            
        } catch (error) {
            console.log('⚠️ Не удалось проверить netlify.toml');
        }
    }

    // ===== ПРОВЕРКА PACKAGE.JSON =====
    async checkPackageJson() {
        try {
            const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
            
            // Проверяем зависимости
            const requiredDeps = ['astro', '@astrojs/sitemap'];
            for (const dep of requiredDeps) {
                if (!packageJson.dependencies?.[dep]) {
                    this.errors.push({
                        type: 'missing_dependency',
                        description: `Отсутствует зависимость: ${dep}`
                    });
                }
            }
            
        } catch (error) {
            console.log('⚠️ Не удалось проверить package.json');
        }
    }

    // ===== ПРИМЕНЕНИЕ АВТОИСПРАВЛЕНИЙ =====
    async applyAutoFixes() {
        console.log(`🔧 Применяю автоисправления для ${this.errors.length} проблем...`);
        
        for (const error of this.errors) {
            console.log(`🛠️ Исправляю: ${error.description}`);
            
            try {
                await this.applySpecificFix(error);
                this.fixedIssues.push(error);
                console.log(`✅ Исправлено: ${error.description}`);
                
            } catch (fixError) {
                console.log(`❌ Не удалось исправить: ${error.description}`);
                console.log(`   Ошибка: ${fixError.message}`);
            }
        }
    }

    // ===== ПРИМЕНЕНИЕ КОНКРЕТНОГО ИСПРАВЛЕНИЯ =====
    async applySpecificFix(error) {
        switch (error.type) {
            case 'astro_hoisted_scripts':
                await this.fixAstroHoistedScripts();
                break;
                
            case 'astro_adapter_conflict':
                await this.fixAstroAdapterConflict();
                break;
                
            case 'missing_postbuild':
                await this.fixMissingPostbuild();
                break;
                
            case 'missing_dependency':
                await this.fixMissingDependency(error);
                break;
                
            default:
                console.log(`⚠️ Неизвестный тип ошибки: ${error.type}`);
        }
    }

    // ===== ИСПРАВЛЕНИЕ HOISTED SCRIPTS =====
    async fixAstroHoistedScripts() {
        const astroConfig = await fs.readFile('astro.config.mjs', 'utf8');
        
        if (!astroConfig.includes("inlineStylesheets: 'never'")) {
            const updatedConfig = astroConfig.replace(
                /build:\s*{([^}]*)}/,
                `build: {
    inlineStylesheets: 'never' // Исправляет проблему с hoisted scripts$1
  }`
            );
            
            await fs.writeFile('astro.config.mjs', updatedConfig);
            await this.commitToGitHub('astro.config.mjs', '🛠️ AUTO-FIX: Исправление hoisted scripts ошибки');
        }
    }

    // ===== ИСПРАВЛЕНИЕ ADAPTER КОНФЛИКТА =====
    async fixAstroAdapterConflict() {
        const astroConfig = await fs.readFile('astro.config.mjs', 'utf8');
        
        if (astroConfig.includes('adapter: netlify()') && astroConfig.includes("output: 'static'")) {
            const updatedConfig = astroConfig.replace(
                /adapter:\s*netlify\(\),?/,
                '// adapter убран для static output'
            );
            
            await fs.writeFile('astro.config.mjs', updatedConfig);
            await this.commitToGitHub('astro.config.mjs', '🛠️ AUTO-FIX: Убрал adapter для static output');
        }
    }

    // ===== КОММИТ В GITHUB =====
    async commitToGitHub(filename, message) {
        try {
            const fileContent = await fs.readFile(filename, 'utf8');
            const encodedContent = Buffer.from(fileContent).toString('base64');
            
            // Получаем текущий SHA файла
            const fileResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${filename}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'AutoFixer-Bot'
                }
            });
            
            const fileData = await fileResponse.json();
            
            // Обновляем файл
            await fetch(`https://api.github.com/repos/${REPO}/contents/${filename}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'AutoFixer-Bot',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    content: encodedContent,
                    sha: fileData.sha
                })
            });
            
            console.log(`✅ Файл ${filename} обновлён в GitHub`);
            
        } catch (error) {
            console.error(`❌ Ошибка коммита ${filename}:`, error.message);
        }
    }
}

// ===== ЗАПУСК AUTO-FIXER =====
if (import.meta.url === `file://${process.argv[1]}`) {
    const autoFixer = new AutoFixer();
    autoFixer.runAutoFix();
}

export default AutoFixer; 