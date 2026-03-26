const bcrypt = require("bcryptjs");

const { User } = require("../models");
const { ROLES } = require("../constants/roles");
const { signAccessToken } = require("../utils/jwt");

function validateRole(role) {
  return typeof role === "string" && ROLES.includes(role);
}

async function register(req, res) {
  const { email, password, role } = req.body || {};

  if (!email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "email, password, and role are required",
    });
  }

  if (!validateRole(role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role. Allowed: ${ROLES.join(", ")}`,
    });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "User already exists for this email",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
  });

  return res.status(201).json({
    success: true,
    user: { id: user._id, email: user.email, role: user.role },
  });
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "email and password are required",
    });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  return res.status(200).json({
    success: true,
    token,
    user: { id: user._id, email: user.email, role: user.role },
  });
}

module.exports = {
  register,
  login,
};

