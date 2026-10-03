const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },
  category: { type: String, required: true, enum: ["Roads & Infrastructure", "Waste & Cleanliness", "Water & Drainage", "Public Safety"] },
  head: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  officers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  fieldWorkers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isActive: { type: Boolean, default: true },
  contactEmail: { type: String, trim: true, maxlength: 254 },
  contactPhone: { type: String, trim: true, maxlength: 32 },
}, { timestamps: true });

module.exports = mongoose.models.Department || mongoose.model("Department", departmentSchema);