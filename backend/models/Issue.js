const mongoose = require("mongoose");

// The real-world municipal resolution deadline, in days. This is the single
// source of truth for the 14 day escalation rule: the stored
// `expectedResolutionDate` below is what services/escalationService.js reads
// when it decides whether an issue may climb the escalation ladder. Demo mode
// never changes this value.
const REAL_ESCALATION_DEADLINE_DAYS = 14;

const progressUpdateSchema = new mongoose.Schema({
	id: { type: String, default: () => `PU-${Date.now()}-${Math.floor(Math.random() * 1000)}` },
	date: { type: Date, default: Date.now },
	status: { type: String, trim: true, required: true },
	description: { type: String, trim: true, default: "" },
	percentage: { type: Number, min: 0, max: 100, default: 0 },
	updatedBy: { type: String, trim: true, default: "Municipal Official" },
	image: { type: String, default: null },
}, { _id: false });

const issueSchema = new mongoose.Schema({
	id: { type: String, required: true, unique: true, index: true },
	title: { type: String, required: true, trim: true, maxlength: 160 },
	description: { type: String, required: true, trim: true, maxlength: 5000 },
	category: {
		type: String,
		required: true,
		enum: ["Roads & Infrastructure", "Waste & Cleanliness", "Water & Drainage", "Public Safety"],
	},
	image: { type: String, required: true },
	location: { type: String, required: true, trim: true, maxlength: 240 },
	area: { type: String, trim: true, maxlength: 160 },
	city: { type: String, trim: true, maxlength: 120 },
	state: { type: String, trim: true, maxlength: 120 },
	country: { type: String, trim: true, maxlength: 120 },
	// "device GPS" means the coordinates came from the browser Geolocation API.
	// "manual" means the citizen typed the area and no verified fix was available.
	locationSource: { type: String, enum: ["device GPS", "manual"], default: "manual" },
	// Left null when the citizen reported an area without a verified position,
	// so the map never plots a fabricated coordinate.
	latitude: { type: Number, min: -90, max: 90, default: null },
	longitude: { type: Number, min: -180, max: 180, default: null },
	reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	reporter: {
		name: { type: String, trim: true, default: "" },
		role: { type: String, trim: true, default: "Citizen" },
	},
	severity: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
	status: {
		type: String,
		enum: ["Reported", "Under Review", "Acknowledged", "In Progress", "Resolved", "Escalated"],
		default: "Reported",
	},
	reportCount: { type: Number, min: 1, default: 1 },
	collectiveSignal: { type: Boolean, default: false },
	collectiveSignalCount: { type: Number, min: 1, default: 1 },
	affectedAreaKm: { type: Number, min: 0, default: 0.1 },
	neglectStatus: { type: String, enum: ["ON TRACK", "ATTENTION", "DEADLINE EXCEEDED"], default: "ON TRACK" },
	escalationLevel: { type: Number, min: 1, default: 1 },
	escalationReason: { type: String, trim: true, default: "Newly registered civic report" },
	department: { type: String, trim: true, default: "Municipal Civic Works" },
	expectedResolutionDate: { type: Date, default: () => new Date(Date.now() + REAL_ESCALATION_DEADLINE_DAYS * 24 * 60 * 60 * 1000) },
	aiAnalysis: {
		detectedCategory: { type: String, trim: true },
		detectedIssue: { type: String, trim: true },
		suggestedSeverity: { type: String, trim: true },
		confidence: { type: Number, min: 0, max: 1 },
	},
	progressUpdates: { type: [progressUpdateSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.models.Issue || mongoose.model("Issue", issueSchema);
module.exports.REAL_ESCALATION_DEADLINE_DAYS = REAL_ESCALATION_DEADLINE_DAYS;
