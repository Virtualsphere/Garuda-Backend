const pool = require("../db/db");

const createTables = async (req, res) => {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS land_location (
        land_id VARCHAR(255) PRIMARY KEY,
        unique_id VARCHAR(50) NOT NULL,
        state VARCHAR(50),
        district VARCHAR(50),
        mandal VARCHAR(50),
        village VARCHAR(200),
        location VARCHAR(200),
        status VARCHAR(50),
        verification VARCHAR(50) DEFAULT 'pending',
        remarks TEXT,
        created_at DATE DEFAULT CURRENT_DATE,
        verification_date TIMESTAMP,
        verification_unique_id VARCHAR(255)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS farmer_details (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        name VARCHAR(50),
        phone VARCHAR(15),
        whatsapp_number VARCHAR(15),
        literacy VARCHAR(20),
        age_group VARCHAR(20),
        nature VARCHAR(20),
        land_ownership VARCHAR(20),
        mortgage VARCHAR(20)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS land_details (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        land_area VARCHAR(50),
        guntas VARCHAR(50),
        price_per_acre DOUBLE PRECISION,
        total_land_price DOUBLE PRECISION,
        passbook_photo VARCHAR(100),
        land_type VARCHAR(100),
        water_source VARCHAR(100),
        garden VARCHAR(100),
        shed_details VARCHAR(100),
        farm_pond VARCHAR(100),
        residental VARCHAR(100),
        fencing VARCHAR(100)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_tracking (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        road_path VARCHAR(100),
        latitude TEXT,
        longitude TEXT,
        land_border VARCHAR(100)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS dispute_details (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        dispute_type VARCHAR(50),
        siblings_involve_in_dispute VARCHAR(10),
        path_to_land VARCHAR(100)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS document_media (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        land_photo TEXT[],
        land_video TEXT[]
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS session (
        id SERIAL PRIMARY KEY,
        unique_id VARCHAR(255) NOT NULL,
        starting_time VARCHAR(200),
        starting_km VARCHAR(200),
        starting_image VARCHAR(200),
        end_time VARCHAR(200),
        end_km VARCHAR(200),
        end_image VARCHAR(100),
        transport_charges double precision,
        ticket_image TEXT[],
        created_at DATE DEFAULT CURRENT_DATE
      );
    `);
};

module.exports= { createTables }