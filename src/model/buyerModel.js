const pool = require("../db/db");

const buyerTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS buyers (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      state VARCHAR(100),
      district VARCHAR(100),
      sectors VARCHAR(200),
      near_town_1 VARCHAR(255),
      near_town_2 VARCHAR(255),
      acres VARCHAR(255),
      total_budget VARCHAR(255),
      price_per_acres VARCHAR(255),
      type_of_soil VARCHAR(255),
      remarks VARCHAR(255),
      role VARCHAR(50) DEFAULT 'buyer'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS whish_list(
      id SERIAL PRIMARY KEY,
      land_id VARCHAR(255),
      unique_id VARCHAR(255)
    );
    `)
};

module.exports= { buyerTable }