const { pool } = require('./db');

// Функция для получения задачи по ID
async function getTaskById(id) {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка при получении задачи:', error);
    throw error;
  }
}

// Экспорт функций
module.exports = {
  getTaskById
};