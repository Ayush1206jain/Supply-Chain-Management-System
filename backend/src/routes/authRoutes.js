const express = require("express");

const authController = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

// Simple endpoint to confirm token works
router.get("/me", authRequired, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;

