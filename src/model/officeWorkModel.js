const pool = require("../db/db");

const createOfficeWorkTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS office_work (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,

        suggested_farmer_name VARCHAR(100),
        suggested_farmer_phone VARCHAR(15),
        suggested_village VARCHAR(100),
        suggested_mandal VARCHAR(100),

        keep_in_special_package BOOLEAN DEFAULT FALSE,
        package_name VARCHAR(100),
        package_remarks TEXT,

        mediator_id VARCHAR(100),

        certification_willingness VARCHAR(50),
        certification_location VARCHAR(100),
        board_start_date DATE,
        board_end_date DATE,
        border_latitude TEXT,
        border_longitude TEXT,
        border_photo TEXT[],

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_office_work_land
        FOREIGN KEY (land_id)
        REFERENCES land_location(land_id)
        ON DELETE CASCADE
    );
    `);

  await pool.query(`
        CREATE TABLE IF NOT EXISTS office_work_visitors (
            id SERIAL PRIMARY KEY,
            office_work_id INTEGER NOT NULL,

            visit_date DATE NOT NULL,
            visitor_name VARCHAR(100) NOT NULL,
            visitor_phone VARCHAR(15) NOT NULL,
            visitor_status VARCHAR(50) DEFAULT 'Interested',

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_office_work
            FOREIGN KEY (office_work_id)
            REFERENCES office_work(id)
            ON DELETE CASCADE
        );
    `);
};

module.exports = { createOfficeWorkTable };
