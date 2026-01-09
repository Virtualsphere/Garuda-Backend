const express = require('express');
const dotenv = require('dotenv');
const cors = require("cors");
const path = require("path");

// Import table creation functions
const { createUserTable } = require('./src/model/userModel');
const { createTables } = require('./src/model/landModel');
const { createWalletTable }= require('./src/model/walletModel');
const { buyerTable }= require('./src/model/buyerModel');
const { createLocation }= require('./src/model/locationModel');
const { createLandCode }= require('./src/model/landCodeModel');
const { createRoleTable }= require('./src/model/roleModel');
const { createAgent } = require('./src/model/agentModel');
const { creatLandPurchaseRequestTable }= require('./src/model/landPurchaseRequest');

// Import database pool
const pool = require('./src/db/db'); // Make sure you have this file

// Import routes
const registerRoutes = require('./src/routes/registerRoutes');
const userRoutes= require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const agentRoutes = require('./src/routes/agentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const baseRoutes= require('./src/routes/baseRoutes');
const regionalRoutes= require('./src/routes/regionalRoutes');
const roleRoutes= require('./src/routes/permissionRoutes');
const marketingRoutes= require('./src/routes/marketingRoutes');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "./src/public")));

// Routes
app.use('/api', registerRoutes);
app.use('/auth', authRoutes);
app.use('/field-executive', agentRoutes);
app.use('/admin', adminRoutes);
app.use('/regional', regionalRoutes);
app.use('/location', baseRoutes);
app.use('/roles', roleRoutes);
app.use('/user', userRoutes);
app.use('/marketing', marketingRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Welcome to Garuda Server");
});

// Function to create default roles
const createDefaultRoles = async () => {
  try {
    // Check if roles table has data
    const result = await pool.query(`SELECT COUNT(*) FROM roles`);
    
    if (parseInt(result.rows[0].count) === 0) {
      console.log("Creating default roles...");
      
      // Create Director/Founder role (has all permissions)
      const allPermissions = {
        "Dashboard": true,
        "Data Entry": true,
        "Buyers": true,
        "Budget": true,
        "Lands": true,
        "Stock": true,
        "Land Codes": true,
        "Access Controls": true,
        "New Land": true,
        "Agents": true,
        "Garuda Map": true,
        "Investors": true,
        "Company Profile": true,
        "Legal & Docs": true,
        "Garuda Points": true,
        "Lands Data and Verification": true,
        "Employees": true,
        "Home": true,
        "My Profile": true,
        "Schedule": true,
        "Locations": true,
        "Travel Wallet": true,
        "Land Wallet": true,
        "CRM": true
      };
      
      await pool.query(
        `INSERT INTO roles (name, permissions) 
         VALUES ($1, $2)`,
        ['admin', JSON.stringify(allPermissions)]
      );

      console.log("✅ Default roles created successfully");
    } else {
      console.log("✅ Roles table already has data, skipping default role creation");
    }
  } catch (error) {
    console.error("Error creating default roles:", error);
  }
};

// Function to initialize all tables and data
const initializeDatabase = async () => {
  try {
    console.log("Initializing database tables...");
    
    // Create tables in sequence
    await createUserTable();
    await createTables();
    await createWalletTable();
    await buyerTable();
    await createLocation();
    await createAgent();
    await createLandCode();
    await createRoleTable();
    await createDefaultRoles();
    await creatLandPurchaseRequestTable();
    
    console.log("✅ Database initialization completed");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, async () => {
  try {
    await initializeDatabase();
    console.log(`🚀 Server running on port ${PORT}`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

module.exports = app;