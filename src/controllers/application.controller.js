const pool = require("../config/db");

// POST /applications — employee applies
const applyForJob = async (req, res) => {
  const { job_id, cover_letter } = req.body;

  if (!job_id) {
    return res.status(400).json({
      success: false,
      message: "job_id is required",
    });
  }

  try {
    const job = await pool.query(
      "SELECT id FROM jobs WHERE id = $1 AND status = 'open'",
      [job_id]
    );

    if (!job.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Open job not found",
      });
    }

    const result = await pool.query(
      `INSERT INTO applications (job_id, employee_id, cover_letter)
       VALUES ($1, $2, $3)
       ON CONFLICT (job_id, employee_id) DO NOTHING
       RETURNING *`,
      [job_id, req.user.id, cover_letter || null]
    );

    if (!result.rows.length) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    res.status(201).json({
      success: true,
      message: "Application submitted",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid job or employee profile",
      });
    }
    console.error(error.message);
    res.status(500).json({ success: false, message: "Failed to apply" });
  }
};

// GET /applications/my — employee's applications
const getMyApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, j.title AS job_title, j.location AS job_location,
              j.job_type, c.company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN companies c ON c.user_id = j.company_id
       WHERE a.employee_id = $1
       ORDER BY a.applied_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your applications",
    });
  }
};

// GET /applications/job/:jobId — company's applicants
const getApplicantsByJob = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id AS application_id, a.status, a.cover_letter,
              a.applied_at, u.name, u.email, e.phone, e.location,
              e.skills, e.experience, e.resume_url,
              j.id AS job_id, j.title AS job_title
       FROM applications a
       JOIN users u ON u.id = a.employee_id
       JOIN employees e ON e.user_id = a.employee_id
       JOIN jobs j ON j.id = a.job_id
       WHERE a.job_id = $1 AND j.company_id = $2
       ORDER BY a.applied_at DESC`,
      [req.params.jobId, req.user.id]
    );

    // Also verify ownership if the job has no applicants.
    const job = await pool.query(
      "SELECT id FROM jobs WHERE id = $1 AND company_id = $2",
      [req.params.jobId, req.user.id]
    );

    if (!job.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not own this job",
      });
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applicants",
    });
  }
};

// PUT /applications/:id/status — company updates status
const updateApplicationStatus = async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = [
    "pending", "reviewing", "shortlisted", "rejected", "accepted",
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid application status",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE applications a
       SET status = $1, updated_at = NOW()
       FROM jobs j
       WHERE a.id = $2
         AND j.id = a.job_id
         AND j.company_id = $3
       RETURNING a.*`,
      [status, req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Application not found or not accessible",
      });
    }

    res.json({
      success: true,
      message: "Application status updated",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update application status",
    });
  }
};

// GET /applications/:id — employee or owning company views application
const getApplicationById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, j.title AS job_title, j.company_id,
              u.name AS employee_name, u.email AS employee_email,
              e.phone, e.location, e.skills, e.experience, e.resume_url,
              c.company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.employee_id
       JOIN employees e ON e.user_id = a.employee_id
       JOIN companies c ON c.user_id = j.company_id
       WHERE a.id = $1
         AND (a.employee_id = $2 OR j.company_id = $2)`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch application",
    });
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getApplicantsByJob,
  updateApplicationStatus,
  getApplicationById,
};