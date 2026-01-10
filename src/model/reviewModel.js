const pool = require("../db/db");

const createReviewTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS user_review (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255),
      name VARCHAR(100) NOT NULL,
      image VARCHAR(255),
      description TEXT,
      location VARCHAR(255),
      rating VARCHAR(255) default '5',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

module.exports= { createReviewTable }