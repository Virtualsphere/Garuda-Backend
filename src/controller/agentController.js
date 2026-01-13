const pool = require("../db/db");
const axios = require("axios");

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
      `DELETE FROM agents 
       WHERE agent_id = $1 
       RETURNING *`,
      [agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.status(200).json({
      message: "Agent deleted successfully",
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
  getAllAgents,
  getAvailableLands,
  deleteAgent,
  updateAgent,
  createAgent,
  getAgentById,
  getAgentLands
};