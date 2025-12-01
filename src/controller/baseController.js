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


// ===================== GET land_wallet BY unique_id =====================
const getLandWallet = async (req, res) => {
  try {
    const unique_id= req.user.unique_id;

    const result = await pool.query(
      `SELECT * FROM land_wallet WHERE unique_id = $1 ORDER BY id DESC`,
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
    const unique_id= req.user.unique_id;

    const result = await pool.query(
      `SELECT * FROM land_month_wallet WHERE unique_id = $1 ORDER BY id DESC`,
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


const dynamicUpdate = async (table, id, body) => {
  const columns = Object.keys(body);
  const values = Object.values(body);

  if (columns.length === 0) return null;

  const setClause = columns
    .map((col, idx) => `${col} = $${idx + 2}`)
    .join(", ");

  const query = `
    UPDATE ${table}
    SET ${setClause}
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [id, ...values]);
  return result.rows[0];
};


const updateTravelWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await dynamicUpdate("travel_wallet", id, req.body);

    if (!updated)
      return res.status(404).json({ error: "Travel wallet record not found" });

    res.status(200).json({
      message: "Travel wallet updated successfully",
      data: updated,
    });

  } catch (error) {
    console.error("Update Travel Wallet Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};


const updateLandWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await dynamicUpdate("land_wallet", id, req.body);

    if (!updated)
      return res.status(404).json({ error: "Land wallet record not found" });

    res.status(200).json({
      message: "Land wallet updated successfully",
      data: updated,
    });

  } catch (error) {
    console.error("Update Land Wallet Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};


const updateLandMonthWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await dynamicUpdate("land_month_wallet", id, req.body);

    if (!updated)
      return res.status(404).json({ error: "Land month wallet record not found" });

    res.status(200).json({
      message: "Land month wallet updated successfully",
      data: updated,
    });

  } catch (error) {
    console.error("Update Land Month Wallet Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports= {
    getTravelWallet,
    getLandWallet,
    getLandMonthWallet,
    updateTravelWallet,
    updateLandWallet,
    updateLandMonthWallet,
    createWalletTable
}