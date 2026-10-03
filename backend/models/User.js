const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 32 },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["citizen", "field_worker", "department_officer", "admin", "super_admin"], default: "citizen" },
  department: { type: String, trim: true, maxlength: 120 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);