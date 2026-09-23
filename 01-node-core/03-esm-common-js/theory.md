## 1. CommonJS (CJS) vs ECMAScript Modules (ESM)

У Node.js історично склалися дві системи модулів. **CommonJS** — це класичний формат, розроблений спеціально під серверний JS, а **ESM** — це офіційний стандарт мови JavaScript.

```
CommonJS (CJS)                       ECMAScript Modules (ESM)
----------------                    --------------------------
const fs = require('node:fs');      import fs from 'node:fs';
module.exports = { ... };           export default { ... };

- Синхронна завантаження             - Асинхронне парсинг і завантаження
- Виконується під час RUNTIME       - Парситься під час COMPILE TIME (статичний аналіз)
- Динамічний (require всередині if)  - Статичний (import лише нагорі файлу*)
- `this` посилається на module.exports - `this` дорівнює undefined на верхньому рівні

```

> **Динамічний `import()`:** В ESM можна імпортувати модулі динамічно всередині функцій або умов за допомогою функціонального виклику `const module = await import('./module.mjs')`.

---

## 2. Як увімкнути ESM у проекту

Існує два шляхи вказати Node.js, що файл потрібно виконувати як ESM:

1. **Глобально для проекту (Рекомендовано):**
Додати `"type": "module"` у файл `package.json`. Після цього всі `.js` файли в цій папці вважаються ESM.
```json
{
  "name": "my-app",
  "type": "module"
}

```


2. **Через розширення файлів:**
* `.mjs` — завжди обробляється як **ESM** (незалежно від `package.json`).
* `.cjs` — завжди обробляється як **CommonJS**.
* `.js` — залежить від поля `"type"` у `package.json` (`"module"` $\rightarrow$ ESM, відсутність або `"commonjs"` $\rightarrow$ CJS).



---

## 3. Критичні відмінності: Змінні оточення та імпортування

### Відсутність `__dirname` та `__filename` в ESM

В ESM відсутні класичні змінні CJS: `__dirname`, `__filename`, `require` та `module.exports`.

Щоб отримати шлях до поточного файлу та директорії в ESM, використовують модуль `node:url` та метаданні `import.meta.url`:

```javascript
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// import.meta.url повертає URL файлу (наприклад, 'file:///app/index.js')
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__filename); // /app/index.js
console.log(__dirname);  // /app

```

### Обов'язкові розширення файлів в ESM

В CommonJS можна було писати `require('./utils')`.

**В ESM обов'язково вказувати повне розширення файлу:** `import { utils } from './utils.js'`. Відсутність `.js` або `.mjs` призведе до помилки `ERR_MODULE_NOT_FOUND`.

---

## 4. `node:` Префікс для вбудованих модулів

Починаючи з Node.js v14.18.0 / v16.0.0, офіційно рекомендовано імпортувати вбудовані модулі з префіксом `node:`.

```javascript
// ❌ Старий підхід (може створити конфлікт з npm-пакетом)
import fs from 'fs';
import path from 'path';

// ✅ Сучасний стандарт (Explicit Specifier)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

```

### Чому префікс `node:` — це важливий стандарт?

1. **Запобігання конфліктам імен (NPM squatting):** Якщо розробник створить у `node_modules` пакет із назвою `http` або `test`, імпорт без префіксу може завантажити сторонній npm-пакет замість системного модуля Node.js. Префікс `node:` гарантує завантаження саме системного модуля.
2. **Ясність коду:** Будь-який розробник або статичний аналізатор одразу бачить, що це вбудований модуль платформи, а не зовнішня залежність.
3. **Підтримка нових модулів:** Деякі нові модулі Node.js (наприклад, `node:test` для юніт-тестування) доступні **виключно** через префікс `node:`.

---

## 5. Приклади та Демонстрація

Створимо два файли для порівняння та інтеграції.

### Приклад 1: ESM модуль із сучасними стандартами (`math.js`)

```javascript
// math.js
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

```

### Приклад 2: Головний файл із використанням ESM та `node:` префіксів (`main.js`)

```javascript
// main.js
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs/promises';
import { add, multiply } from './math.js'; // Повне розширення обов'язкове!

// Отримуємо __dirname в ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  console.log('Поточна директорія:', __dirname);

  const result = add(5, 10);
  console.log('Результат додавання:', result);

  // Запис у файл за допомогою асинхронного fs/promises
  const filePath = join(__dirname, 'output.txt');
  await fs.writeFile(filePath, `Result: ${multiply(4, 4)}`);
  console.log('Файл успішно збережено за шляхом:', filePath);
}

run().catch(console.error);

```

---

## 6. Практичне завдання для закріплення

Створи міні-проект для відпрацювання роботи з ESM.

### Завдання:

1. Ініціалізуй проект з `"type": "module"` у `package.json`.
2. Створи модуль `file-helpers.js`, який експортує функцію `getFolderStats(dirPath)`. Функція повинна прочитати вміст директорії за допомогою `node:fs/promises`.
3. У головному файлі `index.js`:
* Отримай абсолютний шлях до поточної директорії через `import.meta.url`.
* Виклич `getFolderStats(__dirname)` і виведіть список файлів у консоль.
* Використовуй префікси `node:` для всіх системних модулів (`node:fs/promises`, `node:path`, `node:url`).



---