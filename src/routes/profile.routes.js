const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile,
} = require("../controllers/profile.controller");

const authenticate = require("../middleware/auth.middleware");

router.use(authenticate);

router.get("/", getProfile);
router.put("/", updateProfile);

module.exports = router;