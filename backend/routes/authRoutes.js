const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../authMiddleware");

const router = express.Router();

// The shared users collection carries unique indexes on both email and phone.
// A duplicate-key error therefore has to be matched to the field that actually
// clashed, otherwise a phone collision is reported as an email collision.
function duplicateKeyField(error) {
  if (error.keyPattern) return Object.keys(error.keyPattern)[0] || null;
  if (error.keyValue) return Object.keys(error.keyValue)[0] || null;
  const match = String(error.message || "").match(/index:\s+([A-Za-z0-9]+?)_\d/);
  return match ? match[1] : null;
}

router.use((req, res, next) => {
  if (require("mongoose").connection.readyState !== 1) {
    return res.status(503).json({ success: false, error: "Database is temporarily unavailable." });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ success: false, error: "Authentication is not configured on the server." });
  }
  next();
});

router.post("/register", async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ success: false, error: "Please fill in all required fields." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "Enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
  }

  const existingUser = await User.findOne({ email }).select("_id");
  if (existingUser) return res.status(409).json({ success: false, error: "Email already registered." });

  const existingPhone = await User.findOne({ phone }).select("_id");
  if (existingPhone) return res.status(409).json({ success: false, error: "Phone number is already registered to another account." });

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, password: hashedPassword, role: "citizen" });
    res.status(201).json({ success: true, data: { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } } });
  } catch (error) {
    if (error.code === 11000) {
      const field = duplicateKeyField(error);
      if (field === "email") return res.status(409).json({ success: false, error: "Email already registered." });
      if (field === "phone") return res.status(409).json({ success: false, error: "Phone number is already registered to another account." });
      return res.status(409).json({ success: false, error: "That email or phone number is already registered." });
    }
    if (error.name === "ValidationError") return res.status(400).json({ success: false, error: "Please check the account details and try again." });
    throw error;
  }
});

router.post("/login", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!email || !password) return res.status(400).json({ success: false, error: "Please enter your email and password." });

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, error: "Invalid email or password." });
  }

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    },
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    data: { user: { id: req.user.id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role } },
  });
});

module.exports = router;