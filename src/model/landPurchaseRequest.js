const pool = require("../db/db");

const creatLandPurchaseRequestTable= async()=>{
    await pool.query(`
    CREATE TABLE IF NOT EXISTS land_purchase_request (
      id SERIAL PRIMARY KEY,
      land_id VARCHAR(255),
      unique_id VARCHAR(255),
      land_code VARCHAR(255),
      created_at DATE DEFAULT CURRENT_DATE,
      status VARCHAR(100)
    );
  `);
}

module.exports= { creatLandPurchaseRequestTable };