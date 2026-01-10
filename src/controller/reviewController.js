const pool = require("../db/db");

const createReview = async (req, res) => {
  try {
    const { name, description, location }= req.body;
    const uniqueId= req.user.unique_id;
    const image = req.files?.image?.[0]?.filename || null;

    const result = await pool.query(
      `INSERT INTO user_review (unique_id, name, image, description, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [uniqueId, name, image, description, location]
    );

    const newReview = result.rows[0];
    res.status(201).json({
      message: '✅ Review upload successfully',
      data: {
        newReview
      }
    });
  } catch (error) {
    console.error('Review Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getReview = async (req, res) => {
  try {
    const baseURL = `${req.protocol}://${req.get("host")}/public/images/`;

    const result = await pool.query(`SELECT * FROM user_review`);

    const data = result.rows.map(row => ({
      ...row,
      image: row.image ? baseURL + row.image : null
    }));

    res.status(200).json({
      message: '✅ Review fetch successfully',
      data
    });
  } catch (error) {
    console.error('Review Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports= { createReview, getReview }