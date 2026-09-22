import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { getFolderStats } from './file-helpers.js'; // Зверни увагу на обов'язкове розширення .js

// Отримуємо абсолютний шлях до поточного файла та директорії в ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('Поточний файл:', __filename);
  console.log('Поточна директорія:', __dirname);
  console.log('-----------------------------------');

  try {
    const files = await getFolderStats(__dirname);
    console.log('Список файлів у поточній директорії:');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
  } catch (error) {
    console.error('Помилка при виконанні:', error.message);
  }
}

main();