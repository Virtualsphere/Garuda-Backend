const pool = require("../db/db");

const createRoleTable= async ()=>{
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        permissions JSONB DEFAULT '{}',
        section_permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_key VARCHAR(100) NOT NULL,
        section VARCHAR(100) NOT NULL,
        has_access BOOLEAN DEFAULT false,
        UNIQUE(role_id, permission_key, section)
      );
    `);
}

module.exports= { createRoleTable };