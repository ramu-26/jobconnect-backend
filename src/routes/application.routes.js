const express = require("express");
const router = express.Router();

const {
  applyForJob,
  getMyApplications,
  getApplicantsByJob,
  updateApplicationStatus,
  getApplicationById,
} = require("../controllers/application.controller");

const authenticate = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

router.use(authenticate);

// Keep specific routes before /:id.
router.post("/", allowRoles("employee"), applyForJob);
router.get("/my", allowRoles("employee"), getMyApplications);
router.get("/job/:jobId", allowRoles("company"), getApplicantsByJob);
router.put("/:id/status", allowRoles("company"), updateApplicationStatus);
router.get("/:id", getApplicationById);

module.exports = router;