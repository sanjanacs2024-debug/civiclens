const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  issueId: { type: String, required: true, index: true },
  issueTitle: { type: String, trim: true, maxlength: 160 },
  action: { type: String, required: true, enum: [
    "ISSUE_REPORTED",
    "ISSUE_ASSIGNED",
    "ISSUE_REASSIGNED",
    "STATUS_CHANGED",
    "PROGRESS_UPDATE",
    "PROGRESS_PHOTO_UPLOADED",
    "ESCALATED",
    "DEPARTMENT_CHANGED",
    "WORKER_ASSIGNED",
    "NOTE_ADDED",
    "ISSUE_RESOLVED",
    "ISSUE_CLOSED",
  ] },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  performedByName: { type: String, trim: true, maxlength: 120 },
  performedByRole: { type: String, trim: true, maxlength: 32 },
  previousValue: { type: String, trim: true, maxlength: 500 },
  newValue: { type: String, trim: true, maxlength: 500 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, trim: true },
  userAgent: { type: String, trim: true },
}, { timestamps: { createdAt: "createdAt", updatedAt: false } });

activityLogSchema.index({ issueId: 1, createdAt: -1 });
activityLogSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);