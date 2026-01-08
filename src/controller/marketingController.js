const pool = require("../db/db");

const createPosterSticking = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { state, district, town, mandal, shops } = req.body;
    const unique_id = req.user.unique_id;

    const locationRes = await client.query(
      `
      INSERT INTO poster_location (unique_id, state, district, town, mandal)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
      `,
      [unique_id, state, district, town, mandal]
    );

    const posterLocationId = locationRes.rows[0].id;

    for (let i = 0; i < shops.length; i++) {
      const shopPhoto =
        req.files?.[`shop_photo_${i}`]?.[0]?.filename || null;
      const stickerPhoto =
        req.files?.[`sticker_photo_${i}`]?.[0]?.filename || null;

      const shop = shops[i];

      await client.query(
        `
        INSERT INTO poster_shops
        (poster_location_id, shop_name, phone_number, shop_type,
         shop_photo, sticker_photo, latitude, longitude)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          posterLocationId,
          shop.shop_name,
          shop.phone_number,
          shop.shop_type,
          shopPhoto,
          stickerPhoto,
          shop.latitude,
          shop.longitude,
        ]
      );
    }

    await client.query(
      `INSERT INTO poster_wallet 
      (poster_location_id, unique_id, date, number_of_posters, amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [posterLocationId, unique_id, new Date(), shops.lenght, 0, "pending"]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "✅ Poster sticking work saved successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "❌ Failed to save poster sticking work" });
  } finally {
    client.release();
  }
};

const createJobPosting = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { state, district, town, mandal, postings } = req.body;
    const unique_id = req.user.unique_id;

    // 1️⃣ job_location
    const jobRes = await client.query(
      `
      INSERT INTO job_location (unique_id, state, district, town, mandal)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
      `,
      [unique_id, state, district, town, mandal]
    );

    const jobLocationId = jobRes.rows[0].id;

    // 2️⃣ posting_details
    for (let i = 0; i < postings.length; i++) {
      const placePhoto =
        req.files?.[`place_photo_${i}`]?.[0]?.filename || null;
      const stickerPhoto =
        req.files?.[`sticker_photo_${i}`]?.[0]?.filename || null;

      const post = postings[i];

      await client.query(
        `
        INSERT INTO posting_detials
        (job_location_id, latitude, longitude, place_photo, sticker_photo)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          jobLocationId,
          post.latitude,
          post.longitude,
          placePhoto,
          stickerPhoto,
        ]
      );
    }

    await client.query(
      `INSERT INTO job_post_wallet 
      (job_location_id, unique_id, date, number_of_post, amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [jobLocationId, unique_id, new Date(), postings.length, 0, "pending"]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "✅ Job posting saved successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "❌ Failed to save job posting" });
  } finally {
    client.release();
  }
};

const createTVAdvertising = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { contacts } = req.body;
    const unique_id = req.user.unique_id;

    // 1️⃣ batch
    const batchRes = await client.query(
      `
      INSERT INTO tv_advertising_batch (unique_id)
      VALUES ($1)
      RETURNING id
      `,
      [unique_id]
    );

    const batchId = batchRes.rows[0].id;

    // 2️⃣ contacts
    for (let i = 0; i < contacts.length; i++) {
      const photo = req.files?.[`photo_${i}`]?.[0]?.filename || null;
      const c = contacts[i];

      await client.query(
        `
        INSERT INTO tv_advertising_contacts
        (tv_batch_id, contact_name, contact_phone, state, district,
         town, mandal, latitude, longitude, photo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          batchId,
          c.contact_name,
          c.contact_phone,
          c.state,
          c.district,
          c.town,
          c.mandal,
          c.latitude,
          c.longitude,
          photo,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "✅ TV advertising details saved",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "❌ Failed to save TV advertising details" });
  } finally {
    client.release();
  }
};

const createBannerAdvertising = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { contacts } = req.body;
    const unique_id = req.user.unique_id;

    const batchRes = await client.query(
      `
      INSERT INTO banner_advertising_batch (unique_id)
      VALUES ($1)
      RETURNING id
      `,
      [unique_id]
    );

    const batchId = batchRes.rows[0].id;

    for (let i = 0; i < contacts.length; i++) {
      const photo = req.files?.[`photo_${i}`]?.[0]?.filename || null;
      const c = contacts[i];

      await client.query(
        `
        INSERT INTO banner_advertising_contacts
        (banner_batch_id, contact_name, contact_phone, state, district,
         town, mandal, latitude, longitude, photo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          batchId,
          c.contact_name,
          c.contact_phone,
          c.state,
          c.district,
          c.town,
          c.mandal,
          c.latitude,
          c.longitude,
          photo,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "✅ Banner advertising details saved",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "❌ Failed to save banner advertising" });
  } finally {
    client.release();
  }
};

const createHoardingDetails = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      state,
      district,
      town,
      mandal,
      latitude,
      longitude,
      contact_person_name,
      contact_person_phone,
    } = req.body;

    const unique_id = req.user.unique_id;

    // 📷 Image handling (same as land entry)
    const hoardingPhoto =
      req.files?.hoarding_photo?.[0]?.filename || null;

    await client.query(
      `
      INSERT INTO hoarding_details
      (
        unique_id,
        state,
        district,
        town,
        mandal,
        latitude,
        longitude,
        hoarding_photo,
        contact_person_name,
        contact_person_phone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        unique_id,
        state,
        district,
        town,
        mandal,
        latitude,
        longitude,
        hoardingPhoto,
        contact_person_name,
        contact_person_phone,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "✅ Hoarding details saved successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Hoarding Error:", err);
    res.status(500).json({ error: "❌ Failed to save hoarding details" });
  } finally {
    client.release();
  }
};

const createOurAds = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      type,
      from_date,
      to_date,
      state,
      district,
      town,
      mandal,
      address,
      latitude,
      longitude,
    } = req.body;

    const unique_id = req.user.unique_id;

    const adPhoto = req.files?.ad_photo?.[0]?.filename || null;
    const locationPhoto = req.files?.location_photo?.[0]?.filename || null;

    // Insert into our_ads and get inserted id
    const adsResult = await client.query(
      `
      INSERT INTO our_ads
      (
        type,
        from_date,
        to_date,
        ad_photo,
        state,
        district,
        town,
        mandal,
        address,
        latitude,
        longitude,
        location_photo
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id
      `,
      [
        type,
        from_date,
        to_date,
        adPhoto,
        state,
        district,
        town,
        mandal,
        address,
        latitude,
        longitude,
        locationPhoto,
      ]
    );

    const ads_id = adsResult.rows[0].id;

    await client.query(
      `
      INSERT INTO ads_wallet
      (ads_id, unique_id, date, ad_type, amount, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [ads_id, unique_id, new Date(), type, 0, "pending"]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "✅ Banner ad details saved successfully",
      ads_id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Banner Ad Error:", err);
    res.status(500).json({
      error: "❌ Failed to save banner ad details",
    });
  } finally {
    client.release();
  }
};

const getPosterSticking = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(
      `
      SELECT 
        pl.id AS location_id,
        pl.state, pl.district, pl.town, pl.mandal,
        ps.shop_name, ps.phone_number, ps.shop_type,
        ps.shop_photo, ps.sticker_photo,
        ps.latitude, ps.longitude
      FROM poster_location pl
      LEFT JOIN poster_shops ps ON ps.poster_location_id = pl.id
      WHERE pl.unique_id = $1
      ORDER BY pl.id DESC
      `,
      [uniqueId]
    );

    const data = {};

    result.rows.forEach((row) => {
      if (!data[row.location_id]) {
        data[row.location_id] = {
          location_id: row.location_id,
          state: row.state,
          district: row.district,
          town: row.town,
          mandal: row.mandal,
          shops: [],
        };
      }

      if (row.shop_name) {
        data[row.location_id].shops.push({
          shop_name: row.shop_name,
          phone_number: row.phone_number,
          shop_type: row.shop_type,
          latitude: row.latitude,
          longitude: row.longitude,
          shop_photo: row.shop_photo
            ? baseURL + "images/" + row.shop_photo
            : null,
          sticker_photo: row.sticker_photo
            ? baseURL + "images/" + row.sticker_photo
            : null,
        });
      }
    });

    res.status(200).json({
      message: "✔ Poster sticking details fetched",
      data: Object.values(data),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch poster sticking details" });
  }
};

const getJobPosting = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(
      `
      SELECT 
        jl.id AS job_location_id,
        jl.state, jl.district, jl.town, jl.mandal,
        pd.latitude, pd.longitude,
        pd.place_photo, pd.sticker_photo
      FROM job_location jl
      LEFT JOIN posting_detials pd ON pd.job_location_id = jl.id
      WHERE jl.unique_id = $1
      ORDER BY jl.id DESC
      `,
      [uniqueId]
    );

    const data = {};

    result.rows.forEach((row) => {
      if (!data[row.job_location_id]) {
        data[row.job_location_id] = {
          job_location_id: row.job_location_id,
          state: row.state,
          district: row.district,
          town: row.town,
          mandal: row.mandal,
          postings: [],
        };
      }

      if (row.latitude) {
        data[row.job_location_id].postings.push({
          latitude: row.latitude,
          longitude: row.longitude,
          place_photo: row.place_photo
            ? baseURL + "images/" + row.place_photo
            : null,
          sticker_photo: row.sticker_photo
            ? baseURL + "images/" + row.sticker_photo
            : null,
        });
      }
    });

    res.status(200).json({
      message: "✔ Job posting details fetched",
      data: Object.values(data),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch job posting details" });
  }
};

const getTVAdvertising = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(
      `
      SELECT 
        b.id AS batch_id,
        c.*
      FROM tv_advertising_batch b
      LEFT JOIN tv_advertising_contacts c ON c.tv_batch_id = b.id
      WHERE b.unique_id = $1
      ORDER BY b.id DESC
      `,
      [uniqueId]
    );

    const data = {};

    result.rows.forEach((row) => {
      if (!data[row.batch_id]) {
        data[row.batch_id] = {
          batch_id: row.batch_id,
          contacts: [],
        };
      }

      if (row.contact_name) {
        data[row.batch_id].contacts.push({
          contact_name: row.contact_name,
          contact_phone: row.contact_phone,
          state: row.state,
          district: row.district,
          town: row.town,
          mandal: row.mandal,
          latitude: row.latitude,
          longitude: row.longitude,
          photo: row.photo
            ? baseURL + "images/" + row.photo
            : null,
        });
      }
    });

    res.status(200).json({
      message: "✔ TV advertising details fetched",
      data: Object.values(data),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch TV advertising details" });
  }
};

const getBannerAdvertising = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(
      `
      SELECT 
        b.id AS batch_id,
        c.*
      FROM banner_advertising_batch b
      LEFT JOIN banner_advertising_contacts c ON c.banner_batch_id = b.id
      WHERE b.unique_id = $1
      ORDER BY b.id DESC
      `,
      [uniqueId]
    );

    const data = {};

    result.rows.forEach((row) => {
      if (!data[row.batch_id]) {
        data[row.batch_id] = {
          batch_id: row.batch_id,
          contacts: [],
        };
      }

      if (row.contact_name) {
        data[row.batch_id].contacts.push({
          contact_name: row.contact_name,
          contact_phone: row.contact_phone,
          state: row.state,
          district: row.district,
          town: row.town,
          mandal: row.mandal,
          latitude: row.latitude,
          longitude: row.longitude,
          photo: row.photo
            ? baseURL + "images/" + row.photo
            : null,
        });
      }
    });

    res.status(200).json({
      message: "✔ Banner advertising details fetched",
      data: Object.values(data),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch banner advertising details" });
  }
};

const getHoardingDetails = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(
      `
      SELECT *
      FROM hoarding_details
      WHERE unique_id = $1
      ORDER BY id DESC
      `,
      [uniqueId]
    );

    const data = result.rows.map((row) => ({
      ...row,
      hoarding_photo: row.hoarding_photo
        ? baseURL + "images/" + row.hoarding_photo
        : null,
    }));

    res.status(200).json({
      message: "✔ Hoarding details fetched",
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hoarding details" });
  }
};

const getOurAds = async (req, res) => {
  try {
    const uniqueId = req.user.unique_id;
    const baseURL = `${req.protocol}://${req.get("host")}/public/`;

    const result = await pool.query(
      `
      SELECT *
      FROM our_ads
      WHERE unique_id = $1
      ORDER BY id DESC
      `,
      [uniqueId]
    );

    const data = result.rows.map((row) => ({
      ...row,
      ad_photo: row.ad_photo
        ? baseURL + "images/" + row.ad_photo
        : null,
      location_photo: row.location_photo
        ? baseURL + "images/" + row.location_photo
        : null,
    }));

    res.status(200).json({
      message: "✔ Ads fetched",
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ads" });
  }
};

module.exports = {
  createPosterSticking,
  createJobPosting,
  createTVAdvertising,
  createBannerAdvertising,
  createHoardingDetails,
  createOurAds,
  getPosterSticking,
  getJobPosting,
  getTVAdvertising,
  getOurAds,
  getBannerAdvertising,
  getHoardingDetails
};