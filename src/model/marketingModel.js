const pool = require("../db/db");

const marketingTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS poster_location (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      state VARCHAR(100),
      district VARCHAR(100),
      town VARCHAR(100),
      mandal VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS poster_shops (
      id SERIAL PRIMARY KEY,
      poster_location_id INT NOT NULL,
      shop_name VARCHAR(255),
      phone_number VARCHAR(20),
      shop_type VARCHAR(100),
      shop_photo VARCHAR(255),
      sticker_photo VARCHAR(255),
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poster_location_id)
        REFERENCES poster_location(id)
        ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_location (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      state VARCHAR(100),
      district VARCHAR(100),
      town VARCHAR(100),
      mandal VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posting_detials (
      id SERIAL PRIMARY KEY,
      job_location_id INT NOT NULL,
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      place_photo VARCHAR(255),
      sticker_photo VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_location_id)
        REFERENCES job_location(id)
        ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hoarding_details (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      state VARCHAR(100),
      district VARCHAR(100),
      town VARCHAR(100),
      mandal VARCHAR(100),
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      hoarding_photo VARCHAR(255),
      contact_person_name VARCHAR(255),
      contact_person_phone VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE tv_advertising_batch (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE tv_advertising_contacts (
      id SERIAL PRIMARY KEY,
      tv_batch_id INT NOT NULL,

      contact_name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(20),

      state VARCHAR(100),
      district VARCHAR(100),
      town VARCHAR(100),
      mandal VARCHAR(100),

      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),

      photo VARCHAR(255),

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_tv_batch
        FOREIGN KEY (tv_batch_id)
        REFERENCES tv_advertising_batch(id)
        ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE banner_advertising_batch (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE banner_advertising_contacts (
      id SERIAL PRIMARY KEY,
      banner_batch_id INT NOT NULL,

      contact_name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(20),

      state VARCHAR(100),
      district VARCHAR(100),
      town VARCHAR(100),
      mandal VARCHAR(100),

      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),

      photo VARCHAR(255),

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_tv_batch
        FOREIGN KEY (banner_batch_id)
        REFERENCES banner_advertising_batch(id)
        ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE our_ads (
      id SERIAL PRIMARY KEY,
      type VARCHAR(255),
      from_date VARCHAR(255),
      to_date VARCHAR(255),
      ad_photo VARCHAR(255),
      state VARCHAR(255),
      district VARCHAR(255),
      town VARCHAR(255),
      mandal VARCHAR(255),
      address VARCHAR(255),
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      location_photo VARCHAR(255)
    );
  `);
};

module.exports = { marketingTable };