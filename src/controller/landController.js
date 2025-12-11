const pool = require("../db/db");

function buildStructuredUpdate(body) {
  return {
    land_location: {
      state: body.state,
      district: body.district,
      mandal: body.mandal,
      village: body.village,
      location: body.location,
      status: body.status,
      verification: body.verification,
      remarks: body.remarks,
      unique_id: body.unique_id
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

const getAllUniverfiedLandFullDetails = async (req, res) => {
  try {
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
      WHERE l.verification = $1
      AND l.status = $2
      ORDER BY l.created_at DESC, l.land_id DESC;
  `,
      ["pending" ,"true"]
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
        verification: row.verification
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

const getAllRejectedLandFullDetails = async (req, res) => {
  try {
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
      WHERE l.verification = $1
      AND l.status = $2
      ORDER BY l.created_at DESC, l.land_id DESC;
  `,
      ["rejected" ,"true"]
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
        verification: row.verification,
        remarks: row.remarks
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
      updates.land_details.passbook_photo = req.files.passbook_photo[0].filename;
    }
    if (req.files?.land_border) {
      updates.gps_tracking.land_border = req.files.land_border[0].filename;
    }
    if (req.files?.land_photo) {
      updates.document_media.land_photo = req.files.land_photo.map((f) => f.filename);
    }
    if (req.files?.land_video) {
      updates.document_media.land_video = req.files.land_video.map((f) => f.filename);
    }

    // Table mapping
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

    // NEW: store verification admin & date + create wallet entry IF NOT EXISTS
    if (updates.land_location.verification === "verified") {
        const uniqueId = req.user.unique_id;

        // Update land_location with verifier info
        await client.query(
            `UPDATE land_location
            SET verification_unique_id = $1,
                verification_date = NOW()
            WHERE land_id = $2`,
            [uniqueId, land_id]
        );

        // Check if a wallet record already exists
        const existingWallet = await client.query(
            `SELECT id FROM physical_verification_wallet 
            WHERE land_id = $1 AND varification = 'verified'`,
            [land_id]
        );

        if (existingWallet.rowCount === 0) {
            // Insert only if no previous verified entry
            await client.query(
            `INSERT INTO physical_verification_wallet
            (land_id, unique_id, varification, date, physical_verification_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                land_id,
                uniqueId,
                "verified",
                new Date(),
                0,
                "pending"
            ]
            );
        }
    }

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
      WHERE l.status = $1
      ORDER BY l.created_at DESC
    `,
      ["false"]
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

module.exports= {
    getAllUniverfiedLandFullDetails,
    getAllRejectedLandFullDetails,
    updateLandDetails,
    getAllLandFullDraftDetails,
    createFullLandEntry
}