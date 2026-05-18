const express = require("express");
const router = express.Router();

const {
  login,
  getMe,
  updateProfile,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/auth");

router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.put("/profile", authMiddleware, updateProfile);


module.exports = router;