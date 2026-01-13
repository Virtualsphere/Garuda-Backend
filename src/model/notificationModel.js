const pool = require("../db/db");

const createNotificationTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS notification (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255),
      description TEXT,
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

module.exports= { createNotificationTable }