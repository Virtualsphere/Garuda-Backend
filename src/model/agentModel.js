
const pool = require("../db/db");

const createAgent = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      agent_id VARCHAR(50) UNIQUE NOT NULL,
      user_id VARCHAR(255) NOT NULL REFERENCES users(unique_id) ON DELETE CASCADE,
      deposit DECIMAL(15,2) DEFAULT 0,
      total_land_worth DECIMAL(15,2) DEFAULT 0,
      attached_lands_count INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_preferences (
      id SERIAL PRIMARY KEY,
      agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      district VARCHAR(100),
      mandal VARCHAR(100),
      village VARCHAR(200),
      UNIQUE(agent_id, district, mandal, village)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_land_attachments (
      id SERIAL PRIMARY KEY,
      agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      land_id VARCHAR(255) NOT NULL REFERENCES land_location(land_id) ON DELETE CASCADE,
      attached_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(agent_id, land_id)
    );
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
  `);

  await pool.query(`
    DROP FUNCTION IF EXISTS update_updated_at_column();
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE 'plpgsql';
  `);

  await pool.query(`
    CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

module.exports = { createAgent };
