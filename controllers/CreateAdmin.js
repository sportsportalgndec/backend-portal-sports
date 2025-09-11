// controllers/auth/createAdmin.js
const bcrypt = require('bcrypt');
const User = require('../models/User');

const createAdminIfNotExists = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME) {
    console.warn('⚠️ Admin env variables missing');
    return;
  }

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log('✅ Admin already exists');
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: hashed,
    roles: ['admin'],
  });

  console.log(`✅ Admin created: ${ADMIN_EMAIL}`);
};

module.exports = createAdminIfNotExists;
