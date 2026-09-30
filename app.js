const express = require("express");
const cors = require("cors");
const mainRoutes = require("./src/routes/main.routes");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  origin: "http://192.168.0.109:5173",
  origin: "https://jobconnect-six-xi.vercel.app"
}));

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "JobConnect app.js is responding",
  });
});

// All API modules
app.use("/api/v1", mainRoutes);

// 404 handler — must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

module.exports = app;