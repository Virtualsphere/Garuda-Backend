const pool = require("../db/db");
const axios = require("axios");

const generateLandCodes = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { state_id, district_id, town_id, prefix, count } = req.body;
        
        // Validate input
        if (!state_id || !district_id || !town_id || !prefix || !count) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Missing required fields: state_id, district_id, town_id, prefix, count' 
            });
        }
        
        if (count > 1000) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Cannot generate more than 1000 codes at once' 
            });
        }
        
        // Check if town exists
        const townCheck = await client.query(
            'SELECT t.name as town_name, d.name as district_name, s.name as state_name ' +
            'FROM towns t ' +
            'JOIN districts d ON t.district_id = d.id ' +
            'JOIN states s ON d.state_id = s.id ' +
            'WHERE t.id = $1',
            [town_id]
        );
        
        if (townCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Town not found' });
        }
        
        const { town_name, district_name, state_name } = townCheck.rows[0];
        
        // Generate land codes
        const generatedCodes = [];
        const existingCodesQuery = await client.query(
            'SELECT land_code FROM land_code WHERE town_id = $1',
            [town_id]
        );
        
        const existingCodes = new Set(existingCodesQuery.rows.map(row => row.land_code));
        
        for (let i = 1; i <= count; i++) {
            let codeNumber = i;
            let landCode = `${prefix}@${codeNumber.toString().padStart(2, '0')}`;
            
            // Ensure unique code
            while (existingCodes.has(landCode)) {
                codeNumber++;
                landCode = `${prefix}@${codeNumber.toString().padStart(2, '0')}`;
            }
            
            // Insert land code
            const result = await client.query(
                `INSERT INTO land_code 
                (land_code, state_id, district_id, town_id, status) 
                VALUES ($1, $2, $3, $4, 'Available') 
                RETURNING land_code, id`,
                [landCode, state_id, district_id, town_id]
            );
            
            generatedCodes.push({
                id: result.rows[0].id,
                land_code: result.rows[0].land_code,
                status: 'Available'
            });
            
            existingCodes.add(landCode);
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({
            message: `${generatedCodes.length} land codes generated successfully`,
            town: town_name,
            district: district_name,
            state: state_name,
            data: generatedCodes
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error generating land codes:', error);
        res.status(500).json({ error: 'Failed to generate land codes' });
    } finally {
        client.release();
    }
};

const getLandCodesByLocation = async (req, res) => {
    try {
        const { state_id, district_id, town_id, status } = req.query;
        
        // FIXED: Removed LEFT JOIN villages since we're not using village_id anymore
        let query = `
            SELECT 
                lc.*,
                s.name as state_name,
                d.name as district_name,
                t.name as town_name
                -- village_name is already in lc.*
            FROM land_code lc
            LEFT JOIN states s ON lc.state_id = s.id
            LEFT JOIN districts d ON lc.district_id = d.id
            LEFT JOIN towns t ON lc.town_id = t.id
            WHERE 1=1
        `;
        
        const values = [];
        let paramCount = 1;
        
        if (state_id) {
            query += ` AND lc.state_id = $${paramCount}`;
            values.push(state_id);
            paramCount++;
        }
        
        if (district_id) {
            query += ` AND lc.district_id = $${paramCount}`;
            values.push(district_id);
            paramCount++;
        }
        
        if (town_id) {
            query += ` AND lc.town_id = $${paramCount}`;
            values.push(town_id);
            paramCount++;
        }
        
        if (status) {
            query += ` AND lc.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }
        
        query += ` ORDER BY lc.land_code`;
        
        const result = await pool.query(query, values);
        
        res.json({
            message: 'Land codes fetched successfully',
            count: result.rows.length,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching land codes:', error);
        res.status(500).json({ error: 'Failed to fetch land codes' });
    }
};

const getLandCodeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                lc.*,
                s.name as state_name,
                d.name as district_name,
                t.name as town_name
                -- Removed: LEFT JOIN villages v ON lc.village_id = v.id
            FROM land_code lc
            LEFT JOIN states s ON lc.state_id = s.id
            LEFT JOIN districts d ON lc.district_id = d.id
            LEFT JOIN towns t ON lc.town_id = t.id
            WHERE lc.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Land code not found' });
        }
        
        res.json({
            message: 'Land code fetched successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching land code:', error);
        res.status(500).json({ error: 'Failed to fetch land code' });
    }
};

const updateLandCode = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { farmer_name, farmer_phone, village_name, status } = req.body;
        
        // Check if land code exists and is available
        const landCodeCheck = await client.query(
            'SELECT * FROM land_code WHERE id = $1',
            [id]
        );
        
        if (landCodeCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Land code not found' });
        }
        
        const landCode = landCodeCheck.rows[0];
        
        if (landCode.status !== 'Available' && status === 'Assigned') {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: `Land code is already ${landCode.status}` 
            });
        }
        
        // Update land code
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        
        if (farmer_name !== undefined) {
            updateFields.push(`farmer_name = $${paramCount}`);
            updateValues.push(farmer_name);
            paramCount++;
        }
        
        if (farmer_phone !== undefined) {
            updateFields.push(`farmer_phone = $${paramCount}`);
            updateValues.push(farmer_phone);
            paramCount++;
        }
        
        if (status !== undefined) {
            updateFields.push(`status = $${paramCount}`);
            updateValues.push(status);
            paramCount++;
            
            if (status === 'Assigned') {
                updateFields.push(`allotted_date = CURRENT_TIMESTAMP`);
            }
        }

        if (village_name !== undefined){
          updateFields.push(`village_name= $${paramCount}`);
          updateValues.push(village_name);
          paramCount++;
        }
        
        if (updateFields.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE land_code 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;
        
        const result = await client.query(updateQuery, updateValues);
        
        await client.query('COMMIT');
        
        res.json({
            message: 'Land code updated successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating land code:', error);
        res.status(500).json({ error: 'Failed to update land code' });
    } finally {
        client.release();
    }
};

const deleteLandCode = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM land_code WHERE id = $1 RETURNING land_code',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Land code not found' });
        }
        
        res.json({
            message: 'Land code deleted successfully',
            land_code: result.rows[0].land_code
        });
        
    } catch (error) {
        console.error('Error deleting land code:', error);
        res.status(500).json({ error: 'Failed to delete land code' });
    }
};

const getLandCodeStats = async (req, res) => {
    try {
        const { state_id, district_id, town_id } = req.query;
        
        let whereClause = '';
        const values = [];
        let paramCount = 1;
        
        if (state_id) {
            whereClause += ` WHERE state_id = $${paramCount}`;
            values.push(state_id);
            paramCount++;
        }
        
        if (district_id) {
            whereClause += whereClause ? ` AND district_id = $${paramCount}` : ` WHERE district_id = $${paramCount}`;
            values.push(district_id);
            paramCount++;
        }
        
        if (town_id) {
            whereClause += whereClause ? ` AND town_id = $${paramCount}` : ` WHERE town_id = $${paramCount}`;
            values.push(town_id);
            paramCount++;
        }
        
        const statsQuery = `
            SELECT 
                status,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM land_code
            ${whereClause}
            GROUP BY status
            ORDER BY status
        `;
        
        const result = await pool.query(statsQuery, values);
        
        const totalQuery = `SELECT COUNT(*) as total FROM land_code ${whereClause}`;
        const totalResult = await pool.query(totalQuery, values);
        
        res.json({
            message: 'Land code statistics fetched successfully',
            total: parseInt(totalResult.rows[0].total),
            stats: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching land code stats:', error);
        res.status(500).json({ error: 'Failed to fetch land code statistics' });
    }
};

const bulkUpdateLandCodes = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { updates } = req.body; // Array of {id, farmer_name, farmer_phone, village_id, status}
        
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No updates provided' });
        }
        
        const updatedCodes = [];
        const errors = [];
        
        for (const update of updates) {
            try {
                const { id, farmer_name, farmer_phone, village_id, status } = update;
                
                // Check if land code exists
                const checkResult = await client.query(
                    'SELECT land_code, status FROM land_code WHERE id = $1',
                    [id]
                );
                
                if (checkResult.rows.length === 0) {
                    errors.push({ id, error: 'Land code not found' });
                    continue;
                }
                
                const currentStatus = checkResult.rows[0].status;
                
                if (currentStatus !== 'Available' && status === 'Assigned') {
                    errors.push({ 
                        id, 
                        error: `Land code is already ${currentStatus}` 
                    });
                    continue;
                }
                
                // Build update query
                const updateFields = [];
                const updateValues = [];
                let paramCount = 1;
                
                if (farmer_name !== undefined) {
                    updateFields.push(`farmer_name = $${paramCount}`);
                    updateValues.push(farmer_name);
                    paramCount++;
                }
                
                if (farmer_phone !== undefined) {
                    updateFields.push(`farmer_phone = $${paramCount}`);
                    updateValues.push(farmer_phone);
                    paramCount++;
                }
                
                if (village_id !== undefined) {
                    updateFields.push(`village_id = $${paramCount}`);
                    updateValues.push(village_id);
                    paramCount++;
                }
                
                if (status !== undefined) {
                    updateFields.push(`status = $${paramCount}`);
                    updateValues.push(status);
                    paramCount++;
                    
                    if (status === 'Assigned') {
                        updateFields.push(`allotted_date = CURRENT_TIMESTAMP`);
                    }
                }
                
                updateValues.push(id);
                
                const updateQuery = `
                    UPDATE land_code 
                    SET ${updateFields.join(', ')}
                    WHERE id = $${paramCount}
                    RETURNING land_code, farmer_name, status
                `;
                
                const result = await client.query(updateQuery, updateValues);
                updatedCodes.push(result.rows[0]);
                
            } catch (error) {
                errors.push({ id: update.id, error: error.message });
            }
        }
        
        await client.query('COMMIT');
        
        res.json({
            message: 'Bulk update completed',
            updated: updatedCodes.length,
            data: updatedCodes,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in bulk update:', error);
        res.status(500).json({ error: 'Failed to perform bulk update' });
    } finally {
        client.release();
    }
};

module.exports = {
  bulkUpdateLandCodes,
  getLandCodeById,
  getLandCodeStats,
  deleteLandCode,
  updateLandCode,
  getLandCodesByLocation,
  generateLandCodes,
};