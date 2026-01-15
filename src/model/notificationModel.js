const pool = require("../db/db");

const createNotificationTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS notification (
      id SERIAL PRIMARY KEY,
      description TEXT,
      email VARCHAR(255),
      phone_number VARCHAR(15),
      role VARCHAR(50),
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

module.exports= { createNotificationTable }