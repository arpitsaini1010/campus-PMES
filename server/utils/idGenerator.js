const User = require('../models/User');

/**
 * Calculates the next sequential ID for faculty or student.
 * Fetches existing IDs from DB and increments the highest number.
 * 
 * Faculty: EMP-101, EMP-102, ... (starts at EMP-101)
 * Student: K26001, K26002, ... (starts at K26001)
 */
async function getNextId(role) {
  if (role === 'faculty') {
    const users = await User.find({ role: 'faculty', employeeId: { $exists: true, $ne: '' } }).select('employeeId');
    if (!users || users.length === 0) {
      return 'EMP-101';
    }

    let maxNum = 100;
    let prefix = 'EMP-';
    let padLen = 3;

    for (const u of users) {
      if (!u.employeeId) continue;
      const match = u.employeeId.trim().match(/^([A-Za-z\-_]+)(\d+)$/);
      if (match) {
        prefix = match[1];
        const num = parseInt(match[2], 10);
        padLen = Math.max(padLen, match[2].length);
        if (num > maxNum) maxNum = num;
      } else {
        const digits = u.employeeId.match(/\d+/g);
        if (digits) {
          const num = parseInt(digits.join(''), 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `${prefix}${String(maxNum + 1).padStart(padLen, '0')}`;
  } else if (role === 'student') {
    const users = await User.find({ role: 'student', enrollmentNo: { $exists: true, $ne: '' } }).select('enrollmentNo');
    if (!users || users.length === 0) {
      return 'K26001';
    }

    let maxNum = 26000;
    let prefix = 'K';
    let padLen = 5;

    for (const u of users) {
      if (!u.enrollmentNo) continue;
      const match = u.enrollmentNo.trim().match(/^([A-Za-z\-_]+)(\d+)$/);
      if (match) {
        prefix = match[1];
        const num = parseInt(match[2], 10);
        padLen = Math.max(padLen, match[2].length);
        if (num > maxNum) maxNum = num;
      } else {
        const digits = u.enrollmentNo.match(/\d+/g);
        if (digits) {
          const num = parseInt(digits.join(''), 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `${prefix}${String(maxNum + 1).padStart(padLen, '0')}`;
  }

  return '';
}

module.exports = { getNextId };

