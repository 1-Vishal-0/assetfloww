require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'employee_inventory';

  try {
    const conn = await mysql.createConnection({ host, port, user, password });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`✅ Database '${dbName}' ensured (created if missing).`);
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create database:', err.message);
    process.exit(1);
  }
})();
