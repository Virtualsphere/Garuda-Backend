const pool = require("../db/db");
const axios= require("axios")


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
}

// ===================== GET travel_wallet BY unique_id =====================
const getTravelWallet = async (req, res) => {
  try {
    const unique_id= req.user.unique_id;

    const result = await pool.query(
      `SELECT * FROM travel_wallet WHERE unique_id = $1 ORDER BY id DESC`,
      [unique_id]
    );

    res.status(200).json({
      message: "Travel wallet records fetched successfully",
      data: result.rows,
    });

  } catch (error) {
    console.error("Get Travel Wallet Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ===================== GET land_wallet BY unique_id =======
// ==============
const getLandWallet = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;

    const result = await pool.query(
      `SELECT lw.*, fd.name AS farmer_name
       FROM land_wallet lw
       LEFT JOIN farmer_details fd ON fd.land_id = lw.land_id
       WHERE lw.unique_id = $1
       ORDER BY lw.id DESC`,
      [unique_id]
    );

    res.status(200).json({
      message: "Land wallet records fetched successfully",
      data: result.rows,
    });

  } catch (error) {
    console.error("Get Land Wallet Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ===================== GET land_month_wallet BY unique_id =====================
const getLandMonthWallet = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;

    const result = await pool.query(
      `SELECT lmw.*, fd.name AS farmer_name
       FROM land_month_wallet lmw
       LEFT JOIN farmer_details fd ON fd.land_id = lmw.land_id
       WHERE lmw.unique_id = $1
       ORDER BY lmw.id DESC`,
      [unique_id]
    );

    res.status(200).json({
      message: "Land month wallet records fetched successfully",
      data: result.rows,
    });

  } catch (error) {
    console.error("Get Land Month Wallet Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports= {
    getTravelWallet,
    getLandWallet,
    getLandMonthWallet,
    createWalletTable
}