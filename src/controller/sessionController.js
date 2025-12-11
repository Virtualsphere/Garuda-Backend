const pool = require("../db/db");
const axios = require("axios");

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

const getSessionsByUser = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;

    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const landRes = await pool.query(
      `
      SELECT 
        ll.land_id,
        ll.created_at,
        ll.status,
        ll.verification_date,
        fd.name AS farmer_name
      FROM land_location ll
      LEFT JOIN farmer_details fd ON fd.land_id = ll.land_id
      WHERE ll.verification_unique_id = $1
      `,
      [unique_id]
    );

    const landCreatedMap = {};
    const verificationMap = {};

    landRes.rows.forEach((row) => {
      const landId = row.land_id;

      if (row.created_at) {
        const landDate = row.created_at.toISOString().split("T")[0];

        if (!landCreatedMap[landDate]) landCreatedMap[landDate] = [];

        landCreatedMap[landDate].push({
          land_id: landId,
          farmer_name: row.farmer_name || null,
          status: row.status === "true",
        });
      }

      if (row.verification_date) {
        const verifyDate = row.verification_date.toISOString().split("T")[0];

        if (!verificationMap[verifyDate]) verificationMap[verifyDate] = [];

        verificationMap[verifyDate].push(landId);
      }
    });

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

    sessionRes.rows.forEach((row) => {
      const sessionDate = row.created_at.toISOString().split("T")[0];

      const landEntries = landCreatedMap[sessionDate] || [];
      const verifyEntries = verificationMap[sessionDate] || [];

      const land_status = landEntries.length > 0;
      const verification_status = verifyEntries.length > 0;

      finalOutput[row.id] = {
        date: sessionDate,
        land_status,
        verification_status,
        farmer_name: landEntries[0]?.farmer_name || null,

        starting_km: row.starting_km,
        starting_image: row.starting_image
          ? baseURL + "images/" + row.starting_image
          : null,

        end_km: row.end_km,
        end_image: row.end_image
          ? baseURL + "images/" + row.end_image
          : null,

        transport_charges: row.transport_charges,
        ticket_image: (row.ticket_image || []).map(
          (img) => baseURL + "images/" + img
        ),
      };
    });

    res.status(200).json({
      message: "✔ Sessions fetched successfully",
      data: finalOutput,
    });
  } catch (error) {
    console.error("Get Sessions Error:", error);
    res.status(500).json({ error: "Server error while fetching sessions" });
  }
};

module.exports= { createSession, updateSession, getSessionsByUser }