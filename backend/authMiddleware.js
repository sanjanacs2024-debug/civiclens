const jwt = require("jsonwebtoken");
const User = require("./models/User");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Please sign in to continue." });
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: "Please sign in to continue." });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid or expired token." });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Please sign in to continue." });
    }
    if (!req.user.isActive) {
      return res.status(403).json({ success: false, error: "Your account has been deactivated." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "You do not have permission to access this resource." });
    }
    next();
  };
}

function requireAdminOrSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Please sign in to continue." });
  }
  if (!req.user.isActive) {
    return res.status(403).json({ success: false, error: "Your account has been deactivated." });
  }
  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: "Admin access required." });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Please sign in to continue." });
  }
  if (!req.user.isActive) {
    return res.status(403).json({ success: false, error: "Your account has been deactivated." });
  }
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Super admin access required." });
  }
  next();
}

function requireDepartmentAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Please sign in to continue." });
  }
  if (!req.user.isActive) {
    return res.status(403).json({ success: false, error: "Your account has been deactivated." });
  }
  const allowedRoles = ["department_officer", "admin", "super_admin"];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: "Department officer access required." });
  }
  next();
}

function requireFieldWorkerOrAbove(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Please sign in to continue." });
  }
  if (!req.user.isActive) {
    return res.status(403).json({ success: false, error: "Your account has been deactivated." });
  }
  const allowedRoles = ["field_worker", "department_officer", "admin", "super_admin"];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: "Field worker access required." });
  }
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireAdminOrSuperAdmin,
  requireSuperAdmin,
  requireDepartmentAccess,
  requireFieldWorkerOrAbove,
};