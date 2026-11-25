const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

let SECRET;
try {
  SECRET = fs.readFileSync(path.join(process.cwd(), "private.key"), "utf8").trim();
} catch (e) {
  SECRET = process.env.JWT_SECRET || "Bla@2021BOWS^!@#$)(*)";
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Token missing" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Invalid or expired token" });
  }
};

/**
 * Role-Based Access Control Middleware
 * Checks if authenticated user has at least one of the specified roles or is a Super Admin.
 * @param  {...string} allowedRoles 
 */
const requireRole = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.flat().map(r => String(r).toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Authentication required" });
    }

    const isSuperAdmin = !!req.user.isSystemAdmin || (req.user.roleName || '').toLowerCase().includes('super');
    if (isSuperAdmin) {
      return next();
    }

    const userRole = (req.user.roleName || req.user.role?.role || '').toLowerCase();
    const hasRole = normalizedAllowed.some(role => userRole.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Access denied: Requires one of [${allowedRoles.join(', ')}] role(s)`
      });
    }

    next();
  };
};

const requireAdmin = requireRole('admin', 'super admin', 'hr');

module.exports = verifyToken;
module.exports.verifyToken = verifyToken;
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
