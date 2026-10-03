const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const escalationService = require("../services/escalationService");
const { requireAuth } = require("../authMiddleware");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "..", "uploads");
const categories = ["Roads & Infrastructure", "Waste & Cleanliness", "Water & Drainage", "Public Safety"];
const statuses = ["Reported", "Under Review", "In Progress", "Resolved", "Escalated"];

fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
	storage: multer.diskStorage({
		destination: uploadDirectory,
		filename: (req, file, callback) => {
			const extensionByType = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
			callback(null, `${crypto.randomUUID()}${extensionByType[file.mimetype] || ".img"}`);
		},
	}),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, callback) => {
		if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) return callback(null, true);
		callback(new Error("Upload a JPG, PNG, WEBP, or GIF image."));
	},
});

router.use((req, res, next) => {
	if (mongoose.connection.readyState !== 1) {
		return res.status(503).json({ success: false, error: "Database is temporarily unavailable." });
	}
	next();
});

router.get("/issues", async (req, res) => {
	const filters = {};
	if (categories.includes(req.query.category)) filters.category = req.query.category;
	if (statuses.includes(req.query.status)) filters.status = req.query.status;
	if (["Low", "Medium", "High", "Critical"].includes(req.query.severity)) filters.severity = req.query.severity;
	if (req.query.escalatedOnly === "true") filters.$or = [{ escalationLevel: { $gt: 1 } }, { status: "Escalated" }];
	if (req.query.neglectedOnly === "true") filters.neglectStatus = "DEADLINE EXCEEDED";
	if (req.query.collectiveOnly === "true") filters.collectiveSignal = true;
	if (typeof req.query.search === "string" && req.query.search.trim()) {
		const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		filters.$and = [{ $or: [
			{ title: { $regex: escaped, $options: "i" } },
			{ location: { $regex: escaped, $options: "i" } },
			{ id: { $regex: escaped, $options: "i" } },
		] }];
	}

	const issues = await Issue.find(filters).sort({ createdAt: -1 }).lean();
	res.json({ success: true, data: issues });
});

router.get("/issues/:id", async (req, res) => {
	const issue = await Issue.findOne({ id: req.params.id }).lean();
	if (!issue) return res.status(404).json({ success: false, error: "Issue not found." });
	res.json({ success: true, data: issue });
});

router.post("/issues", requireAuth, upload.single("image"), async (req, res) => {
	const { title, description, category, location } = req.body;
	const hasLatitude = req.body.latitude !== undefined && req.body.latitude !== "";
	const hasLongitude = req.body.longitude !== undefined && req.body.longitude !== "";
	const latitude = hasLatitude ? Number(req.body.latitude) : null;
	const longitude = hasLongitude ? Number(req.body.longitude) : null;
	const area = typeof req.body.area === "string" ? req.body.area.trim() : "";
	const city = typeof req.body.city === "string" ? req.body.city.trim() : "";
	const state = typeof req.body.state === "string" ? req.body.state.trim() : "";
	const country = typeof req.body.country === "string" ? req.body.country.trim() : "";
	// Only trust a device claim when coordinates actually came with it.
	const locationSource = req.body.locationSource === "device GPS" && Number.isFinite(latitude) && Number.isFinite(longitude)
		? "device GPS"
		: "manual";
	// The department CivicLens AI proposed for this issue, stored in the existing
	// department field rather than adding a second column for the same value.
	const responsibleDepartment = typeof req.body.responsibleDepartment === "string" && req.body.responsibleDepartment.trim()
		? req.body.responsibleDepartment.trim().slice(0, 120)
		: "";

	if (!title?.trim() || !description?.trim() || !categories.includes(category) || !location?.trim() || !req.file) {
		if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
		return res.status(400).json({ success: false, error: "Please provide the issue details, location, category, and an evidence photo." });
	}
	// Coordinates stay optional: a manually reported area is still a valid report,
	// it just will not be pinned on the Civic Map.
	if ((hasLatitude || hasLongitude) && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
		if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
		return res.status(400).json({ success: false, error: "Enter valid latitude and longitude coordinates." });
	}

	try {
		const issue = await Issue.create({
			id: `CL-${Date.now()}`,
			title: title.trim(),
			description: description.trim(),
			category,
			image: `/uploads/${req.file.filename}`,
			location: location.trim(),
			area,
			city,
			state,
			country,
			locationSource,
			latitude,
			longitude,
			reportedBy: req.user._id,
			reporter: { name: req.user.name, role: "Citizen" },
			severity: ["Low", "Medium", "High", "Critical"].includes(req.body.severity) ? req.body.severity : "Medium",
			department: responsibleDepartment || "Municipal Civic Works",
		});
		res.status(201).json({ success: true, data: issue });
	} catch (error) {
		await fs.promises.unlink(req.file.path).catch(() => {});
		throw error;
	}
});

router.post("/issues/:id/signals", async (req, res) => {
	const issue = await Issue.findOneAndUpdate(
		{ id: req.params.id },
		[{ $set: { reportCount: { $add: ["$reportCount", 1] }, collectiveSignalCount: { $add: ["$collectiveSignalCount", 1] } } },
			{ $set: { collectiveSignal: { $gte: ["$collectiveSignalCount", 10] } } }],
		{ new: true },
	);
	if (!issue) return res.status(404).json({ success: false, error: "Issue not found." });
	res.json({ success: true, data: issue });
});

router.put("/issues/:id", requireAuth, async (req, res) => {
	if (!["authority", "admin"].includes(req.user.role)) {
		return res.status(403).json({ success: false, error: "Authority access is required to post issue updates." });
	}

	const { status, description, percentage } = req.body;
	if (!statuses.includes(status) || typeof description !== "string" || !description.trim()) {
		return res.status(400).json({ success: false, error: "Provide a valid status and progress description." });
	}
	const progress = Number(percentage);
	if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
		return res.status(400).json({ success: false, error: "Progress must be between 0 and 100." });
	}

	const issue = await Issue.findOneAndUpdate(
		{ id: req.params.id },
		{
			$set: { status },
			$push: { progressUpdates: { status, description: description.trim(), percentage: progress, updatedBy: req.user.name } },
		},
		{ new: true, runValidators: true },
	);
	if (!issue) return res.status(404).json({ success: false, error: "Issue not found." });
	res.json({ success: true, data: issue });
});

// The Escalation Center is the only reader that needs escalation to advance on
// its own, so the deadline sweep runs here: every load re-reads the stored
// 14 day `expectedResolutionDate` and persists whatever the passage of time
// changed. Nothing is written for an issue that is still inside its window, and
// the sweep only ever writes fields that actually moved, so repeated loads stay
// idempotent and cannot duplicate escalation history.
router.get("/escalations", async (req, res) => {
  await escalationService.recalculateEscalations();

  const issues = await Issue.find({
    $or: [{ status: "Escalated" }, { neglectStatus: "DEADLINE EXCEEDED" }, { escalationLevel: { $gt: 1 } }],
  }).sort({ updatedAt: -1 }).lean();

  res.json({
    success: true,
    data: issues,
    escalation: escalationService.describeEscalationPolicy(),
  });
});

// Demo mode only. Returns what the ladder *would* say with the evaluation clock
// pushed forward, and never writes: `projectForDemo` is a pure read of the stored
// deadline. It is refused outright unless ESCALATION_DEMO_MODE is on, so the
// simulated window can never be mistaken for the real 14 day rule.
router.get("/escalations/demo", async (req, res) => {
  if (!escalationService.demoModeEnabled()) {
    return res.status(404).json({ success: false, error: "Escalation demo mode is not enabled." });
  }

  // Capped at the number of steps that crosses the real deadline, so a
  // fast-forward can reach a genuine escalation but the simulated clock can
  // never be pushed arbitrarily far past it.
  const steps = Math.max(1, Math.min(Number(req.query.steps) || 1, escalationService.MAX_DEMO_STEPS));
  const issues = await Issue.find({ status: { $ne: "Resolved" } }).sort({ createdAt: -1 }).limit(25).lean();
  const projected = issues.map((issue) => escalationService.projectForDemo(issue, steps * escalationService.DEMO_ESCALATION_WINDOW_SECONDS));

  res.json({
    success: true,
    data: projected,
    escalation: escalationService.describeEscalationPolicy(),
    demo: { steps, windowSeconds: escalationService.DEMO_ESCALATION_WINDOW_SECONDS, maxSteps: escalationService.MAX_DEMO_STEPS, simulated: true },
  });
});

module.exports = router;
