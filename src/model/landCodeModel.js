
const pool = require("../db/db");

const createLandCode = async () => {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS land_code (
            id SERIAL PRIMARY KEY,
            land_code VARCHAR(50) UNIQUE NOT NULL,
            state_id INTEGER REFERENCES states(id),
            district_id INTEGER REFERENCES districts(id),
            town_id INTEGER REFERENCES towns(id),
            farmer_name VARCHAR(100),
            farmer_phone VARCHAR(20),
            village_name VARCHAR(100),
            status VARCHAR(50) DEFAULT 'Available',
            allotted_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_land_code_location 
        ON land_code(state_id, district_id, town_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_land_code_status 
        ON land_code(status);
    `);

    await pool.query(`
        CREATE OR REPLACE FUNCTION update_land_code_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_trigger WHERE tgname = 'update_land_code_updated_at'
            ) THEN
                CREATE TRIGGER update_land_code_updated_at
                BEFORE UPDATE ON land_code
                FOR EACH ROW
                EXECUTE FUNCTION update_land_code_updated_at();
            END IF;
        END;
        $$;
    `);
};

module.exports = { createLandCode };