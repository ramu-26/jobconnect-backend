const express = require("express");
const router = express.Router();

const {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
} = require("../controllers/job.controller");

const authenticate = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

// Public routes
router.get("/", getJobs);
router.post("/test", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Correct JobConnect POST route reached",
  });
});

// Put /my BEFORE /:id so "my" isn't treated as a job ID.
router.get("/my", authenticate, allowRoles("company"), getMyJobs);

router.get("/:id", getJobById);

// Company-only routes
router.post("/", authenticate, allowRoles("company"), createJob);
router.put("/:id", authenticate, allowRoles("company"), updateJob);
router.delete("/:id", authenticate, allowRoles("company"), deleteJob);

module.exports = router;