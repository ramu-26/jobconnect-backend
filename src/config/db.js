const { Pool } = require("pg");
require("dotenv").config();

const isNeon = Boolean(process.env.DATABASE_URL?.trim());

const pool = isNeon
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "jobconnect",
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error.message);
});

module.exports = pool;