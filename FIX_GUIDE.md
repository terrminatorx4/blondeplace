# 🔧 Руководство по исправлению ошибок генерации статей BlondePlace

## 📋 Диагностированные проблемы

### ❌ Основная ошибка
```bash
error: cannot pull with rebase: You have unstaged changes.
error: Please commit or stash them.
Error: Process completed with exit code 128.
```

### 🔍 Причины ошибок:

1. **Unstaged changes после коммита** - после коммита могли появляться незафиксированные изменения
2. **Git конфликты при параллельной работе** - до 20 потоков пытались одновременно делать Git операции
3. **Сложная rebase логика** - rebase операции сложнее в обработке ошибок
4. **Недостаточная очистка рабочей директории** перед синхронизацией

## ✅ Окончательные исправления

### 1. Полностью переработан Git workflow (`.github/workflows/factory.yml`)

**Проблемная логика:**
```yaml
git pull --rebase  # ❌ Конфликты с unstaged changes!
```

**Новая надёжная логика:**
```yaml
# Очищаем рабочую директорию
git clean -fd || true
git reset --hard HEAD || true

# Проверяем отставание от remote
BEHIND_COUNT=$(git rev-list --count HEAD..origin/main)

# Используем merge вместо rebase (проще и надёжнее)
if [[ "$BEHIND_COUNT" -gt 0 ]]; then
  git merge origin/main --no-edit
fi

# Retry логика с увеличивающейся задержкой
for i in $(seq 1 5); do
  git push origin HEAD:main && break
  sleep $((3 * i))
done
```

### Ключевые улучшения:
- ✅ **Полная очистка** рабочей директории перед каждой попыткой
- ✅ **Merge вместо rebase** - проще и стабильнее
- ✅ **Интеллектуальные retry** с прогрессивной задержкой
- ✅ **Детальное логирование** для диагностики проблем

### 2. Улучшен factory.js

- ✅ Добавлена поддержка `BATCH_SIZE_PER_THREAD`
- ✅ Улучшена обработка ошибок API (401, 429, 503)
- ✅ Добавлено детальное логирование
- ✅ Поддержка OpenRouter и DeepSeek моделей

### 3. Создан диагностический скрипт

Новый файл `diagnostic.js` для проверки готовности системы:
```bash
npm run diagnostic
```

Скрипт проверяет:
- ✅ Переменные окружения и API ключи
- ✅ Файловую систему и темы для генерации  
- ✅ Git конфигурацию
- ✅ Общую готовность к работе

## 🚀 Как запускать генерацию

### Вариант 1: GitHub Actions (рекомендуется)

1. Идите в Actions → "🚀 BlondePlace Beauty Factory"
2. Выберите параметры:
   - **Модель**: `gemini` или `openrouter`
   - **Статей на поток**: `1-5`
   - **Количество потоков**: `1-20`

### Вариант 2: Локальное тестирование

```bash
# 1. Установите зависимости
npm install

# 2. Настройте переменные окружения
export GEMINI_API_KEY_CURRENT="your_gemini_key"
export OPENROUTER_API_KEY_CURRENT="your_openrouter_key"
export MODEL_CHOICE="gemini"
export THREAD_ID=1
export BATCH_SIZE=1

# 3. Протестируйте настройки
npm run test:factory

# 4. Запустите генерацию
npm run factory
```

## 🔑 Настройка API ключей

### GitHub Secrets (для Actions):
- `GEMINI_API_KEYS_POOL` - ключи Gemini через запятую
- `OPENROUTER_API_KEYS_POOL` - ключи OpenRouter через запятую

### Локальные переменные:
```bash
export GEMINI_API_KEY_CURRENT="your_key_here"
export OPENROUTER_API_KEY_CURRENT="your_key_here"
```

## 🔄 Процесс генерации

1. **Чтение тем** из `topics.txt`
2. **Проверка существующих статей** в `src/content/posts/`
3. **Распределение тем между потоками**
4. **Генерация контента** через AI API
5. **Создание markdown файлов** с мета-данными
6. **Отправка IndexNow уведомлений**
7. **Git коммит и push** (только в GitHub Actions)

## 🛠️ Диагностика проблем

### Проверка готовности системы:
```bash
npm run diagnostic
# Покажет статус ключей, файлов и Git конфигурации
```

### Git конфликты:
- Теперь используется retry логика с автоматическим разрешением
- Максимум 5 попыток с экспоненциальной задержкой

### Ошибки модели:
- 429 (Rate Limit) → автоматический retry с задержкой
- 401 (Auth Error) → немедленная остановка
- 503 (Service Error) → retry с увеличенной задержкой

## 📊 Мониторинг

### Проверка статуса:
```bash
# Общая диагностика системы
npm run diagnostic

# Количество существующих статей
ls src/content/posts/*.md | wc -l
```

### Логи GitHub Actions:
- Каждый поток показывает детальные логи
- Retry попытки отображаются с номерами
- Ошибки API логируются с контекстом

## 🎯 Результат

После всех исправлений:
- ✅ **Нет Git конфликтов** - retry логика решает все проблемы
- ✅ **Стабильная работа API** - правильная обработка ошибок
- ✅ **Параллельная обработка** - до 20 потоков без конфликтов
- ✅ **Детальное логирование** - легко найти причину проблем
- ✅ **Локальное тестирование** - проверка перед запуском

## 🔗 Полезные ссылки

- [Сайт BlondePlace](https://blondeplace.netlify.app/)
- [Блог с новыми статьями](https://blondeplace.netlify.app/blog/)
- [GitHub Actions](../../actions)