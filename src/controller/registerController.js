const pool = require('../db/db');
const bcrypt = require('bcrypt');


const userFields = ["name", "email", "phone", "blood_group", "join_date"];
const addressFields = ["state", "district", "mandal", "village", "pincode", "near_town_1", "near_town_2", "near_town_3"];
const aadharFields = ["aadhar_number"];
const salaryFields = ["package"];
const bankFields = [
  "bank_name",
  "account_number",
  "ifsc_code",
  "gpay_number",
  "phonepe_number",
  "upi_id",
];
const workFields = [
  "work_state",
  "work_district",
  "work_mandal",
  "work_village",
];
const vehicleFields = ["vehicle_type", "license_plate"];
const personalAssignmentFields = ["report_to", "assigned_employee"];

const cleanData = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined || obj[key] === null || obj[key] === "") {
      delete obj[key];   // remove empty fields so DB keeps old value
    }
  });
  return obj;
};

const upsert = async (table, uniqueId, data) => {
  const cols = Object.keys(data);
  const vals = Object.values(data);

  if (cols.length === 0) return;

  const setClause = cols.map((col) => `${col} = EXCLUDED.${col}`).join(", ");

  await pool.query(
    `
      INSERT INTO ${table} (unique_id, ${cols.join(", ")})
      VALUES ($1, ${vals.map((_, i) => `$${i + 2}`).join(", ")})
      ON CONFLICT (unique_id)
      DO UPDATE SET ${setClause};
    `,
    [uniqueId, ...vals]
  );
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

const updateUserDetails = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;

    const body = req.body;
    let dataUsers = {};
    let dataAddress = {};
    let dataAadhar = {};
    let dataSalary = {};
    let dataBank = {};
    let dataWork = {};
    let dataVehicle = {};

    // Assign body fields
    for (let key in body) {
      if (userFields.includes(key)) dataUsers[key] = body[key];
      if (addressFields.includes(key)) dataAddress[key] = body[key];
      if (aadharFields.includes(key)) dataAadhar[key] = body[key];
      if (salaryFields.includes(key)) dataSalary[key] = body[key];
      if (bankFields.includes(key)) dataBank[key] = body[key];
      if (workFields.includes(key)) dataWork[key] = body[key];
      if (vehicleFields.includes(key)) dataVehicle[key] = body[key];
    }

    // Handle image uploads
    if (req.files?.image) {
      dataUsers.image = req.files.image[0].filename || null;
    }

    if (req.files?.photo) {
      dataUsers.photo = req.files.photo[0].filename || null;
    }

    if (req.files?.aadhar_front_image) {
      dataAadhar.aadhar_front_image =
        req.files.aadhar_front_image[0].filename || null;
    }

    if (req.files?.aadhar_back_image) {
      dataAadhar.aadhar_back_image =
        req.files.aadhar_back_image[0].filename || null;
    }

    dataUsers = cleanData(dataUsers);
    dataAddress = cleanData(dataAddress);
    dataAadhar = cleanData(dataAadhar);
    dataSalary = cleanData(dataSalary);
    dataBank = cleanData(dataBank);
    dataWork = cleanData(dataWork);
    dataVehicle = cleanData(dataVehicle);


    // UPSERT for each section
    await upsert("users", uniqueId, dataUsers);
    await upsert("address", uniqueId, dataAddress);
    await upsert("aadhar_card", uniqueId, dataAadhar);
    await upsert("salary_package", uniqueId, dataSalary);
    await upsert("bank_account", uniqueId, dataBank);
    await upsert("work_location", uniqueId, dataWork);
    await upsert("vehicle_information", uniqueId, dataVehicle);

    res.status(200).json({
      message: "User updated successfully",
    });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const updateByAdminUserDetails = async (req, res) => {
  try {
    const uniqueId = req.body.unique_id;

    const body = req.body;
    let dataUsers = {};
    let dataAddress = {};
    let dataAadhar = {};
    let dataSalary = {};
    let dataBank = {};
    let dataWork = {};
    let dataVehicle = {};
    let dataPersonalAssignment= {};

    // Assign body fields
    for (let key in body) {
      if (userFields.includes(key)) dataUsers[key] = body[key];
      if (addressFields.includes(key)) dataAddress[key] = body[key];
      if (aadharFields.includes(key)) dataAadhar[key] = body[key];
      if (salaryFields.includes(key)) dataSalary[key] = body[key];
      if (bankFields.includes(key)) dataBank[key] = body[key];
      if (workFields.includes(key)) dataWork[key] = body[key];
      if (vehicleFields.includes(key)) dataVehicle[key] = body[key];
      if (personalAssignmentFields.includes(key)) dataPersonalAssignment[key] = body[key];
    }

    // Handle image uploads
    if (req.files?.image) {
      dataUsers.image = req.files.image[0].filename || null;
    }

    if (req.files?.photo) {
      dataUsers.photo = req.files.photo[0].filename || null;
    }

    if (req.files?.aadhar_front_image) {
      dataAadhar.aadhar_front_image =
        req.files.aadhar_front_image[0].filename || null;
    }

    if (req.files?.aadhar_back_image) {
      dataAadhar.aadhar_back_image =
        req.files.aadhar_back_image[0].filename || null;
    }

    dataUsers = cleanData(dataUsers);
    dataAddress = cleanData(dataAddress);
    dataAadhar = cleanData(dataAadhar);
    dataSalary = cleanData(dataSalary);
    dataBank = cleanData(dataBank);
    dataWork = cleanData(dataWork);
    dataVehicle = cleanData(dataVehicle);
    dataPersonalAssignment= cleanData(dataPersonalAssignment);

    // UPSERT for each section
    await upsert("users", uniqueId, dataUsers);
    await upsert("address", uniqueId, dataAddress);
    await upsert("aadhar_card", uniqueId, dataAadhar);
    await upsert("salary_package", uniqueId, dataSalary);
    await upsert("bank_account", uniqueId, dataBank);
    await upsert("work_location", uniqueId, dataWork);
    await upsert("vehicle_information", uniqueId, dataVehicle);
    await upsert("personal_assignment", uniqueId, dataPersonalAssignment);

    res.status(200).json({
      message: "User updated successfully",
    });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;

    const baseURL = `${req.protocol}://${req.get("host")}/public/images/`;

    // Get user
    const userRes = await pool.query(
      `SELECT * FROM users WHERE unique_id = $1`,
      [uniqueId]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRes.rows[0];
    user.image = user.image ? baseURL + user.image : null;
    user.photo = user.photo ? baseURL + user.photo : null;

    // Fetch other tables
    const [address, aadhar, salary, bank, work, vehicle] = await Promise.all([
      pool.query(`SELECT * FROM address WHERE unique_id = $1`, [uniqueId]),
      pool.query(`SELECT * FROM aadhar_card WHERE unique_id = $1`, [uniqueId]),
      pool.query(`SELECT * FROM salary_package WHERE unique_id = $1`, [
        uniqueId,
      ]),
      pool.query(`SELECT * FROM bank_account WHERE unique_id = $1`, [uniqueId]),
      pool.query(`SELECT * FROM work_location WHERE unique_id = $1`, [
        uniqueId,
      ]),
      pool.query(`SELECT * FROM vehicle_information WHERE unique_id = $1`, [
        uniqueId,
      ]),
    ]);

    const aadharData = aadhar.rows[0] || null;
    if (aadharData) {
      aadharData.aadhar_front_image = aadharData.aadhar_front_image
        ? baseURL + aadharData.aadhar_front_image
        : null;
      aadharData.aadhar_back_image = aadharData.aadhar_back_image
        ? baseURL + aadharData.aadhar_back_image
        : null;
    }

    res.status(200).json({
      message: "User profile fetched successfully",
      user,
      address: address.rows[0] || null,
      aadhar: aadharData,
      salary_package: salary.rows[0] || null,
      bank_account: bank.rows[0] || null,
      work_location: work.rows[0] || null,
      vehicle_information: vehicle.rows[0] || null,
    });
  } catch (err) {
    console.error("Get User Profile Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllUserProfile = async (req, res) => {
  try {
    const baseURL = `${req.protocol}://${req.get("host")}/public/images/`;

    // Get all users
    const userRes = await pool.query(`SELECT * FROM users`);

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "No users found" });
    }

    // Add full image URLs to each user
    const users = userRes.rows.map((u) => ({
      ...u,
      image: u.image ? baseURL + u.image : null,
      photo: u.photo ? baseURL + u.photo : null,
    }));

    // Fetch all related tables
    const [address, aadhar, salary, bank, work, vehicle, assignment] = await Promise.all([
      pool.query(`SELECT * FROM address`),
      pool.query(`SELECT * FROM aadhar_card`),
      pool.query(`SELECT * FROM salary_package`),
      pool.query(`SELECT * FROM bank_account`),
      pool.query(`SELECT * FROM work_location`),
      pool.query(`SELECT * FROM vehicle_information`),
      pool.query(`SELECT * FROM personal_assignment`),
    ]);

    // Add full image URLs to aadhar table
    const aadharData = aadhar.rows.map((a) => ({
      ...a,
      aadhar_front_image: a.aadhar_front_image
        ? baseURL + a.aadhar_front_image
        : null,
      aadhar_back_image: a.aadhar_back_image
        ? baseURL + a.aadhar_back_image
        : null,
    }));

    // Final response
    res.status(200).json({
      message: "All users fetched successfully",
      users,
      address: address.rows,
      aadhar: aadharData,
      salary_package: salary.rows,
      bank_account: bank.rows,
      work_location: work.rows,
      vehicle_information: vehicle.rows,
      personal_assignment: assignment.rows,
    });
  } catch (err) {
    console.error("Get User Profile Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const deleteUserProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    const uniqueId = req.params.uniqueId;

    await client.query('BEGIN');

    await client.query(`DELETE FROM address WHERE unique_id = $1`, [uniqueId]);
    await client.query(`DELETE FROM aadhar_card WHERE unique_id = $1`, [uniqueId]);
    await client.query(`DELETE FROM salary_package WHERE unique_id = $1`, [uniqueId]);
    await client.query(`DELETE FROM bank_account WHERE unique_id = $1`, [uniqueId]);
    await client.query(`DELETE FROM work_location WHERE unique_id = $1`, [uniqueId]);
    await client.query(`DELETE FROM vehicle_information WHERE unique_id = $1`, [uniqueId]);

    await client.query(`DELETE FROM users WHERE unique_id = $1`, [uniqueId]);

    await client.query('COMMIT');

    res.status(200).json({ message: "User deleted successfully" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Delete User Profile Error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
};

const updatePassword = async (req, res) => {
  try {
    const { unique_id, newPassword } = req.body;

    if (!unique_id || !newPassword) {
      return res.status(400).json({
        error: "unique_id and newPassword are required",
      });
    }

    const userRes = await pool.query(
      `SELECT id FROM users WHERE unique_id = $1`,
      [unique_id]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users SET password = $1 WHERE unique_id = $2`,
      [hashedPassword, unique_id]
    );

    res.status(200).json({
      message: "✅ Password reset successfully by admin",
    });
  } catch (err) {
    console.error("Admin Reset Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { registerUser, updateUserDetails, getUserProfile, getAllUserProfile, updateByAdminUserDetails, deleteUserProfile, updatePassword };