const pool = require("../db/db");

const createLocation = async () => {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS states (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) UNIQUE NOT NULL
    );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS districts (
            id SERIAL PRIMARY KEY,
            state_id INT REFERENCES states(id) ON DELETE CASCADE,
            code VARCHAR(10) NOT NULL,
            name VARCHAR(100) NOT NULL,
            UNIQUE(state_id, code)
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS mandals (
            id SERIAL PRIMARY KEY,
            district_id INT REFERENCES districts(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            UNIQUE(district_id, name)
        );
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS sectors (
            id SERIAL PRIMARY KEY,
            district_id INT REFERENCES districts(id) ON DELETE CASCADE,
            code VARCHAR(10) NOT NULL,
            name VARCHAR(100) NOT NULL,
            UNIQUE(district_id, code)
        );
    `);

    await pool.query(`
       CREATE TABLE IF NOT EXISTS towns (
            id SERIAL PRIMARY KEY,
            district_id INT REFERENCES districts(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            UNIQUE(district_id, name)
        ); 
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS villages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            mandal_id INT REFERENCES mandals(id) ON DELETE CASCADE NULL,
            sector_id INT REFERENCES sectors(id) ON DELETE CASCADE NULL,
            CHECK (
                (mandal_id IS NOT NULL AND sector_id IS NULL) OR
                (mandal_id IS NULL AND sector_id IS NOT NULL)
            ),
            UNIQUE(mandal_id, name),
            UNIQUE(sector_id, name)
        );
    `);
};

module.exports= { createLocation }