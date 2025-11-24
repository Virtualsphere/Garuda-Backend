const pool = require("../db/db");
const axios= require("axios")

// --------------------------
// CREATE ALL TABLES
// --------------------------
const createTables = async (req, res) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS land_location (
        id SERIAL PRIMARY KEY,
        unique_id VARCHAR(50) NOT NULL,
        state VARCHAR(50),
        district VARCHAR(50),
        mandal VARCHAR(50),
        village VARCHAR(200),
        location VARCHAR(200)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS farmer_details (
        id SERIAL PRIMARY KEY,
        land_id INT NOT NULL,
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
        land_id INT NOT NULL,
        land_area VARCHAR(50),
        guntas VARCHAR(50),
        price_per_acre DOUBLE PRECISION,
        total_land_price DOUBLE PRECISION,
        passbook_photo VARCHAR(100),
        land_type VARCHAR(10),
        water_source VARCHAR(10),
        garden VARCHAR(10),
        shed_details VARCHAR(10),
        farm_pond VARCHAR(10),
        residental VARCHAR(20),
        fencing VARCHAR(10)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_tracking (
        id SERIAL PRIMARY KEY,
        land_id INT NOT NULL,
        road_path VARCHAR(100),
        latitude VARCHAR(255),
        longitude VARCHAR(255),
        land_border VARCHAR(100)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dispute_details (
        id SERIAL PRIMARY KEY,
        land_id INT NOT NULL,
        dispute_type VARCHAR(50),
        siblings_involve_in_dispute VARCHAR(10),
        path_to_land VARCHAR(100)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_media (
        id SERIAL PRIMARY KEY,
        land_id INT NOT NULL,
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
        ticket_image TEXT[]
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
      location: body.location
    },
    farmer_details: {
      name: body.name,
      phone: body.phone,
      whatsapp_number: body.whatsapp_number,
      literacy: body.literacy,
      age_group: body.age_group,
      nature: body.nature,
      land_ownership: body.land_ownership,
      mortgage: body.mortgage
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
      land_border: null
    },
    dispute_details: {
      dispute_type: body.dispute_type,
      siblings_involve_in_dispute: body.siblings_involve_in_dispute,
      path_to_land: body.path_to_land
    },
    document_media: {
      land_photo: [],
      land_video: []
    }
  };
}

const parsePgArray = (str) => {
  if (!str) return [];
  return str.replace("{", "").replace("}", "").split(",");
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
      path_to_land
    } = req.body;

    const unique_id= req.user.unique_id;

    // File Handling
    const passbookPhoto = req.files?.passbook_photo?.[0]?.filename || null;
    const landBorder = req.files?.land_border?.[0]?.filename || null;

    const landPhoto = req.files?.land_photo?.map(f => f.filename) || [];
    const landVideo = req.files?.land_video?.map(f => f.filename) || [];

    // ------------------------------
    // 1️⃣ Insert land_location
    // ------------------------------
    const landRes = await client.query(
      `INSERT INTO land_location 
       (unique_id, state, district, mandal, village, location)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [unique_id, state, district, mandal, village, location]
    );

    const land_id = landRes.rows[0].id;

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
        mortgage
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
        fencing
      ]
    );

    // ------------------------------
    // 4️⃣ Insert gps_tracking
    // ------------------------------
    await client.query(
      `INSERT INTO gps_tracking 
       (land_id, road_path, latitude, longitude, land_border)
       VALUES ($1,$2,$3,$4);`,
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

    const unique_id= req.user.unique_id;

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
        ticket_image
      ]
    );

    res.status(201).json({
      message: "✅ Session created successfully",
      data: result.rows[0]
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
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(`
      SELECT 
        l.*,
        f.*,
        ld.*,
        gps.*,
        d.*,
        dm.*
      FROM land_location l
      LEFT JOIN farmer_details f ON l.id = f.land_id
      LEFT JOIN land_details ld ON l.id = ld.land_id
      LEFT JOIN gps_tracking gps ON l.id = gps.land_id
      LEFT JOIN dispute_details d ON l.id = d.land_id
      LEFT JOIN document_media dm ON l.id = dm.land_id
      ORDER BY l.id ASC;
    `);

    if (!result.rows.length)
      return res.status(404).json({ message: "No land records found" });

    const response = result.rows.map(row => ({
      land_id: row.id,

      land_location: {
        id: row.id,
        unique_id: row.unique_id,
        state: row.state,
        district: row.district,
        mandal: row.mandal,
        village: row.village,
        location: row.location
      },

      farmer_details: {
        name: row.name,
        phone: row.phone,
        whatsapp_number: row.whatsapp_number,
        literacy: row.literacy,
        age_group: row.age_group,
        nature: row.nature,
        land_ownership: row.land_ownership,
        mortgage: row.mortgage
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
        fencing: row.fencing
      },

      gps_tracking: {
        road_path: row.road_path,
        latitude: row.latitude,
        longitude: row.longitude,
        land_border: row.land_border
          ? baseURL + "images/" + row.land_border
          : null
      },

      dispute_details: {
        dispute_type: row.dispute_type,
        siblings_involve_in_dispute: row.siblings_involve_in_dispute,
        path_to_land: row.path_to_land
      },

      document_media: {
        land_photo: (row.land_photo || []).map(
          p => baseURL + "images/" + p
        ),
        land_video: (row.land_video || []).map(
          v => baseURL + "videos/" + v
        )
      }
    }));

    res.status(200).json({
      message: "✔ All land full details fetched",
      data: response
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
    const updates = buildStructuredUpdate(req.body || {}); // frontend sends JSON string

    // Attach uploaded files
    if (req.files?.passbook_photo) {
      updates.land_details.passbook_photo = req.files.passbook_photo[0].filename;
    }
    if (req.files?.land_border) {
      updates.gps_tracking.land_border = req.files.land_border[0].filename;
    }
    if (req.files?.land_photo) {
      updates.document_media.land_photo = req.files.land_photo.map(f => f.filename);
    }
    if (req.files?.land_video) {
      updates.document_media.land_video = req.files.land_video.map(f => f.filename);
    }

    // Table map
    const tables = {
      land_location: { table: "land_location", key: "id" },
      farmer_details: { table: "farmer_details", key: "land_id" },
      land_details: { table: "land_details", key: "land_id" },
      gps_tracking: { table: "gps_tracking", key: "land_id" },
      dispute_details: { table: "dispute_details", key: "land_id" },
      document_media: { table: "document_media", key: "land_id" }
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

    await client.query("COMMIT");

    res.status(200).json({
      message: "✔ Land updated successfully"
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to update land" });
  } finally {
    client.release();
  }
};

const getUserDetails = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;

    const baseURL = `${req.protocol}://${req.get("host")}/public/images/`;

    const result = await pool.query(
      `SELECT name, email, phone, image 
       FROM users 
       WHERE unique_id = $1`,
      [uniqueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // Build full image URL
    const imageUrl = user.image ? baseURL + user.image : null;

    res.status(200).json({
      message: "User details fetched successfully",
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: imageUrl,
      },
    });
  } catch (error) {
    console.error("Get User Error:", error);
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
      data.ticket_image = req.files.ticket_image.map(f => f.filename);
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

    res.status(200).json({
      message: "✅ Session updated successfully",
      data: result.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Failed to update session" });
  }
};

const updateUserDetails = async (req, res) => {
  try {
    const userId = req.user.unique_id;
    const { name, email, phone } = req.body;

    const image = req.files?.image?.[0]?.filename || null;

    // Fetch all user rows with same unique_id
    const userRows = await pool.query(
      `SELECT name, email, phone, image FROM users WHERE unique_id = $1`,
      [userId]
    );

    if (userRows.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check duplicate email/phone only within this user's multiple accounts
    const sameUserRows = userRows.rows;

    const emailExists =
      email &&
      sameUserRows.some((row) => row.email === email);

    const phoneExists =
      phone &&
      sameUserRows.some((row) => row.phone === phone);

    if (emailExists || phoneExists) {
      return res.status(400).json({
        error: "Email or phone already exists in your account group",
      });
    }

    // Use old values if not provided
    const oldData = sameUserRows[0];

    const updatedName = name ?? oldData.name;
    const updatedEmail = email ?? oldData.email;
    const updatedPhone = phone ?? oldData.phone;
    const updatedImage = image ?? oldData.image;

    // Update all rows with same unique_id
    const updatedUser = await pool.query(
      `UPDATE users
       SET name = $1, email = $2, phone = $3,
           image = $4
       WHERE unique_id = $5
       RETURNING name, email, phone, image`,
      [updatedName, updatedEmail, updatedPhone, updatedImage, userId]
    );

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser.rows[0],
    });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

async function getAddressFromCoords(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'speedopro-app/1.0 (your-email@example.com)'
      }
    });
    const address = response.data.display_name;
    return address || "Address not found";
  } catch (error) {
    console.error("Nominatim error:", error.message);
    return "Error retrieving address";
  }
}

const getAddress= async(req, res)=>{
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  const address = await getAddressFromCoords(latitude, longitude);
  res.json({ address });
}

module.exports = {
  createTables,
  createFullLandEntry,
  getAllLandFullDetails,
  updateLandDetails,
  createSession,
  updateSession,
  updateUserDetails,
  getUserDetails,
  getAddress
};