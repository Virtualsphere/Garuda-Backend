const express = require('express');
const dotenv = require('dotenv');
const cors = require("cors");
const path = require("path");

const { createUserTable } = require('./src/controller/registerController');
const { createTables } = require('./src/controller/agentController');

const userRoutes = require('./src/routes/registerRoutes');
const authRoutes = require('./src/routes/authRoutes');
const agentRoutes = require('./src/routes/agentRoutes');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "./src/public")));

// Routes
app.use('/api', userRoutes);
app.use('/auth', authRoutes);
app.use('/agent', agentRoutes);
app.get("/", (req, res) => {
  res.send("welcome to Gadura server");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await createUserTable();
  await createTables();
  console.log(`🚀 Server running on port ${PORT}`);
});