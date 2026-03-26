const { verifyAccessToken } = require("../utils/jwt");

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid Authorization header",
      });
    }

    const token = header.slice("Bearer ".length).trim();
    const decoded = verifyAccessToken(token);

    // decoded should contain: { sub, role, email, iat, exp }
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email,
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = { authRequired };

