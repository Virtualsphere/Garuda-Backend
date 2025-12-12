const pool = require('../db/db');

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM roles ORDER BY created_at DESC`
    );
    
    res.status(200).json({
      success: true,
      roles: result.rows
    });
  } catch (error) {
    console.error("Get roles error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get single role
const getRole = async (req, res) => {
  try {
    const { roleName } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM roles WHERE name = $1`,
      [roleName]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }
    
    res.status(200).json({
      success: true,
      role: result.rows[0]
    });
  } catch (error) {
    console.error("Get role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const createRole = async (req, res) => {
  try {
    let { name, permissions = {} } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: "Role name is required" });
    }

    // Convert name to lowercase
    name = name.toLowerCase().trim();

    // Check if role already exists
    const checkResult = await pool.query(
      `SELECT id FROM roles WHERE name = $1`,
      [name]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: "Role already exists" });
    }

    const result = await pool.query(
      `INSERT INTO roles (name, permissions) 
       VALUES ($1, $2) 
       RETURNING *`,
      [name, JSON.stringify(permissions)]
    );

    res.status(201).json({
      success: true,
      message: "✅ Role created successfully",
      role: result.rows[0]
    });
  } catch (error) {
    console.error("Create role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update role permissions
const updateRolePermissions = async (req, res) => {
  try {
    const { roleName } = req.params;
    const { permissions } = req.body;
    
    // Check if role exists
    const checkResult = await pool.query(
      `SELECT id FROM roles WHERE name = $1`,
      [roleName]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }
    
    const result = await pool.query(
      `UPDATE roles 
       SET permissions = $1, updated_at = CURRENT_TIMESTAMP
       WHERE name = $2 
       RETURNING *`,
      [JSON.stringify(permissions), roleName]
    );
    
    res.status(200).json({
      success: true,
      message: "✅ Role permissions updated",
      role: result.rows[0]
    });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const { roleName } = req.params;
    
    // Check if any users have this role
    const usersResult = await pool.query(
      `SELECT COUNT(*) FROM users WHERE role = $1`,
      [roleName]
    );
    
    if (parseInt(usersResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: "Cannot delete role. Users are assigned to this role." 
      });
    }
    
    const result = await pool.query(
      `DELETE FROM roles WHERE name = $1 RETURNING id`,
      [roleName]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }
    
    res.status(200).json({
      success: true,
      message: "✅ Role deleted successfully"
    });
  } catch (error) {
    console.error("Delete role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get user's permissions based on JWT token role
const getUserPermissions = async (req, res) => {
  try {
    const userRole = req.user.role; // From JWT token
    
    const result = await pool.query(
      `SELECT permissions FROM roles WHERE name = $1`,
      [userRole]
    );
    
    if (result.rows.length === 0) {
      // Return default permissions if role not found
      return res.status(200).json({
        success: true,
        permissions: {
          "Dashboard": true,
          "My Profile": true
        }
      });
    }
    
    res.status(200).json({
      success: true,
      permissions: result.rows[0].permissions || {}
    });
  } catch (error) {
    console.error("Get user permissions error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get current user's role (for frontend)
const getMyRole = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      role: req.user.role
    });
  } catch (error) {
    console.error("Get my role error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
    getAllRoles,
    getRole,
    createRole,
    updateRolePermissions,
    deleteRole,
    getUserPermissions,
    getMyRole
}