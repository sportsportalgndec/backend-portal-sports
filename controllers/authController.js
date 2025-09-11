const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // ✅ default activeRole: pehla role
    const activeRole = user.roles?.[0] || null;

    const token = jwt.sign(
      { id: user._id, roles: user.roles, activeRole },  // activeRole included
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie('token', token, { 
      httpOnly: true,  
      secure: true,       // production -> true
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000
    }).json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        activeRole,        // ✅ frontend ko bhi bhej
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Assuming this route is defined as:
// router.post("/set-role", verifyToken, setRole);

exports.setRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = req.user; // already verified by verifyToken

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.roles.includes(role)) {
      return res.status(403).json({ message: "Invalid role selection" });
    }

    // ✅ create a new token with the selected role
    const newToken = jwt.sign(
      { id: user._id, roles: user.roles, activeRole: role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure in production only
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Role set successfully",
      activeRole: role,
    });
  } catch (err) {
    console.error("Error setting role:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: 'None',
      path: '/'
    });
    
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};