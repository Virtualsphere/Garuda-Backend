const pool = require("../db/db");
const axios = require("axios");

function buildStructuredUpdate(body = {}) {
  const updates = {};

  const addField = (table, field, value) => {
    if (value !== undefined && value !== null && value !== "") {
      if (!updates[table]) updates[table] = {};
      updates[table][field] = value;
    }
  };

  // land_location
  addField("land_location", "state", body.state);
  addField("land_location", "district", body.district);
  addField("land_location", "mandal", body.mandal);
  addField("land_location", "village", body.village);
  addField("land_location", "location", body.location);
  addField("land_location", "status", body.status);
  addField("land_location", "verification", body.verification);
  addField("land_location", "remarks", body.remarks);
  addField("land_location", "unique_id", body.unique_id);

  // farmer_details
  addField("farmer_details", "name", body.name);
  addField("farmer_details", "phone", body.phone);
  addField("farmer_details", "whatsapp_number", body.whatsapp_number);
  addField("farmer_details", "literacy", body.literacy);
  addField("farmer_details", "age_group", body.age_group);
  addField("farmer_details", "nature", body.nature);
  addField("farmer_details", "land_ownership", body.land_ownership);
  addField("farmer_details", "mortgage", body.mortgage);

  // land_details
  addField("land_details", "land_area", body.land_area);
  addField("land_details", "guntas", body.guntas);
  addField("land_details", "price_per_acre", body.price_per_acre);
  addField("land_details", "total_land_price", body.total_land_price);
  addField("land_details", "land_type", body.land_type);
  addField("land_details", "water_source", body.water_source);
  addField("land_details", "garden", body.garden);
  addField("land_details", "shed_details", body.shed_details);
  addField("land_details", "farm_pond", body.farm_pond);
  addField("land_details", "residental", body.residental);
  addField("land_details", "fencing", body.fencing);

  // gps_tracking
  addField("gps_tracking", "road_path", body.road_path);
  addField("gps_tracking", "latitude", body.latitude);
  addField("gps_tracking", "longitude", body.longitude);

  // dispute_details
  addField("dispute_details", "dispute_type", body.dispute_type);
  addField("dispute_details", "siblings_involve_in_dispute", body.siblings_involve_in_dispute);
  addField("dispute_details", "path_to_land", body.path_to_land);

  return updates;
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

    if (req.files?.passbook_photo) {
      updates.land_details = updates.land_details || {};
      updates.land_details.passbook_photo = req.files.passbook_photo[0].filename;
    }

    if (req.files?.land_border) {
      updates.gps_tracking = updates.gps_tracking || {};
      updates.gps_tracking.land_border = req.files.land_border[0].filename;
    }

    if (req.files?.land_photo) {
      updates.document_media = updates.document_media || {};
      updates.document_media.land_photo = req.files.land_photo.map(f => f.filename);
    }

    if (req.files?.land_video) {
      updates.document_media = updates.document_media || {};
      updates.document_media.land_video = req.files.land_video.map(f => f.filename);
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