const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    location,
    skills,
    experience,
    resume_url,
    company_name,
    website,
    industry,
    description,
  } = req.body;

  const normalizedEmail = email?.trim().toLowerCase();

  if (
    !name?.trim() ||
    !normalizedEmail ||
    !password ||
    !["employee", "company"].includes(role)
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, email, password and a valid role are required",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least 8 characters",
    });
  }

  if (
    role === "company" &&
    (!company_name?.trim() || !phone?.trim() || !location?.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Company name, phone and location are required",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name.trim(), normalizedEmail, passwordHash, role]
    );

    const user = userResult.rows[0];

    if (role === "employee") {
      await client.query(
        `INSERT INTO employees
         (user_id, phone, location, skills, experience, resume_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          phone || null,
          location || null,
          skills || null,
          experience ?? 0,
          resume_url || null,
        ]
      );
    } else {
      await client.query(
        `INSERT INTO companies
         (user_id, company_name, phone, location, website, industry, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user.id,
          company_name.trim(),
          phone.trim(),
          location.trim(),
          website || null,
          industry || null,
          description || null,
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: user,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    if (error.code === "23514" || error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid registration data",
      });
    }

    console.error("Register error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

module.exports = { register, login };