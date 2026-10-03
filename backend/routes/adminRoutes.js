const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Issue = require("../models/Issue");

const {
  requireAuth,
  requireAdminOrSuperAdmin,
  requireFieldWorkerOrAbove,
} = require("../authMiddleware");

const router = express.Router();

const categories = ["Roads & Infrastructure", "Waste & Cleanliness", "Water & Drainage", "Public Safety"];
const statuses = ["Reported", "Under Review", "Acknowledged", "In Progress", "Resolved", "Escalated"];
const roles = ["citizen", "field_worker", "department_officer", "admin", "super_admin"];

router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, error: "Database is temporarily unavailable." });
  }
  next();
});

router.get(
  "/dashboard",
  requireAuth,
  requireAdminOrSuperAdmin,
  async (req, res, next) => {
    try {
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalIssues,
        openIssues,
        inProgressIssues,
        resolvedIssues,
        escalatedIssues,
        pendingReports,
        recentReports,
        issuesByCategory,
        issuesByStatus,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        Issue.countDocuments(),
        Issue.countDocuments({
          status: { $in: ["Reported", "Under Review", "Acknowledged", "In Progress"] },
        }),
        Issue.countDocuments({ status: "In Progress" }),
        Issue.countDocuments({ status: "Resolved" }),
        Issue.countDocuments({
          $or: [{ status: "Escalated" }, { escalationLevel: { $gt: 1 } }],
        }),
        Issue.countDocuments({ status: { $in: ["Reported", "Under Review"] } }),
        Issue.find().sort({ createdAt: -1 }).limit(5).lean(),
        Issue.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Issue.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: inactiveUsers,
          },
          issues: {
            total: totalIssues,
            open: openIssues,
            inProgress: inProgressIssues,
            resolved: resolvedIssues,
            escalated: escalatedIssues,
            pendingReports: pendingReports,
          },
          recentReports,
          issuesByCategory: issuesByCategory.map(({ _id, count }) => ({
            category: _id,
            count,
          })),
          issuesByStatus: issuesByStatus.map(({ _id, count }) => ({
            status: _id,
            count,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/users",
  requireAuth,
  requireAdminOrSuperAdmin,
  async (req, res, next) => {
    try {
      const filters = {};

      if (req.query.isActive === "true" || req.query.isActive === "false") {
        filters.isActive = req.query.isActive === "true";
      }
      if (req.query.role && roles.includes(req.query.role)) {
        filters.role = req.query.role;
      }
      if (req.query.department && typeof req.query.department === "string" && req.query.department.trim()) {
        filters.department = { $regex: req.query.department.trim(), $options: "i" };
      }
      if (typeof req.query.search === "string" && req.query.search.trim()) {
        const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filters.$or = [
          { name: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
          { phone: { $regex: escaped, $options: "i" } },
        ];
      }

      const users = await User.find(filters).sort({ createdAt: -1 }).lean();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/users/:id",
  requireAuth,
  requireAdminOrSuperAdmin,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id).lean();
      if (!user) return res.status(404).json({ success: false, error: "User not found." });
      res.json({ success: true, data: user });
    } catch (error) {
      if (error instanceof mongoose.Error.CastError) {
        return res.status(400).json({ success: false, error: "Invalid user ID." });
      }
      next(error);
    }
  },
);

router.get(
  "/issues",
  requireAuth,
  requireFieldWorkerOrAbove,
  async (req, res, next) => {
    try {
      const filters = {};

      if (req.query.category && categories.includes(req.query.category)) {
        filters.category = req.query.category;
      }
      if (req.query.status && statuses.includes(req.query.status)) {
        filters.status = req.query.status;
      }
      if (req.query.severity && ["Low", "Medium", "High", "Critical"].includes(req.query.severity)) {
        filters.severity = req.query.severity;
      }
      if (req.query.escalatedOnly === "true") {
        filters.$or = [{ escalationLevel: { $gt: 1 } }, { status: "Escalated" }];
      }
      if (req.query.neglectedOnly === "true") {
        filters.neglectStatus = "DEADLINE EXCEEDED";
      }
      if (typeof req.query.search === "string" && req.query.search.trim()) {
        const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filters.$and = [
          {
            $or: [
              { title: { $regex: escaped, $options: "i" } },
              { location: { $regex: escaped, $options: "i" } },
              { id: { $regex: escaped, $options: "i" } },
            ],
          },
        ];
      }

      const issues = await Issue.find(filters).sort({ createdAt: -1 }).lean();
      res.json({ success: true, data: issues });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/issues/:id",
  requireAuth,
  requireFieldWorkerOrAbove,
  async (req, res, next) => {
    try {
      const issue = await Issue.findOne({ id: req.params.id }).lean();
      if (!issue) return res.status(404).json({ success: false, error: "Issue not found." });
      res.json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
