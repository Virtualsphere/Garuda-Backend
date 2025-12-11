const pool = require("../db/db");

const createUserTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      password VARCHAR(200),
      role VARCHAR(50) DEFAULT 'agent',
      blood_group VARCHAR(50),
      image VARCHAR(100),
      photo VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS address (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      state VARCHAR(100),
      district VARCHAR(100),
      mandal VARCHAR(100),
      village VARCHAR(100),
      pincode VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS aadhar_card (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      aadhar_number VARCHAR(255),
      aadhar_front_image VARCHAR(255),
      aadhar_back_image VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS salary_package (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      package VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bank_account (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      bank_name VARCHAR(255),
      account_number VARCHAR(255),
      ifsc_code VARCHAR(255),
      gpay_number VARCHAR(255),
      phonepe_number VARCHAR(255),
      upi_id VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_location (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      work_state VARCHAR(255),
      work_district VARCHAR(255),
      work_mandal VARCHAR(255),
      work_village VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicle_information (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      vehicle_type VARCHAR(255),
      license_plate VARCHAR(255)
    );
  `);
};

module.exports= { createUserTable }