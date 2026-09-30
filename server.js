require("dotenv").config();

const app = require("./app");
const pool = require("./src/config/db");

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing from .env");
  process.exit(1);
}

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully");

    app.listen(PORT, () => {
      console.log(`JobConnect server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();