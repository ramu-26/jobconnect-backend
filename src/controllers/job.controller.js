const pool = require("../config/db");

// GET /jobs — list open jobs, with optional search filters
const getJobs = async (req, res) => {
  try {
    const { search, location, job_type } = req.query;

    const result = await pool.query(
      `SELECT j.*, c.company_name
       FROM jobs j
       JOIN companies c ON c.user_id = j.company_id
       JOIN users u ON u.id = c.user_id
       WHERE j.status = 'open'
         AND u.is_active = TRUE
         AND ($1::text IS NULL OR
              j.title ILIKE '%' || $1 || '%' OR
              j.skills ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR j.location ILIKE '%' || $2 || '%')
         AND ($3::text IS NULL OR j.job_type = $3)
       ORDER BY j.created_at DESC`,
      [
        search?.trim() || null,
        location?.trim() || null,
        job_type || null,
      ]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Failed to fetch jobs" });
  }
};

// GET /jobs/:id — job details
const getJobById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, c.company_name, c.website, c.industry
       FROM jobs j
       JOIN companies c ON c.user_id = j.company_id
       WHERE j.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Failed to fetch job" });
  }
};

// POST /jobs — company creates a job
const createJob = async (req, res) => {
;

  const {
    title,
    description,
    location,
    job_type,
    experience_required,
    salary_min,
    salary_max,
    skills,
  } = req.body;

  if (
    !title?.trim() ||
    !description?.trim() ||
    !location?.trim() ||
    !job_type?.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Title, description, location and job type are required",
    });
  }

  try {
    const company = await pool.query(
      "SELECT user_id FROM companies WHERE user_id = $1",
      [req.user.id]
    );

    console.log("Company found:", company.rows.length > 0);

    if (!company.rows.length) {
      return res.status(403).json({
        success: false,
        message: "Company profile not found",
      });
    }

    const result = await pool.query(
      `INSERT INTO public.jobs
       (company_id, title, description, location, job_type,
        experience_required, salary_min, salary_max, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        title.trim(),
        description.trim(),
        location.trim(),
        job_type.trim(),
        experience_required ?? 0,
        salary_min ?? null,
        salary_max ?? null,
        skills || null,
      ]
    );

    console.log("Inserted job:", result.rows[0]);
  

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("CREATE JOB ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: error.message,
    });
  }
};

// PUT /jobs/:id — update own job
const updateJob = async (req, res) => {
  const {
    title, description, location, job_type,
    experience_required, salary_min, salary_max, skills, status,
  } = req.body;

  if (status !== undefined && !["open", "closed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid job status" });
  }

  try {
    const result = await pool.query(
      `UPDATE jobs
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           job_type = COALESCE($4, job_type),
           experience_required = COALESCE($5, experience_required),
           salary_min = CASE WHEN $6::boolean THEN $7::numeric ELSE salary_min END,
           salary_max = CASE WHEN $8::boolean THEN $9::numeric ELSE salary_max END,
           skills = COALESCE($10, skills),
           status = COALESCE($11, status),
           updated_at = NOW()
       WHERE id = $12 AND company_id = $13
       RETURNING *`,
      [
        title ?? null, description ?? null, location ?? null, job_type ?? null,
        experience_required ?? null,
        Object.hasOwn(req.body, "salary_min"), salary_min ?? null,
        Object.hasOwn(req.body, "salary_max"), salary_max ?? null,
        skills ?? null, status ?? null, req.params.id, req.user.id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not own this job",
      });
    }

    res.json({ success: true, message: "Job updated", data: result.rows[0] });
  } catch (error) {
    if (["23514", "22P02", "22003"].includes(error.code)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job data or salary range",
      });
    }
    console.error(error.message);
    res.status(500).json({ success: false, message: "Failed to update job" });
  }
};

// DELETE /jobs/:id — delete own job
const deleteJob = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM jobs
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Job not found or you do not own this job",
      });
    }

    res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Failed to delete job" });
  }
};

// GET /jobs/my — logged-in company's jobs
const getMyJobs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id)
                AS application_count
       FROM jobs j
       WHERE j.company_id = $1
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Failed to fetch your jobs" });
  }
};

module.exports = {
  getJobs, getJobById, createJob, updateJob, deleteJob, getMyJobs,
};