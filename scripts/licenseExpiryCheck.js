const mongoose = require('mongoose');
const Driver = require('../models/Driver');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bus_admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkLicenseExpiry() {
  try {
    console.log('Starting daily license expiry check...');
    
    // Update expired licenses
    const result = await Driver.updateExpiredLicenses();
    
    // Get drivers with expiring licenses (within 30 days)
    const expiringDrivers = await Driver.getDriversWithExpiringLicenses();
    
    // Get expired drivers
    const expiredDrivers = await Driver.getExpiredDrivers();
    
    console.log(`License expiry check completed:`);
    console.log(`- ${result.modifiedCount} drivers marked as inactive due to expired licenses`);
    console.log(`- ${expiringDrivers.length} drivers with licenses expiring within 30 days`);
    console.log(`- ${expiredDrivers.length} drivers with expired licenses`);
    
    // Log expiring drivers for admin notification
    if (expiringDrivers.length > 0) {
      console.log('\nDrivers with licenses expiring within 30 days:');
      expiringDrivers.forEach(driver => {
        console.log(`- ${driver.fullName} (License: ${driver.licenseNumber}) - Expires: ${driver.licenseExpiry.toDateString()}`);
      });
    }
    
    // Log expired drivers for admin notification
    if (expiredDrivers.length > 0) {
      console.log('\nDrivers with expired licenses:');
      expiredDrivers.forEach(driver => {
        console.log(`- ${driver.fullName} (License: ${driver.licenseNumber}) - Expired: ${driver.licenseExpiry.toDateString()}`);
      });
    }
    
  } catch (error) {
    console.error('Error during license expiry check:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the check
checkLicenseExpiry();
