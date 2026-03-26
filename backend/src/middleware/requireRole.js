const { ROLES } = require("../constants/roles");

function requireRoles(allowedRoles = []) {
  const normalized = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  for (const role of normalized) {
    if (!ROLES.includes(role)) {
      throw new Error(`Unknown role in requireRoles(): ${role}`);
    }
  }

  return function (req, res, next) {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!normalized.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient role",
      });
    }

    return next();
  };
}

module.exports = { requireRoles };

