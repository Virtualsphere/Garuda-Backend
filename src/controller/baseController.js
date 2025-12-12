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

const getAllTravelWallet = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          tw.date,
          u.name,
          u.role,
          u.phone,
          tw.amount,
          tw.status,
          tw.session_id,
          tw.id AS travel_id
       FROM travel_wallet tw
       LEFT JOIN users u ON u.unique_id = tw.unique_id
       ORDER BY tw.date DESC`
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

const getAllLandWallet = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        lmw.date,
        u.name,
        u.role,
        u.phone,
        lmw.work_amount AS amount,
        lmw.status,
        lmw.land_id,
        lmw.id AS land_wallet_id
       FROM land_wallet lmw
       LEFT JOIN users u ON u.unique_id = lmw.unique_id
       ORDER BY lmw.date DESC`
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

const getAllLandMonthWallet = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        lmw.date,
        u.name,
        u.role,
        u.phone,
        lmw.month_end_amount AS amount,
        lmw.status,
        lmw.land_id,
        lmw.id AS land_wallet_id
       FROM land_month_wallet lmw
       LEFT JOIN users u ON u.unique_id = lmw.unique_id
       ORDER BY lmw.date DESC`
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

const getAllPhysicalWallet= async (req, res)=>{
  try {
    const result = await pool.query(
      `SELECT
        pw.date,
        u.name,
        u.role,
        u.phone,
        pw.physical_verification_amount AS amount,
        pw.status,
        pw.land_id,
        pw.id AS physical_verification_id
       FROM physical_verification_wallet pw
       LEFT JOIN users u ON u.unique_id = pw.unique_id
       ORDER BY pw.date DESC`
    );

    res.status(200).json({
      message: "Physical verification wallet records fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Get Physical verification Wallet Error:", error);
    res.status(500).json({ error: "Server error" });
  }
}

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
      return res
        .status(404)
        .json({ error: "Land month wallet record not found" });

    res.status(200).json({
      message: "Land month wallet updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update Land Month Wallet Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updatePhysicalVerificationWallet= async (req, res)=>{
  try {
    const { id } = req.params;
    const updated = await dynamicUpdate("physical_verification_wallet", id, req.body);

    if (!updated)
      return res
        .status(404)
        .json({ error: "Physical verification wallet record not found" });

    res.status(200).json({
      message: "Physical verification wallet updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update Physical verification Error:", error);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports= {
    getTravelWallet,
    getLandWallet,
    getLandMonthWallet,
    getPhysicalWallet,
    getAllTravelWallet,
    getAllLandWallet,
    getAllLandMonthWallet,
    getAllPhysicalWallet,
    updateTravelWallet,
    updateLandWallet,
    updateLandMonthWallet,
    updatePhysicalVerificationWallet
}