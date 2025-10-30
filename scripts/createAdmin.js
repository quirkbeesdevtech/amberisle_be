/*
  Usage:
  node scripts/createAdmin.js admin@gmail.com StrongPass123
  If no args, defaults to admin@gmail.com / Admin@1234
*/

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function run() {
  const email = process.argv[2] || 'admin@gmail.com';
  const password = process.argv[3] || 'Admin@1234';
  const fullname = 'System Admin';
  const phone = '9999999999';

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus_management';
    await mongoose.connect(uri);

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, password, fullname, phone, role: 'admin' });
      await user.save();
      console.log(`Created admin user: ${email}`);
    } else {
      let changed = false;
      if (user.role !== 'admin') {
        user.role = 'admin';
        changed = true;
      }
      if (password) {
        user.password = password; // will be hashed by pre-save
        changed = true;
      }
      if (changed) {
        await user.save();
        console.log(`Updated admin user: ${email}`);
      } else {
        console.log(`Admin already exists (no changes): ${email}`);
      }
    }

    const ok = await user.comparePassword(password);
    console.log('Password set/verified:', ok);

  } catch (err) {
    console.error('createAdmin error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
