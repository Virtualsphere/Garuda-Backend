const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db/db');

// ✅ Helper to find user by email or phone
const findUserByEmailOrPhone = async (identifier) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 OR phone = $1 LIMIT 1`,
    [identifier]
  );
  return result.rows[0];
};

// ✅ Login Controller
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Email/Phone and password are required" });
    }

    const user = await findUserByEmailOrPhone(identifier);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: user.id,
        unique_id: user.unique_id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "✅ Login successful",
      token,
      user: {
        unique_id: user.unique_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};