const pool = require("../db/db");
const axios = require("axios");

function buildStructuredUpdate(body) {
  return {
    land_location: {
      state: body.state,
      district: body.district,
      mandal: body.mandal,
      village: body.village,
      location: body.location,
      status: "true",
      verification: body.verification
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

const getLandData = async (req, res) => {
  try {
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    // Extract filters
    const {
      district,
      state,
      price_per_acres,
      total_land_price,
      land_area,
      land_id,
    } = req.query;

    // Dynamic conditions
    let conditions = [`l.status = $1`];
    let values = ["true"];
    let index = 2;

    // 🆕 Filter by land_id (exact match)
    if (land_id) {
      conditions.push(`l.land_id = $${index++}`);
      values.push(land_id);
    }

    // Text filters (LIKE)
    if (district) {
      conditions.push(`l.district ILIKE $${index++}`);
      values.push(`%${district}%`);
    }
    if (state) {
      conditions.push(`l.state ILIKE $${index++}`);
      values.push(`%${state}%`);
    }

    // Numeric filters (<=)
    if (price_per_acres) {
      conditions.push(`ld.price_per_acre <= $${index++}`);
      values.push(price_per_acres);
    }
    if (total_land_price) {
      conditions.push(`ld.total_land_price <= $${index++}`);
      values.push(total_land_price);
    }
    if (land_area) {
      conditions.push(`ld.land_area <= $${index++}`);
      values.push(land_area);
    }

    // Build final SQL
    const query = `
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
      WHERE ${conditions.join(" AND ")}
      ORDER BY l.created_at DESC;
    `;

    const result = await pool.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ message: "No land records found" });
    }

    // Build response format
    const response = result.rows.map((row) => ({
      land_id: row.land_id,

      land_location: {
        unique_id: row.unique_id,
        state: row.state,
        district: row.district,
        mandal: row.mandal,
        village: row.village,
        location: row.location,
        verification: row.verification,
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

    return res.status(200).json({
      message: "✔ Land details fetched",
      filters_used: req.query,
      count: response.length,
      data: response,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch land details" });
  }
};

const getAllLandFullDetails = async (req, res) => {
  try {
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    // Extract filters
    const {
      district,
      state,
      price_per_acres,
      total_land_price,
      land_area,
    } = req.query;

    // Dynamic conditions
    let conditions = [`l.status = $1`];
    let values = ["true"];
    let index = 2;

    // Text filters (LIKE search)
    if (district) {
      conditions.push(`l.district ILIKE $${index++}`);
      values.push(`%${district}%`);
    }
    if (state) {
      conditions.push(`l.state ILIKE $${index++}`);
      values.push(`%${state}%`);
    }

    // Numeric filters (<= search)
    if (price_per_acres) {
      conditions.push(`ld.price_per_acre <= $${index++}`);
      values.push(price_per_acres);
    }
    if (total_land_price) {
      conditions.push(`ld.total_land_price <= $${index++}`);
      values.push(total_land_price);
    }
    if (land_area) {
      conditions.push(`ld.land_area <= $${index++}`);
      values.push(land_area);
    }

    // Build final SQL query
    const query = `
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
      WHERE ${conditions.join(" AND ")}
      ORDER BY l.created_at DESC;
    `;

    const result = await pool.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ message: "No land records found" });
    }

    // Build response format
    const response = result.rows.map((row) => ({
      land_id: row.land_id,

      land_location: {
        unique_id: row.unique_id,
        state: row.state,
        district: row.district,
        mandal: row.mandal,
        village: row.village,
        location: row.location,
        verification: row.verification,
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

    return res.status(200).json({
      message: "✔ Land details fetched",
      filters_used: req.query,
      count: response.length,
      data: response,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch land details" });
  }
};

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
    const [address, aadhar, salary, bank, work, vehicle] = await Promise.all([
      pool.query(`SELECT * FROM address`),
      pool.query(`SELECT * FROM aadhar_card`),
      pool.query(`SELECT * FROM salary_package`),
      pool.query(`SELECT * FROM bank_account`),
      pool.query(`SELECT * FROM work_location`),
      pool.query(`SELECT * FROM vehicle_information`),
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
    });
  } catch (err) {
    console.error("Get User Profile Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const updateUserDetails = async (req, res) => {
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

const getTravelWallet = async (req, res) => {
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

const getLandWallet = async (req, res) => {
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

const getLandMonthWallet = async (req, res) => {
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

const getSessionsByUser = async (req, res) => {
  try {
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;
    const session_id= req.params.session_id;

    const sessionRes = await pool.query(
      `SELECT * FROM session WHERE id = $1 ORDER BY id DESC`,
      [session_id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({
        message: "No sessions found for this user",
      });
    }
    const row= sessionRes.rows[0];
    let finalOutput = {
        session_id: row.id,
        date: row.created_at,
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

const generateLandCodes = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { state_id, district_id, town_id, prefix, count } = req.body;
        
        // Validate input
        if (!state_id || !district_id || !town_id || !prefix || !count) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Missing required fields: state_id, district_id, town_id, prefix, count' 
            });
        }
        
        if (count > 1000) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Cannot generate more than 1000 codes at once' 
            });
        }
        
        // Check if town exists
        const townCheck = await client.query(
            'SELECT t.name as town_name, d.name as district_name, s.name as state_name ' +
            'FROM towns t ' +
            'JOIN districts d ON t.district_id = d.id ' +
            'JOIN states s ON d.state_id = s.id ' +
            'WHERE t.id = $1',
            [town_id]
        );
        
        if (townCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Town not found' });
        }
        
        const { town_name, district_name, state_name } = townCheck.rows[0];
        
        // Generate land codes
        const generatedCodes = [];
        const existingCodesQuery = await client.query(
            'SELECT land_code FROM land_code WHERE town_id = $1',
            [town_id]
        );
        
        const existingCodes = new Set(existingCodesQuery.rows.map(row => row.land_code));
        
        for (let i = 1; i <= count; i++) {
            let codeNumber = i;
            let landCode = `${prefix}@${codeNumber.toString().padStart(2, '0')}`;
            
            // Ensure unique code
            while (existingCodes.has(landCode)) {
                codeNumber++;
                landCode = `${prefix}@${codeNumber.toString().padStart(2, '0')}`;
            }
            
            // Insert land code
            const result = await client.query(
                `INSERT INTO land_code 
                (land_code, state_id, district_id, town_id, status) 
                VALUES ($1, $2, $3, $4, 'Available') 
                RETURNING land_code, id`,
                [landCode, state_id, district_id, town_id]
            );
            
            generatedCodes.push({
                id: result.rows[0].id,
                land_code: result.rows[0].land_code,
                status: 'Available'
            });
            
            existingCodes.add(landCode);
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({
            message: `${generatedCodes.length} land codes generated successfully`,
            town: town_name,
            district: district_name,
            state: state_name,
            data: generatedCodes
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error generating land codes:', error);
        res.status(500).json({ error: 'Failed to generate land codes' });
    } finally {
        client.release();
    }
};

const getLandCodesByLocation = async (req, res) => {
    try {
        const { state_id, district_id, town_id, status } = req.query;
        
        // FIXED: Removed LEFT JOIN villages since we're not using village_id anymore
        let query = `
            SELECT 
                lc.*,
                s.name as state_name,
                d.name as district_name,
                t.name as town_name
                -- village_name is already in lc.*
            FROM land_code lc
            LEFT JOIN states s ON lc.state_id = s.id
            LEFT JOIN districts d ON lc.district_id = d.id
            LEFT JOIN towns t ON lc.town_id = t.id
            WHERE 1=1
        `;
        
        const values = [];
        let paramCount = 1;
        
        if (state_id) {
            query += ` AND lc.state_id = $${paramCount}`;
            values.push(state_id);
            paramCount++;
        }
        
        if (district_id) {
            query += ` AND lc.district_id = $${paramCount}`;
            values.push(district_id);
            paramCount++;
        }
        
        if (town_id) {
            query += ` AND lc.town_id = $${paramCount}`;
            values.push(town_id);
            paramCount++;
        }
        
        if (status) {
            query += ` AND lc.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }
        
        query += ` ORDER BY lc.land_code`;
        
        const result = await pool.query(query, values);
        
        res.json({
            message: 'Land codes fetched successfully',
            count: result.rows.length,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching land codes:', error);
        res.status(500).json({ error: 'Failed to fetch land codes' });
    }
};

const getLandCodeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                lc.*,
                s.name as state_name,
                d.name as district_name,
                t.name as town_name
                -- Removed: LEFT JOIN villages v ON lc.village_id = v.id
            FROM land_code lc
            LEFT JOIN states s ON lc.state_id = s.id
            LEFT JOIN districts d ON lc.district_id = d.id
            LEFT JOIN towns t ON lc.town_id = t.id
            WHERE lc.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Land code not found' });
        }
        
        res.json({
            message: 'Land code fetched successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching land code:', error);
        res.status(500).json({ error: 'Failed to fetch land code' });
    }
};

const updateLandCode = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { farmer_name, farmer_phone, village_name, status } = req.body;
        
        // Check if land code exists and is available
        const landCodeCheck = await client.query(
            'SELECT * FROM land_code WHERE id = $1',
            [id]
        );
        
        if (landCodeCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Land code not found' });
        }
        
        const landCode = landCodeCheck.rows[0];
        
        if (landCode.status !== 'Available' && status === 'Assigned') {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: `Land code is already ${landCode.status}` 
            });
        }
        
        // Update land code
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        
        if (farmer_name !== undefined) {
            updateFields.push(`farmer_name = $${paramCount}`);
            updateValues.push(farmer_name);
            paramCount++;
        }
        
        if (farmer_phone !== undefined) {
            updateFields.push(`farmer_phone = $${paramCount}`);
            updateValues.push(farmer_phone);
            paramCount++;
        }
        
        if (status !== undefined) {
            updateFields.push(`status = $${paramCount}`);
            updateValues.push(status);
            paramCount++;
            
            if (status === 'Assigned') {
                updateFields.push(`allotted_date = CURRENT_TIMESTAMP`);
            }
        }

        if (village_name !== undefined){
          updateFields.push(`village_name= $${paramCount}`);
          updateValues.push(village_name);
          paramCount++;
        }
        
        if (updateFields.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE land_code 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;
        
        const result = await client.query(updateQuery, updateValues);
        
        await client.query('COMMIT');
        
        res.json({
            message: 'Land code updated successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating land code:', error);
        res.status(500).json({ error: 'Failed to update land code' });
    } finally {
        client.release();
    }
};

const deleteLandCode = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM land_code WHERE id = $1 RETURNING land_code',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Land code not found' });
        }
        
        res.json({
            message: 'Land code deleted successfully',
            land_code: result.rows[0].land_code
        });
        
    } catch (error) {
        console.error('Error deleting land code:', error);
        res.status(500).json({ error: 'Failed to delete land code' });
    }
};

const getLandCodeStats = async (req, res) => {
    try {
        const { state_id, district_id, town_id } = req.query;
        
        let whereClause = '';
        const values = [];
        let paramCount = 1;
        
        if (state_id) {
            whereClause += ` WHERE state_id = $${paramCount}`;
            values.push(state_id);
            paramCount++;
        }
        
        if (district_id) {
            whereClause += whereClause ? ` AND district_id = $${paramCount}` : ` WHERE district_id = $${paramCount}`;
            values.push(district_id);
            paramCount++;
        }
        
        if (town_id) {
            whereClause += whereClause ? ` AND town_id = $${paramCount}` : ` WHERE town_id = $${paramCount}`;
            values.push(town_id);
            paramCount++;
        }
        
        const statsQuery = `
            SELECT 
                status,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM land_code
            ${whereClause}
            GROUP BY status
            ORDER BY status
        `;
        
        const result = await pool.query(statsQuery, values);
        
        const totalQuery = `SELECT COUNT(*) as total FROM land_code ${whereClause}`;
        const totalResult = await pool.query(totalQuery, values);
        
        res.json({
            message: 'Land code statistics fetched successfully',
            total: parseInt(totalResult.rows[0].total),
            stats: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching land code stats:', error);
        res.status(500).json({ error: 'Failed to fetch land code statistics' });
    }
};

const bulkUpdateLandCodes = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { updates } = req.body; // Array of {id, farmer_name, farmer_phone, village_id, status}
        
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No updates provided' });
        }
        
        const updatedCodes = [];
        const errors = [];
        
        for (const update of updates) {
            try {
                const { id, farmer_name, farmer_phone, village_id, status } = update;
                
                // Check if land code exists
                const checkResult = await client.query(
                    'SELECT land_code, status FROM land_code WHERE id = $1',
                    [id]
                );
                
                if (checkResult.rows.length === 0) {
                    errors.push({ id, error: 'Land code not found' });
                    continue;
                }
                
                const currentStatus = checkResult.rows[0].status;
                
                if (currentStatus !== 'Available' && status === 'Assigned') {
                    errors.push({ 
                        id, 
                        error: `Land code is already ${currentStatus}` 
                    });
                    continue;
                }
                
                // Build update query
                const updateFields = [];
                const updateValues = [];
                let paramCount = 1;
                
                if (farmer_name !== undefined) {
                    updateFields.push(`farmer_name = $${paramCount}`);
                    updateValues.push(farmer_name);
                    paramCount++;
                }
                
                if (farmer_phone !== undefined) {
                    updateFields.push(`farmer_phone = $${paramCount}`);
                    updateValues.push(farmer_phone);
                    paramCount++;
                }
                
                if (village_id !== undefined) {
                    updateFields.push(`village_id = $${paramCount}`);
                    updateValues.push(village_id);
                    paramCount++;
                }
                
                if (status !== undefined) {
                    updateFields.push(`status = $${paramCount}`);
                    updateValues.push(status);
                    paramCount++;
                    
                    if (status === 'Assigned') {
                        updateFields.push(`allotted_date = CURRENT_TIMESTAMP`);
                    }
                }
                
                updateValues.push(id);
                
                const updateQuery = `
                    UPDATE land_code 
                    SET ${updateFields.join(', ')}
                    WHERE id = $${paramCount}
                    RETURNING land_code, farmer_name, status
                `;
                
                const result = await client.query(updateQuery, updateValues);
                updatedCodes.push(result.rows[0]);
                
            } catch (error) {
                errors.push({ id: update.id, error: error.message });
            }
        }
        
        await client.query('COMMIT');
        
        res.json({
            message: 'Bulk update completed',
            updated: updatedCodes.length,
            data: updatedCodes,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in bulk update:', error);
        res.status(500).json({ error: 'Failed to perform bulk update' });
    } finally {
        client.release();
    }
};

module.exports = {
  updateLandDetails,
  updateUserDetails,
  getAllLandFullDetails,
  getUserProfile,
  updateLandWallet,
  updateLandMonthWallet,
  updateTravelWallet,
  getLandMonthWallet,
  getLandWallet,
  getTravelWallet,
  getSessionsByUser,
  bulkUpdateLandCodes,
  getLandCodeById,
  getLandCodeStats,
  deleteLandCode,
  updateLandCode,
  getLandCodesByLocation,
  generateLandCodes,
  getLandData
};