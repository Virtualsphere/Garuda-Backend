const pool = require('../db/db');
const bcrypt = require('bcrypt');

// ✅ Create table if not exists (with role column)
const createUserTable = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      password VARCHAR(200),
      role VARCHAR(50) DEFAULT 'agent',
      blood_group VARCHAR(50),
      image VARCHAR(100),
      photo VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS address (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      state VARCHAR(100),
      district VARCHAR(100),
      mandal VARCHAR(100),
      village VARCHAR(100),
      pincode VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS aadhar_card (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      aadhar_number VARCHAR(255),
      aadhar_front_image VARCHAR(255),
      aadhar_back_image VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS salary_package (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      package VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bank_account (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      bank_name VARCHAR(255),
      account_number VARCHAR(255),
      ifsc_code VARCHAR(255),
      gpay_number VARCHAR(255),
      phonepe_number VARCHAR(255),
      upi_id VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_location (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      work_state VARCHAR(255),
      work_district VARCHAR(255),
      work_mandal VARCHAR(255),
      work_village VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicle_information (
      id SERIAL PRIMARY KEY,
      unique_id VARCHAR(255) UNIQUE NOT NULL,
      vehicle_type VARCHAR(255),
      license_plate VARCHAR(255)
    );
  `);
};

// ✅ Generate unique ID (still keep this format for tracking)
const generateUniqueId = async (role) => {
  const result = await pool.query(
    `SELECT unique_id FROM users WHERE unique_id LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${role}%`]
  );

  if (result.rows.length === 0) return `${role}0`;

  const lastId = result.rows[0].unique_id;
  const numberPart = parseInt(lastId.replace(role, '')) || 0;
  return `${role}${numberPart + 1}`;
};

// ✅ Register user
const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, bloodGroup } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const image = req.files?.image?.[0]?.filename || null;
    const photo = req.files?.photo?.[0]?.filename || null;

    await createUserTable();

    const duplicate = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR phone = $2`,
      [email, phone]
    );

    if (duplicate.rows.length > 0) {
      return res.status(400).json({
        error: 'User with this email or phone already exists.',
      });
    }

    const uniqueId = await generateUniqueId(role);
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (unique_id, name, email, phone, password, role, image, blood_group, photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [uniqueId, name, email, phone, hashedPassword, role, image, bloodGroup, photo]
    );

    const newUser = result.rows[0];
    res.status(201).json({
      message: '✅ User registered successfully',
      user: {
        id: newUser.id,
        unique_id: newUser.unique_id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { registerUser, createUserTable };
