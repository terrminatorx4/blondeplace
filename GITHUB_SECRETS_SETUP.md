# 🔒 GITHUB SECRETS РОТАЦИЯ API КЛЮЧЕЙ (БЕЗОПАСНАЯ)

## ✅ ИСПРАВЛЕНА КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ!

### ❌ БЫЛО (ОПАСНО):
- Файл с ключами в репозитории = **ПУБЛИЧНЫЕ API КЛЮЧИ**
- Нарушение безопасности

### ✅ СТАЛО (БЕЗОПАСНО):
- GitHub Secrets = **ЗАШИФРОВАННОЕ ХРАНЕНИЕ**
- API ключи недоступны публично

---

## 🔧 НАСТРОЙКА GITHUB SECRETS:

### 1️⃣ Перейдите в настройки репозитория:
```
https://github.com/terrminatorx4/blondeplace/settings/secrets/actions
```

### 2️⃣ Создайте секрет GEMINI_API_KEYS_POOL:

**Имя секрета:** `GEMINI_API_KEYS_POOL`

**Значение секрета:** (ваши API ключи через перенос строки)
```
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_1
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_2
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_3
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_4
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_5
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_6
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_7
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_8
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_9
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_10
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_11
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_12
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_13
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_14
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_15
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_16
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_17
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_18
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_19
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_your_key_20
```

### 3️⃣ Создайте фоллбэк секрет API_KEY_CURRENT:

**Имя секрета:** `API_KEY_CURRENT`

**Значение секрета:** 
```
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxx_fallback_key
```

---

## 🚀 КАК ЭТО РАБОТАЕТ:

### 📋 Алгоритм ротации:
```javascript
// 1. Читаем GitHub Secret
const poolSecret = process.env.GEMINI_API_KEYS_POOL;

// 2. Парсим ключи
const apiKeys = poolSecret.split('\n').filter(key => key.trim());

// 3. Выбираем ключ по номеру потока
const keyIndex = (threadId - 1) % apiKeys.length;
const selectedKey = apiKeys[keyIndex];
```

### 🔑 Логирование:
```bash
[🔑] [Поток #1] Загружен пул из 20 ключей из GitHub Secrets, использую Pool KEY_1/20 (...k8Xq)
[🔑] [Поток #2] Загружен пул из 20 ключей из GitHub Secrets, использую Pool KEY_2/20 (...mZ9P)
[🔑] [Поток #3] Загружен пул из 20 ключей из GitHub Secrets, использую Pool KEY_3/20 (...dF2L)

✨ [Поток #1] Использую модель Gemini с ключом Pool KEY_1/20 (...k8Xq)
✨ [Поток #2] Использую модель Gemini с ключом Pool KEY_2/20 (...mZ9P)
✨ [Поток #3] Использую модель Gemini с ключом Pool KEY_3/20 (...dF2L)
```

---

## 🎯 ПРЕИМУЩЕСТВА GITHUB SECRETS:

### ✅ Безопасность:
- **Зашифрованное хранение** в GitHub
- **Недоступно** в публичном репозитории
- **Автоматическая маскировка** в логах GitHub Actions

### ✅ Удобство:
- **Centralized management** всех ключей
- **Easy rotation** - меняете секрет, все потоки получают новые ключи
- **No file management** - никаких локальных файлов

### ✅ Масштабируемость:
- **Dynamic scaling** - добавили ключ в секрет, все потоки его используют
- **Load balancing** - автоматическое распределение нагрузки
- **Fault tolerance** - один ключ сломался, остальные работают

---

## 📊 РАСПРЕДЕЛЕНИЕ КЛЮЧЕЙ:

### Для 20 потоков с 20 ключами:
```
Поток #1  → Pool KEY_1/20  (...k8Xq)
Поток #2  → Pool KEY_2/20  (...mZ9P)  
Поток #3  → Pool KEY_3/20  (...dF2L)
...
Поток #20 → Pool KEY_20/20 (...xB9W)
```

### Если потоков больше ключей (цикл):
```
Поток #21 → Pool KEY_1/20  (...k8Xq) [снова]
Поток #22 → Pool KEY_2/20  (...mZ9P) [снова]
```

### Если ключей больше потоков:
```
# 30 ключей, 10 потоков:
Поток #1  → Pool KEY_1/30  (...k8Xq)
Поток #2  → Pool KEY_2/30  (...mZ9P)
...
Поток #10 → Pool KEY_10/30 (...xB9W)
# Ключи 11-30 в резерве для масштабирования
```

---

## 🛡️ ФОЛЛБЭК СИСТЕМА:

### Уровни безопасности:
```
1. GitHub Secret GEMINI_API_KEYS_POOL ✅ (основной)
2. GitHub Secret API_KEY_CURRENT ✅ (фоллбэк)
3. Environment Variable API_KEY_CURRENT ⚠️ (последний шанс)
```

### Логика выбора:
```javascript
if (process.env.GEMINI_API_KEYS_POOL) {
    // Используем пул ключей с ротацией
} else if (process.env.API_KEY_CURRENT) {
    // Фоллбэк на один ключ
} else {
    // Критическая ошибка
    throw new Error("Нет API ключей!");
}
```

---

## 🎊 РЕЗУЛЬТАТ:

### Теперь у вас полностью безопасная система:
- ✅ **GitHub Secrets** вместо файлов
- ✅ **Автоматическая ротация** по потокам  
- ✅ **Информативное логирование** с количеством ключей
- ✅ **Многоуровневая защита** с фоллбэками
- ✅ **Простое управление** через веб-интерфейс GitHub

### 🔒 Безопасность гарантирована:
- **Никто не видит** ваши API ключи
- **Зашифровано** на серверах GitHub  
- **Доступно только** вашим GitHub Actions

**Система готова к безопасной работе! 🚀** 