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

module.exports = {
  updateLandDetails,
};