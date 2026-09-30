const pool = require("../config/db");

// GET /profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let result;

    if (role === "employee") {
      // Fetch employee details only
      result = await pool.query(
        `SELECT
           u.id,
           u.name,
           u.email,
           u.role,
           u.created_at,
           e.phone,
           e.location,
           e.skills,
           e.experience,
           e.resume_url
         FROM users u
         LEFT JOIN employees e ON e.user_id = u.id
         WHERE u.id = $1`,
        [userId]
      );
    } else if (role === "company") {
      // Fetch company details only
      result = await pool.query(
        `SELECT
           u.id,
           u.name,
           u.email,
           u.role,
           u.created_at,
           c.company_name,
           c.phone AS company_phone,
           c.location AS company_location,
           c.website,
           c.industry,
           c.description
         FROM users u
         LEFT JOIN companies c ON c.user_id = u.id
         WHERE u.id = $1`,
        [userId]
      );
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid user role",
      });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

// PUT /profile
const updateProfile = async (req, res) => {
  const {
    name, phone, location, skills, experience, resume_url,
    company_name, website, industry, description,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET name = COALESCE($1, name), updated_at = NOW()
       WHERE id = $2`,
      [name ?? null, req.user.id]
    );

    if (req.user.role === "employee") {
      await client.query(
        `UPDATE employees
         SET phone = COALESCE($1, phone),
             location = COALESCE($2, location),
             skills = COALESCE($3, skills),
             experience = COALESCE($4, experience),
             resume_url = COALESCE($5, resume_url)
         WHERE user_id = $6`,
        [
          phone ?? null, location ?? null, skills ?? null,
          experience ?? null, resume_url ?? null, req.user.id,
        ]
      );
    } else if (req.user.role === "company") {
      await client.query(
        `UPDATE companies
         SET company_name = COALESCE($1, company_name),
             phone = COALESCE($2, phone),
             location = COALESCE($3, location),
             website = COALESCE($4, website),
             industry = COALESCE($5, industry),
             description = COALESCE($6, description)
         WHERE user_id = $7`,
        [
          company_name ?? null, phone ?? null, location ?? null,
          website ?? null, industry ?? null, description ?? null,
          req.user.id,
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error.message);

    if (["23514", "22P02", "22003"].includes(error.code)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile data",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  } finally {
    client.release();
  }
};

module.exports = { getProfile, updateProfile };