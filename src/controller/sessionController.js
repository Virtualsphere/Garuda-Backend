const pool = require("../db/db");
const axios = require("axios");

const createSession = async (req, res) => {
  try {
    const { starting_time, starting_km, work_type } = req.body;
    const starting_image = req.files?.starting_image?.[0]?.filename || null;
    const unique_id = req.user.unique_id;

    let result= null;

    if(req.user.role == 'regional incharge'){
      result = await pool.query(
      `INSERT INTO session 
       (unique_id, starting_time, starting_km, starting_image, work_type)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *;`,
      [unique_id, starting_time, starting_km, starting_image, work_type]
    );
    }else{
      result = await pool.query(
      `INSERT INTO session 
       (unique_id, starting_time, starting_km, starting_image)
       VALUES ($1,$2,$3,$4)
       RETURNING *;`,
      [unique_id, starting_time, starting_km, starting_image]
    );
    }

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
    const unique_id = req.user.unique_id;

    const {
      end_time,
      end_km,
      transport_charges,
    } = req.body;

    let end_image = null;
    let ticket_image = null;

    if (req.files?.end_image) {
      end_image = req.files.end_image[0].filename;
    }

    if (req.files?.ticket_image) {
      ticket_image = req.files.ticket_image.map(f => f.filename);
    }

    
    const endResult = await pool.query(
      `INSERT INTO end_session 
       (unique_id, session_id, end_time, end_km, end_image, transport_charges, ticket_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *;`,
      [
        unique_id,
        session_id,
        end_time,
        end_km,
        end_image,
        transport_charges,
        ticket_image
      ]
    );

    const endData = endResult.rows[0];
    
    const sessionRes = await pool.query(
      `SELECT starting_km, created_at FROM session WHERE id = $1`,
      [session_id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const starting_km = sessionRes.rows[0].starting_km;
    const created_at = sessionRes.rows[0].created_at;

    const total_km =
      starting_km && end_km ? Number(end_km) - Number(starting_km) : null;

    const walletCheck = await pool.query(
      `SELECT id FROM travel_wallet WHERE session_id = $1`,
      [session_id]
    );

    if (walletCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO travel_wallet
         (session_id, unique_id, date, total_km, amount, status)
         VALUES ($1,$2,$3,$4,$5,$6);`,
        [
          session_id,
          unique_id,
          created_at,
          total_km,
          transport_charges || 0,
          "pending"
        ]
      );
    }

    res.status(201).json({
      message: "✅ End session added successfully",
      data: endData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Failed to update session" });
  }
};

const getRegionalSessions = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const landRes = await pool.query(
      `
      SELECT ll.land_id, ll.created_at, ll.status, ll.verification_date, fd.name AS farmer_name
      FROM land_location ll
      LEFT JOIN farmer_details fd ON fd.land_id = ll.land_id
      WHERE ll.verification_unique_id = $1
      `,
      [unique_id]
    );

    const landMap = {};
    const verifyMap = {};

    landRes.rows.forEach(r => {
      if (r.created_at) {
        const d = r.created_at.toISOString().split("T")[0];
        landMap[d] = r.farmer_name;
      }
      if (r.verification_date) {
        const d = r.verification_date.toISOString().split("T")[0];
        verifyMap[d] = true;
      }
    });

    const sessionRes = await pool.query(
      `
      SELECT s.*, e.*
      FROM session s
      LEFT JOIN end_session e ON e.session_id = s.id
      WHERE s.unique_id = $1
      ORDER BY s.id DESC, e.id ASC
      `,
      [unique_id]
    );

    const map = {};

    sessionRes.rows.forEach(row => {
      const date = row.created_at.toISOString().split("T")[0];

      if (!map[date]) {
        map[date] = {
          date,
          land_status: !!landMap[date],
          verification_status: !!verifyMap[date],
          farmer_name: landMap[date] || null,
          starting_km: row.starting_km,
          starting_image: row.starting_image
            ? baseURL + "images/" + row.starting_image
            : null,
          end_sessions: []
        };
      }

      if (row.end_km) {
        map[date].end_sessions.push({
          end_km: row.end_km,
          end_image: row.end_image ? baseURL + "images/" + row.end_image : null,
          transport_charges: row.transport_charges,
          ticket_image: (row.ticket_image || []).map(img => baseURL + "images/" + img)
        });
      }
    });

    res.json({ message: "✔ Sessions fetched", data: Object.values(map) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
};

const getSessionsByUserId = async (req, res) => {
  try {
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;
    const session_id = req.params.session_id;

    const result = await pool.query(
      `
      SELECT 
        s.id AS session_id,
        s.created_at,
        s.starting_time,
        s.starting_km,
        s.starting_image,
        e.end_time,
        e.end_km,
        e.end_image,
        e.transport_charges,
        e.ticket_image
      FROM session s
      LEFT JOIN end_session e ON s.id = e.session_id
      WHERE s.id = $1
      ORDER BY e.id ASC
      `,
      [session_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    const sessionRow = result.rows[0];

    const finalOutput = {
      session_id: sessionRow.session_id,
      date: sessionRow.created_at,
      starting_time: sessionRow.starting_time,
      starting_km: sessionRow.starting_km,
      starting_image: sessionRow.starting_image
        ? baseURL + "images/" + sessionRow.starting_image
        : null,

      end_sessions: result.rows.map(row => ({
        end_time: row.end_time,
        end_km: row.end_km,
        end_image: row.end_image
          ? baseURL + "images/" + row.end_image
          : null,
        transport_charges: row.transport_charges,
        ticket_image: (row.ticket_image || []).map(
          img => baseURL + "images/" + img
        ),
      })),
    };

    res.status(200).json({
      message: "✔ Session fetched successfully",
      data: finalOutput,
    });
  } catch (error) {
    console.error("Get Sessions Error:", error);
    res.status(500).json({ error: "Server error while fetching session" });
  }
};

const getAgentSessions = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const landRes = await pool.query(
      `
      SELECT ll.created_at, ll.status, fd.name AS farmer_name
      FROM land_location ll
      LEFT JOIN farmer_details fd ON fd.land_id = ll.land_id
      WHERE ll.unique_id = $1
      `,
      [unique_id]
    );

    const landMap = {};
    landRes.rows.forEach(row => {
      if (row.created_at) {
        const date = row.created_at.toISOString().split("T")[0];
        landMap[date] = {
          farmer_name: row.farmer_name || null,
          status: row.status === "true",
        };
      }
    });

    const sessionRes = await pool.query(
      `
      SELECT 
        s.id,
        s.created_at,
        s.starting_time,
        s.starting_km,
        s.starting_image,
        e.end_time,
        e.end_km,
        e.end_image,
        e.transport_charges,
        e.ticket_image
      FROM session s
      LEFT JOIN end_session e ON e.session_id = s.id
      WHERE s.unique_id = $1
      ORDER BY s.id DESC, e.id ASC
      `,
      [unique_id]
    );

    const map = {};

    sessionRes.rows.forEach(row => {
      const date = row.created_at.toISOString().split("T")[0];
      const land = landMap[date] || {};

      if (!map[date]) {
        map[date] = {
          date,
          status: land.status || false,
          farmer_name: land.farmer_name || null,
          starting_time: row.starting_time,
          starting_km: row.starting_km,
          starting_image: row.starting_image
            ? baseURL + "images/" + row.starting_image
            : null,
          end_sessions: []
        };
      }

      if (row.end_km) {
        map[date].end_sessions.push({
          end_time: row.end_time,
          end_km: row.end_km,
          end_image: row.end_image ? baseURL + "images/" + row.end_image : null,
          transport_charges: row.transport_charges,
          ticket_image: (row.ticket_image || []).map(img => baseURL + "images/" + img)
        });
      }
    });

    res.json({ message: "✔ Sessions fetched", data: Object.values(map) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
};

const getMarketingSessions = async (req, res) => {
  const client = await pool.connect();
  try {
    const unique_id = req.user.unique_id;

    const sessionRes = await client.query(
      `SELECT * FROM session WHERE unique_id = $1 ORDER BY created_at DESC`,
      [unique_id]
    );

    const finalData = [];

    for (const s of sessionRes.rows) {
      const date = s.created_at;

      const poster = await client.query(
        `SELECT COUNT(*)::int FROM poster_wallet WHERE unique_id=$1 AND DATE(date)=DATE($2)`,
        [unique_id, date]
      );

      const job = await client.query(
        `SELECT COUNT(*)::int FROM job_post_wallet WHERE unique_id=$1 AND DATE(date)=DATE($2)`,
        [unique_id, date]
      );

      const ads = await client.query(
        `
        SELECT COUNT(*)::int 
        FROM ads_wallet aw
        WHERE aw.unique_id=$1 AND DATE(date)=DATE($2)
        `,
        [unique_id, date]
      );

      finalData.push({
        session_id: s.id,
        date,
        poster_count: poster.rows[0].count,
        job_count: job.rows[0].count,
        ads_count: ads.rows[0].count,
        status: {
          poster: poster.rows[0].count > 0,
          job: job.rows[0].count > 0,
          ads: ads.rows[0].count > 0
        }
      });
    }

    res.json({ success: true, sessions: finalData });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  } finally {
    client.release();
  }
};

const getWeeklyLandStats = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;

    const result = await pool.query(`
      SELECT 
        to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week_start,
        COUNT(*)::int AS total_lands
      FROM land_location
      WHERE unique_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY week_start
      ORDER BY week_start ASC
    `, [unique_id]);

    const formatted = result.rows.map((row, index) => ({
      week: `Week ${index + 1}`,
      date: row.week_start,
      count: row.total_lands
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error("Weekly Land Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getWeeklyVerifiedLandStats = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;

    const result = await pool.query(`
      SELECT 
        to_char(date_trunc('week', verification_date), 'YYYY-MM-DD') AS week_start,
        COUNT(*)::int AS total_lands
      FROM land_location
      WHERE verification_unique_id = $1
        AND verification = 'verified'
        AND verification_date >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY week_start
      ORDER BY week_start ASC
    `, [unique_id]);

    const formatted = result.rows.map((row, index) => ({
      week: `Week ${index + 1}`,
      date: row.week_start,
      count: row.total_lands
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error("Weekly Verified Land Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports= { createSession, updateSession, getRegionalSessions, getSessionsByUserId, getAgentSessions, getMarketingSessions, getWeeklyLandStats, getWeeklyVerifiedLandStats }