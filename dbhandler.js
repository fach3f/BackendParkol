const mysql = require("mysql2/promise");
require('dotenv').config();

// Konfigurasi MySQL
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const createConnection = async () => {
  return await mysql.createConnection(dbConfig);
};

module.exports = createConnection;
