const express = require('express');
const dotenv = require('dotenv');
const cors = require("cors");
const path = require("path");

const { createUserTable } = require('./src/model/userModel');
const { createTables } = require('./src/model/landModel');
const { createWalletTable }= require('./src/model/walletModel');
const { buyerTable }= require('./src/model/buyerModel');
const { createLocation }= require('./src/model/locationModel');
const { createLandCode }= require('./src/model/landCodeModel');

const userRoutes = require('./src/routes/registerRoutes');
const authRoutes = require('./src/routes/authRoutes');
const agentRoutes = require('./src/routes/agentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const baseRoutes= require('./src/routes/baseRoutes');
const regionalRoutes= require('./src/routes/regionalRoutes')
const { createAgent } = require('./src/model/agentModel');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "./src/public")));

// Routes
app.use('/api', userRoutes);
app.use('/auth', authRoutes);
app.use('/field-executive', agentRoutes);
app.use('/admin', adminRoutes);
app.use('/regional', regionalRoutes)
app.use('/location', baseRoutes);
app.get("/", (req, res) => {
  res.send("welcome to Gadura server");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await createUserTable();
  await createTables();
  await createWalletTable();
  await buyerTable();
  await createLocation();
  await createAgent();
  await createLandCode();
  console.log(`🚀 Server running on port ${PORT}`);
});