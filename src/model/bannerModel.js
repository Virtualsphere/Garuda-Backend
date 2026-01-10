const pool = require("../db/db");

const createBannerTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS user_banner (
      id SERIAL PRIMARY KEY,
      image VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

module.exports= { createBannerTable }