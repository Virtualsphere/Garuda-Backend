const pool = require("../db/db");

const createWalletTable= async()=>{
    await pool.query(`
    CREATE TABLE IF NOT EXISTS travel_wallet (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255),
      unique_id VARCHAR(255),
      date VARCHAR(255),
      total_km VARCHAR(255),
      amount VARCHAR(255),
      status VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS land_wallet (
      id SERIAL PRIMARY KEY,
      land_id VARCHAR(255),
      unique_id VARCHAR(255),
      varification VARCHAR(100),
      date VARCHAR(255),
      work_amount VARCHAR(255),
      status VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS land_month_wallet (
      id SERIAL PRIMARY KEY,
      land_id VARCHAR(255),
      unique_id VARCHAR(255),
      varification VARCHAR(100),
      date VARCHAR(255),
      month_end_amount VARCHAR(255),
      status VARCHAR(100)
    );
  `);

  await pool.query(`
        CREATE TABLE IF NOT EXISTS physical_verification_wallet (
            id SERIAL PRIMARY KEY,
            land_id VARCHAR(255),
            unique_id VARCHAR(255),
            varification VARCHAR(100),
            date VARCHAR(255),
            physical_verification_amount VARCHAR(255),
            status VARCHAR(100)
        );
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS poster_wallet (
        id SERIAL PRIMARY KEY,
        poster_location_id VARCHAR(255),
        unique_id VARCHAR(255),
        date VARCHAR(255),
        number_of_posters VARCHAR(255),
        amount VARCHAR(255),
        status VARCHAR(255)
        );
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS job_post_wallet (
        id SERIAL PRIMARY KEY,
        job_location_id VARCHAR(255),
        unique_id VARCHAR(255),
        date VARCHAR(255),
        number_of_post VARCHAR(255),
        amount VARCHAR(255),
        status VARCHAR(255)
        );
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ads_wallet (
        id SERIAL PRIMARY KEY,
        ads_id VARCHAR(255),
        unique_id VARCHAR(255),
        date VARCHAR(255),
        ad_type VARCHAR(255),
        amount VARCHAR(255),
        status VARCHAR(255)
        );
    `)
}

module.exports= { createWalletTable };