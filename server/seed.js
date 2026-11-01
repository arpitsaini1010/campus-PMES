const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const User = require('./models/User');
const Department = require('./models/Department');
const Category = require('./models/Category');

const seedData = async () => {
  try {
    console.log('--- Starting Campus PMES Database Seeding (Production Baseline) ---');

    // 1. Seed Initial Admin Account via Environment Variables
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@cpur.in').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      if (!adminPassword) {
        console.log('ℹ Set ADMIN_PASSWORD environment variable to bootstrap initial admin.');
      } else {
        admin = new User({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          employeeId: 'ADM-001',
          mustChangePassword: false
        });
        await admin.save();
        console.log(`✓ Admin user created from environment configuration: ${adminEmail}`);
      }
    } else {
      console.log(`ℹ Admin user verified: ${adminEmail}`);
    }

    // 2. Seed Baseline University Academic Departments
    const departmentDefinitions = [
      { name: 'BCA', code: 'BCA', totalSemesters: 6 },
      { name: 'BTECH', code: 'BTECH', totalSemesters: 8 },
      { name: 'BBA', code: 'BBA', totalSemesters: 6 },
      { name: 'MCA', code: 'MCA', totalSemesters: 4 },
      { name: 'Pharmacy', code: 'PHARM', totalSemesters: 8 }
    ];

    for (const dDef of departmentDefinitions) {
      let dept = await Department.findOne({ code: dDef.code });
      if (!dept) {
        dept = await Department.create(dDef);
        console.log(`✓ Seeded department: ${dDef.name} (${dDef.code}) - ${dDef.totalSemesters} Semesters`);
      } else {
        dept.totalSemesters = dDef.totalSemesters;
        await dept.save();
      }
    }

    // 3. Seed Standard Capstone Project Categories
    const defaultCategories = [
      'Web Application Development',
      'Artificial Intelligence & ML',
      'Mobile Application Development',
      'Cloud Computing & DevOps',
      'Cybersecurity & Network Defense',
      'Internet of Things (IoT)',
      'Data Science & Analytics',
      'Blockchain Technology'
    ];

    for (const catName of defaultCategories) {
      let cat = await Category.findOne({ name: catName });
      if (!cat) {
        await Category.create({ name: catName });
        console.log(`✓ Seeded category: ${catName}`);
      }
    }

    console.log('\n=============================================================');
    console.log('✅ Baseline Database Seeding Completed Successfully');
    console.log('   All faculty, student, and academic records are managed securely');
    console.log('   in MongoDB Atlas via the Admin Portal.');
    console.log('=============================================================\n');

  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  connectDB().then(() => {
    seedData();
  });
}

module.exports = { seedData };
