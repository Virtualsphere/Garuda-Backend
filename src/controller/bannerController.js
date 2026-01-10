const pool = require("../db/db");

const createBanner = async (req, res) => {
  try {
    const image = req.files?.image?.[0]?.filename || null;

    await pool.query(
      `TRUNCATE TABLE user_banner`,
    );

    const result = await pool.query(
      `INSERT INTO user_banner (image)
       VALUES ($1)
       RETURNING *;`,
      [image]
    );

    const newUser = result.rows[0];
    res.status(201).json({
      message: '✅ Banner upload successfully',
    });
  } catch (error) {
    console.error('Banner Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getBanner= async (req, res)=>{
    try {
    const baseURL = `${req.protocol}://${req.get("host")}/public/images/`;

    const result = await pool.query(
      `SELECT * FROM user_banner`
    );

    const data= result.rows[0];

    data.image= data.image ? baseURL + data.image : null;

    res.status(201).json({
      message: '✅ Banner fetch successfully',
      data
    });
  } catch (error) {
    console.error('Banner Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports= { createBanner, getBanner }