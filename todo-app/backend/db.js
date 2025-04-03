const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'database',  // Имя сервиса Docker
  database: 'todo_db',
  password: 'postgres',
  port: 5432,
});

module.exports = {
  pool,
};