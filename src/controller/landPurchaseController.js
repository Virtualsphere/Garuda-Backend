const pool = require("../db/db");

const createLandPurchase= async(req, res)=>{
    try {
        const unique_id= req.user.unique_id;
        const { land_id, status, land_code  }= req.body;
        const result= await pool.query(`Insert into land_purchase_request (land_id, unique_id, land_code, status)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
            `, [land_id, unique_id, land_code, status]);
        const newPurchase= result.rows[0];
        res.status(201).json({
        message: '✅ Save user land request successfully',
        landPurchase: {
            id: newPurchase.id,
            unique_id: newPurchase.unique_id,
            land_id: newPurchase.land_id,
            status: newPurchase.status,
            land_code: newPurchase.land_code
        },
        });
    } catch (error) {
        console.error("Update User Error:", err);
        res.status(500).json({ error: "Server error" });
    }
}

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

        -- land location
        ll.state,
        ll.district,
        ll.mandal,
        ll.village,
        ll.location,
        ll.status AS land_status,
        ll.verification,
        ll.remarks,

        -- farmer details
        fd.name AS farmer_name,
        fd.phone,
        fd.whatsapp_number,
        fd.literacy,
        fd.age_group,
        fd.nature,
        fd.land_ownership,
        fd.mortgage,

        -- land details
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

        -- gps tracking
        gt.road_path,
        gt.latitude,
        gt.longitude,
        gt.land_border,

        -- dispute details
        dd.dispute_type,
        dd.siblings_involve_in_dispute,
        dd.path_to_land,

        -- media
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

    if (!result.rows.length)
      return res.status(404).json({ message: "No land purchase records found" });

    const response = result.rows.map((row) => ({
      purchase_request: {
        id: row.purchase_id,
        unique_id: row.unique_id,
        land_id: row.land_id,
        land_code: row.land_code,
        status: row.purchase_status,
        created_at: row.purchase_date
      },

      land_id: row.land_id,

      land_location: {
        unique_id: row.unique_id,
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
      message: "✔ Land purchase details fetched successfully",
      data: response,
      count: response.length
    });

  } catch (err) {
    console.error("Get Land Purchase Detail Error:", err);
    res.status(500).json({ error: "Failed to fetch land purchase details" });
  }
};

module.exports= { createLandPurchase, getLandPurchaseDetail }