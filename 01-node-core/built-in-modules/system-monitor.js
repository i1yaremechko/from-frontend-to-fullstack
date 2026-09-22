import { EventEmitter } from 'node:events';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Відновлюємо __dirname для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SystemMonitor extends EventEmitter {
  constructor(thresholdPercent = 70) {
    super();
    this.thresholdPercent = thresholdPercent;
  }

  /**
   * Перевіряє стан системних ресурсів
   */
  check() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Обчислюємо відсоток використаної пам'яті
    const usedMemoryPercentage = Number(((usedMem / totalMem) * 100).toFixed(2));
    const uptimeSeconds = Math.floor(os.uptime());

    const stats = {
      usedMemoryPercentage,
      totalMemMB: Math.round(totalMem / 1024 / 1024),
      freeMemMB: Math.round(freeMem / 1024 / 1024),
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    };

    // Якщо поріг перевищено — емітимо подію warning
    if (usedMemoryPercentage > this.thresholdPercent) {
      this.emit('warning', stats);
    }

    return stats;
  }
}

// ---------------------------------------------------------------
// Налаштування та запуск монітора
// ---------------------------------------------------------------

// Створюємо екземпляр з порогом 70% (або 10% для гарантованого спрацювання при тесті)
const monitor = new SystemMonitor(10); // Змінити на 10 для тестування

// Шлях до лог-файлу: logs/system-warnings.log
const logDir = path.join(__dirname, 'logs');
const logFilePath = path.join(logDir, 'system-warnings.log');

// Слухач події 'warning'
monitor.on('warning', async (stats) => {
  const incidentId = crypto.randomUUID();

  const logEntry = `[${stats.timestamp}] INCIDENT_ID: ${incidentId} | RAM Usage: ${stats.usedMemoryPercentage}% (Free: ${stats.freeMemMB}MB / Total: ${stats.totalMemMB}MB) | Uptime: ${stats.uptimeSeconds}s\n`;

  console.warn(`⚠️ [УВАГА] Високе навантаження RAM: ${stats.usedMemoryPercentage}%. Запис у лог...`);

  try {
    // Гарантуємо наявність папки logs/
    await fs.mkdir(logDir, { recursive: true });

    // Додаємо запис у файл (flag 'a' - append)
    await fs.appendFile(logFilePath, logEntry, 'utf-8');
    console.log(`✅ Лог інциденту ${incidentId} успішно збережено у ${logFilePath}`);
  } catch (error) {
    console.error('❌ Помилка запису логу:', error.message);
  }
});

// ---------------------------------------------------------------
// Тестовий запуск перевірки
// ---------------------------------------------------------------

console.log('🔍 Запуск системної перевірки...');
const currentStats = monitor.check();

console.log('Поточний стан системи:', {
  RAM_Usage: `${currentStats.usedMemoryPercentage}%`,
  Uptime: `${currentStats.uptimeSeconds} сек`,
});

/* 
💡 ПРИМІТКА ДЛЯ ТЕСТУВАННЯ:
Якщо на вашому ПК RAM завантажена менше ніж на 70%, подія warning не створить файл.
Щоб протестувати запис, змініть поріг при створенні екземпляра на низьке значення:
const monitor = new SystemMonitor(10);
*/