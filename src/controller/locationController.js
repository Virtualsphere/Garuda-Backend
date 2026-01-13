const pool = require("../db/db");

const getStates = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM states ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch states' });
    }
};

// Add single state
const addState = async (req, res) => {
    const { code, name } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO states (code, name) VALUES ($1, $2) RETURNING *',
            [code, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // unique violation
            res.status(400).json({ error: 'State code or name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to add state' });
        }
    }
};

// Add multiple states (bulk insert)
const addMultipleStates = async (req, res) => {
    const { states } = req.body; // states: [{code: 'AP', name: 'Andhra Pradesh'}, ...]
    
    try {
        const values = states.map(s => `('${s.code}', '${s.name}')`).join(',');
        const query = `INSERT INTO states (code, name) VALUES ${values} RETURNING *`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add states' });
    }
};

// ============================
// 2. DISTRICT OPERATIONS
// ============================

// Get districts by state
const getDistrictsByState = async (req, res) => {
    const { stateId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT d.* FROM districts d WHERE d.state_id = $1 ORDER BY d.name',
            [stateId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch districts' });
    }
};

// Add district to state
const addDistrict = async (req, res) => {
    const { state_id, code, name } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO districts (state_id, code, name) VALUES ($1, $2, $3) RETURNING *',
            [state_id, code, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'District code already exists in this state' });
        } else {
            res.status(500).json({ error: 'Failed to add district' });
        }
    }
};

// Add multiple districts (bulk)
const addMultipleDistricts = async (req, res) => {
    const { state_id, districts } = req.body;
    
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            const insertedDistricts = [];
            
            for (const district of districts) {
                const result = await client.query(
                    'INSERT INTO districts (state_id, code, name) VALUES ($1, $2, $3) RETURNING *',
                    [state_id, district.code, district.name]
                );
                insertedDistricts.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            res.json(insertedDistricts);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add districts' });
    }
};

// ============================
// 3. MANDAL OPERATIONS
// ============================

// Get mandals by district
const getMandalsByDistrict = async (req, res) => {
    const { districtId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT * FROM mandals WHERE district_id = $1 ORDER BY name',
            [districtId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch mandals' });
    }
};

// Add mandal to district
const addMandal = async (req, res) => {
    const { district_id, name } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO mandals (district_id, name) VALUES ($1, $2) RETURNING *',
            [district_id, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Mandal already exists in this district' });
        } else {
            res.status(500).json({ error: 'Failed to add mandal' });
        }
    }
};

// Add multiple mandals (bulk)
const addMultipleMandals = async (req, res) => {
    const { district_id, mandals } = req.body; // mandals: ["Mandal 1", "Mandal 2", ...]
    
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            const insertedMandals = [];
            
            for (const mandalName of mandals) {
                const result = await client.query(
                    'INSERT INTO mandals (district_id, name) VALUES ($1, $2) RETURNING *',
                    [district_id, mandalName]
                );
                insertedMandals.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            res.json(insertedMandals);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add mandals' });
    }
};

// ============================
// 4. SECTOR OPERATIONS
// ============================

// Get sectors by district
const getSectorsByDistrict = async (req, res) => {
    const { districtId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT * FROM sectors WHERE district_id = $1 ORDER BY name',
            [districtId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sectors' });
    }
};

// Add sector to district
const addSector = async (req, res) => {
    const { district_id, code, name } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO sectors (district_id, code, name) VALUES ($1, $2, $3) RETURNING *',
            [district_id, code, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Sector code already exists in this district' });
        } else {
            res.status(500).json({ error: 'Failed to add sector' });
        }
    }
};

// Add multiple sectors (bulk)
const addMultipleSectors = async (req, res) => {
    const { district_id, sectors } = req.body; // sectors: [{code: 'MA', name: 'Mandal A'}, ...]
    
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            const insertedSectors = [];
            
            for (const sector of sectors) {
                const result = await client.query(
                    'INSERT INTO sectors (district_id, code, name) VALUES ($1, $2, $3) RETURNING *',
                    [district_id, sector.code, sector.name]
                );
                insertedSectors.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            res.json(insertedSectors);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add sectors' });
    }
};

// ============================
// 5. TOWN OPERATIONS
// ============================

// Get towns by district
const getTownsByDistrict = async (req, res) => {
    const { districtId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT * FROM towns WHERE district_id = $1 ORDER BY name',
            [districtId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch towns' });
    }
};

// Add town to district
const addTown = async (req, res) => {
    const { district_id, name } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO towns (district_id, name) VALUES ($1, $2) RETURNING *',
            [district_id, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Town already exists in this district' });
        } else {
            res.status(500).json({ error: 'Failed to add town' });
        }
    }
};

// Add multiple towns (bulk)
const addMultipleTowns = async (req, res) => {
    const { district_id, towns } = req.body; // towns: ["Town 1", "Town 2", ...]
    
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            const insertedTowns = [];
            
            for (const townName of towns) {
                const result = await client.query(
                    'INSERT INTO towns (district_id, name) VALUES ($1, $2) RETURNING *',
                    [district_id, townName]
                );
                insertedTowns.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            res.json(insertedTowns);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add towns' });
    }
};

// ============================
// 6. VILLAGE OPERATIONS
// ============================

// Get villages by mandal
const getVillagesByMandal = async (req, res) => {
    const { mandalId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT * FROM villages WHERE mandal_id = $1 ORDER BY name',
            [mandalId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch villages' });
    }
};

// Get villages by sector
const getVillagesBySector = async (req, res) => {
    const { sectorId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT * FROM villages WHERE sector_id = $1 ORDER BY name',
            [sectorId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch villages' });
    }
};

// Add village to mandal
const addVillageToMandal = async (req, res) => {
    const { mandal_id, name } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO villages (mandal_id, name) VALUES ($1, $2) RETURNING *',
            [mandal_id, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Village already exists in this mandal' });
        } else {
            res.status(500).json({ error: 'Failed to add village' });
        }
    }
};

// Add village to sector
const addVillageToSector = async (req, res) => {
    const { sector_id, name } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO villages (sector_id, name) VALUES ($1, $2) RETURNING *',
            [sector_id, name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Village already exists in this sector' });
        } else {
            res.status(500).json({ error: 'Failed to add village' });
        }
    }
};

// Add multiple villages to mandal (bulk)
const addMultipleVillagesToMandal = async (req, res) => {
    const { mandal_id, villages } = req.body; // villages: ["Village 1", "Village 2", ...]
    
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            const insertedVillages = [];
            
            for (const villageName of villages) {
                const result = await client.query(
                    'INSERT INTO villages (mandal_id, name) VALUES ($1, $2) RETURNING *',
                    [mandal_id, villageName]
                );
                insertedVillages.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            res.json(insertedVillages);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add villages' });
    }
};

// Add multiple villages to sector (bulk)
const addMultipleVillagesToSector = async (req, res) => {
    const { sector_id, villages } = req.body; // villages: ["Village 1", "Village 2", ...]
    
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            const insertedVillages = [];
            
            for (const villageName of villages) {
                const result = await client.query(
                    'INSERT INTO villages (sector_id, name) VALUES ($1, $2) RETURNING *',
                    [sector_id, villageName]
                );
                insertedVillages.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            res.json(insertedVillages);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add villages' });
    }
};

// ============================
// 7. HELPER/LOOKUP FUNCTIONS
// ============================

// Get state details with all districts
const getStateDetails = async (req, res) => {
    const { stateId } = req.params;
    
    try {
        const stateResult = await pool.query('SELECT * FROM states WHERE id = $1', [stateId]);
        const districtsResult = await pool.query(
            'SELECT * FROM districts WHERE state_id = $1 ORDER BY name',
            [stateId]
        );
        
        res.json({
            state: stateResult.rows[0],
            districts: districtsResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch state details' });
    }
};

// Get district details with all children
const getDistrictDetails = async (req, res) => {
    const { districtId } = req.params;
    
    try {
        const districtResult = await pool.query(
            'SELECT d.*, s.name as state_name FROM districts d JOIN states s ON d.state_id = s.id WHERE d.id = $1',
            [districtId]
        );
        
        const mandalsResult = await pool.query(
            'SELECT * FROM mandals WHERE district_id = $1 ORDER BY name',
            [districtId]
        );
        
        const sectorsResult = await pool.query(
            'SELECT * FROM sectors WHERE district_id = $1 ORDER BY name',
            [districtId]
        );
        
        const townsResult = await pool.query(
            'SELECT * FROM towns WHERE district_id = $1 ORDER BY name',
            [districtId]
        );
        
        res.json({
            district: districtResult.rows[0],
            mandals: mandalsResult.rows,
            sectors: sectorsResult.rows,
            towns: townsResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch district details' });
    }
};

// Search location by name
const searchLocation = async (req, res) => {
    const { query } = req.query;
    
    try {
        const searchTerm = `%${query}%`;
        const result = await pool.query(`
            SELECT 'state' as type, id, name, code FROM states WHERE name ILIKE $1 OR code ILIKE $1
            UNION
            SELECT 'district' as type, d.id, d.name, d.code FROM districts d WHERE d.name ILIKE $1 OR d.code ILIKE $1
            UNION
            SELECT 'mandal' as type, m.id, m.name, NULL as code FROM mandals m WHERE m.name ILIKE $1
            UNION
            SELECT 'sector' as type, s.id, s.name, s.code FROM sectors s WHERE s.name ILIKE $1 OR s.code ILIKE $1
            UNION
            SELECT 'town' as type, t.id, t.name, NULL as code FROM towns t WHERE t.name ILIKE $1
            UNION
            SELECT 'village' as type, v.id, v.name, NULL as code FROM villages v WHERE v.name ILIKE $1
            LIMIT 50
        `, [searchTerm]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to search locations' });
    }
};

const deleteState = async (req, res) => {
    const { stateId } = req.params;

    try {
        await pool.query('DELETE FROM states WHERE id = $1', [stateId]);
        res.json({ message: 'State deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete state' });
    }
};

const deleteDistrict = async (req, res) => {
    const { districtId } = req.params;

    try {
        await pool.query('DELETE FROM districts WHERE id = $1', [districtId]);
        res.json({ message: 'District deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete district' });
    }
};

const deleteMandal = async (req, res) => {
    const { mandalId } = req.params;

    try {
        await pool.query('DELETE FROM mandals WHERE id = $1', [mandalId]);
        res.json({ message: 'Mandal deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete mandal' });
    }
};

const deleteSector = async (req, res) => {
    const { sectorId } = req.params;

    try {
        await pool.query('DELETE FROM sectors WHERE id = $1', [sectorId]);
        res.json({ message: 'Sector deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete sector' });
    }
};

const deleteTown = async (req, res) => {
    const { townId } = req.params;

    try {
        await pool.query('DELETE FROM towns WHERE id = $1', [townId]);
        res.json({ message: 'Town deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete town' });
    }
};

const deleteVillage = async (req, res) => {
    const { villageId } = req.params;

    try {
        await pool.query('DELETE FROM villages WHERE id = $1', [villageId]);
        res.json({ message: 'Village deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete village' });
    }
};


module.exports = {
    getStates,
    addState,
    addMultipleStates,
    
    getDistrictsByState,
    addDistrict,
    addMultipleDistricts,
    
    getMandalsByDistrict,
    addMandal,
    addMultipleMandals,
    
    getSectorsByDistrict,
    addSector,
    addMultipleSectors,
    
    getTownsByDistrict,
    addTown,
    addMultipleTowns,
    
    getVillagesByMandal,
    getVillagesBySector,
    addVillageToMandal,
    addVillageToSector,
    addMultipleVillagesToMandal,
    addMultipleVillagesToSector,
    
    getStateDetails,
    getDistrictDetails,
    searchLocation,
    deleteState,
    deleteDistrict,
    deleteMandal,
    deleteSector,
    deleteTown,
    deleteVillage
};