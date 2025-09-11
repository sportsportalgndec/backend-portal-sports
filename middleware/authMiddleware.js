const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ✅ Import your user model


exports.verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized - No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ normalize id
    const userId = decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // DB se user fetch
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = {
      ...user.toObject(),
      roles: decoded.roles || user.roles || [],
      activeRole: decoded.activeRole || null,
    };

    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(403).json({ message: "Forbidden - Invalid token" });
  }
};


// Role-specific checks
exports.isStudent = (req, res, next) =>
  req.user?.activeRole === "student"
    ? next()
    : res.status(403).json({ message: "Students only" });

exports.isTeacher = (req, res, next) =>
  req.user?.activeRole === "teacher"
    ? next()
    : res.status(403).json({ message: "Teachers only" });

exports.isAdmin = (req, res, next) =>
  req.user?.activeRole === "admin"
    ? next()
    : res.status(403).json({ message: "Admins only" });

exports.roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.activeRole) {
      return res.status(401).json({ message: "Unauthorized - No active role" });
    }
    if (!allowedRoles.includes(req.user.activeRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

