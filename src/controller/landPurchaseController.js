const pool = require("../db/db");

const createLandPurchase = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const unique_id = req.user.unique_id;
    const { land_id, land_code } = req.body;

    if (!land_id || !land_code) {
      return res.status(400).json({ error: "land_id and land_code are required" });
    }

    const exists = await client.query(
      `SELECT 1 FROM land_purchase_request 
       WHERE land_id = $1 AND unique_id = $2`,
      [land_id, unique_id]
    );

    if (exists.rowCount > 0) {
      return res.status(409).json({
        error: "Purchase request already exists for this land"
      });
    }

    const status = "pending";

    const result = await client.query(
      `INSERT INTO land_purchase_request (land_id, unique_id, land_code, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [land_id, unique_id, land_code, status]
    );

    const purchase = result.rows[0];

    await client.query("COMMIT");

    res.status(201).json({
      message: "✅ Land purchase request created successfully",
      landPurchase: {
        id: purchase.id,
        unique_id: purchase.unique_id,
        land_id: purchase.land_id,
        land_code: purchase.land_code,
        status: purchase.status,
        created_at: purchase.created_at
      }
    });

  } catch (error) {
    console.error("Create Land Purchase Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getLandPurchaseDetail = async (req, res) => {
  try {
    const unique_id = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const query = `
      SELECT 
        lpr.id AS purchase_id,
        lpr.land_id,
        lpr.unique_id,
        lpr.land_code,
        lpr.status AS purchase_status,
        lpr.created_at AS purchase_date,

        ll.state,
        ll.district,
        ll.mandal,
        ll.village,
        ll.location,
        ll.status AS land_status,
        ll.verification,
        ll.remarks,

        fd.name AS farmer_name,
        fd.phone,
        fd.whatsapp_number,
        fd.literacy,
        fd.age_group,
        fd.nature,
        fd.land_ownership,
        fd.mortgage,

        ld.land_area,
        ld.guntas,
        ld.price_per_acre,
        ld.total_land_price,
        ld.passbook_photo,
        ld.land_type,
        ld.water_source,
        ld.garden,
        ld.shed_details,
        ld.farm_pond,
        ld.residental,
        ld.fencing,

        gt.road_path,
        gt.latitude,
        gt.longitude,
        gt.land_border,

        dd.dispute_type,
        dd.siblings_involve_in_dispute,
        dd.path_to_land,

        dm.land_photo,
        dm.land_video

      FROM land_purchase_request lpr
      LEFT JOIN land_location ll ON ll.land_id = lpr.land_id
      LEFT JOIN farmer_details fd ON fd.land_id = lpr.land_id
      LEFT JOIN land_details ld ON ld.land_id = lpr.land_id
      LEFT JOIN gps_tracking gt ON gt.land_id = lpr.land_id
      LEFT JOIN dispute_details dd ON dd.land_id = lpr.land_id
      LEFT JOIN document_media dm ON dm.land_id = lpr.land_id
      WHERE lpr.unique_id = $1
      ORDER BY lpr.created_at DESC
    `;

    const result = await pool.query(query, [unique_id]);

    if (!result.rows.length) {
      return res.status(404).json({
        message: "No land purchase records found"
      });
    }

    const data = result.rows.map(row => ({
      purchase_request: {
        id: row.purchase_id,
        unique_id: row.unique_id,
        land_id: row.land_id,
        land_code: row.land_code,
        status: row.purchase_status,
        created_at: row.purchase_date
      },

      land_location: {
        state: row.state,
        district: row.district,
        mandal: row.mandal,
        village: row.village,
        location: row.location,
        status: row.land_status,
        verification: row.verification,
        remarks: row.remarks
      },

      farmer_details: {
        name: row.farmer_name,
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
          ? `${baseURL}images/${row.passbook_photo}`
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
          ? `${baseURL}images/${row.land_border}`
          : null
      },

      dispute_details: {
        dispute_type: row.dispute_type,
        siblings_involve_in_dispute: row.siblings_involve_in_dispute,
        path_to_land: row.path_to_land
      },

      document_media: {
        land_photo: (row.land_photo || []).map(p => `${baseURL}images/${p}`),
        land_video: (row.land_video || []).map(v => `${baseURL}videos/${v}`)
      }
    }));

    res.status(200).json({
      message: "✔ Land purchase details fetched successfully",
      count: data.length,
      data
    });

  } catch (error) {
    console.error("Get Land Purchase Detail Error:", error);
    res.status(500).json({ error: "Failed to fetch land purchase details" });
  }
};

const getSinglePurchaseDetail = async (req, res) =>{
  try {
    const { id } = req.params;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const uniqueId= req.user.unique_id;

    const result = await pool.query(
      `
     SELECT 
        l.*,
        f.*,
        ld.*,
        gps.*,
        d.*,
        dm.*,
        lp.status AS purchase_status
      FROM land_location l
      LEFT JOIN farmer_details f ON l.land_id = f.land_id
      LEFT JOIN land_details ld ON l.land_id = ld.land_id
      LEFT JOIN gps_tracking gps ON l.land_id = gps.land_id
      LEFT JOIN dispute_details d ON l.land_id = d.land_id
      LEFT JOIN document_media dm ON l.land_id = dm.land_id
      LEFT JOIN land_purchase_request lp ON l.land_id = lp.land_id AND lp.unique_id = $4
      WHERE l.land_id = $1
      AND l.verification = $2
      AND l.status = $3
      LIMIT 1
  `,
      [id, "verified", "true", uniqueId]
    );

    if (!result.rows.length)
      return res.status(404).json({ 
        message: "Land record not found or not verified",
        data: null 
      });

    const row = result.rows[0];
    
    const response = {
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

      purchase_details: {
        purchase_status: row.purchase_status
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
    };

    res.status(200).json({
      message: "✔ Land details fetched successfully",
      data: response,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: "Failed to fetch land details",
      details: err.message 
    });
  }
}

module.exports = {
  createLandPurchase,
  getLandPurchaseDetail,
  getSinglePurchaseDetail
};