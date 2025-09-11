// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 login attempts per IP
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again after 15 minutes."
  },
  standardHeaders: true, // send RateLimit headers
  legacyHeaders: false,  // disable X-RateLimit headers
});
