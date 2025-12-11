const pool = require("../db/db");
const axios= require("axios");

const getTravelWallet = async (req, res) => {
  try {
    const unique_id= req.user.unique_id;

    const result = await pool.query(
      `SELECT * FROM travel_wallet WHERE unique_id = $1 ORDER BY date DESC`,
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

const getLandWallet = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;

    const result = await pool.query(
      `SELECT lw.*, fd.name AS farmer_name
       FROM land_wallet lw
       LEFT JOIN farmer_details fd ON fd.land_id = lw.land_id
       WHERE lw.unique_id = $1
       ORDER BY lw.date DESC`,
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

const getLandMonthWallet = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;

    const result = await pool.query(
      `SELECT lmw.*, fd.name AS farmer_name
       FROM land_month_wallet lmw
       LEFT JOIN farmer_details fd ON fd.land_id = lmw.land_id
       WHERE lmw.unique_id = $1
       ORDER BY lmw.date DESC`,
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

const getPhysicalWallet= async (req, res) =>{
    try {
      const unique_id= req.user.unique_id;
      const result= await pool.query(
        `
          SELECT pw.*, fd.name AS farmer_name
          FROM physical_verification_wallet pw
          LEFT JOIN farmer_details fd ON fd.land_id = pw.land_id
          WHERE pw.unique_id = $1
          ORDER BY pw.date DESC
        `,
        [unique_id]
      );
      res.status(200).json({
        message: "Physical wallet records fetched successfully",
        data: result.rows,
      });
    } catch (error) {
      console.error("Get Physical Wallet Error:", error);
      res.status(500).json({ error: "Server error" });
    }
}

module.exports= {
    getTravelWallet,
    getLandWallet,
    getLandMonthWallet,
    getPhysicalWallet
}