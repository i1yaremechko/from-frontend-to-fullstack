Продовжуємо! Розглядаємо фундамент **Node.js Core API**. Вбудовані модулі — це інструментарій, наданий платформою без потреби встановлювати зовнішні `npm`-пакети.

---

## Overview вбудованих модулів

| Модуль | Призначення | Основний сценарій використання |
| --- | --- | --- |
| **`node:fs/promises`** | Файлова система (асинхронна через Promises) | Читання, запис, видалення файлів та каталогів |
| **`node:path`** | Робота зі шляхами файлової системи | Нормалізація, об'єднання шляхів, розширення файлів |
| **`node:http`** | Мережевий протокол HTTP | Створення веб-серверів та HTTP-клієнтів |
| **`node:events`** | Подієво-орієнтована архітектура | Створення власних емітерів подій (`EventEmitter`) |
| **`node:stream`** | Потокова обробка даних | Ефективна обробка великих файлів або мережевих потоків |
| **`node:os`** | Інформація про операційну систему | Моніторинг системних ресурсів (CPU, RAM, Uptime) |
| **`node:crypto`** | Криптографія та безпека | Хешування (SHA-256), шифрування, генерація токенів |
| **`node:worker_threads`** | Паралельні обчислювальні потоки | Обробка важких CPU-bound задач без блокування Event Loop |

---

## 1. `node:path` & `node:fs/promises` — Файлові операції

Завжди поєднуйте `path` з `fs`, щоб уникнути помилок із кросплатформеними шляхами (наприклад, `/` на Linux vs `\` у Windows).

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Кросплатформенне створення шляху
const filePath = path.join(__dirname, 'data', 'user.json');

async function handleFile() {
  try {
    // Створення директорії, якщо її немає
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Запис JSON
    const userData = { id: 1, name: 'Ivan', role: 'FullStack Developer' };
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2), 'utf-8');

    // Читання
    const content = await fs.readFile(filePath, 'utf-8');
    console.log('Прочитано:', JSON.parse(content));
  } catch (error) {
    console.error('Помилка FS:', error);
  }
}

handleFile();

```

---

## 2. `node:events` — Event-Driven Architecture

Клас `EventEmitter` лежить в основі багатьох внутрішніх модулів Node.js (таких як `http.Server`, `Stream` тощо).

```javascript
import { EventEmitter } from 'node:events';

class Logger extends EventEmitter {
  log(message) {
    console.log(`[Log]: ${message}`);
    // Емітимо подію з даними
    this.emit('messageLogged', { id: Date.now(), text: message });
  }
}

const logger = new Logger();

// Підписка на подію
logger.on('messageLogged', (data) => {
  console.log('Слухач події отримав:', data);
});

logger.log('Hello Node.js Event Loop!');

```

---

## 3. `node:stream` & `node:http` — Потоки та Сервер

Потоки дозволяють обробляти дані частинами (**chunks**), не завантажуючи весь файл у оперативну пам'ять (RAM).

```javascript
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const server = http.createServer((req, res) => {
  if (req.url === '/video' && req.method === 'GET') {
    const videoPath = path.join(process.cwd(), 'large-video.mp4');

    // ❌ Погано: fs.readFile завантажить усі 2 ГБ відео у RAM перед відправкою
    // ✅ Добре: createReadStream передає файл частинами за допомогою pipe()
    const readStream = fs.createReadStream(videoPath);
    
    res.writeHead(200, { 'Content-Type': 'video/mp4' });
    readStream.pipe(res); // Прокидаємо поток з диска прямо у мережеву відповідь
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Головна сторінка');
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));

```

---

## 4. `node:os` & `node:crypto` — Системні дані та безпека

```javascript
import os from 'node:os';
import crypto from 'node:crypto';

// 1. Отримання інформації про систему через node:os
console.log('Платформа:', os.platform());
console.log('Кількість ядер CPU:', os.cpus().length);
console.log('Вільна пам\'ять (MB):', Math.round(os.freemem() / 1024 / 1024));

// 2. Безпечна генерація токенів та хешування через node:crypto
const randomToken = crypto.randomBytes(32).toString('hex');
console.log('Генерований токен:', randomToken);

// Хешування пароля (SHA-256)
const hash = crypto.createHash('sha256').update('mySecretPassword123').digest('hex');
console.log('SHA-256 Хеш:', hash);

```

---

## 5. Практичне завдання для закріплення

Створимо комплексну утиліту-монітор серверу, яка об'єднає роботу кількох модулів (`os`, `fs/promises`, `path`, `events`, `crypto`).

### Завдання:

1. Створи клас `SystemMonitor`, який успадковується від `EventEmitter`.
2. Реалізуй метод `check()`, який вимірює:
* Навантаження на RAM (відсоток використаної пам'яті за допомогою `os.totalmem()` та `os.freemem()`).
* Час роботи системи (`os.uptime()`).


3. Якщо використання RAM перевищує **70%**, клас має згенерувати подію `warning` з деталями.
4. Слухач події `warning` повинен:
* Згенерувати унікальний ID інциденту за допомогою `crypto.randomUUID()`.
* Записати лог помилки у файл `logs/system-warnings.log` за допомогою `node:fs/promises` та `node:path`.



---