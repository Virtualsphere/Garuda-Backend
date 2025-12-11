const pool = require("../db/db");
const axios = require("axios");

const generateUniqueId = async (role) => {
  const result = await pool.query(
    `SELECT unique_id FROM buyers WHERE unique_id LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${role}%`]
  );

  if (result.rows.length === 0) return `${role}0`;

  const lastId = result.rows[0].unique_id;
  const numberPart = parseInt(lastId.replace(role, '')) || 0;
  return `${role}${numberPart + 1}`;
};

const createBuyer= async(req, res)=>{
   try {
     const {
      name,
      phone,
      state,
      district,
      sectors,
      near_town_1,
      near_town_2,
      acres,
      total_budget,
      price_per_acres,
      type_of_soil,
      remarks,
    } = req.body;

    const role= "buyer";
    const uniqueId = await generateUniqueId(role);
    const result = await pool.query(
      `INSERT INTO buyers 
        (unique_id, name, phone, state, district, sectors, near_town_1, near_town_2, acres, total_budget, price_per_acres, type_of_soil, remarks)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        uniqueId,
        name,
        phone,
        state,
        district,
        sectors,
        near_town_1,
        near_town_2,
        acres,
        total_budget,
        price_per_acres,
        type_of_soil,
        remarks,
      ]
    );
    return res.status(201).json({
      message: "Buyer created successfully",
      data: result.rows[0],
    });
   } catch (err) {
        console.error(err);
        res.status(500).json({
        message: "Error creating buyer",
        error: err.message,
        });
   }
}

const getBuyers = async (req, res) => {
  try {
    const { state, district, town, sectors } = req.query;

    // If no filters were provided → return all buyers
    if (!state && !district && !town && !sectors) {
      const result = await pool.query(`
        SELECT * FROM buyers
        ORDER BY id DESC
      `);

      return res.status(200).json({
        message: "All buyers fetched successfully",
        count: result.rows.length,
        data: result.rows,
      });
    }

    // Build WHERE conditions dynamically
    let conditions = [];
    let values = [];

    if (state) {
      values.push(`%${state}%`);
      conditions.push(`state ILIKE $${values.length}`);
    }

    if (district) {
      values.push(`%${district}%`);
      conditions.push(`district ILIKE $${values.length}`);
    }

    if (town) {
      values.push(`%${town}%`);
      conditions.push(`(near_town_1 ILIKE $${values.length} OR near_town_2 ILIKE $${values.length})`);
    }

    if (sectors) {
      values.push(`%${sectors}%`);
      conditions.push(`sectors ILIKE $${values.length}`);
    }

    let query = `SELECT * FROM buyers WHERE ${conditions.join(" AND ")} ORDER BY id DESC`;

    const result = await pool.query(query, values);

    return res.status(200).json({
      message: "Filtered buyers fetched successfully",
      count: result.rows.length,
      data: result.rows,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error fetching buyers",
      error: err.message,
    });
  }
};

const addWishlist = async (req, res) => {
  try {
    const { buyer_id, land_ids } = req.body;

    if (!buyer_id || !Array.isArray(land_ids) || land_ids.length === 0) {
      return res.status(400).json({
        message: "buyer_id and land_ids (array) are required",
      });
    }

    // Insert each land_id into wishlist
    const insertQuery = `
      INSERT INTO whish_list (unique_id, land_id)
      VALUES ($1, $2)
      RETURNING *;
    `;

    let insertedRows = [];

    for (const landId of land_ids) {
      const result = await pool.query(insertQuery, [buyer_id, landId]);
      insertedRows.push(result.rows[0]);
    }

    return res.status(201).json({
      message: "Wishlist added successfully",
      data: insertedRows,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error adding wishlist",
      error: err.message,
    });
  }
};

const getWishList = async (req, res) => {
  try {
    const wishListQuery = `
      SELECT * FROM whish_list
      ORDER BY id DESC;
    `;
    const wishListResult = await pool.query(wishListQuery);

    if (wishListResult.rows.length === 0) {
      return res.status(200).json({
        message: "Wishlist empty",
        count: 0,
        data: []
      });
    }

    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    let finalResult = [];

    for (const item of wishListResult.rows) {
      const { unique_id, land_id } = item;

      // 2.1 Fetch buyer details
      const buyerRes = await pool.query(
        `SELECT * FROM buyers WHERE unique_id = $1`,
        [unique_id]
      );

      const landRes = await pool.query(
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
        WHERE l.land_id = $1;
        `,
        [land_id]
      );

      let landData = null;
      if (landRes.rows.length > 0) {
        const row = landRes.rows[0];
        landData = {
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
            passbook_photo: row.passbook_photo ? baseURL + "images/" + row.passbook_photo : null,
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
            land_border: row.land_border ? baseURL + "images/" + row.land_border : null,
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
        };
      }

      finalResult.push({
        unique_id,
        buyer_details: buyerRes.rows[0] || null,
        land_id,
        land_details: landData,
      });
    }

    return res.status(200).json({
      message: "Wishlist fetched successfully",
      count: finalResult.length,
      data: finalResult,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Failed to fetch wishlist",
      error: err.message,
    });
  }
};

module.exports= {
    createBuyer,
    getBuyers,
    addWishlist,
    getWishList
}