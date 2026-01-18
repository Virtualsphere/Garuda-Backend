const pool = require("../db/db");

const creatLandPurchaseRequestTable= async()=>{
    await pool.query(`
    CREATE TABLE IF NOT EXISTS land_purchase_request (
      id SERIAL PRIMARY KEY,
      land_id VARCHAR(255),
      unique_id VARCHAR(255),
      land_code VARCHAR(255),
      created_at DATE DEFAULT CURRENT_DATE,
      status VARCHAR(100),
      phone VARCHAR(20),
      name VARCHAR(100),
      description TEXT,

      CONSTRAINT fk_land_purchase_request_land
        FOREIGN KEY (land_id)
        REFERENCES land_location(land_id)
        ON DELETE CASCADE
    );
  `);
}

module.exports= { creatLandPurchaseRequestTable };