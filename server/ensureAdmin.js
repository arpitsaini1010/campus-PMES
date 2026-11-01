const User = require('./models/User');

const ensureAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@cpur.in').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      if (!adminPassword) {
        console.log('ℹ Admin user not found. Set ADMIN_PASSWORD environment variable to initialize initial admin.');
        return;
      }
      admin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        employeeId: 'ADM-001',
        mustChangePassword: false
      });
      await admin.save();
      console.log(`✓ Admin user initialized: ${adminEmail}`);
    } else {
      console.log(`✓ Admin user verified: ${adminEmail}`);
    }
  } catch (error) {
    console.error('Error ensuring admin user:', error);
  }
};

module.exports = { ensureAdmin };

