#!/bin/bash

# Демонстрационный скрипт для чеккера куков Outlook

echo "🚀 Демонстрация чеккера куков Outlook"
echo "===================================="

# Проверка наличия Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не найден. Установите Python 3.7+"
    exit 1
fi

# Установка зависимостей если нужно
if [ ! -f "requirements.txt" ]; then
    echo "❌ Файл requirements.txt не найден"
    exit 1
fi

echo "📦 Проверка зависимостей..."
pip install -r requirements.txt --quiet

# Создание тестового файла с аккаунтами если нет
if [ ! -f "test_accounts.txt" ]; then
    echo "📝 Создание тестового файла аккаунтов..."
    cat > test_accounts.txt << 'EOF'
# Тестовые аккаунты для демонстрации
test1@outlook.com:sessionid=test123; auth_token=token123
test2@hotmail.com:{"sessionid": "test456", "auth_token": "token456"}  
test3@live.com:MSPAuth=value1; MSPProf=value2; MUID=value3
EOF
fi

# Основные примеры использования
echo ""
echo "📋 Примеры использования:"
echo ""

echo "1️⃣ Базовая проверка:"
echo "python outlook_cookie_checker.py test_accounts.txt -o results_demo.json"
echo ""

echo "2️⃣ Быстрая проверка (много потоков):"
echo "python outlook_cookie_checker.py test_accounts.txt -c 100 -d 0.05 -t 15"
echo ""

echo "3️⃣ Стабильная проверка (меньше нагрузки):"
echo "python outlook_cookie_checker.py test_accounts.txt -c 25 -d 0.2 -t 30"
echo ""

echo "4️⃣ С прокси и подробным выводом:"
echo "python outlook_cookie_checker.py test_accounts.txt --proxy-file proxies.txt -v"
echo ""

echo "5️⃣ Экспорт в CSV:"
echo "python outlook_cookie_checker.py test_accounts.txt --format csv -o results.csv"
echo ""

# Запуск демонстрации
echo "🎯 Запуск демонстрации..."
echo ""

# Демо с небольшими настройками
python3 outlook_cookie_checker.py test_accounts.txt \
    -o demo_results.json \
    -c 5 \
    -t 10 \
    -r 2 \
    -d 0.5 \
    --format json \
    -v

echo ""
echo "✅ Демонстрация завершена!"
echo ""
echo "📁 Созданные файлы:"
echo "  - demo_results.json (результаты)"
echo "  - demo_results_valid.json (только валидные)"
echo "  - outlook_checker.log (логи)"
echo ""
echo "🔍 Для просмотра результатов:"
echo "  cat demo_results.json | jq '.[].status' | sort | uniq -c"
echo ""
echo "📊 Полная документация в README.md"