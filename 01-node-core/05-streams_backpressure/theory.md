Розбираємо одну з найпотужніших та найважливіших концепцій у Node.js — **Streams (Потоки)** та механізм **Backpressure (Зворотний тиск)**.

---

## 1. Що таке Streams і навіщо вони потрібні?

За замовчуванням при роботі з файлами через `fs.readFile` Node.js зчитує **весь файл повністю в оперативну пам'ять (RAM)** і лише потім віддає його. Якщо файл важить $2\text{ GB}$, а вхідних запитів $100$, сервер спробує виділити $200\text{ GB}$ RAM і миттєво впаде з помилкою `JavaScript heap out of memory`.

**Streams (Потоки)** розбивають дані на невеликі порції — **порції (chunks)** (за замовчуванням $64\text{ KB}$ для звичайних даних і $16\text{ KB}$ для String/Buffer) і обробляють їх послідовно.

```
Звичайний підхід (fs.readFile):
[===================== Весь файл 2 GB =====================] -> RAM -> Обробка

Потоковий підхід (fs.createReadStream):
[Chunk 64KB] -> RAM -> Обробка -> [Chunk 64KB] -> RAM -> Обробка ...

```

---

## 2. 4 типи Streams у Node.js

Всі потоки успадковуються від `EventEmitter`.

1. **`Readable` (Потік читання):** Джерело даних (`fs.createReadStream`, `req` у HTTP-сервері, `process.stdin`).
2. **`Writable` (Потік запису):** Приймач даних (`fs.createWriteStream`, `res` у HTTP-сервері, `process.stdout`).
3. **`Duplex` (Двосторонній):** Потік, який є одночасно і Readable, і Writable незалежно один від одного (`net.Socket`, TCP сокети).
4. **`Transform` (Потік трансформації):** Різновид Duplex, де вихідні дані залежать від вхідних (`zlib.createGzip` для стиснення, `crypto.createCipheriv` для шифрування).

---

## 3. Що таке Backpressure (Зворотний тиск)?

Уявіть, що **Readable Stream** читає дані з дуже швидкого SSD-диска зі швидкістю $500\text{ MB/s}$, а **Writable Stream** записує ці дані у повільне мережеве з'єднання (або застарілий HDD) зі швидкістю $10\text{ MB/s}$.

Якщо Readable продовжуватиме читати дані без зупинки, невикористані chunks почнуть накопичуватися у внутрішньому буфері (пам'яті RAM). Рано чи пізно пам'ять переповниться.

> **Backpressure (Зворотний тиск)** — це механізм сигналізації між Writable та Readable потоками, який каже Readable-потоку: **«Зачекай, я не встигаю обробляти дані, призупини читання!»**.

### Як працює буфер та поріг `highWaterMark`

У кожного потоку є свій внутрішній буфер та поріг ємності — **`highWaterMark`** (за замовчуванням $64\text{ KB}$).

1. Коли ми викликаємо `writable.write(chunk)`, метод повертає `boolean`:
* `true`: Буфер Writable-потоку **не переповнений** (менше ніж `highWaterMark`). Продовжуй відправляти дані.
* `false`: Внутрішній буфер **переповнений** (досяг або перевищив `highWaterMark`). **ЗУПИНИ** відправку нових chunks!


2. Коли Writable-потік розвантажує свій буфер (встигає записати дані), він емітить подію **`'drain'`**.
3. Отримавши подію `'drain'`, Readable-потік відновлює читання (`readable.resume()`).

---

## 4. Демонстрація Ручного керування Backpressure

Ось як виглядає правильна реалізація обробки Backpressure вручну на низькому рівні:

```javascript
import fs from 'node:fs';
import path from 'node:path';

const srcPath = path.join(process.cwd(), 'big-file.txt');
const destPath = path.join(process.cwd(), 'copy-file.txt');

// Створюємо потоки із малим highWaterMark для наочності (16 KB)
const readStream = fs.createReadStream(srcPath, { highWaterMark: 16 * 1024 });
const writeStream = fs.createWriteStream(destPath, { highWaterMark: 16 * 1024 });

readStream.on('data', (chunk) => {
  // Перевіряємо, чи встигає writeStream записувати дані
  const canContinue = writeStream.write(chunk);

  if (!canContinue) {
    // ⚠️ Backpressure! Буфер Writable переповнений. Зупиняємо читання!
    console.log('⚠️ Буфер переповнений. Призупиняємо readStream...');
    readStream.pause();
  }
});

// Коли Writable розвантажить свій буфер, викликається подія 'drain'
writeStream.on('drain', () => {
  console.log('✅ Буфер очищено (drain). Відновлюємо readStream...');
  readStream.resume();
});

readStream.on('end', () => {
  writeStream.end();
  console.log('Файл успішно скопійовано з урахуванням Backpressure!');
});

```

---

## 5. Сучасний та надійний підхід: `stream/promises` (`pipeline`)

Писати ручну обробку `pause()`, `resume()`, `drain` та перехоплення помилок складне й вразливе до витоків пам'яті.

У сучасному Node.js для цього використовують `pipeline` з модуля **`node:stream/promises`**. Всі питання з Backpressure, закриттям дескрипторів та обробкою помилок `pipeline` **бере на себе автоматично**.

### Приклад: Стиснення файлу на льоту через Transform Stream

```javascript
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

async function compressFile() {
  const source = fs.createReadStream('large-log.txt');
  const gzip = zlib.createGzip(); // Transform Stream
  const destination = fs.createWriteStream('large-log.txt.gz');

  try {
    // pipeline автоматично контролює Backpressure на всіх етапах!
    await pipeline(
      source,      // Readable
      gzip,        // Transform (стиснення)
      destination  // Writable
    );
    console.log('🚀 Файл успішно заархівовано без перевищення RAM!');
  } catch (err) {
    console.error('❌ Помилка в pipeline:', err);
  }
}

compressFile();

```

---

Два приклади у файлах count-lines.js та pipeline.js демонструють **ідеальний сучасний підхід** до обробки даних у Node.js. Давайте розберемо їхню внутрішню механіку, щоб остаточно зафіксувати ці шаблони у вашому арсеналі FullStack-розробника.

---

## 1. Розбір Прикладу 1: Порядкове читання через `readline` та `for await...of`

Цей паттерн є стандартом для обробки логів, CSV-файлів або будь-яких великих текстових даних.

```javascript
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node count-lines.mjs <file>');
  process.exit(1);
}

const rl = createInterface({
  input: createReadStream(file, { encoding: 'utf8' }),
  crlfDelay: Infinity, // ✅ Розпізнає \r\n як єдиний перехід рядка
});

let lines = 0;
// Async Iterator послідовно витягує рядки з внутрішнього буфера
for await (const line of rl) {
  if (line.trim()) lines++;
}
console.log(`Non-empty lines: ${lines}`);

```

### Що відбувається під капотом:

1. **`createReadStream(file)`** відкриває дескриптор файла і зчитує його не весь одразу, а шматками (**chunks**) по $64\text{ KB}$.
2. **`readline.createInterface`** виступає в ролі парсера: він приймає $64\text{ KB}$ буфер, шукає в ньому символи переведення рядка (`\n` або `\r\n`) і розбиває сирі дані на окремі текстові рядки.
3. **`crlfDelay: Infinity`** запобігає багам із розривом символів `\r` та `\n`, якщо вони випадково потрапили на межу двох різних chunks ($64\text{ KB}$).
4. **`for await (const line of rl)`** — це використання **Async Iterator (асинхронного ітератора)**. Він читає з `rl` рядок за рядком. Якщо обробка рядка в циклі уповільниться (наприклад, ви робите `await db.insert(line)` всередині циклу), асинхронний ітератор **автоматично призупинить `ReadStream**`, реалізуючи **Backpressure** «з коробки».

> **Витрати пам'яті:** Незалежно від того, чи важить ваш файл $10\text{ MB}$ чи $500\text{ GB}$, цей скрипт споживатиме лише біля **$20-30\text{ MB}$ RAM**, оскільки в пам'яті одночасно знаходиться тільки один поточний $64\text{ KB}$ chunk та один рядок.

---

## 2. Розбір Прикладу 2: `pipeline` з `stream/promises`

Цей паттерн замінив застарілий метод `.pipe()`.

```javascript
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

await pipeline(
  createReadStream('big.log'), // 1. Readable
  createGzip(),                // 2. Transform (Gzip)
  createWriteStream('big.log.gz'), // 3. Writable
);

```

### Чому `pipeline` значно кращий за старий `.pipe()`?

В старому синтаксисі `readStream.pipe(gzip).pipe(writeStream)` існувало кілька критичних проблем:

1. **Витоки ресурсів при помилках (Resource Leaks):** Якщо під час читання, стиснення чи запису ставалася помилка (наприклад, закінчилося місце на диску), `.pipe()` залишав дескриптори файлів відкритими.
2. **Обробка помилок:** Потрібно було вішати `.on('error')` окремо на *кожен* потік у ланцюжку. Якщо забути про один з них — сервер падав з `Unhandled Error`.

### Що робить `pipeline` автоматично:

* **Автоматичний Backpressure:** Якщо `createWriteStream` не встигає записувати `.gz` файл на диск, `pipeline` зупиняє читання з `createReadStream`.
* **Автоматичний Cleanup (GC):** Якщо виникає помилка або процес переривається, `pipeline` автоматично закриває (`destroy()`) усі потоки у ланцюжку і звільняє дескриптори.
* **Підтримка `async/await`:** Оскільки імпортовано з `node:stream/promises`, функція повертає звичайний `Promise`, що дозволяє обгортати її у стандартні `try...catch` блоки.
