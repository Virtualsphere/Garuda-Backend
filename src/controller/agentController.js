const pool = require("../db/db");
const axios = require("axios");

// --------------------------
// CREATE ALL TABLES
// --------------------------
const createTables = async (req, res) => {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS land_location (
        land_id VARCHAR(255) PRIMARY KEY,
        unique_id VARCHAR(50) NOT NULL,
        state VARCHAR(50),
        district VARCHAR(50),
        mandal VARCHAR(50),
        village VARCHAR(200),
        location VARCHAR(200),
        status VARCHAR(50),
        verification VARCHAR(50) DEFAULT 'pending',
        created_at DATE DEFAULT CURRENT_DATE
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS farmer_details (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        name VARCHAR(50),
        phone VARCHAR(15),
        whatsapp_number VARCHAR(15),
        literacy VARCHAR(20),
        age_group VARCHAR(20),
        nature VARCHAR(20),
        land_ownership VARCHAR(20),
        mortgage VARCHAR(20)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS land_details (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        land_area VARCHAR(50),
        guntas VARCHAR(50),
        price_per_acre DOUBLE PRECISION,
        total_land_price DOUBLE PRECISION,
        passbook_photo VARCHAR(100),
        land_type VARCHAR(100),
        water_source VARCHAR(100),
        garden VARCHAR(100),
        shed_details VARCHAR(100),
        farm_pond VARCHAR(100),
        residental VARCHAR(100),
        fencing VARCHAR(100)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_tracking (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        road_path VARCHAR(100),
        latitude TEXT,
        longitude TEXT,
        land_border VARCHAR(100)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS dispute_details (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        dispute_type VARCHAR(50),
        siblings_involve_in_dispute VARCHAR(10),
        path_to_land VARCHAR(100)
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS document_media (
        id SERIAL PRIMARY KEY,
        land_id VARCHAR(255) NOT NULL,
        land_photo TEXT[],
        land_video TEXT[]
      );
    `);

  await pool.query(`
      CREATE TABLE IF NOT EXISTS session (
        id SERIAL PRIMARY KEY,
        unique_id VARCHAR(255) NOT NULL,
        starting_time VARCHAR(200),
        starting_km VARCHAR(200),
        starting_image VARCHAR(200),
        end_time VARCHAR(200),
        end_km VARCHAR(200),
        end_image VARCHAR(100),
        transport_charges double precision,
        ticket_image TEXT[],
        created_at DATE DEFAULT CURRENT_DATE
      );
    `);
};

// Convert flat form-data into grouped JSON object
function buildStructuredUpdate(body) {
  return {
    land_location: {
      state: body.state,
      district: body.district,
      mandal: body.mandal,
      village: body.village,
      location: body.location,
      status: body.status,
    },
    farmer_details: {
      name: body.name,
      phone: body.phone,
      whatsapp_number: body.whatsapp_number,
      literacy: body.literacy,
      age_group: body.age_group,
      nature: body.nature,
      land_ownership: body.land_ownership,
      mortgage: body.mortgage,
    },
    land_details: {
      land_area: body.land_area,
      guntas: body.guntas,
      price_per_acre: body.price_per_acre,
      total_land_price: body.total_land_price,
      land_type: body.land_type,
      water_source: body.water_source,
      garden: body.garden,
      shed_details: body.shed_details,
      farm_pond: body.farm_pond,
      residental: body.residental,
      fencing: body.fencing,
      passbook_photo: null,
    },
    gps_tracking: {
      road_path: body.road_path,
      latitude: body.latitude,
      longitude: body.longitude,
      land_border: null,
    },
    dispute_details: {
      dispute_type: body.dispute_type,
      siblings_involve_in_dispute: body.siblings_involve_in_dispute,
      path_to_land: body.path_to_land,
    },
    document_media: {
      land_photo: [],
      land_video: [],
    },
  };
}

const parsePgArray = (str) => {
  if (!str) return [];
  return str.replace("{", "").replace("}", "").split(",");
};

const userFields = ["name", "email", "phone", "blood_group"];
const addressFields = ["state", "district", "mandal", "village", "pincode"];
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

// ----------------------------------------------------
// NEW FUNCTION — INSERT INTO ALL TABLES AT ONCE
// ----------------------------------------------------
const createFullLandEntry = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      // land_location
      state,
      district,
      mandal,
      village,
      location,
      status,

      // farmer_details
      name,
      phone,
      whatsapp_number,
      literacy,
      age_group,
      nature,
      land_ownership,
      mortgage,

      // land_details
      land_area,
      guntas,
      price_per_acre,
      total_land_price,
      land_type,
      water_source,
      garden,
      shed_details,
      farm_pond,
      residental,
      fencing,

      // gps_tracking
      road_path,
      latitude,
      longitude,

      // dispute_details
      dispute_type,
      siblings_involve_in_dispute,
      path_to_land,
    } = req.body;

    const unique_id = req.user.unique_id;

    // File Handling
    const passbookPhoto = req.files?.passbook_photo?.[0]?.filename || null;
    const landBorder = req.files?.land_border?.[0]?.filename || null;

    const landPhoto = req.files?.land_photo?.map((f) => f.filename) || [];
    const landVideo = req.files?.land_video?.map((f) => f.filename) || [];

    const lastIdRes = await client.query(`
      SELECT land_id FROM land_location ORDER BY created_at DESC LIMIT 1
    `);

    const idRes = await client.query(`SELECT nextval('land_id_seq') AS id`);

    const land_id = `LAND-${idRes.rows[0].id}`;

    // ------------------------------
    // 1️⃣ Insert land_location
    // ------------------------------
    const landRes = await client.query(
      `INSERT INTO land_location 
       (land_id, unique_id, state, district, mandal, village, location, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING land_id`,
      [land_id, unique_id, state, district, mandal, village, location, status]
    );

    // ------------------------------
    // 2️⃣ Insert farmer_details
    // ------------------------------
    await client.query(
      `INSERT INTO farmer_details 
       (land_id, name, phone, whatsapp_number, literacy, age_group,
        nature, land_ownership, mortgage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9);`,
      [
        land_id,
        name,
        phone,
        whatsapp_number,
        literacy,
        age_group,
        nature,
        land_ownership,
        mortgage,
      ]
    );

    // ------------------------------
    // 3️⃣ Insert land_details
    // ------------------------------
    await client.query(
      `INSERT INTO land_details 
       (land_id, land_area, guntas, price_per_acre, total_land_price, 
        passbook_photo, land_type, water_source, garden, shed_details, 
        farm_pond, residental, fencing)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13);`,
      [
        land_id,
        land_area,
        guntas,
        price_per_acre,
        total_land_price,
        passbookPhoto,
        land_type,
        water_source,
        garden,
        shed_details,
        farm_pond,
        residental,
        fencing,
      ]
    );

    // ------------------------------
    // 4️⃣ Insert gps_tracking
    // ------------------------------
    await client.query(
      `INSERT INTO gps_tracking 
       (land_id, road_path, latitude, longitude, land_border)
       VALUES ($1,$2,$3,$4,$5);`,
      [land_id, road_path, latitude, longitude, landBorder]
    );

    // ------------------------------
    // 5️⃣ Insert dispute_details
    // ------------------------------
    await client.query(
      `INSERT INTO dispute_details 
       (land_id, dispute_type, siblings_involve_in_dispute, path_to_land)
       VALUES ($1,$2,$3,$4);`,
      [land_id, dispute_type, siblings_involve_in_dispute, path_to_land]
    );

    // ------------------------------
    // 6️⃣ Insert document_media
    // ------------------------------
    await client.query(
      `INSERT INTO document_media 
       (land_id, land_photo, land_video)
       VALUES ($1,$2::text[],$3::text[]);`,
      [land_id, landPhoto, landVideo]
    );

    await client.query(
      `INSERT INTO land_wallet 
      (land_id, unique_id, varification, date, work_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6);`,
      [land_id, unique_id, "pending", new Date(), 0, "pending"]
    );

    await client.query(
      `INSERT INTO land_month_wallet 
      (land_id, unique_id, varification, date, month_end_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6);`,
      [land_id, unique_id, "pending", new Date(), 0, "pending"]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "✅ Full land entry created successfully",
      land_id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "❌ Failed to create full land entry" });
  } finally {
    client.release();
  }
};

// --------------------------
// CREATE SESSION
// --------------------------
const createSession = async (req, res) => {
  try {
    const {
      starting_time,
      starting_km,
      end_time,
      end_km,
      end_image,
      transport_charges,
      ticket_image,
    } = req.body;

    const starting_image = req.files?.starting_image?.[0]?.filename || null;

    const unique_id = req.user.unique_id;

    const result = await pool.query(
      `INSERT INTO session 
      (unique_id, starting_time, starting_km, starting_image, end_time, end_km, end_image, transport_charges, ticket_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *;`,
      [
        unique_id,
        starting_time,
        starting_km,
        starting_image,
        end_time,
        end_km,
        end_image,
        transport_charges,
        ticket_image,
      ]
    );

    res.status(201).json({
      message: "✅ Session created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Failed to create session" });
  }
};

// --------------------------
// GET ALL DETAILS FOR A LAND
// --------------------------
const getAllLandFullDetails = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(
      `
     SELECT 
        l.*,
        f.*,
        ld.*,
        gps.*,
        d.*,
        dm.*
      FROM land_location l
      LEFT JOIN farmer_details f ON l.land_id = f.land_id
      LEFT JOIN land_details ld ON l.land_id = ld.land_id
      LEFT JOIN gps_tracking gps ON l.land_id = gps.land_id
      LEFT JOIN dispute_details d ON l.land_id = d.land_id
      LEFT JOIN document_media dm ON l.land_id = dm.land_id
      WHERE l.unique_id = $1
      AND l.status = $2
      ORDER BY l.created_at DESC, l.land_id DESC;  -- Changed to show newest first
  `,
      [uniqueId, "true"]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "No land records found" });

    const response = result.rows.map((row) => ({
      land_id: row.land_id,

      land_location: {
        unique_id: row.unique_id,
        state: row.state,
        district: row.district,
        mandal: row.mandal,
        village: row.village,
        location: row.location,
        status: row.status,
      },

      farmer_details: {
        name: row.name,
        phone: row.phone,
        whatsapp_number: row.whatsapp_number,
        literacy: row.literacy,
        age_group: row.age_group,
        nature: row.nature,
        land_ownership: row.land_ownership,
        mortgage: row.mortgage,
      },

      land_details: {
        land_area: row.land_area,
        guntas: row.guntas,
        price_per_acre: row.price_per_acre,
        total_land_price: row.total_land_price,
        passbook_photo: row.passbook_photo
          ? baseURL + "images/" + row.passbook_photo
          : null,
        land_type: row.land_type,
        water_source: row.water_source,
        garden: row.garden,
        shed_details: row.shed_details,
        farm_pond: row.farm_pond,
        residental: row.residental,
        fencing: row.fencing,
      },

      gps_tracking: {
        road_path: row.road_path,
        latitude: row.latitude,
        longitude: row.longitude,
        land_border: row.land_border
          ? baseURL + "images/" + row.land_border
          : null,
      },

      dispute_details: {
        dispute_type: row.dispute_type,
        siblings_involve_in_dispute: row.siblings_involve_in_dispute,
        path_to_land: row.path_to_land,
      },

      document_media: {
        land_photo: (row.land_photo || []).map((p) => baseURL + "images/" + p),
        land_video: (row.land_video || []).map((v) => baseURL + "videos/" + v),
      },
    }));

    res.status(200).json({
      message: "✔ All land full details fetched",
      data: response,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch land details" });
  }
};

const getAllLandFullDraftDetails = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(
      `
      SELECT 
        l.*,
        f.*,
        ld.*,
        gps.*,
        d.*,
        dm.*
      FROM land_location l
      LEFT JOIN farmer_details f ON l.land_id = f.land_id
      LEFT JOIN land_details ld ON l.land_id = ld.land_id
      LEFT JOIN gps_tracking gps ON l.land_id = gps.land_id
      LEFT JOIN dispute_details d ON l.land_id = d.land_id
      LEFT JOIN document_media dm ON l.land_id = dm.land_id
      WHERE l.unique_id = $1 
        AND l.status = $2
      ORDER BY l.created_at DESC, l.land_id DESC  -- Changed to show newest first
    `,
      [uniqueId, "false"]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "No land records found" });

    const response = result.rows.map((row) => ({
      land_id: row.land_id,

      land_location: {
        unique_id: row.unique_id,
        state: row.state,
        district: row.district,
        mandal: row.mandal,
        village: row.village,
        location: row.location,
        status: row.status,
      },

      farmer_details: {
        name: row.name,
        phone: row.phone,
        whatsapp_number: row.whatsapp_number,
        literacy: row.literacy,
        age_group: row.age_group,
        nature: row.nature,
        land_ownership: row.land_ownership,
        mortgage: row.mortgage,
      },

      land_details: {
        land_area: row.land_area,
        guntas: row.guntas,
        price_per_acre: row.price_per_acre,
        total_land_price: row.total_land_price,
        passbook_photo: row.passbook_photo
          ? baseURL + "images/" + row.passbook_photo
          : null,
        land_type: row.land_type,
        water_source: row.water_source,
        garden: row.garden,
        shed_details: row.shed_details,
        farm_pond: row.farm_pond,
        residental: row.residental,
        fencing: row.fencing,
      },

      gps_tracking: {
        road_path: row.road_path,
        latitude: row.latitude,
        longitude: row.longitude,
        land_border: row.land_border
          ? baseURL + "images/" + row.land_border
          : null,
      },

      dispute_details: {
        dispute_type: row.dispute_type,
        siblings_involve_in_dispute: row.siblings_involve_in_dispute,
        path_to_land: row.path_to_land,
      },

      document_media: {
        land_photo: (row.land_photo || []).map((p) => baseURL + "images/" + p),
        land_video: (row.land_video || []).map((v) => baseURL + "videos/" + v),
      },
    }));

    res.status(200).json({
      message: "✔ All land full details fetched",
      data: response,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch land details" });
  }
};

// --------------------------
// GENERIC UPDATE FUNCTION
// --------------------------
const updateLandDetails = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const land_id = req.params.land_id;
    const updates = buildStructuredUpdate(req.body || {});

    const checkLand = await client.query(
      `SELECT land_id FROM land_location WHERE land_id = $1`,
      [land_id]
    );

    if (checkLand.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: `${land_id} not found` });
    }

    // Attach uploaded files
    if (req.files?.passbook_photo) {
      updates.land_details.passbook_photo =
        req.files.passbook_photo[0].filename;
    }
    if (req.files?.land_border) {
      updates.gps_tracking.land_border = req.files.land_border[0].filename;
    }
    if (req.files?.land_photo) {
      updates.document_media.land_photo = req.files.land_photo.map(
        (f) => f.filename
      );
    }
    if (req.files?.land_video) {
      updates.document_media.land_video = req.files.land_video.map(
        (f) => f.filename
      );
    }

    // Table map
    const tables = {
      land_location: { table: "land_location", key: "land_id" },
      farmer_details: { table: "farmer_details", key: "land_id" },
      land_details: { table: "land_details", key: "land_id" },
      gps_tracking: { table: "gps_tracking", key: "land_id" },
      dispute_details: { table: "dispute_details", key: "land_id" },
      document_media: { table: "document_media", key: "land_id" },
    };

    // Update each table
    for (const key in updates) {
      const { table, key: idColumn } = tables[key];
      if (!table) continue;

      const fields = updates[key];
      const columns = Object.keys(fields);
      const values = Object.values(fields);

      if (!columns.length) continue;

      // Special case: document_media columns that are arrays must be cast to text[]
      let setClause;
      if (key === "document_media") {
        setClause = columns
          .map((col, i) => `${col} = $${i + 2}::text[]`)
          .join(", ");
      } else {
        setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(", ");
      }

      await client.query(
        `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = $1`,
        [land_id, ...values]
      );
    }

    await client.query(
      `UPDATE land_location 
      SET created_at = CURRENT_DATE 
      WHERE land_id = $1`,
      [land_id]
    );

    await client.query("COMMIT");

    res.status(200).json({
      message: "✔ Land updated successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to update land" });
  } finally {
    client.release();
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

// --------------------------
// UPDATE SESSION
// --------------------------
const updateSession = async (req, res) => {
  try {
    const session_id = req.params.id;

    let data = { ...req.body };

    // Single image
    if (req.files?.end_image) {
      data.end_image = req.files.end_image[0].filename;
    }

    // Multiple images → array
    if (req.files?.ticket_image) {
      data.ticket_image = req.files.ticket_image.map((f) => f.filename);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const columns = Object.keys(data);
    const values = Object.values(data);

    // Build SET clause with correct casting for arrays
    const setClause = columns
      .map((col, i) => {
        if (col === "ticket_image") {
          return `${col} = $${i + 2}::text[]`; // 👈 IMPORTANT
        }
        return `${col} = $${i + 2}`;
      })
      .join(", ");

    const query = `
      UPDATE session
      SET ${setClause}
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [session_id, ...values]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    const updated = result.rows[0];

    const total_km =
      updated.end_km && updated.starting_km
        ? Number(updated.end_km) - Number(updated.starting_km)
        : null;

    // 3️⃣ Insert directly into travel_wallet
    await pool.query(
      `INSERT INTO travel_wallet 
        (session_id, unique_id, date, total_km, amount, status)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        updated.id,
        updated.unique_id,
        updated.created_at,
        total_km,
        0,
        "pending",
      ]
    );

    // 4️⃣ Response
    res.status(200).json({
      message: "✅ Session updated & travel wallet entry created",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Failed to update session" });
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

const getSessionsByUser = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;

    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    // -----------------------------
    // 1️⃣ Fetch land records + farmer name + status
    // -----------------------------
    const landRes = await pool.query(
      `
      SELECT 
        ll.created_at,
        ll.status,
        fd.name AS farmer_name
      FROM land_location ll
      LEFT JOIN farmer_details fd ON fd.land_id = ll.land_id
      WHERE ll.unique_id = $1
      `,
      [unique_id]
    );

    // Build map by date
    const landMap = {};
    landRes.rows.forEach((row) => {
      if (row.created_at) {
        const date = row.created_at.toISOString().split("T")[0];

        landMap[date] = {
          farmer_name: row.farmer_name || null,
          status: row.status === "true", // convert to Boolean
        };
      }
    });

    // -----------------------------
    // 2️⃣ Fetch sessions
    // -----------------------------
    const sessionRes = await pool.query(
      `SELECT * FROM session WHERE unique_id = $1 ORDER BY id DESC`,
      [unique_id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({
        message: "No sessions found for this user",
      });
    }

    let finalOutput = {};

    // -----------------------------
    // 3️⃣ Build Final Response with status logic
    // -----------------------------
    sessionRes.rows.forEach((row) => {
      const sessionDate = row.created_at
        ? row.created_at.toISOString().split("T")[0]
        : null;

      const landMatch = landMap[sessionDate] || null;

      const status = landMatch && landMatch.status === true ? true : false;

      finalOutput[row.id] = {
        date: sessionDate,
        status: status,
        farmer_name: landMatch ? landMatch.farmer_name : null,

        starting_time: row.starting_time,
        starting_km: row.starting_km,
        starting_image: row.starting_image
          ? baseURL + "images/" + row.starting_image
          : null,

        end_time: row.end_time,
        end_km: row.end_km,
        end_image: row.end_image ? baseURL + "images/" + row.end_image : null,

        transport_charges: row.transport_charges,
        ticket_image: (row.ticket_image || []).map(
          (img) => baseURL + "images/" + img
        ),
      };
    });

    // -----------------------------
    // 4️⃣ Send Response
    // -----------------------------
    res.status(200).json({
      message: "✔ Sessions fetched successfully",
      data: finalOutput,
    });
  } catch (error) {
    console.error("Get Sessions Error:", error);
    res.status(500).json({ error: "Server error while fetching sessions" });
  }
};

async function getAddressFromCoords(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "speedopro-app/1.0 (your-email@example.com)",
      },
    });
    const address = response.data.display_name;
    return address || "Address not found";
  } catch (error) {
    console.error("Nominatim error:", error.message);
    return "Error retrieving address";
  }
}

const getAddress = async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required" });
  }

  const address = await getAddressFromCoords(latitude, longitude);
  res.json({ address });
};

const getAllAgents = async (req, res) => {
  try {
    const {
      search_name,
      search_phone,
      district_filter,
      mandal_filter,
      village_filter
    } = req.query;

    let query = `
      SELECT 
        a.agent_id,
        a.user_id,
        a.deposit,
        a.total_land_worth,
        a.attached_lands_count,
        a.status,
        a.created_at,
        a.updated_at,
        u.name,
        u.phone,
        u.email,
        u.role,
        u.image,
        u.photo,
        (
          SELECT STRING_AGG(DISTINCT district, ', ')
          FROM agent_preferences ap
          WHERE ap.agent_id = a.agent_id
        ) as districts,
        (
          SELECT STRING_AGG(DISTINCT mandal, ', ')
          FROM agent_preferences ap
          WHERE ap.agent_id = a.agent_id
        ) as mandals
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.unique_id
      WHERE u.role = 'agent'
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (search_name) {
      conditions.push(`u.name ILIKE $${paramCount}`);
      values.push(`%${search_name}%`);
      paramCount++;
    }

    if (search_phone) {
      conditions.push(`u.phone ILIKE $${paramCount}`);
      values.push(`%${search_phone}%`);
      paramCount++;
    }

    if (district_filter && district_filter !== 'All Districts') {
      conditions.push(`EXISTS (
        SELECT 1 FROM agent_preferences ap 
        WHERE ap.agent_id = a.agent_id 
        AND ap.district = $${paramCount}
      )`);
      values.push(district_filter);
      paramCount++;
    }

    if (mandal_filter && mandal_filter !== 'All Mandals') {
      conditions.push(`EXISTS (
        SELECT 1 FROM agent_preferences ap 
        WHERE ap.agent_id = a.agent_id 
        AND ap.mandal = $${paramCount}
      )`);
      values.push(mandal_filter);
      paramCount++;
    }

    if (village_filter && village_filter !== 'All Villages') {
      conditions.push(`EXISTS (
        SELECT 1 FROM agent_preferences ap 
        WHERE ap.agent_id = a.agent_id 
        AND ap.village = $${paramCount}
      )`);
      values.push(village_filter);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await pool.query(query, values);

    res.status(200).json({
      message: "Agents fetched successfully",
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
};

const getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Get agent details
    const agentQuery = `
      SELECT 
        a.*,
        u.name,
        u.phone,
        u.email,
        u.role,
        u.image,
        u.photo
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.unique_id
      WHERE a.agent_id = $1
    `;

    const agentResult = await pool.query(agentQuery, [agentId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Get preferences
    const prefQuery = `
      SELECT * FROM agent_preferences 
      WHERE agent_id = $1
      ORDER BY district, mandal, village
    `;

    const prefResult = await pool.query(prefQuery, [agentId]);

    // Get attached lands count and total worth
    const landStatsQuery = `
      SELECT 
        COUNT(*) as attached_lands_count,
        COALESCE(SUM(ld.total_land_price), 0) as total_land_worth
      FROM agent_land_attachments ala
      LEFT JOIN land_details ld ON ala.land_id = ld.land_id
      WHERE ala.agent_id = $1
    `;

    const landStatsResult = await pool.query(landStatsQuery, [agentId]);

    res.status(200).json({
      message: "Agent details fetched successfully",
      data: {
        ...agentResult.rows[0],
        preferences: prefResult.rows,
        attached_lands_count: landStatsResult.rows[0]?.attached_lands_count || 0,
        total_land_worth: landStatsResult.rows[0]?.total_land_worth || 0
      },
      user: {
        name: agentResult.rows[0].name,
        phone: agentResult.rows[0].phone,
        email: agentResult.rows[0].email,
        role: agentResult.rows[0].role
      }
    });
  } catch (error) {
    console.error("Error fetching agent details:", error);
    res.status(500).json({ error: "Failed to fetch agent details" });
  }
};

const createAgent = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      user_id,
      deposit,
      preferred_districts,
      preferred_mandals,
      preferred_villages,
      attach_lands
    } = req.body;

    // Check if user exists and is an agent
    const userCheck = await client.query(
      'SELECT unique_id, name, phone, email FROM users WHERE unique_id = $1 AND role = $2',
      [user_id, 'agent']
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "User not found or not an agent" });
    }

    // Generate agent ID
    const agentId = `AGENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate total land worth for attached lands
    let totalLandWorth = 0;
    if (attach_lands && attach_lands.length > 0) {
      const landWorthQuery = `
        SELECT SUM(total_land_price) as total 
        FROM land_details 
        WHERE land_id = ANY($1)
      `;
      const worthResult = await client.query(landWorthQuery, [attach_lands]);
      totalLandWorth = parseFloat(worthResult.rows[0]?.total) || 0;
    }

    // Create agent record
    const agentQuery = `
      INSERT INTO agents (
        agent_id,
        user_id,
        deposit,
        total_land_worth,
        attached_lands_count,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const agentResult = await client.query(agentQuery, [
      agentId,
      user_id,
      parseFloat(deposit) || 0,
      totalLandWorth,
      attach_lands?.length || 0,
      'active'
    ]);

    // Insert preferences
    if (preferred_districts && preferred_districts.length > 0) {
      for (const district of preferred_districts) {
        const mandalsForDistrict = preferred_mandals[district] || [];
        for (const mandal of mandalsForDistrict) {
          const villagesForMandal = preferred_villages[mandal] || [];
          for (const village of villagesForMandal) {
            await client.query(
              `INSERT INTO agent_preferences (agent_id, district, mandal, village)
               VALUES ($1, $2, $3, $4)`,
              [agentId, district, mandal, village]
            );
          }
          if (villagesForMandal.length === 0) {
            await client.query(
              `INSERT INTO agent_preferences (agent_id, district, mandal)
               VALUES ($1, $2, $3)`,
              [agentId, district, mandal]
            );
          }
        }
        if (mandalsForDistrict.length === 0) {
          await client.query(
            `INSERT INTO agent_preferences (agent_id, district)
             VALUES ($1, $2)`,
            [agentId, district]
          );
        }
      }
    }

    // Attach lands
    if (attach_lands && attach_lands.length > 0) {
      for (const landId of attach_lands) {
        await client.query(
          `INSERT INTO agent_land_attachments (agent_id, land_id)
           VALUES ($1, $2)
           ON CONFLICT (agent_id, land_id) DO NOTHING`,
          [agentId, landId]
        );
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      message: "Agent created successfully",
      data: agentResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error creating agent:", error);
    res.status(500).json({ error: "Failed to create agent" });
  } finally {
    client.release();
  }
};

const updateAgent = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { agentId } = req.params;
    const {
      deposit,
      preferred_districts,
      preferred_mandals,
      preferred_villages,
      attach_lands
    } = req.body;

    // Check if agent exists
    const agentCheck = await client.query(
      'SELECT agent_id FROM agents WHERE agent_id = $1',
      [agentId]
    );

    if (agentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Agent not found" });
    }

    // Calculate total land worth for attached lands
    let totalLandWorth = 0;
    if (attach_lands && attach_lands.length > 0) {
      const landWorthQuery = `
        SELECT SUM(total_land_price) as total 
        FROM land_details 
        WHERE land_id = ANY($1)
      `;
      const worthResult = await client.query(landWorthQuery, [attach_lands]);
      totalLandWorth = parseFloat(worthResult.rows[0]?.total) || 0;
    }

    // Update agent record
    const agentQuery = `
      UPDATE agents 
      SET 
        deposit = $1,
        total_land_worth = $2,
        attached_lands_count = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE agent_id = $4
      RETURNING *
    `;

    const agentResult = await client.query(agentQuery, [
      parseFloat(deposit) || 0,
      totalLandWorth,
      attach_lands?.length || 0,
      agentId
    ]);

    // Clear existing preferences
    await client.query(
      'DELETE FROM agent_preferences WHERE agent_id = $1',
      [agentId]
    );

    // Insert new preferences
    if (preferred_districts && preferred_districts.length > 0) {
      for (const district of preferred_districts) {
        const mandalsForDistrict = preferred_mandals[district] || [];
        for (const mandal of mandalsForDistrict) {
          const villagesForMandal = preferred_villages[mandal] || [];
          for (const village of villagesForMandal) {
            await client.query(
              `INSERT INTO agent_preferences (agent_id, district, mandal, village)
               VALUES ($1, $2, $3, $4)`,
              [agentId, district, mandal, village]
            );
          }
          if (villagesForMandal.length === 0) {
            await client.query(
              `INSERT INTO agent_preferences (agent_id, district, mandal)
               VALUES ($1, $2, $3)`,
              [agentId, district, mandal]
            );
          }
        }
        if (mandalsForDistrict.length === 0) {
          await client.query(
            `INSERT INTO agent_preferences (agent_id, district)
             VALUES ($1, $2)`,
            [agentId, district]
          );
        }
      }
    }

    // Clear existing land attachments
    await client.query(
      'DELETE FROM agent_land_attachments WHERE agent_id = $1',
      [agentId]
    );

    // Attach new lands
    if (attach_lands && attach_lands.length > 0) {
      for (const landId of attach_lands) {
        await client.query(
          `INSERT INTO agent_land_attachments (agent_id, land_id)
           VALUES ($1, $2)`,
          [agentId, landId]
        );
      }
    }

    await client.query('COMMIT');
    
    res.status(200).json({
      message: "Agent updated successfully",
      data: agentResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating agent:", error);
    res.status(500).json({ error: "Failed to update agent" });
  } finally {
    client.release();
  }
};

const deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Soft delete - update status to inactive
    const result = await pool.query(
      `UPDATE agents SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
       WHERE agent_id = $1 RETURNING *`,
      [agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.status(200).json({
      message: "Agent deactivated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error deleting agent:", error);
    res.status(500).json({ error: "Failed to deactivate agent" });
  }
};

const getAvailableLands = async (req, res) => {
  try {
    const { districts, mandals, villages } = req.query;

    let query = `
      SELECT 
        ll.land_id,
        ll.state,
        ll.district,
        ll.mandal,
        ll.village,
        ll.location,
        ll.status,
        fd.name as farmer_name,
        fd.phone as farmer_phone,
        ld.land_area,
        ld.guntas,
        ld.price_per_acre,
        ld.total_land_price,
        ld.land_type,
        ld.water_source
      FROM land_location ll
      LEFT JOIN farmer_details fd ON ll.land_id = fd.land_id
      LEFT JOIN land_details ld ON ll.land_id = ld.land_id
      WHERE ll.status = 'true'
        AND ll.land_id NOT IN (
          SELECT land_id FROM agent_land_attachments
        )
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (districts) {
      const districtArray = districts.split(',');
      conditions.push(`ll.district = ANY($${paramCount})`);
      values.push(districtArray);
      paramCount++;
    }

    if (mandals) {
      const mandalArray = mandals.split(',');
      conditions.push(`ll.mandal = ANY($${paramCount})`);
      values.push(mandalArray);
      paramCount++;
    }

    if (villages) {
      const villageArray = villages.split(',');
      conditions.push(`ll.village = ANY($${paramCount})`);
      values.push(villageArray);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ll.district, ll.mandal, ll.village`;

    const result = await pool.query(query, values);

    // Format the response
    const formattedLands = result.rows.map(land => ({
      land_id: land.land_id,
      display: `${land.village}, ${land.mandal}, ${land.district} - ¥${land.total_land_price}`,
      land_location: {
        state: land.state,
        district: land.district,
        mandal: land.mandal,
        village: land.village,
        location: land.location,
        status: land.status
      },
      farmer_details: {
        name: land.farmer_name,
        phone: land.farmer_phone
      },
      land_details: {
        land_area: land.land_area,
        guntas: land.guntas,
        price_per_acre: land.price_per_acre,
        total_land_price: land.total_land_price,
        land_type: land.land_type,
        water_source: land.water_source
      }
    }));

    res.status(200).json({
      message: "Available lands fetched successfully",
      count: formattedLands.length,
      data: formattedLands
    });
  } catch (error) {
    console.error("Error fetching available lands:", error);
    res.status(500).json({ error: "Failed to fetch available lands" });
  }
};

const getAgentLands = async (req, res) => {
  try {
    const { agentId } = req.params;

    const query = `
      SELECT 
        ll.land_id,
        ll.district,
        ll.mandal,
        ll.village,
        ll.location,
        fd.name as farmer_name,
        fd.phone as farmer_phone,
        ld.total_land_price,
        ld.land_area,
        ala.attached_date
      FROM agent_land_attachments ala
      LEFT JOIN land_location ll ON ala.land_id = ll.land_id
      LEFT JOIN farmer_details fd ON ala.land_id = fd.land_id
      LEFT JOIN land_details ld ON ala.land_id = ld.land_id
      WHERE ala.agent_id = $1
      ORDER BY ala.attached_date DESC
    `;

    const result = await pool.query(query, [agentId]);

    res.status(200).json({
      message: "Agent lands fetched successfully",
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching agent lands:", error);
    res.status(500).json({ error: "Failed to fetch agent lands" });
  }
};

module.exports = {
  createTables,
  createFullLandEntry,
  getAllLandFullDetails,
  updateLandDetails,
  createSession,
  updateSession,
  updateUserDetails,
  getUserProfile,
  getAddress,
  getSessionsByUser,
  getAllLandFullDraftDetails,
  getAllAgents,
  getAvailableLands,
  deleteAgent,
  updateAgent,
  createAgent,
  getAgentById,
  getAgentLands
};