const pool = require("../db/db");

const budget = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        SUM(ld.total_land_price) AS total_budget
      FROM land_location ll
      JOIN land_details ld ON ll.land_id = ld.land_id
      WHERE ll.admin_verification = 'verified'
    `);

    const totalBudget = result.rows[0].total_budget || 0;

    res.status(200).json({
      success: true,
      total_budget: totalBudget
    });
  } catch (error) {
    console.error("Error calculating budget:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate budget"
    });
  }
};

const activeUsers = async (req, res) => {
  try {
    const usersCount = await pool.query(`
      SELECT COUNT(*) FROM users WHERE role = 'user'
    `);

    const buyersCount = await pool.query(`
      SELECT COUNT(*) FROM buyers
    `);

    const totalActiveUsers =
      parseInt(usersCount.rows[0].count) +
      parseInt(buyersCount.rows[0].count);

    res.status(200).json({
      success: true,
      active_users: totalActiveUsers
    });
  } catch (err) {
    console.error("Error fetching active users:", err);
    res.status(500).json({ message: "Error fetching active users" });
  }
};

const fieldProductivity = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.unique_id,
        u.name,
        u.role,
        COUNT(ll.land_id) AS total_lands_submitted
      FROM land_location ll
      JOIN users u ON ll.unique_id = u.unique_id
      WHERE u.role = 'field executive'
      GROUP BY u.unique_id, u.name, u.role
      ORDER BY total_lands_submitted DESC
    `);

    res.status(200).json({
      success: true,
      field_productivity: result.rows
    });
  } catch (error) {
    console.error("Error fetching field productivity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch field productivity"
    });
  }
};

const monthlyBudgetByYear = async (req, res) => {
  try {
    const { year } = req.query;

    const result = await pool.query(`
      SELECT 
        EXTRACT(MONTH FROM ll.created_at) AS month_number,
        TO_CHAR(ll.created_at, 'Mon') AS month_name,
        SUM(ld.total_land_price) AS total_budget
      FROM land_location ll
      JOIN land_details ld ON ll.land_id = ld.land_id
      WHERE ll.admin_verification = 'verified'
      AND EXTRACT(YEAR FROM ll.created_at) = $1
      GROUP BY month_number, month_name
      ORDER BY month_number
    `, [year]);

    res.status(200).json({
      success: true,
      year: year,
      monthly_budget: result.rows
    });
  } catch (error) {
    console.error("Error fetching yearly monthly budget:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly budget for the year"
    });
  }
};

module.exports = { budget, activeUsers, fieldProductivity, monthlyBudgetByYear };