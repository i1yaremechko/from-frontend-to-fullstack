import fs from 'node:fs/promises';

/**
 * Читає вміст директорії за вказаним шляхом
 * @param {string} dirPath - Абсолютний шлях до директорії
 * @returns {Promise<string[]>} Список назв файлів та папок
 */
export async function getFolderStats(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    return files;
  } catch (error) {
    throw new Error(`Не вдалося прочитати директорію ${dirPath}: ${error.message}`);
  }
}