const pool = require("../db/db");

const createNotification = async (req, res) => {
  try {
    const { description }= req.body;
    const uniqueId= req.user.unique_id;

    const status= "pending";

    const result = await pool.query(
      `INSERT INTO notification (unique_id,  description, status)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [uniqueId, description, status]
    );

    const newNotification = result.rows[0];
    res.status(201).json({
      message: '✅ Notification send successfully',
      data: {
        newNotification
      }
    });
  } catch (error) {
    console.error('Notification Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE notification 
       SET status = $1 
       WHERE id = $2 
       RETURNING *;`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: '✅ Notification updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Notification Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getNotification = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM notification`);

    const data = result.rows.map(row => ({
      ...row,
    }));

    res.status(200).json({
      message: '✅ Notification fetch successfully',
      data
    });
  } catch (error) {
    console.error('Notification Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports= { createNotification, getNotification, updateNotification }